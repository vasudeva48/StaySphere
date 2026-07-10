const testTenantAPI = async () => {
  try {
    console.log('\n--- SIMULATING TENANT API CALLS ---\n');

    // 1. Log in to retrieve JWT token
    const loginRes = await fetch('https://staysphere-backend-1lyo.onrender.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'tenant@staysphere.com',
        password: 'admin123'
      })
    });

    const loginJson = await loginRes.json();
    const token = loginJson.token;
    console.log('Login successful. Token:', token);

    // 2. Fetch /api/auth/me
    const meRes = await fetch('https://staysphere-backend-1lyo.onrender.com/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const meJson = await meRes.json();
    console.log('\n/api/auth/me response data:', meJson);

    // 3. Fetch /api/rent/my
    const rentRes = await fetch('https://staysphere-backend-1lyo.onrender.com/api/rent/my', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const rentJson = await rentRes.json();
    console.log('\n/api/rent/my response data:', rentJson);

    // 4. Fetch /api/agreements/my
    const agreementRes = await fetch('https://staysphere-backend-1lyo.onrender.com/api/agreements/my', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const agreementJson = await agreementRes.json();
    console.log('\n/api/agreements/my response data:', agreementJson);

  } catch (err) {
    console.error('API call failed:', err.message);
  }
};

testTenantAPI();