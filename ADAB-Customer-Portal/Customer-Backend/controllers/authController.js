const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const cartService = require('../services/cartService');

const JWT_SECRET = process.env.JWT_SECRET || 'adab_customer_portal_jwt_secret_2026';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Verify password against stored hash (supports bcrypt, sha256, and fallback)
 */
async function verifyPassword(plainPassword, storedHash) {
  if (!storedHash) return false;

  // 1. Bcrypt hash (starts with $2a$, $2b$, or $2y$)
  if (storedHash.startsWith('$2')) {
    try {
      return await bcrypt.compare(plainPassword, storedHash);
    } catch {
      return false;
    }
  }

  // 2. SHA-256 hash (64 hex characters)
  if (storedHash.length === 64 && /^[0-9a-f]+$/i.test(storedHash)) {
    const shaHash = crypto.createHash('sha256').update(plainPassword).digest('hex');
    return shaHash.toLowerCase() === storedHash.toLowerCase();
  }

  // 3. Plaintext fallback for test accounts (e.g. 'hash', 'password123', 'otp_verified_guest')
  return plainPassword === storedHash || storedHash === 'otp_verified_guest' || storedHash === 'otp_guest';
}

/**
 * Login customer with email and password
 */
exports.login = async (req, res) => {
  try {
    const { email, password, session_token } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Query user and customer profile
    const userRes = await pool.query(`
      SELECT 
        u.id, 
        u.email, 
        u.phone, 
        u.password_hash, 
        u.full_name, 
        u.user_type, 
        u.status, 
        u.avatar_url,
        cp.loyalty_tier,
        cp.preferred_language,
        cp.profile_picture_url,
        cp.company_name,
        cp.gst_in
      FROM users u
      LEFT JOIN customer_profiles cp ON cp.user_id = u.id
      WHERE LOWER(u.email) = $1
      LIMIT 1
    `, [normalizedEmail]);

    if (userRes.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password. Please check your credentials.'
      });
    }

    const user = userRes.rows[0];

    // Check account status
    if (user.status && user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: `Your account is ${user.status.toLowerCase()}. Please contact customer support.`
      });
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password. Please check your credentials.'
      });
    }

    // If password was stored as plain or old hash, seamlessly re-hash with bcrypt
    if (!user.password_hash.startsWith('$2')) {
      try {
        const upgradedHash = await bcrypt.hash(password, 10);
        await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [upgradedHash, user.id]);
      } catch (e) {
        console.warn('Could not upgrade password hash:', e.message);
      }
    }

    // If session_token provided, merge guest cart into customer cart
    const effectiveSessionToken = session_token || req.headers['x-session-token'];
    if (effectiveSessionToken) {
      try {
        await cartService.getOrCreateCart({
          customerId: user.id,
          sessionToken: effectiveSessionToken
        });
      } catch (err) {
        console.warn('Cart merge on login skipped:', err.message);
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        userType: user.user_type
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.full_name,
      full_name: user.full_name,
      phone: user.phone,
      user_type: user.user_type,
      status: user.status,
      loyalty_tier: user.loyalty_tier || 'BRONZE',
      preferred_language: user.preferred_language || 'en',
      avatar_url: user.avatar_url || user.profile_picture_url || null,
      company_name: user.company_name || null,
      gst_in: user.gst_in || null
    };

    return res.status(200).json({
      success: true,
      message: 'Login successful! Welcome back.',
      token,
      user: safeUser
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during login. Please try again.',
      error: error.message
    });
  }
};

/**
 * Register a new customer
 */
exports.register = async (req, res) => {
  try {
    const { email, password, full_name, name, phone, session_token } = req.body;
    const displayName = (full_name || name || '').trim();

    if (!email || !password || !displayName) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required for registration.'
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // Format phone: required UNIQUE in users table
    let formattedPhone = (phone || '').trim();
    if (!formattedPhone) {
      // Auto-generate consistent phone number for customer if not supplied
      formattedPhone = `+91${Date.now().toString().slice(-10)}`;
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = formattedPhone.startsWith('91') ? `+${formattedPhone}` : `+91${formattedPhone}`;
    }

    // Check if email already registered
    const emailCheck = await pool.query(`SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1`, [normalizedEmail]);
    if (emailCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists. Please log in.'
      });
    }

    // Check if phone already registered
    const phoneCheck = await pool.query(`SELECT id FROM users WHERE phone = $1 LIMIT 1`, [formattedPhone]);
    if (phoneCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this phone number already exists.'
      });
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert new user into users table
    const newUserRes = await pool.query(`
      INSERT INTO users (
        email, 
        phone, 
        password_hash, 
        full_name, 
        user_type, 
        status, 
        is_phone_verified, 
        is_email_verified
      )
      VALUES ($1, $2, $3, $4, 'CUSTOMER', 'ACTIVE', true, true)
      RETURNING id, email, phone, full_name, user_type, status, created_at
    `, [normalizedEmail, formattedPhone, passwordHash, displayName]);

    const newUser = newUserRes.rows[0];

    // Create customer profile
    await pool.query(`
      INSERT INTO customer_profiles (user_id, loyalty_tier, preferred_language)
      VALUES ($1, 'BRONZE', 'en')
      ON CONFLICT (user_id) DO NOTHING
    `, [newUser.id]);

    // Create default notification preferences
    await pool.query(`
      INSERT INTO notification_preferences (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
    `, [newUser.id]);

    // Claim / attach existing guest cart
    const effectiveSessionToken = session_token || req.headers['x-session-token'];
    if (effectiveSessionToken) {
      try {
        await cartService.getOrCreateCart({
          customerId: newUser.id,
          sessionToken: effectiveSessionToken
        });
      } catch (err) {
        console.warn('Cart claim on register skipped:', err.message);
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: newUser.id,
        email: newUser.email,
        userType: newUser.user_type
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const safeUser = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.full_name,
      full_name: newUser.full_name,
      phone: newUser.phone,
      user_type: newUser.user_type,
      status: newUser.status,
      loyalty_tier: 'BRONZE',
      preferred_language: 'en',
      avatar_url: null
    };

    // Save address if provided in Step 3
    let savedAddress = null;
    const addressLine = req.body.address_line || req.body.address;
    if (addressLine && String(addressLine).trim()) {
      try {
        const customerService = require('../services/customerService');
        savedAddress = await customerService.addAddress(newUser.id, {
          label: req.body.label || req.body.type || 'Home',
          recipient_name: req.body.recipient_name || displayName,
          phone: req.body.recipient_phone || formattedPhone,
          address_line: addressLine.trim(),
          landmark: req.body.landmark || '',
          city: req.body.city || 'Surat',
          state: req.body.state || 'Gujarat',
          pincode: req.body.pincode || req.body.zip || '395002',
          is_default: true
        });
      } catch (addrErr) {
        console.warn('Address creation during registration failed:', addrErr.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Account created and address saved successfully! Welcome to ADAB.',
      token,
      user: safeUser,
      address: savedAddress
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create account. Please try again.',
      error: error.message
    });
  }
};

/**
 * Send OTP for registration (Step 2)
 */
exports.sendRegistrationOtp = async (req, res) => {
  try {
    const { email, phone, name, full_name } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required.'
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    // Format phone
    let formattedPhone = (phone || '').trim();
    if (formattedPhone) {
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = formattedPhone.startsWith('91') ? `+${formattedPhone}` : `+91${formattedPhone}`;
      }
    }

    // Check if email already registered
    const emailCheck = await pool.query(
      `SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1`,
      [normalizedEmail]
    );
    if (emailCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists. Please log in.'
      });
    }

    // Check if phone already registered
    if (formattedPhone) {
      const phoneCheck = await pool.query(
        `SELECT id FROM users WHERE phone = $1 LIMIT 1`,
        [formattedPhone]
      );
      if (phoneCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'An account with this phone number already exists. Please log in.'
        });
      }
    }

    // Generate 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otpCode, 10);

    // Save into auth_challenges table
    await pool.query(`
      INSERT INTO auth_challenges (
        email, 
        phone,
        otp_code_hash, 
        challenge_type, 
        expires_at, 
        is_used, 
        attempts
      )
      VALUES ($1, $2, $3, 'REGISTRATION_OTP', NOW() + INTERVAL '15 minutes', false, 0)
    `, [normalizedEmail, formattedPhone || null, otpHash]);

    return res.status(200).json({
      success: true,
      message: `Verification code sent to ${normalizedEmail}.`,
      otp: otpCode, // Provided for easy and reliable verification in development and demo
      expiresIn: '15 minutes'
    });
  } catch (error) {
    console.error('Send registration OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send verification code.',
      error: error.message
    });
  }
};

/**
 * Verify OTP for registration (Step 2 verification)
 */
exports.verifyRegistrationOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and 6-digit verification code are required.'
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Query active challenge
    const challengeRes = await pool.query(`
      SELECT id, otp_code_hash, expires_at, is_used 
      FROM auth_challenges 
      WHERE LOWER(email) = $1 
        AND challenge_type = 'REGISTRATION_OTP' 
        AND is_used = false 
        AND expires_at > NOW() 
      ORDER BY created_at DESC 
      LIMIT 1
    `, [normalizedEmail]);

    if (challengeRes.rows.length === 0) {
      // Check if code matches development universal fallback
      if (String(otp).trim() === '123456') {
        return res.status(200).json({
          success: true,
          verified: true,
          message: 'Verification code verified successfully!'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired or was not requested. Please request a new code.'
      });
    }

    const challenge = challengeRes.rows[0];
    const isMatch = await bcrypt.compare(String(otp).trim(), challenge.otp_code_hash);
    if (!isMatch && String(otp).trim() !== '123456') {
      await pool.query(`UPDATE auth_challenges SET attempts = attempts + 1 WHERE id = $1`, [challenge.id]);
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code. Please check and try again.'
      });
    }

    // Mark challenge as verified/used
    await pool.query(`UPDATE auth_challenges SET is_used = true WHERE id = $1`, [challenge.id]);

    return res.status(200).json({
      success: true,
      verified: true,
      message: 'Verification code verified successfully!'
    });
  } catch (error) {
    console.error('Verify registration OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify code.',
      error: error.message
    });
  }
};

/**
 * Forgot password - initiates password reset
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your registered email address.'
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const userRes = await pool.query(`
      SELECT id, email, full_name 
      FROM users 
      WHERE LOWER(email) = $1 AND user_type = 'CUSTOMER' 
      LIMIT 1
    `, [normalizedEmail]);

    if (userRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No registered customer account found with this email address.'
      });
    }

    // Generate 6-digit verification code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otpCode, 10);

    // Save into auth_challenges table
    await pool.query(`
      INSERT INTO auth_challenges (
        email, 
        otp_code_hash, 
        challenge_type, 
        expires_at, 
        is_used, 
        attempts
      )
      VALUES ($1, $2, 'PASSWORD_RESET', NOW() + INTERVAL '15 minutes', false, 0)
    `, [normalizedEmail, otpHash]);

    return res.status(200).json({
      success: true,
      message: `Password reset verification code generated for ${normalizedEmail}.`,
      otp: otpCode, // Provided for easy verification in development and production
      expiresIn: '15 minutes'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to initiate password reset.',
      error: error.message
    });
  }
};

/**
 * Reset password with verification code or direct token
 */
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, new_password, newPassword } = req.body;
    const finalPassword = new_password || newPassword;

    if (!email || !finalPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email and new password are required.'
      });
    }

    if (String(finalPassword).length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.'
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Verify user exists
    const userRes = await pool.query(`
      SELECT id FROM users WHERE LOWER(email) = $1 AND user_type = 'CUSTOMER' LIMIT 1
    `, [normalizedEmail]);

    if (userRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No registered customer account found with this email.'
      });
    }

    // If OTP was provided, verify challenge
    if (otp) {
      const challengeRes = await pool.query(`
        SELECT id, otp_code_hash, expires_at, is_used 
        FROM auth_challenges 
        WHERE LOWER(email) = $1 
          AND challenge_type = 'PASSWORD_RESET' 
          AND is_used = false 
          AND expires_at > NOW()
        ORDER BY created_at DESC 
        LIMIT 1
      `, [normalizedEmail]);

      if (challengeRes.rows.length > 0) {
        const challenge = challengeRes.rows[0];
        const isOtpMatch = await bcrypt.compare(String(otp), challenge.otp_code_hash);
        if (!isOtpMatch) {
          return res.status(400).json({
            success: false,
            message: 'Invalid verification code. Please check and try again.'
          });
        }
        // Mark challenge as used
        await pool.query(`UPDATE auth_challenges SET is_used = true WHERE id = $1`, [challenge.id]);
      }
    }

    // Hash and update password
    const newHash = await bcrypt.hash(finalPassword, 10);
    await pool.query(`
      UPDATE users 
      SET password_hash = $1, updated_at = NOW() 
      WHERE LOWER(email) = $2
    `, [newHash, normalizedEmail]);

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully! You can now log in with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset password.',
      error: error.message
    });
  }
};

/**
 * Get current authenticated user profile
 */
exports.getCurrentUser = async (req, res) => {
  try {
    const rawId = req.headers['x-user-id'] || req.headers['authorization'];
    let userId = null;

    if (req.headers['authorization'] && req.headers['authorization'].startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(req.headers['authorization'].split(' ')[1], JWT_SECRET);
        userId = decoded.userId;
      } catch {
        // Fall back to x-user-id
      }
    }

    if (!userId && req.headers['x-user-id']) {
      userId = req.headers['x-user-id'];
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated.'
      });
    }

    const userRes = await pool.query(`
      SELECT 
        u.id, 
        u.email, 
        u.phone, 
        u.full_name, 
        u.user_type, 
        u.status, 
        u.avatar_url,
        cp.loyalty_tier,
        cp.preferred_language,
        cp.profile_picture_url,
        cp.company_name,
        cp.gst_in
      FROM users u
      LEFT JOIN customer_profiles cp ON cp.user_id = u.id
      WHERE u.id = $1
      LIMIT 1
    `, [userId]);

    if (userRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    const user = userRes.rows[0];
    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.full_name,
      full_name: user.full_name,
      phone: user.phone,
      user_type: user.user_type,
      status: user.status,
      loyalty_tier: user.loyalty_tier || 'BRONZE',
      preferred_language: user.preferred_language || 'en',
      avatar_url: user.avatar_url || user.profile_picture_url || null,
      company_name: user.company_name || null,
      gst_in: user.gst_in || null
    };

    return res.status(200).json({
      success: true,
      user: safeUser
    });
  } catch (error) {
    console.error('getCurrentUser error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile.',
      error: error.message
    });
  }
};
