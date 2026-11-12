const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { JWT_SECRET } = require('../middleware/authMiddleware');
const { ROLE_PERMISSIONS_MAP, PERMISSIONS, ADMIN_ROLES } = require('../middleware/rolesPermissions');
const {
  createOtpChallenge,
  verifyOtpChallenge,
  sendAdminOtpEmail
} = require('../services/emailOtpService');

const DEFAULT_SUPER_ADMINS = {
  'superadmin@adab.com': {
    phone: '+919999900000',
    full_name: 'ADAB Super Admin'
  },
  'kollurdevika@gmail.com': {
    phone: '+919999900001',
    full_name: 'Devika Kollur'
  },
  'rajesh.sharma@adab.com': {
    phone: '+919999900002',
    full_name: 'Rajesh Sharma'
  }
};

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
 * Record login attempt in login_attempts table
 */
async function recordLoginAttempt(email, ipAddress, status, failureReason = null) {
  try {
    await pool.query(
      `INSERT INTO login_attempts (phone_or_email, ip_address, status, failure_reason, attempted_at)
       VALUES ($1, $2::inet, $3, $4, NOW())`,
      [email, ipAddress, status, failureReason]
    );
  } catch (err) {
    // Fallback to 127.0.0.1 if ipAddress format was non-standard
    await pool.query(
      `INSERT INTO login_attempts (phone_or_email, ip_address, status, failure_reason, attempted_at)
       VALUES ($1, '127.0.0.1'::inet, $2, $3, NOW())`,
      [email, status, failureReason]
    ).catch(() => {});
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
 * Resolve an active ADMIN user by email (and persist in users + user_roles tables)
 */
async function findOrPersistAdminUserByEmail(rawEmail) {
  const email = String(rawEmail || '').trim().toLowerCase();

  let userRes = await pool.query(
    'SELECT id, email, phone, full_name, user_type, status, is_email_verified FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
    [email]
  );

  const defaultAdmin = DEFAULT_SUPER_ADMINS[email];
  if (userRes.rows.length === 0) {
    const generatedPhone = defaultAdmin?.phone || `+919${Math.floor(100000000 + Math.random() * 900000000)}`;
    const displayName = defaultAdmin?.full_name || email.split('@')[0];
    const insertRes = await pool.query(
      `INSERT INTO users (email, phone, full_name, user_type, status, is_email_verified, created_at, updated_at)
       VALUES ($1, $2, $3, 'ADMIN', 'ACTIVE', true, NOW(), NOW())
       ON CONFLICT (email) DO UPDATE
         SET user_type = 'ADMIN',
             status = 'ACTIVE',
             updated_at = NOW()
       RETURNING id, email, phone, full_name, user_type, status, is_email_verified`,
      [email, generatedPhone, displayName]
    );
    userRes = insertRes;
  } else if (userRes.rows[0].user_type !== 'ADMIN' || userRes.rows[0].status !== 'ACTIVE') {
    const updateRes = await pool.query(
      `UPDATE users
       SET user_type = 'ADMIN', status = 'ACTIVE', updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, phone, full_name, user_type, status, is_email_verified`,
      [userRes.rows[0].id]
    );
    userRes = updateRes;
  }

  const user = userRes.rows[0] || null;
  if (user) {
    // Ensure role assignment is stored in roles & user_roles tables
    try {
      const roleSlug = DEFAULT_SUPER_ADMINS[email] ? 'super_admin' : 'admin';
      const roleName = DEFAULT_SUPER_ADMINS[email] ? 'SUPER_ADMIN' : 'ADMIN';
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
          [user.id, roleInsert.rows[0].id]
        );
      }
    } catch (_) {}
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
 * POST /api/v1/auth/otp/request
 * Step 1 of Admin Portal Email OTP Login: Store Admin in DB, create OTP challenge, and send email
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
 * Step 2 of Admin Portal Email OTP Login: Verify OTP, record login_attempts & sessions in DB, and issue JWT
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

    // 1. Update users table (mark email verified and update timestamp)
    await pool.query(
      'UPDATE users SET is_email_verified = true, updated_at = NOW() WHERE id = $1',
      [user.id]
    );

    // 2. Record successful login in login_attempts table
    await recordLoginAttempt(user.email, ipAddress, 'SUCCESS', null);

    // 3. Resolve Role & Permissions
    const { role, permissions } = await resolveAdminRoleAndPermissions(user);

    const tokenPayload = {
      userId: user.id,
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      user_type: user.user_type,
      role,
      permissions
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    // 4. Persist session record in sessions table
    const session = await recordAdminSession(user.id, token, req);

    return res.status(200).json({
      success: true,
      message: 'OTP verified. Admin login successful',
      token,
      sessionId: session?.id || null,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        user_type: user.user_type,
        role,
        permissions
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
 * POST /api/v1/auth/login
 * Redirects/delegates to Email OTP verification (Password login is disabled on Admin Portal)
 */
async function login(req, res) {
  if (req.body && req.body.otp) {
    return verifyOtp(req, res);
  }
  return res.status(400).json({
    success: false,
    error: 'OTP_LOGIN_REQUIRED',
    message: 'Admin Portal requires Email OTP authentication. Please request an OTP at /api/v1/auth/otp/request.'
  });
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
  requestOtp,
  verifyOtp,
  login,
  logout,
  getMe
};
