import request from 'supertest';
import app from '../index';
import prisma from '../config/prisma';
import bcrypt from 'bcryptjs';

describe('API Integration Tests', () => {
  const testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
  };

  const createAdminUser = async () => {
    const hashedPassword = await bcrypt.hash('adminpass', 10);
    const user = await prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@test.com',
        password: hashedPassword,
        role: 'ADMIN',
      },
    });
    return user;
  };

  const getAuthToken = async (email: string, password: string = 'password123') => {
    const res = await request(app).post('/api/auth/login').send({ email, password });
    return res.body.token;
  };

  describe('Autenticación', () => {
    it('Registro exitoso de un nuevo usuario', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe(testUser.email);
    });

    it('Registro con un email ya existente devuelve error', async () => {
      await request(app).post('/api/auth/register').send(testUser);
      
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.status).toBe(400); // Or whatever status your app returns for existing email, usually 400 or 409
      expect(res.body).toHaveProperty('error');
    });

    it('Login con credenciales correctas devuelve token JWT', async () => {
      await request(app).post('/api/auth/register').send(testUser);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
    });

    it('Login con contraseña incorrecta devuelve 401', async () => {
      await request(app).post('/api/auth/register').send(testUser);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' });

      expect(res.status).toBe(401);
    });

    it('Usuario bloqueado no puede hacer login y recibe 403', async () => {
      await request(app).post('/api/auth/register').send(testUser);
      
      // Block the user
      await prisma.user.update({
        where: { email: testUser.email },
        data: { isBlocked: true }
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      expect(res.status).toBe(403);
    });
  });

  describe('Autorización', () => {
    it('Acceder a una ruta protegida sin token devuelve 401', async () => {
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(401);
    });

    it('Un usuario con rol MEMBER accede a /api/stats y recibe 403', async () => {
      await request(app).post('/api/auth/register').send(testUser);
      const token = await getAuthToken(testUser.email);

      const res = await request(app)
        .get('/api/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('Un usuario con rol ADMIN accede a /api/stats y recibe 200', async () => {
      await createAdminUser();
      const token = await getAuthToken('admin@test.com', 'adminpass');

      const res = await request(app)
        .get('/api/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });

  describe('Reservas', () => {
    let courtId: string;
    let userToken: string;
    let userId: string;

    beforeEach(async () => {
      // Create user
      const registerRes = await request(app).post('/api/auth/register').send(testUser);
      userToken = registerRes.body.token;
      userId = registerRes.body.user.id;

      // Create a court directly via Prisma for testing reservations
      const court = await prisma.court.create({
        data: {
          name: 'Pista Test',
          sport: 'Pádel',
          type: 'Interior',
          surface: 'Cristal',
          pricePerHour: 10,
          isActive: true,
          openTime: '08:00',
          closeTime: '22:00',
          activeDays: [0, 1, 2, 3, 4, 5, 6]
        }
      });
      courtId = court.id;
    });

    it('Crear una reserva en una pista disponible devuelve 201', async () => {
      // Create date for tomorrow at 10:00 AM UTC
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setUTCHours(10, 0, 0, 0);
      
      const startTime = tomorrow.toISOString();
      const endTime = new Date(tomorrow.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour later

      const res = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          courtId,
          startTime,
          endTime
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
    });

    it('Crear dos reservas solapadas en la misma pista devuelve error de conflicto', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setUTCHours(10, 0, 0, 0);
      
      const startTime = tomorrow.toISOString();
      const endTime = new Date(tomorrow.getTime() + 60 * 60 * 1000).toISOString();

      // First reservation
      await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ courtId, startTime, endTime });

      // Second overlapping reservation
      const res = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ courtId, startTime, endTime });

      // Usually overlapping returns 409 Conflict
      expect(res.status).toBe(409);
    });

    it('Cancelar una reserva propia cambia su estado correctamente', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setUTCHours(10, 0, 0, 0);
      
      const startTime = tomorrow.toISOString();
      const endTime = new Date(tomorrow.getTime() + 60 * 60 * 1000).toISOString();

      const createRes = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ courtId, startTime, endTime });
        
      const reservationId = createRes.body.id;

      const res = await request(app)
        .put(`/api/reservations/${reservationId}/cancel`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      
      // Verify in database
      const updatedRes = await prisma.reservation.findUnique({ where: { id: reservationId } });
      expect(updatedRes?.status).toBe('CANCELLED');
    });
  });

  describe('Check-in', () => {
    let courtId: string;
    let userToken: string;

    beforeEach(async () => {
      const registerRes = await request(app).post('/api/auth/register').send(testUser);
      userToken = registerRes.body.token;

      const court = await prisma.court.create({
        data: {
          name: 'Pista Check-in',
          sport: 'Tenis',
          type: 'Exterior',
          surface: 'Tierra',
          pricePerHour: 15,
          isActive: true,
          checkInLeadTime: 60,
          checkInFollowUpTime: 30
        }
      });
      courtId = court.id;
    });

    it('Hacer check-in sin reserva activa devuelve error 404', async () => {
      const res = await request(app)
        .post(`/api/reservations/checkin/${courtId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
    });

    it('Hacer check-in dos veces en la misma reserva devuelve error de duplicado', async () => {
      // Create a reservation that starts in 10 minutes (within check-in window)
      const now = new Date();
      const startTime = new Date(now.getTime() + 10 * 60 * 1000).toISOString(); // In 10 mins
      const endTime = new Date(now.getTime() + 70 * 60 * 1000).toISOString(); // In 70 mins

      await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ courtId, startTime, endTime });

      // First check-in
      const firstCheckIn = await request(app)
        .post(`/api/reservations/checkin/${courtId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(firstCheckIn.status).toBe(200);

      // Second check-in
      const secondCheckIn = await request(app)
        .post(`/api/reservations/checkin/${courtId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(secondCheckIn.status).toBe(400); // Double check-in returns 400
      expect(secondCheckIn.body.error).toContain('Ya has realizado el check-in');
    });
  });
});
