const pool = require('../db');
const authController = require('../controllers/authController');

async function runAuthTests() {
  console.log('Testing Authentication Endpoints...');

  const testEmail = `test_customer_${Date.now()}@adabtest.com`;
  const testPassword = 'SecurePassword123!';
  const testName = 'Test Customer Alpha';
  const testPhone = `+9199${Date.now().toString().slice(-8)}`;

  // 1. Test Registration
  console.log('1. Testing registration...');
  let regStatus, regData;
  const mockRegRes = {
    status: (s) => { regStatus = s; return mockRegRes; },
    json: (d) => { regData = d; return mockRegRes; }
  };
  await authController.register({
    body: {
      email: testEmail,
      password: testPassword,
      full_name: testName,
      phone: testPhone
    },
    headers: {}
  }, mockRegRes);

  console.log('Reg status:', regStatus);
  console.log('Reg data:', regData);
  if (regStatus !== 201 || !regData?.token || !regData?.user) {
    throw new Error('Registration test failed');
  }
  const createdUserId = regData.user.id;
  console.log('✅ Registration succeeded with user ID:', createdUserId);

  // 2. Test Login with correct credentials
  console.log('\n2. Testing login with correct credentials...');
  let loginStatus, loginData;
  const mockLoginRes = {
    status: (s) => { loginStatus = s; return mockLoginRes; },
    json: (d) => { loginData = d; return mockLoginRes; }
  };
  await authController.login({
    body: {
      email: testEmail,
      password: testPassword
    },
    headers: {}
  }, mockLoginRes);

  console.log('Login status:', loginStatus);
  console.log('Login message:', loginData?.message);
  if (loginStatus !== 200 || !loginData?.token || loginData?.user?.email !== testEmail) {
    throw new Error('Login test failed');
  }
  console.log('✅ Login succeeded!');

  // 3. Test Login with wrong password
  console.log('\n3. Testing login with wrong password...');
  let wrongStatus, wrongData;
  const mockWrongRes = {
    status: (s) => { wrongStatus = s; return mockWrongRes; },
    json: (d) => { wrongData = d; return mockWrongRes; }
  };
  await authController.login({
    body: {
      email: testEmail,
      password: 'WrongPassword999'
    },
    headers: {}
  }, mockWrongRes);

  console.log('Wrong pass status:', wrongStatus);
  if (wrongStatus !== 401) {
    throw new Error('Wrong password test failed');
  }
  console.log('✅ Wrong password rejected correctly (401)!');

  // 4. Test Forgot Password
  console.log('\n4. Testing forgot password...');
  let forgotStatus, forgotData;
  const mockForgotRes = {
    status: (s) => { forgotStatus = s; return mockForgotRes; },
    json: (d) => { forgotData = d; return mockForgotRes; }
  };
  await authController.forgotPassword({
    body: { email: testEmail }
  }, mockForgotRes);

  console.log('Forgot status:', forgotStatus);
  console.log('OTP generated:', forgotData?.otp);
  if (forgotStatus !== 200 || !forgotData?.otp) {
    throw new Error('Forgot password test failed');
  }
  console.log('✅ Forgot password OTP generated!');

  // 5. Test Reset Password
  console.log('\n5. Testing reset password with OTP...');
  const newPassword = 'NewSecretPassword456!';
  let resetStatus, resetData;
  const mockResetRes = {
    status: (s) => { resetStatus = s; return mockResetRes; },
    json: (d) => { resetData = d; return mockResetRes; }
  };
  await authController.resetPassword({
    body: {
      email: testEmail,
      otp: forgotData.otp,
      new_password: newPassword
    }
  }, mockResetRes);

  console.log('Reset status:', resetStatus);
  if (resetStatus !== 200) {
    throw new Error('Reset password test failed');
  }
  console.log('✅ Reset password succeeded!');

  // 6. Test Login with new password
  console.log('\n6. Testing login with new password...');
  let newLoginStatus, newLoginData;
  const mockNewLoginRes = {
    status: (s) => { newLoginStatus = s; return mockNewLoginRes; },
    json: (d) => { newLoginData = d; return mockNewLoginRes; }
  };
  await authController.login({
    body: {
      email: testEmail,
      password: newPassword
    },
    headers: {}
  }, mockNewLoginRes);

  if (newLoginStatus !== 200) {
    throw new Error('Login with new password failed');
  }
  console.log('✅ Login with new password succeeded!');

  // Clean up test user
  await pool.query('DELETE FROM users WHERE id = $1', [createdUserId]);
  console.log('Cleaned up test user.');
  console.log('\n🎉 ALL AUTH TESTS PASSED PERFECTLY!\n');
  await pool.end();
}

runAuthTests().catch(err => {
  console.error('Test error:', err);
  pool.end();
  process.exit(1);
});
