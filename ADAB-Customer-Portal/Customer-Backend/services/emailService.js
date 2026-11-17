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
          },
          connectionTimeout: 5000,
          greetingTimeout: 5000,
          socketTimeout: 8000
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
 * Diagnostic function to test SMTP connectivity
 */
async function verifyTransporter() {
  if (!transporter) {
    return { configured: false, message: 'SMTP credentials missing or unconfigured.' };
  }
  try {
    await transporter.verify();
    return { configured: true, ready: true, message: 'SMTP connection verified successfully.' };
  } catch (err) {
    return { configured: true, ready: false, message: err.message };
  }
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
          max-width: 540px;
          margin: 0 auto;
          background: #FFFFFF;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
          border: 1px solid #E2E8F0;
        }
        .header {
          background: linear-gradient(135deg, #18753C 0%, #15803D 100%);
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
        .info-card {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 16px 20px;
          margin: 20px 0;
        }
        .btn-cta {
          display: inline-block;
          background: #18753C;
          color: #FFFFFF !important;
          font-weight: 700;
          font-size: 14px;
          padding: 12px 28px;
          border-radius: 12px;
          text-decoration: none;
          margin-top: 16px;
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
          <p>This communication was sent by <strong>ADAB Customer Portal</strong>.</p>
          <p>If you did not initiate this request or have questions, please reach out to customer support.</p>
          <p>&copy; ${currentYear} ADAB · Neighbourhood stores delivered in minutes. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Core sendEmail executor via Brevo SMTP / Custom SMTP
 */
async function sendEmail({ to, subject, html, text }) {
  const fromName = (process.env.EMAIL_FROM_NAME || 'ADAB Customer Portal').replace(/^["']|["']$/g, '');
  const fromEmail = process.env.BREVO_FROM_EMAIL || process.env.SMTP_FROM_EMAIL || process.env.BREVO_SMTP_USER || 'no-reply@adab.com';
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
    console.warn(`⚠️ SMTP dispatch notice for ${to}: ${error.message}`);
    console.log(`✉️  [LOCAL FALLBACK LOG] To: ${to} | Subject: ${subject}`);
    return { success: true, simulated: true, notice: error.message };
  }
}

/**
 * 1. Send Login OTP Email
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
 * 2. Send Registration OTP Email
 */
async function sendRegistrationOtpEmail(email, otp, userName) {
  const contentHtml = `
    <p>Thank you for signing up with ADAB! Use the verification code below to verify your email address and activate your account:</p>
    <div class="otp-box">
      <div class="otp-label">Your Registration Code</div>
      <div class="otp-code">${otp}</div>
      <div class="expiry-note">⏰ Valid for 15 minutes</div>
    </div>
    <p style="font-size: 13px; color: #475569;">
      Welcome to fast local doorstep delivery across your neighbourhood shops!
    </p>
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
 * 3. Send Password Reset OTP Email
 */
async function sendPasswordResetOtpEmail(email, otp, userName) {
  const contentHtml = `
    <p>You recently requested to reset the password for your ADAB account.</p>
    <div class="otp-box">
      <div class="otp-label">Your Password Reset Code</div>
      <div class="otp-code">${otp}</div>
      <div class="expiry-note">⏰ Valid for 15 minutes</div>
    </div>
    <p style="font-size: 13px; color: #475569;">
      If you did not request a password reset, please contact customer support immediately.
    </p>
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

/**
 * 4. Send Password Changed Security Notification Email
 */
async function sendPasswordChangedEmail(email, userName) {
  const contentHtml = `
    <p>The password for your ADAB account has been successfully changed.</p>
    <div class="info-card" style="border-left: 4px solid #18753C;">
      <p style="margin: 0; font-weight: 600; color: #166534;">Security Confirmation</p>
      <p style="margin: 4px 0 0; font-size: 13px; color: #475569;">
        Timestamp: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
      </p>
    </div>
    <p style="font-size: 13px; color: #475569;">
      If you made this change, no further action is needed. If you did not make this change, please contact ADAB Customer Support immediately to secure your account.
    </p>
  `;

  return sendEmail({
    to: email,
    subject: '🛡️ Your ADAB Password Has Been Changed',
    html: generateEmailTemplate({
      title: 'Password Updated',
      subtitle: 'Security notification for your account',
      userName,
      contentHtml
    }),
    text: `Hello ${userName || 'Customer'},\n\nYour ADAB account password was successfully updated.\n\nIf you did not perform this action, please contact support immediately.\n\nADAB Security Team`
  });
}

/**
 * 5. Send Order Confirmation Email
 */
async function sendOrderConfirmationEmail({ email, userName, order }) {
  const itemsHtml = (order.items || [])
    .map(
      (item) => `
        <tr style="border-bottom: 1px solid #F1F5F9;">
          <td style="padding: 10px 0; font-size: 13px; color: #334155;">
            <strong>${item.name || item.product_name || 'Item'}</strong>
            <div style="font-size: 11px; color: #64748B;">Qty: ${item.quantity || 1}</div>
          </td>
          <td style="padding: 10px 0; text-align: right; font-size: 13px; font-weight: 600; color: #0F172A;">
            ₹${Number(item.price || item.total_price || 0).toFixed(2)}
          </td>
        </tr>
      `
    )
    .join('');

  const contentHtml = `
    <p>Thank you for shopping with ADAB! Your order has been placed and is being prepared by your neighbourhood store.</p>
    
    <div class="info-card">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #64748B; font-weight: 700;">Order Number</span>
      </div>
      <div style="font-size: 18px; font-weight: 800; color: #18753C; font-family: monospace;">#${order.orderNumber}</div>
      <div style="font-size: 13px; color: #475569; margin-top: 6px;">
        Estimated Arrival: <strong>${order.etaMinutes || 25} minutes</strong> (${order.deliveryMode === 'STORE_PICKUP' ? 'Store Pickup' : 'Express Doorstep Delivery'})
      </div>
      ${order.address ? `<div style="font-size: 12px; color: #64748B; margin-top: 4px;">Delivering to: ${order.address}</div>` : ''}
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
      <thead>
        <tr style="border-bottom: 2px solid #E2E8F0; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748B;">
          <th style="padding-bottom: 8px;">Item</th>
          <th style="padding-bottom: 8px; text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
      <tfoot>
        <tr>
          <td style="padding-top: 14px; font-weight: 700; font-size: 15px; color: #0F172A;">Grand Total</td>
          <td style="padding-top: 14px; text-align: right; font-weight: 800; font-size: 17px; color: #18753C;">₹${Number(order.grandTotal || 0).toFixed(2)}</td>
        </tr>
        <tr>
          <td colspan="2" style="font-size: 11px; color: #64748B; padding-top: 4px;">
            Payment: ${order.paymentMethod || 'Online Payment'}
          </td>
        </tr>
      </tfoot>
    </table>
  `;

  return sendEmail({
    to: email,
    subject: `🛒 Order Confirmed #${order.orderNumber} (₹${order.grandTotal})`,
    html: generateEmailTemplate({
      title: 'Order Confirmed! 🎉',
      subtitle: `Your order #${order.orderNumber} is on its way`,
      userName,
      contentHtml
    }),
    text: `Hello ${userName || 'Customer'},\n\nYour ADAB order #${order.orderNumber} for ₹${order.grandTotal} is confirmed!\nEstimated delivery: ${order.etaMinutes || 25} minutes.\n\nThank you for choosing ADAB!`
  });
}

/**
 * 6. Send Order Status Update Email
 */
async function sendOrderStatusUpdateEmail({ email, userName, order, status, courierName, trackingNumber }) {
  const normStatus = (status || '').toUpperCase();
  let statusTitle = `Order Status: ${normStatus}`;
  let statusDesc = `Your order #${order.orderNumber} has been updated to ${normStatus}.`;

  if (normStatus === 'OUT_FOR_DELIVERY') {
    statusTitle = 'Out For Delivery! 🚀';
    statusDesc = `Your order #${order.orderNumber} is out for delivery with ${courierName || 'our local rider'} and will arrive at your doorstep in minutes.`;
  } else if (normStatus === 'DELIVERED') {
    statusTitle = 'Order Delivered! 📦';
    statusDesc = `Your order #${order.orderNumber} has been delivered successfully. We hope you love your products!`;
  } else if (normStatus === 'CANCELLED') {
    statusTitle = 'Order Cancelled';
    statusDesc = `Your order #${order.orderNumber} has been cancelled. Any pre-paid payment will be refunded to your original payment method.`;
  }

  const contentHtml = `
    <div class="info-card" style="border-left: 4px solid #18753C;">
      <h3 style="margin: 0 0 6px; font-size: 16px; color: #18753C;">${statusTitle}</h3>
      <p style="margin: 0; font-size: 14px; color: #334155;">${statusDesc}</p>
      ${trackingNumber ? `<p style="margin: 8px 0 0; font-size: 12px; color: #64748B;">Tracking Ref: <strong>${trackingNumber}</strong></p>` : ''}
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `📦 Order #${order.orderNumber} Update: ${statusTitle}`,
    html: generateEmailTemplate({
      title: statusTitle,
      subtitle: `Update for order #${order.orderNumber}`,
      userName,
      contentHtml
    }),
    text: `Hello ${userName || 'Customer'},\n\nOrder #${order.orderNumber} update: ${statusDesc}\n\nADAB Team`
  });
}

/**
 * 7. Send Support Ticket Confirmation Email
 */
async function sendSupportTicketConfirmationEmail({ email, userName, ticket, subject, message }) {
  const ticketNumber = ticket.ticket_number || ticket.id;
  const contentHtml = `
    <p>We have received your support request. Our customer care team is reviewing it and will get back to you shortly.</p>
    <div class="info-card">
      <div style="font-size: 12px; text-transform: uppercase; color: #64748B; font-weight: 700;">Ticket Reference</div>
      <div style="font-size: 18px; font-weight: 800; color: #18753C; font-family: monospace;">#${ticketNumber}</div>
      <div style="font-size: 13px; color: #0F172A; margin-top: 8px;"><strong>Subject:</strong> ${subject || 'Support Request'}</div>
      <div style="font-size: 13px; color: #475569; margin-top: 4px;"><strong>Category:</strong> ${ticket.category || 'General Support'}</div>
      ${message ? `<div style="font-size: 12px; color: #64748B; margin-top: 8px; background: #FFFFFF; padding: 8px 12px; border-radius: 8px; border: 1px solid #E2E8F0;">"${message}"</div>` : ''}
    </div>
    <p style="font-size: 13px; color: #475569;">
      You can track and reply to this ticket anytime from your ADAB Account Dashboard under <strong>Help & Support</strong>.
    </p>
  `;

  return sendEmail({
    to: email,
    subject: `🎫 Support Ticket #${ticketNumber} Created: ${subject || 'Inquiry'}`,
    html: generateEmailTemplate({
      title: 'Support Request Received',
      subtitle: `Ticket reference #${ticketNumber}`,
      userName,
      contentHtml
    }),
    text: `Hello ${userName || 'Customer'},\n\nWe received your support ticket #${ticketNumber}.\nOur team will review your inquiry and get back to you shortly.\n\nADAB Support Team`
  });
}

module.exports = {
  sendLoginOtpEmail,
  sendRegistrationOtpEmail,
  sendPasswordResetOtpEmail,
  sendPasswordChangedEmail,
  sendOrderConfirmationEmail,
  sendOrderStatusUpdateEmail,
  sendSupportTicketConfirmationEmail,
  verifyTransporter,
  sendEmail
};
