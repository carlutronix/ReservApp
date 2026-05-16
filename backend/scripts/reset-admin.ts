
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetAdmin() {
  const email = 'admin@gmail.com';
  const password = 'admin';
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        isBlocked: false,
        role: 'ADMIN'
      },
      create: {
        email,
        password: hashedPassword,
        name: 'Admin User',
        role: 'ADMIN'
      }
    });

    console.log('✅ Admin user reset successfully:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
  } catch (error) {
    console.error('❌ Error resetting admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdmin();
