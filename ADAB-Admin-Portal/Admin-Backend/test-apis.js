const http = require('http');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc5MTU1MzM2OCwiZXhwIjoxNzkxNjM5NzY4fQ.MP1B9kjMnCQGCAtaTR2_FWO-3xYmntuVafypVJCpcpc';
const endpoints = [
  '/api/v1/admin/sellers',
  '/api/v1/admin/customers',
  '/api/v1/admin/reports/summary',
  '/api/v1/admin/audit',
  '/api/v1/admin/settings',
  '/api/v1/admin/offers'
];

async function testEndpoint(path) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5005,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ path, status: res.statusCode, data: data.substring(0, 100) + '...' }));
    });
    req.on('error', e => resolve({ path, error: e.message }));
    req.end();
  });
}

async function run() {
  for (const p of endpoints) {
    const res = await testEndpoint(p);
    console.log(`[${res.status}] ${res.path} -> ${res.data || res.error}`);
  }
}
run();
