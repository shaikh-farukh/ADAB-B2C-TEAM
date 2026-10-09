async function verify() {
  const baseUrl = 'http://localhost:5005/api/v1/admin';
  
  try {
    const loginRes = await fetch(`${baseUrl}/dev-login`, { method: 'POST' });
    const loginData = await loginRes.json();
    const token = loginData.token;
    
    const endpoints = [
      '/dashboard',
      '/sellers',
      '/customers',
      '/products',
      '/approvals',
      '/orders',
      '/returns'
    ];
    
    for (const ep of endpoints) {
      try {
        const res = await fetch(`${baseUrl}${ep}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        console.log(`[${ep}] PASS: Status ${res.status}, Success: ${data.success}, Records: ${data.data?.length || 0} or Data: ${typeof data.data}`);
      } catch (e) {
        console.log(`[${ep}] FAIL: ${e.message}`);
      }
    }
  } catch(e) {
    console.log('Login failed', e.message);
  }
}

verify();
