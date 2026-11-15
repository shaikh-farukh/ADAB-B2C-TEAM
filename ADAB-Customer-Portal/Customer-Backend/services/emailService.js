const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();
const nodemailer = require('nodemailer');

const smtpHost = process.env.SMTP_HOST || process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com';
const smtpPort = Number(process.env.SMTP_PORT || process.env.BREVO_SMTP_PORT) || 587;
const smtpUser = process.env.SMTP_USER || process.env.BREVO_SMTP_USER;
const smtpPass = process.env.SMTP_PASS || process.env.BREVO_SMTP_KEY;

const isConfigured = Boolean(smtpUser && smtpPass);

let transporter = null;

if (isConfigured) {
  const isGmail = smtpHost.includes('gmail');
  
  transporter = nodemailer.createTransport(
    isGmail
      ? {
          service: 'gmail',
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        }
      : {
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass
          },
          tls: {
            rejectUnauthorized: false
          }
        }
  );

  transporter.verify((error) => {
    if (error) {
      console.warn('⚠️ SMTP verification warning:', error.message);
    } else {
      console.log(`✅ Mail transporter ready (${isGmail ? 'Gmail' : 'Brevo / Custom SMTP'})`);
    }
  });
} else {
  console.log('ℹ️ Mail credentials not configured in Customer Portal. Running in simulation mode.');
}

/**
 * Helper to generate brand-styled HTML email wrapper
 */
function generateEmailTemplate({ title, subtitle, userName, contentHtml }) {
  const currentYear = new Date().getFullYear();
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #F6F9F6;
          color: #1E293B;
          margin: 0;
          padding: 24px 12px;
          line-height: 1.5;
        }
        .container {
          max-width: 520px;
          margin: 0 auto;
          background: #FFFFFF;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
          border: 1px solid #E2E8F0;
        }
        .header {
          background: linear-gradient(135deg, #18753C 0%, #15803d 100%);
          padding: 32px 24px;
          text-align: center;
          color: #FFFFFF;
        }
        .brand-badge {
          display: inline-block;
          width: 44px;
          height: 44px;
          line-height: 44px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.2);
          font-size: 24px;
          font-weight: 900;
          margin-bottom: 12px;
        }
        .header h1 {
          margin: 0;
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .header p {
          margin: 6px 0 0;
          font-size: 13px;
          opacity: 0.9;
        }
        .content {
          padding: 32px 28px;
        }
        .greeting {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 12px;
          color: #0F172A;
        }
        .otp-box {
          background: #F0FDF4;
          border: 2px dashed #86EFAC;
          border-radius: 16px;
          text-align: center;
          padding: 24px;
          margin: 24px 0;
        }
        .otp-label {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #166534;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .otp-code {
          font-family: 'Courier New', Courier, monospace;
          font-size: 38px;
          font-weight: 900;
          letter-spacing: 8px;
          color: #18753C;
        }
        .expiry-note {
          font-size: 13px;
          color: #64748B;
          margin-top: 10px;
        }
        .footer {
          background: #F8FAFC;
          border-top: 1px solid #E2E8F0;
          padding: 20px 24px;
          text-align: center;
          font-size: 12px;
          color: #94A3B8;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="brand-badge">A</div>
          <h1>${title}</h1>
          <p>${subtitle}</p>
        </div>
        <div class="content">
          <div class="greeting">Hello ${userName || 'Valued Customer'},</div>
          ${contentHtml}
        </div>
        <div class="footer">
          <p>This verification email was sent by <strong>ADAB Customer Portal</strong>.</p>
          <p>If you did not request this verification, please disregard this email.</p>
          <p>&copy; ${currentYear} ADAB. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send OTP via Brevo SMTP
 */
async function sendEmail({ to, subject, html, text }) {
  const fromName = process.env.EMAIL_FROM_NAME || 'ADAB Customer Portal';
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.BREVO_FROM_EMAIL || process.env.SMTP_USER || process.env.BREVO_SMTP_USER || 'no-reply@adab.com';
  const sender = `"${fromName}" <${fromEmail}>`;

  if (!transporter) {
    console.log(`✉️  [SIMULATED EMAIL] To: ${to} | Subject: ${subject}`);
    return { success: true, simulated: true };
  }

  try {
    console.log(`📤 Sending email via Brevo from ${sender} to ${to}...`);
    const info = await transporter.sendMail({
      from: sender,
      replyTo: fromEmail,
      to,
      subject,
      html,
      text
    });
    console.log(`✅ Mail accepted by Brevo for ${to} (Message ID: ${info.messageId}) | Server response: ${info.response}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send Login OTP Email
 */
async function sendLoginOtpEmail(email, otp, userName) {
  const contentHtml = `
    <p>We received a request to log in to your ADAB account using your email address.</p>
    <div class="otp-box">
      <div class="otp-label">Your Login Verification Code</div>
      <div class="otp-code">${otp}</div>
      <div class="expiry-note">⏰ Valid for 10 minutes · Single use only</div>
    </div>
    <p style="font-size: 13px; color: #475569;">
      Enter this code on the login screen to access your orders, cart, and account details securely.
    </p>
  `;

  return sendEmail({
    to: email,
    subject: `Your ADAB Verification Code: ${otp}`,
    html: generateEmailTemplate({
      title: 'Sign In to ADAB',
      subtitle: 'Neighbourhood shops delivered in minutes',
      userName,
      contentHtml
    }),
    text: `Hello ${userName || 'Customer'},\n\nYour ADAB login verification code is: ${otp}\n\nThis code is valid for 10 minutes.\n\nBest regards,\nADAB Customer Team`
  });
}

/**
 * Send Registration OTP Email
 */
async function sendRegistrationOtpEmail(email, otp, userName) {
  const contentHtml = `
    <p>Thank you for signing up with ADAB! Use the verification code below to verify your email address:</p>
    <div class="otp-box">
      <div class="otp-label">Your Registration Code</div>
      <div class="otp-code">${otp}</div>
      <div class="expiry-note">⏰ Valid for 15 minutes</div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `🎉 Verify Your ADAB Account: ${otp}`,
    html: generateEmailTemplate({
      title: 'Welcome to ADAB',
      subtitle: 'Complete your registration',
      userName,
      contentHtml
    }),
    text: `Hello ${userName || 'Customer'},\n\nWelcome to ADAB! Your registration verification code is: ${otp}\n\nValid for 15 minutes.\n\nADAB Team`
  });
}

/**
 * Send Password Reset OTP Email
 */
async function sendPasswordResetOtpEmail(email, otp, userName) {
  const contentHtml = `
    <p>You recently requested to reset the password for your ADAB account.</p>
    <div class="otp-box">
      <div class="otp-label">Your Password Reset Code</div>
      <div class="otp-code">${otp}</div>
      <div class="expiry-note">⏰ Valid for 15 minutes</div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `🔑 ADAB Password Reset Code: ${otp}`,
    html: generateEmailTemplate({
      title: 'Password Reset Request',
      subtitle: 'Reset your account password',
      userName,
      contentHtml
    }),
    text: `Hello ${userName || 'Customer'},\n\nYour ADAB password reset code is: ${otp}\n\nValid for 15 minutes.\n\nADAB Team`
  });
}

module.exports = {
  sendLoginOtpEmail,
  sendRegistrationOtpEmail,
  sendPasswordResetOtpEmail
};
