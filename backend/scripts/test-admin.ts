
import { PrismaClient } from '@prisma/client';

const API_URL = 'http://localhost:3000/api';
const prisma = new PrismaClient();

async function testAdminPanel() {
  const adminEmail = `admin_test_${Date.now()}@example.com`;
  const userEmail = `user_test_${Date.now()}@example.com`;
  const password = 'password123';

  try {
    // 1. Setup Admin User
    console.log('1. Setting up Admin User...');
    const adminRes = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password, name: 'Admin Test' })
    });
    const adminData = await adminRes.json();
    if (!adminRes.ok) throw new Error('Admin reg failed');
    
    // Force role upgrade via Prisma
    await prisma.user.update({
        where: { id: adminData.user.id },
        data: { role: 'ADMIN' }
    });
    console.log('   Admin user created and promoted.');

    // Login as Admin
    const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password })
    });
    const loginData = await loginRes.json();
    const adminToken = loginData.token;

    // 2. Setup Normal User
    console.log('2. Setting up Normal User...');
    const userRes = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, password, name: 'Normal User' })
    });
    const userData = await userRes.json();
    const userToken = userData.token;
    const normalUserId = userData.user.id;

    // 3. Test Admin Access (Stats)
    console.log('3. Testing Admin Access (Stats)...');
    const statsRes = await fetch(`${API_URL}/stats`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (statsRes.status === 200) {
        console.log('   SUCCESS: Admin accessed stats.');
    } else {
        console.error('   FAILURE: Admin denied stats access.', statsRes.status);
    }

    // 4. Test User Access Denial (Stats)
    console.log('4. Testing User Access Denial (Stats)...');
    const userStatsRes = await fetch(`${API_URL}/stats`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
    });
    if (userStatsRes.status === 403) {
        console.log('   SUCCESS: User correctly denied stats access.');
    } else {
        console.error('   FAILURE: User accessed stats or wrong error.', userStatsRes.status);
    }

    // 5. Test Create Court
    console.log('5. Testing Create Court...');
    const courtRes = await fetch(`${API_URL}/courts`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}` 
        },
        body: JSON.stringify({
            name: `Court ${Date.now()}`,
            type: 'Indoor',
            surface: 'Turf',
            pricePerHour: 20
        })
    });
    const courtData = await courtRes.json();
    if (courtRes.status === 201) {
        console.log('   SUCCESS: Court created.', courtData.id);
    } else {
        console.error('   FAILURE: Court creation failed.', courtData);
    }

    // 6. Test Block User
    console.log('6. Testing Block User...');
    const blockRes = await fetch(`${API_URL}/users/${normalUserId}`, {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}` 
        },
        body: JSON.stringify({ isBlocked: true })
    });
    if (blockRes.status === 200) {
        console.log('   SUCCESS: User blocked.');
    } else {
        console.error('   FAILURE: Block user failed.', await blockRes.json());
    }

    // 7. Test Blocked User Login
    console.log('7. Testing Blocked User Login...');
    const blockedLoginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, password })
    });
    if (blockedLoginRes.status === 403) {
        console.log('   SUCCESS: Blocked user cannot login.');
    } else {
        console.error('   FAILURE: Blocked user logged in or wrong error.', blockedLoginRes.status);
    }

  } catch (error: any) {
    console.error('Test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testAdminPanel();
