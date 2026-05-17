import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

dotenv.config();

import routes from './routes';
import prisma from './config/prisma';
import bcrypt from 'bcryptjs';

const app = express();
const PORT = process.env.PORT || 3000;

// Seed Courts and Admin
const seedData = async () => {
  try {
    // Seed Courts
    const courtCount = await prisma.court.count();
    if (courtCount === 0) {
      console.log('Seeding initial courts...');
      await prisma.court.createMany({
        data: [
          { name: 'Pádel Interior 1', type: 'Interior', surface: 'Césped Sintético', pricePerHour: 20, sport: 'Pádel' },
          { name: 'Pádel Interior 2', type: 'Interior', surface: 'Césped Sintético', pricePerHour: 20, sport: 'Pádel' },
          { name: 'Pádel Exterior 1', type: 'Exterior', surface: 'Césped Sintético', pricePerHour: 15, sport: 'Pádel' },
          { name: 'Pista de Tenis 1', type: 'Exterior', surface: 'Tierra Batida', pricePerHour: 25, sport: 'Tenis' },
          { name: 'Cancha de Baloncesto 1', type: 'Interior', surface: 'Parqué', pricePerHour: 30, sport: 'Baloncesto' },
          { name: 'Campo de Fútbol 1', type: 'Exterior', surface: 'Césped Natural', pricePerHour: 50, sport: 'Fútbol' },
          { name: 'Cancha de Voleibol 1', type: 'Interior', surface: 'Sintética', pricePerHour: 20, sport: 'Voleibol' },
        ]
      });
      console.log('Courts seeded successfully');
    }

    // Seed Admin
    const adminEmail = 'admin@gmail.com';
    const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!existingAdmin) {
      console.log('Seeding admin user...');
      const hashedPassword = await bcrypt.hash('admin', 10);
      await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: 'Admin User',
          role: 'ADMIN',
        },
      });
      console.log('Admin user seeded successfully');
    }
  } catch (error) {
    console.error('Error seeding data:', error);
  }
};

seedData();

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Swagger
try {
  const swaggerDocument = YAML.load(path.join(__dirname, '../swagger.yaml'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (error) {
  console.warn('Swagger file not found or invalid');
}

// Routes
app.use('/api', routes);

// Health Check
app.get('/', (req, res) => {
  res.send('ReservApp API is running');
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

export default app;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}
