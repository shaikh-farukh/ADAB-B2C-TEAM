import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { generateOTP, saveOTP, verifyOTP as verifyOTPService } from '../services/otpService.js';
import { sendOTPEmail, sendPasswordResetEmail } from '../services/emailOtpService.js';
import pool from '../Config/database.js';
import formatUserResponse from '../Helpers/formatUserResponse.js';

// ─── CONFIGURATION ──────────────────────────────────────────────
if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set. Server cannot start.');
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh_secret_fallback';
const JWT_EXPIRES_IN = '1h'; // Short lived access token
const JWT_REFRESH_EXPIRES_IN = '7d';
const BCRYPT_SALT_ROUNDS = 12;

// ─── SIGNUP ─────────────────────────────────────────────────────
const signup = async (req, res) => {
  try {
    const email = req.body.email.toLowerCase();
    const { full_name, mobile, company_name, role, password } = req.body;

    const normalizedRole = role.toLowerCase();

    if (normalizedRole === 'shop') {
      return res.status(403).json({
        success: false,
        message: 'Shop registration is no longer available.'
      });
    }

    if (normalizedRole !== 'manufacturer' && normalizedRole !== 'distributor') {
      return res.status(400).json({
        success: false,
        message: 'Invalid registration role. Only Manufacturer and Distributor are allowed.'
      });
    }

    // Check if user already exists
    const existingUserQuery = `SELECT id FROM manage_b_to_b_userdetail WHERE email = $1 AND deleted_at IS NULL`;
    const existingUser = await pool.query(existingUserQuery, [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Get role ID
    const typeQuery = await pool.query(
      "SELECT id FROM manage_b_to_b_user_type WHERE LOWER(typename) = $1 LIMIT 1",
      [role.toLowerCase()]
    );

    if (typeQuery.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid registration role'
      });
    }

    const business_type_id = typeQuery.rows[0].id;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // Insert user
    const insertQuery = `
      INSERT INTO manage_b_to_b_userdetail (
        company_name, business_type_id, email, mobile, 
        owner_name, password, active, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP)
      RETURNING id, company_name, email, owner_name
    `;

    const result = await pool.query(insertQuery, [
      company_name,
      business_type_id,
      email,
      mobile,
      full_name,
      hashedPassword
    ]);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        id: result.rows[0].id,
        email: result.rows[0].email,
        company_name: result.rows[0].company_name
      }
    });

  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ─── LOGIN ──────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const email = req.body.email.toLowerCase();
    const { password } = req.body;

    let user = null;
    let roleName = null;

    // Find user by email with role
    const userQuery = `
      SELECT u.*, bt.typename as business_type_name
      FROM manage_b_to_b_userdetail u
      LEFT JOIN manage_b_to_b_user_type bt ON u.business_type_id = bt.id
      WHERE u.email = $1 AND u.deleted_at IS NULL
    `;

    const result = await pool.query(userQuery, [email]);

    if (result.rows.length > 0) {
      user = result.rows[0];
      roleName = user.business_type_name ? user.business_type_name.toLowerCase() : null;
    } else {
      // Check shopdetail
      const shopQuery = `
        SELECT * FROM shopdetail WHERE email_id = $1 AND delete_at IS NULL
      `;
      const shopResult = await pool.query(shopQuery, [email]);
      if (shopResult.rows.length > 0) {
        user = shopResult.rows[0];
        roleName = 'shop';
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if account is active
    const isActive = roleName === 'shop' ? (user.active == 1) : user.active;
    if (!isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password || '');

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT tokens
    const token = jwt.sign(
      {
        userId: user.id,
        email: roleName === 'shop' ? user.email_id : user.email,
        role: roleName,
        companyName: roleName === 'shop' ? user.shop_name : user.company_name
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, role: roleName },
      JWT_REFRESH_SECRET,
      { expiresIn: JWT_REFRESH_EXPIRES_IN }
    );

    if (roleName !== 'shop') {
      await pool.query(
        'UPDATE manage_b_to_b_userdetail SET refresh_token = $1 WHERE id = $2',
        [refreshToken, user.id]
      );
    }

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1 * 60 * 60 * 1000 // 1 hour matching JWT_EXPIRES_IN
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: formatUserResponse(user),
        // token is no longer needed in body, but keep for backward compatibility if needed temporarily
        token 
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ─── GET PROFILE ────────────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;

    if (role === 'shop') {
      const query = `
        SELECT id, shop_name as company_name, email_id as email, mobile_no as mobile,
               first_name as owner_name, gst_id as gst_number, shop_address as address,
               fk_city, fk_state, fk_country, latitude, longitude, active
        FROM shopdetail
        WHERE id = $1 AND delete_at IS NULL
      `;
      const result = await pool.query(query, [userId]);
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Shop not found'
        });
      }
      return res.status(200).json({
        success: true,
        data: {
          ...result.rows[0],
          role: 'shop',
          business_type_name: 'Shop'
        }
      });
    }

    const query = `
      SELECT u.id, u.company_name, u.business_type_id, bt.typename as business_type_name,
             u.gst_number, u.address, u.country, u.email, u.mobile,
             u.owner_name, u.owner_name as contact_person, u.age, u.gender,
             u.personal_contact, u.personal_email, u.created_at, u.active,
             u.city, u.state, u.pan_number, u.company_logo,
             u.international_business, u.wish_to_export_countries, u.fk_city, u.fk_state,
             u.latitude, u.longitude, u.vat_number, u.export_hs_code,
             u.preferred_currency, u.market_scope
      FROM manage_b_to_b_userdetail u
      LEFT JOIN manage_b_to_b_user_type bt ON u.business_type_id = bt.id
      WHERE u.id = $1 AND u.deleted_at IS NULL
    `;

    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
};

// ─── REQUEST OTP ────────────────────────────────────────────────
const requestOTP = async (req, res) => {
  try {
    const email = req.body.email.toLowerCase();

    // Find user by email
    const userQuery = `
      SELECT id, email, company_name, active
      FROM manage_b_to_b_userdetail
      WHERE email = $1 AND deleted_at IS NULL
    `;

    const result = await pool.query(userQuery, [email]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this email'
      });
    }

    const user = result.rows[0];

    if (!user.active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.'
      });
    }

    // Generate and save OTP (OTP is hashed before saving to DB)
    const otp = generateOTP();
    await saveOTP(user.id, otp);

    // Send plain-text OTP to user's email (hashed version is stored in DB)
    const emailResult = await sendOTPEmail(user.email, otp, user.company_name);

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please try again.'
      });
    }

    // In development, log OTP to console
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n🔐 OTP for ${email}: ${otp}`);
      console.log(`⏰ Expires in ${process.env.OTP_EXPIRY_MINUTES || 5} minutes\n`);
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully to your email',
      data: {
        email: user.email,
        expiresIn: `${process.env.OTP_EXPIRY_MINUTES || 5} minutes`
      }
    });

  } catch (error) {
    console.error('Request OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ─── VERIFY OTP ─────────────────────────────────────────────────
const verifyOTP = async (req, res) => {
  try {
    const email = req.body.email.toLowerCase();
    const { otp } = req.body;

    // Verify OTP via service (compares against bcrypt hash in DB)
    const verificationResult = await verifyOTPService(email, otp);

    if (!verificationResult.success) {
      return res.status(400).json({
        success: false,
        message: verificationResult.message
      });
    }

    // Get user details for token generation
    const userQuery = `
      SELECT u.*, bt.typename as business_type_name
      FROM manage_b_to_b_userdetail u
      LEFT JOIN manage_b_to_b_user_type bt ON u.business_type_id = bt.id
      WHERE u.id = $1 AND u.deleted_at IS NULL
    `;

    const result = await pool.query(userQuery, [verificationResult.userId]);

    // Safety check — user could be deleted between OTP request and verification
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    // Generate JWT token — role included to reduce DB queries on protected routes
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.business_type_name ? user.business_type_name.toLowerCase() : null,
        companyName: user.company_name
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1 * 60 * 60 * 1000 // 1 hour
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: formatUserResponse(user),
        token
      }
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'OTP verification failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ─── UPDATE PROFILE ─────────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;

    if (role === 'shop') {
      const allowedFields = ['company_name', 'gst_number', 'address', 'mobile', 'latitude', 'longitude', 'fk_city', 'fk_state'];
      const fieldMap = {
        company_name: 'shop_name',
        gst_number: 'gst_id',
        address: 'shop_address',
        mobile: 'mobile_no'
      };

      const updates = {};
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          const dbField = fieldMap[field] || field;
          updates[dbField] = req.body[field];
        }
      });

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid fields to update'
        });
      }

      const setClauses = Object.keys(updates)
        .map((key, index) => `${key} = $${index + 1}`)
        .join(', ');

      const paramCount = Object.keys(updates).length;
      const values = [...Object.values(updates), userId, userId];

      const query = `
        UPDATE shopdetail
        SET ${setClauses}, modify_at = CURRENT_TIMESTAMP, modify_by = $${paramCount + 1}
        WHERE id = $${paramCount + 2} AND delete_at IS NULL
        RETURNING id, shop_name as company_name, email_id as email, mobile_no as mobile, gst_id as gst_number, shop_address as address
      `;

      const result = await pool.query(query, values);
      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: result.rows[0]
      });
    }

    const allowedFields = [
      'company_name', 'gst_number', 'address', 'country', 'mobile',
      'company_logo', 'age', 'gender', 'personal_contact', 'contact_person', 'owner_name',
      'personal_email', 'email', 'international_business', 'wish_to_export_countries',
      'fk_city', 'fk_state', 'latitude', 'longitude',
      'vat_number', 'export_hs_code', 'preferred_currency', 'market_scope',
      'pan_number', 'city', 'state'
    ];

    // Build update object with only provided fields
    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'contact_person') {
          updates['owner_name'] = req.body[field];
        } else {
          updates[field] = req.body[field];
        }
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    // Build dynamic SQL with separate params for modified_by and WHERE id
    const setClauses = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');

    const paramCount = Object.keys(updates).length;
    const values = [...Object.values(updates), userId];

    const query = `
      UPDATE manage_b_to_b_userdetail
      SET ${setClauses}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount + 1} AND deleted_at IS NULL
      RETURNING id, company_name, email, mobile, gst_number, address, country, 
                international_business, wish_to_export_countries, fk_city, fk_state, latitude, longitude,
                vat_number, export_hs_code, preferred_currency, market_scope,
                pan_number, city, state, company_logo
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ─── FORGOT PASSWORD ────────────────────────────────────────────
const forgotPassword = async (req, res) => {
  try {
    const email = req.body.email.toLowerCase();

    // Find user by email
    const userQuery = `
      SELECT id, email, company_name, owner_name
      FROM manage_b_to_b_userdetail
      WHERE email = $1 AND deleted_at IS NULL AND active = true
    `;

    const result = await pool.query(userQuery, [email]);

    // Always return success message (security best practice — don't reveal if email exists)
    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset link has been sent.'
      });
    }

    const user = result.rows[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    // Store hashed reset token
    await pool.query(
      'UPDATE manage_b_to_b_userdetail SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
      [hashedToken, expiresAt, user.id]
    );

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    // Send email
    const emailResult = await sendPasswordResetEmail(user.email, resetUrl, user.company_name || user.owner_name);

    if (!emailResult.success) {
      console.error('Failed to send email:', emailResult.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send reset email. Please try again.'
      });
    }

    // In development, log the token
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n🔐 Password Reset Token: ${resetToken}`);
      console.log(`🔗 Reset URL: ${resetUrl}`);
      console.log(`⏰ Expires in 1 hour\n`);
    }

    res.status(200).json({
      success: true,
      message: 'If the email exists, a password reset link has been sent.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ─── RESET PASSWORD ─────────────────────────────────────────────
const resetPassword = async (req, res) => {
  try {
    const { token, new_password } = req.body;

    // Hash the token to compare with database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid reset token
    const userQuery = `
      SELECT id, email, company_name
      FROM manage_b_to_b_userdetail
      WHERE reset_token = $1 
        AND reset_token_expires > CURRENT_TIMESTAMP
        AND deleted_at IS NULL
        AND active = true
    `;

    const result = await pool.query(userQuery, [hashedToken]);

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    const user = result.rows[0];

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, BCRYPT_SALT_ROUNDS);

    // Update password and clear reset token
    await pool.query(
      `UPDATE manage_b_to_b_userdetail
       SET password = $1, 
           reset_token = NULL, 
           reset_token_expires = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [hashedPassword, user.id]
    );

    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ─── CHANGE PASSWORD (authenticated) ────────────────────────────
const changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { current_password, new_password } = req.body;

    // Get current password hash
    const userQuery = `
      SELECT id, password
      FROM manage_b_to_b_userdetail
      WHERE id = $1 AND deleted_at IS NULL AND active = true
    `;

    const result = await pool.query(userQuery, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password);

    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Prevent reusing the same password
    const isSamePassword = await bcrypt.compare(new_password, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password'
      });
    }

    // Hash and update
    const hashedPassword = await bcrypt.hash(new_password, BCRYPT_SALT_ROUNDS);

    await pool.query(
      `UPDATE manage_b_to_b_userdetail
       SET password = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [hashedPassword, userId]
    );

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ─── LOGOUT ─────────────────────────────────────────────────────
const logout = async (req, res) => {
  // NOTE: JWT is stateless — full server-side token invalidation requires
  // a token blacklist or token_version column in the database.
  // Current implementation: client removes the token from storage.
  // Future: Add token_version to users table and increment on logout.
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully. Please remove the token from client storage.'
  });
};

// ─── DELETE ACCOUNT (soft delete) ───────────────────────────────
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { password } = req.body;

    // Verify user exists and get password
    const userQuery = `
      SELECT id, password, email
      FROM manage_b_to_b_userdetail
      WHERE id = $1 AND deleted_at IS NULL AND active = true
    `;

    const result = await pool.query(userQuery, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    // Confirm password before deletion
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password. Account deletion requires password confirmation.'
      });
    }

    // Soft delete — mark as deleted and deactivate
    await pool.query(
      `UPDATE manage_b_to_b_userdetail
       SET deleted_at = CURRENT_TIMESTAMP,
           deleted_by = $1, 
           active = false
       WHERE id = $1`,
      [userId]
    );

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ─── REFRESH TOKEN ──────────────────────────────────────────────
const refreshToken = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.status(401).json({ success: false, message: 'Refresh token required' });

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    if (decoded.role === 'shop') {
      // Simplified for shop
      const token = jwt.sign(
        { userId: decoded.userId, role: 'shop' },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 1 * 60 * 60 * 1000 // 1 hour
      });
      return res.status(200).json({ success: true, token });
    }

    const result = await pool.query('SELECT refresh_token FROM manage_b_to_b_userdetail WHERE id = $1', [decoded.userId]);
    if (result.rows.length === 0 || result.rows[0].refresh_token !== refreshToken) {
      return res.status(403).json({ success: false, message: 'Invalid refresh token' });
    }

    const token = jwt.sign(
      { userId: decoded.userId, role: decoded.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1 * 60 * 60 * 1000 // 1 hour
    });

    res.status(200).json({ success: true, token });
  } catch (error) {
    res.status(403).json({ success: false, message: 'Invalid or expired refresh token' });
  }
};

// ─── GOOGLE OAUTH ───────────────────────────────────────────────
import { OAuth2Client } from 'google-auth-library';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const googleLogin = async (req, res) => {
  try {
    const { idToken, access_token } = req.body;
    let email = '';
    let googleId = '';

    if (idToken) {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      email = payload.email.toLowerCase();
      googleId = payload.sub;
    } else if (access_token) {
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      if (!userInfoResponse.ok) {
        throw new Error('Failed to fetch user info from Google');
      }
      const data = await userInfoResponse.json();
      email = data.email.toLowerCase();
      googleId = data.sub;
    } else {
      return res.status(400).json({ success: false, message: 'Google token required' });
    }

    // Check if user exists
    let userQuery = `
      SELECT u.*, bt.typename as business_type_name
      FROM manage_b_to_b_userdetail u
      LEFT JOIN manage_b_to_b_user_type bt ON u.business_type_id = bt.id
      WHERE u.email = $1 AND u.deleted_at IS NULL
    `;
    let result = await pool.query(userQuery, [email]);
    
    let user = null;
    let roleName = null;

    if (result.rows.length > 0) {
      user = result.rows[0];
      roleName = user.business_type_name ? user.business_type_name.toLowerCase() : null;
    } else {
      // Check shopdetail
      const shopQuery = `SELECT * FROM shopdetail WHERE email_id = $1 AND delete_at IS NULL`;
      const shopResult = await pool.query(shopQuery, [email]);
      if (shopResult.rows.length > 0) {
        user = shopResult.rows[0];
        roleName = 'shop';
      }
    }

    if (!user) {
      if (req.body.action === 'signup') {
        const role = req.body.role || 'manufacturer';
        const typeQuery = await pool.query(
          "SELECT id FROM manage_b_to_b_user_type WHERE LOWER(typename) = $1 LIMIT 1",
          [role.toLowerCase()]
        );
        if (typeQuery.rows.length === 0) {
          return res.status(400).json({ success: false, message: 'Invalid registration role for Google Signup.' });
        }
        const business_type_id = typeQuery.rows[0].id;
        const owner_name = email.split('@')[0];
        const company_name = owner_name + ' Company';
        
        const insertQuery = `
          INSERT INTO manage_b_to_b_userdetail (
            company_name, business_type_id, email, mobile, 
            owner_name, password, active, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP)
          RETURNING *
        `;
        const randomPass = crypto.randomBytes(16).toString('hex');
        const hashedPassword = await bcrypt.hash(randomPass, 12);
        
        const newResult = await pool.query(insertQuery, [
          company_name, business_type_id, email, '', owner_name, hashedPassword
        ]);
        
        user = newResult.rows[0];
        roleName = role.toLowerCase();
      } else {
        return res.status(404).json({ success: false, message: 'User not registered. Please sign up first.' });
      }
    }

    const isActive = roleName === 'shop' ? (user.active == 1) : user.active;
    if (!isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Please contact administrator.' });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: roleName === 'shop' ? user.email_id : user.email,
        role: roleName,
        companyName: roleName === 'shop' ? user.shop_name : user.company_name
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const refreshToken = jwt.sign({ userId: user.id, role: roleName }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
    
    if (roleName !== 'shop') {
      await pool.query('UPDATE manage_b_to_b_userdetail SET refresh_token = $1 WHERE id = $2', [refreshToken, user.id]);
    }

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1 * 60 * 60 * 1000 // 1 hour matching JWT_EXPIRES_IN
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({
      success: true,
      message: 'Google Login successful',
      data: {
        user: formatUserResponse(user),
        token
      }
    });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(401).json({ success: false, message: error.message || 'Google authentication failed', stack: error.stack });
  }
};

// ─── EXPORTS (consistent named exports) ─────────────────────────
export {
  signup,
  login,
  getProfile,
  requestOTP,
  verifyOTP,
  updateProfile,
  forgotPassword,
  resetPassword,
  changePassword,
  logout,
  refreshToken,
  googleLogin,
  deleteAccount
};