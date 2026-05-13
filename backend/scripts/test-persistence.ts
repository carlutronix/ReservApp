
const API_URL = 'http://localhost:3000/api';

async function testPersistence() {
  const email = `test_${Date.now()}@example.com`;
  const password = 'password123';
  const name = 'Test User';

  console.log(`1. Registering user: ${email}`);
  try {
    const registerRes = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
    });
    const registerData = await registerRes.json();
    if (!registerRes.ok) throw new Error(JSON.stringify(registerData));
    
    console.log('   Registration successful:', registerData.user.id);
    const token = registerData.token;

    console.log('2. Logging in...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error(JSON.stringify(loginData));
    console.log('   Login successful. Token received.');

    console.log('3. Checking persistence (Get Profile)...');
    
    console.log('4. Creating a reservation...');
    // First get a court
    const courtsRes = await fetch(`${API_URL}/courts`);
    const courts = await courtsRes.json();
    const court = courts[0];
    if (!court) {
        console.log('   No courts available to reserve. Skipping reservation test.');
        return;
    }
    
    const startTime = new Date();
    startTime.setDate(startTime.getDate() + 1);
    startTime.setHours(10, 0, 0, 0);
    const endTime = new Date(startTime);
    endTime.setHours(11, 0, 0, 0);

    const reservationRes = await fetch(`${API_URL}/reservations`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
            courtId: court.id,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            notes: 'Persistence Test'
        })
    });
    const reservationData = await reservationRes.json();
    if (!reservationRes.ok) throw new Error(JSON.stringify(reservationData));
    console.log('   Reservation created:', reservationData.id);

    console.log('5. Verifying reservation persistence...');
    const myReservationsRes = await fetch(`${API_URL}/reservations?mine=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const myReservations = await myReservationsRes.json();
    const found = myReservations.find((r: any) => r.id === reservationData.id);
    
    if (found) {
      console.log('   SUCCESS: Reservation found in DB.');
    } else {
      console.error('   FAILURE: Reservation NOT found.');
    }

  } catch (error: any) {
    console.error('Test failed:', error.message);
  }
}

testPersistence();
