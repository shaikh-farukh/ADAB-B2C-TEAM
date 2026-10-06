import nodemailer from 'nodemailer';

const isEmailConfigured = process.env.BREVO_SMTP_USER && process.env.BREVO_SMTP_KEY;
const isBrevoApiConfigured = !!process.env.SENDINBLUE_API_KEY;

// Create Brevo (Sendinblue) transporter
let transporter = null;
if (isEmailConfigured) {
  transporter = nodemailer.createTransport({
    host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
    port: process.env.BREVO_SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.BREVO_SMTP_USER, // Your Brevo SMTP username (email)
      pass: process.env.BREVO_SMTP_KEY,  // Your Brevo SMTP key/password
    },
    tls: {
      rejectUnauthorized: false // For development, remove in production
    }
  });

  // Verify transporter configuration
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ Brevo SMTP connection failed:', error.message);
      console.error('Please check your BREVO_SMTP_USER and BREVO_SMTP_KEY in .env file');
    } else {
      console.log('✅ Brevo SMTP server is ready to send emails');
    }
  });
} else if (isBrevoApiConfigured) {
  console.log('✅ Brevo API is configured via SENDINBLUE_API_KEY');
} else {
  console.log('ℹ️ Brevo credentials not found. Setting up Ethereal test account...');
  nodemailer.createTestAccount().then(account => {
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: account.user,
        pass: account.pass
      }
    });
    console.log('✅ Ethereal test account ready. Emails will be logged with preview URLs.');
  }).catch(err => {
    console.error('❌ Failed to create Ethereal test account:', err.message);
  });
}

/**
 * Send OTP email via Brevo
 */
const sendOTPEmail = async (email, otp, companyName) => {
  if (!transporter && !isBrevoApiConfigured) {
    console.log(`\n==========================================`);
    console.log(`✉️  [MOCK EMAIL] To: ${email}`);
    console.log(`🔑  OTP Code: ${otp}`);
    console.log(`⏰  Expiry: ${process.env.OTP_EXPIRY_MINUTES || 5} minutes`);
    console.log(`==========================================\n`);
    return {
      success: true,
      messageId: `mock-${Date.now()}`,
      accepted: [email],
      isMock: true
    };
  }

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          margin: 0; 
          padding: 0;
          background-color: #f4f4f4;
        }
        .container { 
          max-width: 600px; 
          margin: 20px auto; 
          background-color: #ffffff;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white; 
          padding: 40px 20px; 
          text-align: center;
        }
        .header h1 { 
          margin: 0; 
          font-size: 28px;
          font-weight: 600;
        }
        .header p {
          margin: 10px 0 0 0;
          font-size: 14px;
          opacity: 0.9;
        }
        .content { 
          padding: 40px 30px;
        }
        .greeting {
          font-size: 18px;
          color: #333;
          margin-bottom: 20px;
        }
        .company {
          color: #667eea;
          font-weight: 600;
        }
        .otp-box { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          padding: 30px;
          text-align: center;
          margin: 30px 0;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }
        .otp-label {
          color: #ffffff;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 10px;
          opacity: 0.9;
        }
        .otp-code { 
          font-size: 42px;
          font-weight: bold;
          color: #ffffff;
          letter-spacing: 10px;
          font-family: 'Courier New', monospace;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }
        .info-box { 
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 25px 0;
          border-radius: 4px;
        }
        .info-box strong {
          color: #856404;
        }
        .info-text {
          color: #856404;
          margin: 5px 0;
          font-size: 14px;
        }
        .security-tips {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          margin: 25px 0;
        }
        .security-tips h3 {
          margin-top: 0;
          color: #495057;
          font-size: 16px;
        }
        .security-tips ul {
          margin: 10px 0;
          padding-left: 20px;
        }
        .security-tips li {
          margin: 8px 0;
          color: #6c757d;
          font-size: 14px;
        }
        .footer { 
          text-align: center;
          padding: 30px 20px;
          font-size: 12px;
          color: #6c757d;
          background-color: #f8f9fa;
          border-top: 1px solid #dee2e6;
        }
        .footer p {
          margin: 5px 0;
        }
        .footer a {
          color: #667eea;
          text-decoration: none;
        }
        .divider {
          height: 1px;
          background: linear-gradient(to right, transparent, #dee2e6, transparent);
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Verification Code</h1>
          <p>B2B Portal Authentication</p>
        </div>
        
        <div class="content">
          <p class="greeting">Hello <span class="company">₹{companyName || 'there'}</span>,</p>
          
          <p>We received a request to log in to your B2B Portal account. Use the verification code below to complete your login:</p>
          
          <div class="otp-box">
            <div class="otp-label">Your Verification Code</div>
            <div class="otp-code">₹{otp}</div>
          </div>
          
          <div class="info-box">
            <div class="info-text">
              <strong>⏰ Important:</strong> This code is valid for <strong>₹{process.env.OTP_EXPIRY_MINUTES || 5} minutes</strong> only.
            </div>
          </div>
          
          <div class="divider"></div>
          
          <div class="security-tips">
            <h3>🛡️ Security Tips:</h3>
            <ul>
              <li>Never share this code with anyone, including B2B Portal support</li>
              <li>Our team will never ask for your verification code</li>
              <li>If you didn't request this code, please ignore this email and secure your account</li>
              <li>This code can only be used once</li>
            </ul>
          </div>
          
          <p style="color: #6c757d; font-size: 14px; margin-top: 25px;">
            If you're having trouble logging in or didn't request this code, please contact our support team immediately.
          </p>
        </div>
        
        <div class="footer">
          <p><strong>B2B Portal</strong></p>
          <p>This is an automated email. Please do not reply to this message.</p>
          <p>&copy; ${new Date().getFullYear()} B2B Portal. All rights reserved.</p>
          <div style="margin-top: 15px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}">Visit Portal</a> | 
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/support">Support</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    console.log(`📧 Sending OTP email to: ${email}`);
    
    if (isBrevoApiConfigured && !isEmailConfigured) {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': process.env.SENDINBLUE_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sender: { 
            email: process.env.BREVO_FROM_EMAIL || process.env.BREVO_SMTP_USER || 'adab.officiall01@gmail.com', 
            name: process.env.EMAIL_FROM_NAME || 'B2B Portal' 
          },
          to: [{ email: email }],
          subject: 'Your B2B Portal Verification Code',
          htmlContent: emailHtml,
          textContent: `Hello ${companyName || 'there'},\n\nYour B2B Portal verification code is: ${otp}\n\nThis code is valid for ${process.env.OTP_EXPIRY_MINUTES || 5} minutes.\n\nIf you didn't request this code, please ignore this email.\n\nBest regards,\nB2B Portal Team`
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Brevo API error');
      }

      const data = await response.json();
      console.log('✅ OTP email sent successfully via API:', data.messageId);
      
      return { 
        success: true, 
        messageId: data.messageId,
        accepted: [email] 
      };
    } else {
      const info = await transporter.sendMail({
        from: `"${process.env.EMAIL_FROM_NAME || 'B2B Portal'}" <${process.env.BREVO_FROM_EMAIL || process.env.BREVO_SMTP_USER || 'test@ethereal.email'}>`,
        to: email,
        subject: 'Your B2B Portal Verification Code',
        html: emailHtml,
        // Plain text version for email clients that don't support HTML
        text: `Hello ${companyName || 'there'},\n\nYour B2B Portal verification code is: ${otp}\n\nThis code is valid for ${process.env.OTP_EXPIRY_MINUTES || 5} minutes.\n\nIf you didn't request this code, please ignore this email.\n\nBest regards,\nB2B Portal Team`
      });

      console.log('✅ OTP email sent successfully:', info.messageId);
      console.log('📬 Accepted:', info.accepted);
      
      if (!isEmailConfigured) {
        console.log('👀 Preview URL: %s', nodemailer.getTestMessageUrl(info));
      }
      
      return { 
        success: true, 
        messageId: info.messageId,
        accepted: info.accepted 
      };
    }
    
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    console.error('Error details:', error);
    
    // Provide helpful error messages
    if (error.code === 'EAUTH') {
      console.error('Authentication failed. Please check your BREVO_SMTP_USER and BREVO_SMTP_KEY');
    } else if (error.code === 'ECONNECTION') {
      console.error('Connection failed. Please check your internet connection and Brevo SMTP settings');
    }
    
    return { 
      success: false, 
      error: error.message,
      code: error.code 
    };
  }
};

/**
 * Send password reset email via Brevo
 */
export const sendPasswordResetEmail = async (email, resetUrl, name) => {
  if (!transporter && !isBrevoApiConfigured) {
    console.log(`\n==========================================`);
    console.log(`✉️  [MOCK EMAIL] To: ${email}`);
    console.log(`🔗  Reset Link: ${resetUrl}`);
    console.log(`==========================================\n`);
    return {
      success: true,
      messageId: `mock-${Date.now()}`,
      isMock: true
    };
  }

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          margin: 0; 
          padding: 0;
          background-color: #f4f4f4;
        }
        .container { 
          max-width: 600px; 
          margin: 20px auto; 
          background-color: #ffffff;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white; 
          padding: 40px 20px; 
          text-align: center;
        }
        .header h1 { 
          margin: 0; 
          font-size: 28px;
          font-weight: 600;
        }
        .content { 
          padding: 40px 30px;
        }
        .button-container {
          text-align: center;
          margin: 35px 0;
        }
        .button { 
          display: inline-block;
          padding: 16px 40px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-decoration: none;
          border-radius: 50px;
          font-weight: 600;
          font-size: 16px;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
          transition: transform 0.2s;
        }
        .button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
        }
        .info-box { 
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 25px 0;
          border-radius: 4px;
        }
        .link-box {
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          word-break: break-all;
          margin: 20px 0;
          font-family: monospace;
          font-size: 12px;
          color: #495057;
        }
        .footer { 
          text-align: center;
          padding: 30px 20px;
          font-size: 12px;
          color: #6c757d;
          background-color: #f8f9fa;
          border-top: 1px solid #dee2e6;
        }
        .divider {
          height: 1px;
          background: linear-gradient(to right, transparent, #dee2e6, transparent);
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Password Reset Request</h1>
        </div>
        
        <div class="content">
          <p>Hi <strong>₹{name || 'there'}</strong>,</p>
          
          <p>We received a request to reset the password for your B2B Portal account.</p>
          
          <p>Click the button below to reset your password. This link will expire in <strong>1 hour</strong> for security reasons.</p>
          
          <div class="button-container">
            <a href="${resetUrl}" class="button">Reset My Password</a>
          </div>
          
          <div class="divider"></div>
          
          <p style="font-size: 14px; color: #6c757d;">If the button doesn't work, copy and paste this link into your browser:</p>
          <div class="link-box">₹{resetUrl}</div>
          
          <div class="info-box">
            <strong>⚠️ Security Notice:</strong><br>
            If you didn't request this password reset, please ignore this email. Your password will remain unchanged and secure.
          </div>
          
          <p style="font-size: 14px; color: #6c757d; margin-top: 25px;">
            This link will expire in 1 hour for your security. If you need to reset your password after that, please submit a new request.
          </p>
        </div>
        
        <div class="footer">
          <p><strong>B2B Portal</strong></p>
          <p>This is an automated email. Please do not reply to this message.</p>
          <p>&copy; ${new Date().getFullYear()} B2B Portal. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    console.log(`📧 Sending password reset email to: ${email}`);
    
    if (isBrevoApiConfigured && !isEmailConfigured) {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': process.env.SENDINBLUE_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sender: { 
            email: process.env.BREVO_FROM_EMAIL || process.env.BREVO_SMTP_USER || 'adab.officiall01@gmail.com', 
            name: process.env.EMAIL_FROM_NAME || 'B2B Portal' 
          },
          to: [{ email: email }],
          subject: 'Password Reset Request - B2B Portal',
          htmlContent: emailHtml,
          textContent: `Hi ${name || 'there'},\n\nWe received a request to reset your B2B Portal password.\n\nClick this link to reset your password:\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nB2B Portal Team`
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Brevo API error');
      }

      const data = await response.json();
      console.log('✅ Password reset email sent successfully via API:', data.messageId);
      return { success: true, messageId: data.messageId };
    } else {
      const info = await transporter.sendMail({
        from: `"${process.env.EMAIL_FROM_NAME || 'B2B Portal'}" <${process.env.BREVO_FROM_EMAIL || process.env.BREVO_SMTP_USER || 'test@ethereal.email'}>`,
        to: email,
        subject: 'Password Reset Request - B2B Portal',
        html: emailHtml,
        text: `Hi ${name || 'there'},\n\nWe received a request to reset your B2B Portal password.\n\nClick this link to reset your password:\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nB2B Portal Team`
      });

      console.log('✅ Password reset email sent successfully:', info.messageId);
      
      if (!isEmailConfigured) {
        console.log('👀 Preview URL: %s', nodemailer.getTestMessageUrl(info));
      }
      
      return { success: true, messageId: info.messageId };
    }
    
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    return { success: false, error: error.message };
  }
};

export { sendOTPEmail };