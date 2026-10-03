import crypto from 'crypto';
import bcrypt from 'bcrypt';
import pool from '../Config/database.js';

const BCRYPT_SALT_ROUNDS = 10;

/**
 * Generate a cryptographically secure 6-digit OTP
 */
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Hash and save OTP to database for the given user.
 * The plain-text OTP is sent to the user via email;
 * only the bcrypt hash is stored in the DB.
 */
const saveOTP = async (userId, otp) => {
  const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 5;
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  // Hash OTP before storing — prevents exposure if DB is compromised
  const hashedOTP = await bcrypt.hash(otp, BCRYPT_SALT_ROUNDS);

  const query = `
    UPDATE manage_b_to_b_userdetail
    SET otp = $1,
        otp_expires_at = $2,
        otp_attempts = 0
    WHERE id = $3
    RETURNING id
  `;

  await pool.query(query, [hashedOTP, expiresAt, userId]);
};

/**
 * Verify an OTP for the given email.
 * Compares the plain-text OTP against the stored bcrypt hash.
 * Handles expiry, max attempts, and cleanup.
 */
const verifyOTP = async (email, otp) => {
  const maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS) || 3;

  // Find user by email
  const userQuery = `
    SELECT id, email, otp, otp_expires_at, otp_attempts, active
    FROM manage_b_to_b_userdetail
    WHERE email = $1 AND deleted_at IS NULL
  `;

  const result = await pool.query(userQuery, [email]);

  if (result.rows.length === 0) {
    return { success: false, message: 'User not found' };
  }

  const user = result.rows[0];

  // Check if account is active
  if (!user.active) {
    return { success: false, message: 'Account is deactivated' };
  }

  // Check if OTP exists
  if (!user.otp) {
    return { success: false, message: 'No OTP requested. Please request OTP first.' };
  }

  // Check if OTP is expired
  if (new Date() > new Date(user.otp_expires_at)) {
    // Clear expired OTP
    await pool.query(
      'UPDATE manage_b_to_b_userdetail SET otp = NULL, otp_expires_at = NULL, otp_attempts = 0 WHERE id = $1',
      [user.id]
    );
    return { success: false, message: 'OTP has expired. Please request a new one.' };
  }

  // Check attempts
  if (user.otp_attempts >= maxAttempts) {
    return { success: false, message: 'Maximum OTP attempts exceeded. Please request a new OTP.' };
  }

  // Compare plain-text OTP against stored hash
  const isValid = await bcrypt.compare(otp, user.otp);

  if (!isValid) {
    // Increment attempts
    await pool.query(
      'UPDATE manage_b_to_b_userdetail SET otp_attempts = otp_attempts + 1 WHERE id = $1',
      [user.id]
    );

    const remainingAttempts = maxAttempts - (user.otp_attempts + 1);
    return {
      success: false,
      message: `Invalid OTP. ${remainingAttempts} attempt(s) remaining.`
    };
  }

  // OTP is valid — clear it from DB
  await pool.query(
    'UPDATE manage_b_to_b_userdetail SET otp = NULL, otp_expires_at = NULL, otp_attempts = 0 WHERE id = $1',
    [user.id]
  );

  return { success: true, userId: user.id };
};

export {
  generateOTP,
  saveOTP,
  verifyOTP
};