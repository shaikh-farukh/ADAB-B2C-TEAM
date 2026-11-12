const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { JWT_SECRET } = require('../middleware/authMiddleware');
const { ROLE_PERMISSIONS_MAP, PERMISSIONS, ADMIN_ROLES } = require('../middleware/rolesPermissions');
const {
  createOtpChallenge,
  verifyOtpChallenge,
  createPasswordResetChallenge,
  verifyPasswordResetChallenge,
  sendAdminOtpEmail,
  sendAdminPasswordResetEmail
} = require('../services/emailOtpService');

const BCRYPT_SALT_ROUNDS = 10;

const DEFAULT_SUPER_ADMINS = {
  'superadmin@adab.com': {
    phone: '+919999900000',
    first_name: 'ADAB',
    last_name: 'Super Admin',
    full_name: 'ADAB Super Admin'
  },
  'kollurdevika@gmail.com': {
    phone: '+919999900001',
    first_name: 'Devika',
    last_name: 'Kollur',
    full_name: 'Devika Kollur'
  },
  'rajesh.sharma@adab.com': {
    phone: '+919999900002',
    first_name: 'Rajesh',
    last_name: 'Sharma',
    full_name: 'Rajesh Sharma'
  }
};

let userColumnsEnsured = false;

/**
 * Ensure first_name and last_name columns exist on users table
 */
async function ensureUserColumns() {
  if (userColumnsEnsured) return;
  try {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
    `);
    userColumnsEnsured = true;
  } catch (_) { }
}

/**
 * Normalize request IP into a valid PostgreSQL INET value
 */
function getClientIp(req) {
  const rawIp = (req && (req.ip || req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress)) || '127.0.0.1';
  const firstIp = String(rawIp).split(',')[0].trim();
  if (!firstIp || firstIp === '::1') return '127.0.0.1';
  if (firstIp.startsWith('::ffff:')) return firstIp.replace('::ffff:', '');
  return firstIp;
}

/**
 * Record login / auth attempt in login_attempts table
 */
async function recordLoginAttempt(email, ipAddress, status, failureReason = null) {
  try {
    await pool.query(
      `INSERT INTO login_attempts (phone_or_email, ip_address, status, failure_reason, attempted_at)
       VALUES ($1, $2::inet, $3, $4, NOW())`,
      [email, ipAddress, status, failureReason]
    );
  } catch (_) {
    await pool.query(
      `INSERT INTO login_attempts (phone_or_email, ip_address, status, failure_reason, attempted_at)
       VALUES ($1, '127.0.0.1'::inet, $2, $3, NOW())`,
      [email, status, failureReason]
    ).catch(() => { });
  }
}

/**
 * Record authenticated admin session in sessions table
 */
async function recordAdminSession(userId, token, req) {
  const ipAddress = getClientIp(req);
  const userAgent = (req && req.headers?.['user-agent']) || 'ADAB Admin Portal Browser';
  const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');

  try {
    const res = await pool.query(
      `INSERT INTO sessions (user_id, refresh_token_hash, device_name, ip_address, user_agent, is_trusted, expires_at, created_at)
       VALUES ($1, $2, 'ADAB Admin Portal', $3::inet, $4, true, NOW() + INTERVAL '7 days', NOW())
       RETURNING id, created_at, expires_at`,
      [userId, tokenHash, ipAddress, userAgent]
    );
    return res.rows[0] || null;
  } catch (_) {
    const res = await pool.query(
      `INSERT INTO sessions (user_id, refresh_token_hash, device_name, ip_address, user_agent, is_trusted, expires_at, created_at)
       VALUES ($1, $2, 'ADAB Admin Portal', '127.0.0.1'::inet, $3, true, NOW() + INTERVAL '7 days', NOW())
       RETURNING id, created_at, expires_at`,
      [userId, tokenHash, userAgent]
    ).catch(() => ({ rows: [] }));
    return res.rows[0] || null;
  }
}

/**
 * Ensure role assignment is stored in roles & user_roles tables
 */
async function ensureAdminRoleAssignment(userId, email) {
  try {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const roleSlug = DEFAULT_SUPER_ADMINS[cleanEmail] ? 'super_admin' : 'admin';
    const roleName = DEFAULT_SUPER_ADMINS[cleanEmail] ? 'SUPER_ADMIN' : 'ADMIN';
    const roleInsert = await pool.query(
      `INSERT INTO roles (slug, name, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [roleSlug, roleName, `${roleName} role for ADAB Admin Portal`]
    );
    if (roleInsert.rows[0]?.id) {
      await pool.query(
        `INSERT INTO user_roles (user_id, role_id, assigned_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id, role_id) DO NOTHING`,
        [userId, roleInsert.rows[0].id]
      );
    }
  } catch (_) { }
}

/**
 * Resolve an active ADMIN user by email (and persist in users + user_roles tables)
 */
async function findOrPersistAdminUserByEmail(rawEmail) {
  await ensureUserColumns();
  const email = String(rawEmail || '').trim().toLowerCase();

  let userRes = await pool.query(
    'SELECT id, email, phone, first_name, last_name, full_name, password_hash, user_type, status, is_email_verified FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
    [email]
  );

  const defaultAdmin = DEFAULT_SUPER_ADMINS[email];
  if (userRes.rows.length === 0) {
    const generatedPhone = defaultAdmin?.phone || `+919${Math.floor(100000000 + Math.random() * 900000000)}`;
    const firstName = defaultAdmin?.first_name || email.split('@')[0];
    const lastName = defaultAdmin?.last_name || '';
    const displayName = defaultAdmin?.full_name || `${firstName} ${lastName}`.trim();
    const insertRes = await pool.query(
      `INSERT INTO users (email, phone, first_name, last_name, full_name, user_type, status, is_email_verified, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'ADMIN', 'ACTIVE', true, NOW(), NOW())
       ON CONFLICT (email) DO UPDATE
         SET user_type = 'ADMIN',
             status = 'ACTIVE',
             updated_at = NOW()
       RETURNING id, email, phone, first_name, last_name, full_name, password_hash, user_type, status, is_email_verified`,
      [email, generatedPhone, firstName, lastName, displayName]
    );
    userRes = insertRes;
  } else if (userRes.rows[0].user_type !== 'ADMIN' || userRes.rows[0].status !== 'ACTIVE') {
    const updateRes = await pool.query(
      `UPDATE users
       SET user_type = 'ADMIN', status = 'ACTIVE', updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, phone, first_name, last_name, full_name, password_hash, user_type, status, is_email_verified`,
      [userRes.rows[0].id]
    );
    userRes = updateRes;
  }

  const user = userRes.rows[0] || null;
  if (user) {
    await ensureAdminRoleAssignment(user.id, email);
  }

  return user;
}

/**
 * Resolve role and effective permissions for an Admin user
 */
async function resolveAdminRoleAndPermissions(user) {
  const emailLower = String(user.email || '').toLowerCase();
  let role = ADMIN_ROLES.ADMIN;

  try {
    const roleRes = await pool.query(
      'SELECT r.slug, r.name FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = $1 LIMIT 1',
      [user.id]
    );
    if (roleRes.rows.length > 0) {
      const r = roleRes.rows[0];
      if (r.slug === 'super_admin' || r.name === 'SUPER_ADMIN') {
        role = ADMIN_ROLES.SUPER_ADMIN;
      } else {
        role = r.name || r.slug.toUpperCase();
      }
    } else if (DEFAULT_SUPER_ADMINS[emailLower]) {
      role = ADMIN_ROLES.SUPER_ADMIN;
    }
  } catch (_) {
    if (DEFAULT_SUPER_ADMINS[emailLower]) {
      role = ADMIN_ROLES.SUPER_ADMIN;
    }
  }

  const permissions =
    role === ADMIN_ROLES.SUPER_ADMIN
      ? Object.values(PERMISSIONS)
      : ROLE_PERMISSIONS_MAP[role] || Object.values(PERMISSIONS);

  return { role, permissions };
}

/**
 * Helper to issue JWT + record session for an authenticated admin user
 */
async function issueAdminAuthResponse(user, req, res, message = 'Login successful', statusCode = 200) {
  const { role, permissions } = await resolveAdminRoleAndPermissions(user);

  const firstName = user.first_name || (user.full_name ? user.full_name.split(' ')[0] : '');
  const lastName = user.last_name || (user.full_name ? user.full_name.split(' ').slice(1).join(' ') : '');

  const tokenPayload = {
    userId: user.id,
    id: user.id,
    email: user.email,
    first_name: firstName,
    last_name: lastName,
    full_name: user.full_name,
    user_type: user.user_type,
    role,
    permissions
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });
  const session = await recordAdminSession(user.id, token, req);

  return res.status(statusCode).json({
    success: true,
    message,
    token,
    sessionId: session?.id || null,
    user: {
      id: user.id,
      email: user.email,
      first_name: firstName,
      last_name: lastName,
      full_name: user.full_name,
      user_type: user.user_type,
      role,
      permissions
    }
  });
}

/**
 * POST /api/v1/auth/signup
 * Admin Sign Up: First Name, Last Name, Email, Password
 */
async function signup(req, res) {
  try {
    await ensureUserColumns();

    const rawFirstName = req.body?.first_name ?? req.body?.firstName ?? '';
    const rawLastName = req.body?.last_name ?? req.body?.lastName ?? '';
    const rawEmail = req.body?.email ?? '';
    const rawPassword = req.body?.password ?? '';

    const firstName = String(rawFirstName).trim();
    const lastName = String(rawLastName).trim();
    const email = String(rawEmail).trim().toLowerCase();
    const password = String(rawPassword);

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'First name, last name, email, and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'WEAK_PASSWORD',
        message: 'Password must be at least 6 characters long'
      });
    }

    const fullName = `${firstName} ${lastName}`.trim();
    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    const defaultAdmin = DEFAULT_SUPER_ADMINS[email];
    const generatedPhone = defaultAdmin?.phone || `+919${Math.floor(100000000 + Math.random() * 900000000)}`;

    const existingRes = await pool.query(
      'SELECT id, email, password_hash FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email]
    );

    let user;
    if (existingRes.rows.length > 0) {
      const updateRes = await pool.query(
        `UPDATE users
         SET first_name = $1,
             last_name = $2,
             full_name = $3,
             password_hash = $4,
             user_type = 'ADMIN',
             status = 'ACTIVE',
             is_email_verified = true,
             updated_at = NOW()
         WHERE id = $5
         RETURNING id, email, phone, first_name, last_name, full_name, user_type, status, is_email_verified`,
        [firstName, lastName, fullName, passwordHash, existingRes.rows[0].id]
      );
      user = updateRes.rows[0];
    } else {
      const insertRes = await pool.query(
        `INSERT INTO users (email, phone, first_name, last_name, full_name, password_hash, user_type, status, is_email_verified, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'ADMIN', 'ACTIVE', true, NOW(), NOW())
         RETURNING id, email, phone, first_name, last_name, full_name, user_type, status, is_email_verified`,
        [email, generatedPhone, firstName, lastName, fullName, passwordHash]
      );
      user = insertRes.rows[0];
    }

    await ensureAdminRoleAssignment(user.id, user.email);
    await recordLoginAttempt(user.email, getClientIp(req), 'SUCCESS', null);

    return issueAdminAuthResponse(user, req, res, 'Admin account registered successfully', 201);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message
    });
  }
}

/**
 * POST /api/v1/auth/login
 * Supports Email + Password login (and delegates to verifyOtp if otp is provided)
 */
async function login(req, res) {
  try {
    if (req.body && req.body.otp) {
      return verifyOtp(req, res);
    }

    await ensureUserColumns();
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Email and password are required'
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const ipAddress = getClientIp(req);

    const userRes = await pool.query(
      'SELECT id, email, phone, first_name, last_name, full_name, password_hash, user_type, status, is_email_verified FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [cleanEmail]
    );

    if (userRes.rows.length === 0) {
      await recordLoginAttempt(cleanEmail, ipAddress, 'OTP_FAILED', 'USER_NOT_FOUND');
      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password. Please Sign Up if you do not have an account.'
      });
    }

    const user = userRes.rows[0];

    if (String(user.user_type || '').toUpperCase() !== 'ADMIN') {
      await recordLoginAttempt(cleanEmail, ipAddress, 'BLOCKED', 'FORBIDDEN_PORTAL');
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN_PORTAL',
        message: 'Access denied. Account does not have administrator privileges.'
      });
    }

    if (user.status !== 'ACTIVE') {
      await recordLoginAttempt(cleanEmail, ipAddress, 'BLOCKED', 'ACCOUNT_INACTIVE');
      return res.status(403).json({
        success: false,
        error: 'ACCOUNT_INACTIVE',
        message: `Account is ${user.status || 'inactive'}`
      });
    }

    if (!user.password_hash) {
      await recordLoginAttempt(cleanEmail, ipAddress, 'OTP_FAILED', 'NO_PASSWORD_SET');
      return res.status(401).json({
        success: false,
        error: 'NO_PASSWORD_SET',
        message: 'No password is set for this email yet. Please use Forgot Password or Sign Up to set your password, or sign in with Email OTP (2-Step).'
      });
    }

    const isMatch = await bcrypt.compare(String(password), user.password_hash);
    if (!isMatch) {
      await recordLoginAttempt(cleanEmail, ipAddress, 'OTP_FAILED', 'INVALID_PASSWORD');
      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      });
    }

    await recordLoginAttempt(user.email, ipAddress, 'SUCCESS', null);
    return issueAdminAuthResponse(user, req, res, 'Login successful', 200);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message
    });
  }
}

/**
 * POST /api/v1/auth/otp/request
 * Step 1 of Admin Portal Email OTP (2-Step) Login: Store Admin in DB, create OTP challenge, and send email
 */
async function requestOtp(req, res) {
  try {
    const { email } = req.body || {};
    if (!email || !String(email).trim()) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Administrator email address is required'
      });
    }

    if (!pool || typeof pool.query !== 'function') {
      return res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Database connection unavailable'
      });
    }

    const user = await findOrPersistAdminUserByEmail(email);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'ADMIN_NOT_FOUND',
        message: 'No administrator account found with this email address'
      });
    }

    const { otp, expiryMinutes } = await createOtpChallenge(user.email);
    const emailResult = await sendAdminOtpEmail(
      user.email,
      otp,
      user.full_name || 'Administrator',
      expiryMinutes
    );

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        error: emailResult.code || 'EMAIL_SEND_FAILED',
        message: emailResult.message || 'Failed to send OTP email to your inbox.'
      });
    }

    return res.status(200).json({
      success: true,
      message: `A 6-digit verification code has been sent to ${user.email}`,
      data: {
        userId: user.id,
        email: user.email,
        expiresInMinutes: expiryMinutes
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message
    });
  }
}

/**
 * POST /api/v1/auth/otp/verify
 * Step 2 of Admin Portal Email OTP (2-Step) Login: Verify OTP, record login_attempts & sessions in DB, and issue JWT
 */
async function verifyOtp(req, res) {
  try {
    const { email, otp } = req.body || {};
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Email and 6-digit OTP verification code are required'
      });
    }

    const cleanOtp = String(otp).trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_OTP_FORMAT',
        message: 'Verification code must be a 6-digit number'
      });
    }

    const ipAddress = getClientIp(req);
    const user = await findOrPersistAdminUserByEmail(email);

    if (!user) {
      await recordLoginAttempt(String(email).trim().toLowerCase(), ipAddress, 'OTP_FAILED', 'ADMIN_NOT_FOUND');
      return res.status(401).json({
        success: false,
        error: 'ADMIN_NOT_FOUND',
        message: 'No administrator account found with this email'
      });
    }

    const verification = await verifyOtpChallenge(user.email, cleanOtp);
    if (!verification.valid) {
      await recordLoginAttempt(user.email, ipAddress, 'OTP_FAILED', verification.code || 'INVALID_OTP');
      return res.status(401).json({
        success: false,
        error: verification.code || 'INVALID_OTP',
        message: verification.message
      });
    }

    await pool.query(
      'UPDATE users SET is_email_verified = true, updated_at = NOW() WHERE id = $1',
      [user.id]
    );

    await recordLoginAttempt(user.email, ipAddress, 'SUCCESS', null);

    return issueAdminAuthResponse(user, req, res, 'OTP verified. Admin login successful', 200);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message
    });
  }
}

/**
 * POST /api/v1/auth/forgot-password
 * Step 1 of Forgot Password: Store PASSWORD_RESET challenge in auth_challenges & send reset email
 */
async function forgotPassword(req, res) {
  try {
    const { email, origin } = req.body || {};
    if (!email || !String(email).trim()) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Please enter your email address'
      });
    }

    const user = await findOrPersistAdminUserByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'ADMIN_NOT_FOUND',
        message: 'No administrator account found with this email address'
      });
    }

    const { challengeId, otp: resetCode, expiryMinutes } = await createPasswordResetChallenge(user.email);
    const frontendOrigin = origin || req.headers?.origin || process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendOrigin.replace(/\/$/, '')}/reset-password?email=${encodeURIComponent(user.email)}&code=${encodeURIComponent(resetCode)}`;

    const emailResult = await sendAdminPasswordResetEmail(
      user.email,
      resetCode,
      resetUrl,
      user.full_name || 'Administrator',
      expiryMinutes
    );

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        error: emailResult.code || 'EMAIL_SEND_FAILED',
        message: emailResult.message || 'Failed to send password reset email'
      });
    }

    return res.status(200).json({
      success: true,
      message: `Password reset instructions and a 6-digit reset code have been sent to ${user.email}`,
      data: {
        challengeId,
        email: user.email,
        expiresInMinutes: expiryMinutes
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message
    });
  }
}

/**
 * POST /api/v1/auth/reset-password
 * Step 2 of Forgot Password: Verify PASSWORD_RESET code in auth_challenges and update password_hash in users
 */
async function resetPassword(req, res) {
  try {
    await ensureUserColumns();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const code = String(req.body?.code || req.body?.otp || '').trim();
    const newPassword = String(req.body?.new_password || req.body?.newPassword || req.body?.password || '');
    const ipAddress = getClientIp(req);

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Email, 6-digit reset code, and new password are required'
      });
    }

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_OTP_FORMAT',
        message: 'Reset code must be a 6-digit number'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'WEAK_PASSWORD',
        message: 'New password must be at least 6 characters long'
      });
    }

    const user = await findOrPersistAdminUserByEmail(email);
    if (!user) {
      await recordLoginAttempt(email, ipAddress, 'OTP_FAILED', 'RESET_USER_NOT_FOUND');
      return res.status(404).json({
        success: false,
        error: 'ADMIN_NOT_FOUND',
        message: 'No administrator account found with this email'
      });
    }

    const verification = await verifyPasswordResetChallenge(user.email, code);
    if (!verification.valid) {
      await recordLoginAttempt(user.email, ipAddress, 'OTP_FAILED', verification.code || 'INVALID_RESET_CODE');
      return res.status(401).json({
        success: false,
        error: verification.code || 'INVALID_RESET_CODE',
        message: verification.message
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
    await pool.query(
      `UPDATE users
       SET password_hash = $1,
           is_email_verified = true,
           updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, user.id]
    );

    await recordLoginAttempt(user.email, ipAddress, 'SUCCESS', 'PASSWORD_RESET_COMPLETED');

    return res.status(200).json({
      success: true,
      message: 'Your password has been reset and saved in the database. Please sign in with your new password.'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message
    });
  }
}

async function logout(req, res) {
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
}

async function getMe(req, res) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHENTICATED',
      message: 'Authentication token required'
    });
  }
  return res.status(200).json({
    success: true,
    user: req.user,
    data: req.user
  });
}

module.exports = {
  signup,
  login,
  requestOtp,
  verifyOtp,
  forgotPassword,
  resetPassword,
  logout,
  getMe
};
