const http = require('http');
const pool = require('../db');
const bcrypt = require('bcryptjs');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 5002,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let resData = '';
      res.on('data', chunk => resData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(resData) });
        } catch {
          resolve({ status: res.statusCode, body: resData });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5002,
      path,
      method: 'GET',
      headers
    }, res => {
      let resData = '';
      res.on('data', chunk => resData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(resData) });
        } catch {
          resolve({ status: res.statusCode, body: resData });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runSignUpVerification() {
  console.log('======================================================');
  console.log('🚀 TESTING FULL 3-STEP SIGN UP PROCESS (BACKEND)');
  console.log('======================================================');

  const testEmail = `enterprise_user_${Date.now()}@adabtest.com`;
  const testPhone = `+9198${Date.now().toString().slice(-8)}`;
  const testPassword = 'Password@123';
  const testName = 'Priyanka Patel';

  // STEP 1: Send Registration OTP with user details
  console.log('\n[STEP 1] Personal details submitted & sending OTP...');
  const step1Res = await post('/api/v1/auth/send-registration-otp', {
    email: testEmail,
    phone: testPhone,
    full_name: testName
  });

  if (step1Res.status !== 200 || !step1Res.body.otp) {
    throw new Error(`Step 1 failed: ${JSON.stringify(step1Res.body)}`);
  }
  const receivedOtp = step1Res.body.otp;
  console.log(`✅ Step 1 passed! OTP generated & challenge stored in auth_challenges: ${receivedOtp}`);

  // STEP 2: Verify OTP
  console.log('\n[STEP 2] Verifying OTP code...');
  const step2Res = await post('/api/v1/auth/verify-registration-otp', {
    email: testEmail,
    otp: receivedOtp
  });

  if (step2Res.status !== 200 || !step2Res.body.success) {
    throw new Error(`Step 2 failed: ${JSON.stringify(step2Res.body)}`);
  }
  console.log('✅ Step 2 passed! Challenge verified and marked as used.');

  // STEP 3: Complete Sign Up with Delivery Address & Encrypted Password
  console.log('\n[STEP 3] Completing registration with delivery address...');
  const step3Res = await post('/api/v1/auth/register', {
    email: testEmail,
    password: testPassword,
    full_name: testName,
    phone: testPhone,
    otp: receivedOtp,
    address_line: 'B-204, Shivalik Residency, Adajan',
    landmark: 'Near Star Bazaar',
    city: 'Surat',
    state: 'Gujarat',
    pincode: '395009',
    label: 'Home',
    is_default: true
  });

  if (step3Res.status !== 201 || !step3Res.body.user) {
    throw new Error(`Step 3 failed: ${JSON.stringify(step3Res.body)}`);
  }
  const createdUser = step3Res.body.user;
  const createdToken = step3Res.body.token;
  const createdAddress = step3Res.body.address;

  console.log(`✅ Step 3 passed! User created: ${createdUser.id} (${createdUser.full_name})`);
  console.log(`   Saved Address: ${createdAddress?.label} · ${createdAddress?.address_line}, ${createdAddress?.city} ${createdAddress?.pincode}`);

  // VERIFY DATABASE INTEGRITY & ENCRYPTION
  console.log('\n[CHECK 4] Verifying password encryption in PostgreSQL users table...');
  const dbUser = await pool.query('SELECT password_hash FROM users WHERE id = $1', [createdUser.id]);
  const storedHash = dbUser.rows[0].password_hash;
  
  if (!storedHash.startsWith('$2')) {
    throw new Error('Password was not hashed with bcrypt!');
  }
  const isBcryptValid = await bcrypt.compare(testPassword, storedHash);
  if (!isBcryptValid) {
    throw new Error('Password hash does not match plaintext password!');
  }
  console.log(`✅ Password securely encrypted with bcrypt: ${storedHash.slice(0, 20)}...`);

  // VERIFY PROFILE AND ADDRESS FETCH WITH AUTHENTICATION
  console.log('\n[CHECK 5] Verifying profile endpoint (/api/v1/customers/me)...');
  const profileRes = await get('/api/v1/customers/me', {
    'x-user-id': createdUser.id,
    'Authorization': `Bearer ${createdToken}`
  });
  if (profileRes.status !== 200 || !profileRes.body.data) {
    throw new Error('Failed to retrieve customer profile!');
  }
  console.log(`✅ Profile retrieved: Name=${profileRes.body.data.name}, Email=${profileRes.body.data.email}, Phone=${profileRes.body.data.phone}`);

  console.log('\n[CHECK 6] Verifying saved address endpoint (/api/v1/customers/me/addresses)...');
  const addrRes = await get('/api/v1/customers/me/addresses', {
    'x-user-id': createdUser.id,
    'Authorization': `Bearer ${createdToken}`
  });
  if (addrRes.status !== 200 || !Array.isArray(addrRes.body.data) || addrRes.body.data.length === 0) {
    throw new Error('Saved address not found in /addresses endpoint!');
  }
  const firstAddr = addrRes.body.data[0];
  console.log(`✅ Address retrieved: ${firstAddr.label} · ${firstAddr.address_line}, ${firstAddr.city} ${firstAddr.pincode}`);

  // Cleanup test user
  await pool.query('DELETE FROM addresses WHERE user_id = $1', [createdUser.id]);
  await pool.query('DELETE FROM customer_addresses WHERE customer_id = $1', [createdUser.id]);
  await pool.query('DELETE FROM customer_profiles WHERE user_id = $1', [createdUser.id]);
  await pool.query('DELETE FROM notification_preferences WHERE user_id = $1', [createdUser.id]);
  await pool.query('DELETE FROM auth_challenges WHERE LOWER(email) = $1', [testEmail.toLowerCase()]);
  await pool.query('DELETE FROM users WHERE id = $1', [createdUser.id]);

  console.log('\n🎉 ALL 3-STEP SIGN UP & VERIFICATION CHECKS PASSED 100%!\n');
  await pool.end();
}

runSignUpVerification().catch(err => {
  console.error('❌ Sign up verification failed:', err);
  pool.end();
  process.exit(1);
});
