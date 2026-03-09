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
          { name: 'Padel Indoor 1', type: 'Indoor', surface: 'Blue Turf', pricePerHour: 20, sport: 'Padel' },
          { name: 'Padel Indoor 2', type: 'Indoor', surface: 'Blue Turf', pricePerHour: 20, sport: 'Padel' },
          { name: 'Padel Outdoor 1', type: 'Outdoor', surface: 'Green Turf', pricePerHour: 15, sport: 'Padel' },
          { name: 'Tennis Court 1', type: 'Outdoor', surface: 'Clay', pricePerHour: 25, sport: 'Tennis' },
          { name: 'Basketball Court 1', type: 'Indoor', surface: 'Hardwood', pricePerHour: 30, sport: 'Basketball' },
          { name: 'Football Field 1', type: 'Outdoor', surface: 'Grass', pricePerHour: 50, sport: 'Football' },
          { name: 'Volleyball Court 1', type: 'Indoor', surface: 'Synthetic', pricePerHour: 20, sport: 'Volleyball' },
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
