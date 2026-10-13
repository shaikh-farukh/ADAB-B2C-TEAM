const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { JWT_SECRET } = require('../middleware/authMiddleware');
const { ROLE_PERMISSIONS_MAP, PERMISSIONS, ADMIN_ROLES } = require('../middleware/rolesPermissions');

/**
 * Authentication Controller
 * Handles Administrator Login, Logout, and Identity (/me).
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Email and password are required'
      });
    }

    if (!pool || typeof pool.query !== 'function') {
      return res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Database connection unavailable'
      });
    }

    const userRes = await pool.query(
      'SELECT id, email, full_name, user_type, status, password_hash FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      });
    }

    const user = userRes.rows[0];

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        error: 'ACCOUNT_INACTIVE',
        message: `Account is ${user.status || 'inactive'}`
      });
    }

    if (!user.password_hash) {
      return res.status(401).json({
        success: false,
        error: 'AUTH_FAILED',
        message: 'No credentials configured for this account'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      });
    }

    // Determine Role
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
      } else if (user.email.toLowerCase() === 'superadmin@adab.com') {
        role = ADMIN_ROLES.SUPER_ADMIN;
      }
    } catch (_) {
      if (user.email.toLowerCase() === 'superadmin@adab.com') {
        role = ADMIN_ROLES.SUPER_ADMIN;
      }
    }

    // Effective Permissions
    const permissions = role === ADMIN_ROLES.SUPER_ADMIN
      ? Object.values(PERMISSIONS)
      : (ROLE_PERMISSIONS_MAP[role] || []);

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

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
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
    user: req.user
  });
}

module.exports = {
  login,
  logout,
  getMe
};
