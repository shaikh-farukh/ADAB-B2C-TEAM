const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const pool = require('../db');

const BCRYPT_SALT_ROUNDS = 10;
const DEFAULT_EXPIRY_MINUTES = 5;
const DEFAULT_RESET_EXPIRY_MINUTES = 15;
const DEFAULT_MAX_ATTEMPTS = 5;

let tableInitialized = false;

/**
 * Ensure auth_challenges table exists in the database
 */
async function ensureOtpTable() {
  if (tableInitialized) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_challenges (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      phone VARCHAR(20),
      email VARCHAR(255),
      otp_code_hash VARCHAR(255) NOT NULL,
      challenge_type VARCHAR(30) NOT NULL CHECK (challenge_type IN ('LOGIN_OTP','REGISTRATION_OTP','PASSWORD_RESET','KYC_VERIFY')),
      attempts INT DEFAULT 0,
      is_used BOOLEAN DEFAULT false,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  tableInitialized = true;
}

/**
 * Generate a cryptographically secure 6-digit code
 */
function generateOtpCode() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Create and store a hashed challenge (LOGIN_OTP or PASSWORD_RESET) in auth_challenges
 */
async function createChallengeByType(email, challengeType = 'LOGIN_OTP', defaultMinutes = DEFAULT_EXPIRY_MINUTES) {
  await ensureOtpTable();

  const normalizedEmail = email.trim().toLowerCase();
  const otp = generateOtpCode();
  const expiryMinutes =
    challengeType === 'PASSWORD_RESET'
      ? defaultMinutes
      : parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || defaultMinutes;
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
  const otpHash = await bcrypt.hash(otp, BCRYPT_SALT_ROUNDS);

  // Invalidate any previous unused challenges of this type for this email
  await pool.query(
    `UPDATE auth_challenges
     SET is_used = true
     WHERE LOWER(email) = LOWER($1)
       AND challenge_type = $2
       AND is_used = false`,
    [normalizedEmail, challengeType]
  );

  const insertRes = await pool.query(
    `INSERT INTO auth_challenges (email, otp_code_hash, challenge_type, attempts, is_used, expires_at)
     VALUES ($1, $2, $3, 0, false, $4)
     RETURNING id`,
    [normalizedEmail, otpHash, challengeType, expiresAt]
  );

  return {
    challengeId: insertRes.rows[0]?.id || null,
    otp,
    expiryMinutes,
    expiresAt
  };
}

/**
 * Verify a 6-digit code against the latest active challenge of the given type
 */
async function verifyChallengeByType(email, otp, challengeType = 'LOGIN_OTP') {
  await ensureOtpTable();

  const normalizedEmail = email.trim().toLowerCase();
  const maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS, 10) || DEFAULT_MAX_ATTEMPTS;

  const res = await pool.query(
    `SELECT id, otp_code_hash, attempts, is_used, expires_at
     FROM auth_challenges
     WHERE LOWER(email) = LOWER($1)
       AND challenge_type = $2
       AND is_used = false
     ORDER BY created_at DESC
     LIMIT 1`,
    [normalizedEmail, challengeType]
  );

  if (res.rows.length === 0) {
    return {
      valid: false,
      code: 'OTP_NOT_FOUND',
      message:
        challengeType === 'PASSWORD_RESET'
          ? 'No active password reset code found. Please request a new reset code.'
          : 'No active OTP found. Please request a new verification code.'
    };
  }

  const challenge = res.rows[0];

  if (new Date() > new Date(challenge.expires_at)) {
    await pool.query('UPDATE auth_challenges SET is_used = true WHERE id = $1', [challenge.id]);
    return {
      valid: false,
      code: 'OTP_EXPIRED',
      message: 'Verification code has expired. Please request a new code.'
    };
  }

  if (challenge.attempts >= maxAttempts) {
    await pool.query('UPDATE auth_challenges SET is_used = true WHERE id = $1', [challenge.id]);
    return {
      valid: false,
      code: 'OTP_MAX_ATTEMPTS',
      message: 'Maximum verification attempts exceeded. Please request a new code.'
    };
  }

  const isMatch = await bcrypt.compare(String(otp).trim(), challenge.otp_code_hash);
  if (!isMatch) {
    const nextAttempts = (challenge.attempts || 0) + 1;
    const exhausted = nextAttempts >= maxAttempts;
    await pool.query(
      'UPDATE auth_challenges SET attempts = $1, is_used = $2 WHERE id = $3',
      [nextAttempts, exhausted, challenge.id]
    );
    const remaining = Math.max(0, maxAttempts - nextAttempts);
    return {
      valid: false,
      code: 'INVALID_OTP',
      message: remaining > 0
        ? `Invalid verification code. ${remaining} attempt(s) remaining.`
        : 'Maximum verification attempts exceeded. Please request a new code.'
    };
  }

  // Mark challenge as used
  await pool.query('UPDATE auth_challenges SET is_used = true WHERE id = $1', [challenge.id]);

  return { valid: true, challengeId: challenge.id };
}

async function createOtpChallenge(email) {
  return createChallengeByType(email, 'LOGIN_OTP', DEFAULT_EXPIRY_MINUTES);
}

async function verifyOtpChallenge(email, otp) {
  return verifyChallengeByType(email, otp, 'LOGIN_OTP');
}

async function createPasswordResetChallenge(email) {
  return createChallengeByType(email, 'PASSWORD_RESET', DEFAULT_RESET_EXPIRY_MINUTES);
}

async function verifyPasswordResetChallenge(email, code) {
  return verifyChallengeByType(email, code, 'PASSWORD_RESET');
}

/**
 * Build Nodemailer transporter if SMTP or Brevo credentials are configured
 */
function getTransporter() {
  const host = (process.env.SMTP_HOST || process.env.BREVO_SMTP_HOST || 'smtp.gmail.com').trim();
  const user = (process.env.SMTP_USER || process.env.BREVO_SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || process.env.BREVO_SMTP_KEY || '').replace(/\s+/g, '');
  const port = parseInt(process.env.SMTP_PORT || process.env.BREVO_SMTP_PORT || '587', 10);

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false }
  });
}

/**
 * Send Admin OTP email via Gmail SMTP / Brevo API to the admin's real email inbox
 */
async function sendAdminOtpEmail(email, otp, adminName = 'Administrator', expiryMinutes = 5) {
  const fromEmail = (
    process.env.EMAIL_FROM ||
    process.env.BREVO_FROM_EMAIL ||
    process.env.SMTP_USER ||
    process.env.BREVO_SMTP_USER ||
    'no-reply@adab.com'
  ).trim();
  const fromName = process.env.EMAIL_FROM_NAME || 'ADAB Admin Portal';
  const subject = `${otp} is your ADAB Admin Portal verification code`;

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="background: #1e1b4b; color: #ffffff; padding: 24px 28px;">
        <h2 style="margin: 0; font-size: 20px; font-weight: 800;">ADAB Admin Authentication</h2>
        <p style="margin: 4px 0 0; font-size: 12px; color: #a5b4fc;">Enterprise Platform Control — Email OTP Sign-In</p>
      </div>
      <div style="padding: 28px; color: #1e293b;">
        <p style="margin: 0 0 12px; font-size: 14px;">Hello <strong>${adminName}</strong>,</p>
        <p style="margin: 0 0 20px; font-size: 13px; color: #475569; line-height: 1.5;">
          Use the following one-time verification code to sign in to the <strong>ADAB Admin Portal</strong>:
        </p>
        <div style="background: #f8fafc; border: 2px dashed #6366f1; border-radius: 12px; padding: 18px; text-align: center; margin: 20px 0;">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 6px;">Verification Code</div>
          <div style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #312e81; font-family: monospace;">${otp}</div>
        </div>
        <p style="margin: 0 0 8px; font-size: 12px; color: #64748b;">
          This code expires in <strong>${expiryMinutes} minutes</strong> and can only be used once.
        </p>
        <p style="margin: 0; font-size: 12px; color: #94a3b8;">
          If you did not request this code, you can safely ignore this email.
        </p>
      </div>
    </div>
  `;

  const text = `Hello ${adminName},\n\nYour ADAB Admin Portal verification code is: ${otp}\n\nThis code expires in ${expiryMinutes} minutes.\n\nIf you did not request this code, please ignore this email.`;

  if (process.env.SENDINBLUE_API_KEY) {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.SENDINBLUE_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sender: { email: fromEmail, name: fromName },
        to: [{ email }],
        subject,
        htmlContent: html,
        textContent: text
      })
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || 'Brevo API failed to send OTP email');
    }
    const data = await response.json();
    return { success: true, messageId: data.messageId };
  }

  const transporter = getTransporter();
  if (!transporter) {
    return {
      success: false,
      code: 'SMTP_NOT_CONFIGURED',
      message:
        'SMTP_PASS is not set in Admin-Backend/.env. Please add your 16-character Gmail App Password to SMTP_PASS in Admin-Backend/.env.'
    };
  }

  const info = await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: email,
    subject,
    html,
    text
  });

  return { success: true, messageId: info.messageId };
}

/**
 * Send Admin Password Reset email (contains both 6-digit reset code and direct reset link)
 */
async function sendAdminPasswordResetEmail(email, resetCode, resetUrl, adminName = 'Administrator', expiryMinutes = 15) {
  const fromEmail = (
    process.env.EMAIL_FROM ||
    process.env.BREVO_FROM_EMAIL ||
    process.env.SMTP_USER ||
    process.env.BREVO_SMTP_USER ||
    'no-reply@adab.com'
  ).trim();
  const fromName = process.env.EMAIL_FROM_NAME || 'ADAB Admin Portal';
  const subject = `${resetCode} — Reset your ADAB Admin Portal password`;

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="background: #1e1b4b; color: #ffffff; padding: 24px 28px;">
        <h2 style="margin: 0; font-size: 20px; font-weight: 800;">ADAB Admin Password Reset</h2>
        <p style="margin: 4px 0 0; font-size: 12px; color: #a5b4fc;">Enterprise Platform Control — Account Recovery</p>
      </div>
      <div style="padding: 28px; color: #1e293b;">
        <p style="margin: 0 0 12px; font-size: 14px;">Hello <strong>${adminName}</strong>,</p>
        <p style="margin: 0 0 20px; font-size: 13px; color: #475569; line-height: 1.5;">
          We received a request to reset your <strong>ADAB Admin Portal</strong> password. Enter the 6-digit reset code below or click the button to set a new password:
        </p>
        <div style="background: #f8fafc; border: 2px dashed #6366f1; border-radius: 12px; padding: 18px; text-align: center; margin: 20px 0;">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 6px;">Password Reset Code</div>
          <div style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #312e81; font-family: monospace;">${resetCode}</div>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; padding: 12px 28px; border-radius: 10px;">
            Reset Password Now
          </a>
        </div>
        <p style="margin: 0 0 8px; font-size: 12px; color: #64748b;">
          This reset code expires in <strong>${expiryMinutes} minutes</strong>.
        </p>
        <p style="margin: 0; font-size: 12px; color: #94a3b8;">
          If you did not request a password reset, you can safely ignore this email.
        </p>
      </div>
    </div>
  `;

  const text = `Hello ${adminName},\n\nYour ADAB Admin Portal password reset code is: ${resetCode}\n\nOr open this link to reset your password:\n${resetUrl}\n\nThis code expires in ${expiryMinutes} minutes.\n\nIf you did not request this, please ignore this email.`;

  if (process.env.SENDINBLUE_API_KEY) {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.SENDINBLUE_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sender: { email: fromEmail, name: fromName },
        to: [{ email }],
        subject,
        htmlContent: html,
        textContent: text
      })
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || 'Brevo API failed to send password reset email');
    }
    const data = await response.json();
    return { success: true, messageId: data.messageId };
  }

  const transporter = getTransporter();
  if (!transporter) {
    return {
      success: false,
      code: 'SMTP_NOT_CONFIGURED',
      message:
        'SMTP_PASS is not set in Admin-Backend/.env. Please add your 16-character Gmail App Password to SMTP_PASS in Admin-Backend/.env.'
    };
  }

  const info = await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: email,
    subject,
    html,
    text
  });

  return { success: true, messageId: info.messageId };
}

module.exports = {
  createOtpChallenge,
  verifyOtpChallenge,
  createPasswordResetChallenge,
  verifyPasswordResetChallenge,
  sendAdminOtpEmail,
  sendAdminPasswordResetEmail
};
