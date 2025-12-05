import nodemailer from 'nodemailer';
import config from '../config/environment';
import logger from '../utils/logger';

// Create reusable transporter using GoDaddy SMTP
const transporter = nodemailer.createTransport({
  host: config.EMAIL_HOST,
  port: config.EMAIL_PORT,
  secure: config.EMAIL_SECURE, // true for 465, false for other ports
  auth: {
    user: config.EMAIL_USER,
    pass: config.EMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false, // For development/testing
  },
});

// Verify SMTP connection on startup
transporter.verify(function (error, success) {
  if (error) {
    logger.error('❌ Email SMTP connection error:', error);
  } else {
    logger.info('✅ Email server is ready to send emails');
  }
});

/**
 * Send OTP email for password reset
 */
export async function sendOTPEmail(email: string, otp: string): Promise<boolean> {
  try {
    const mailOptions = {
      from: `"${config.EMAIL_FROM_NAME}" <${config.EMAIL_FROM}>`,
      to: email,
      subject: 'Password Reset OTP - Quantum Pips',
      text: `Your OTP for password reset is: ${otp}. This OTP will expire in ${config.OTP_EXPIRES_IN_MINUTES} minutes.`,
      html: getOTPEmailTemplate(otp),
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`✅ OTP email sent to ${email}. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error('❌ Error sending OTP email:', error);
    return false;
  }
}

/**
 * Send password reset confirmation email
 */
export async function sendPasswordResetConfirmation(email: string): Promise<boolean> {
  try {
    const mailOptions = {
      from: `"${config.EMAIL_FROM_NAME}" <${config.EMAIL_FROM}>`,
      to: email,
      subject: 'Password Reset Successful - Quantum Pips',
      text: 'Your password has been successfully reset. If you did not perform this action, please contact support immediately.',
      html: getPasswordResetConfirmationTemplate(),
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`✅ Password reset confirmation sent to ${email}. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error('❌ Error sending password reset confirmation:', error);
    return false;
  }
}

/**
 * Send welcome email to new users
 */
export async function sendWelcomeEmail(email: string, fullName: string): Promise<boolean> {
  try {
    const mailOptions = {
      from: `"${config.EMAIL_FROM_NAME}" <${config.EMAIL_FROM}>`,
      to: email,
      subject: 'Welcome to Quantum Pips!',
      text: `Welcome ${fullName}! Thank you for joining Quantum Pips.`,
      html: getWelcomeEmailTemplate(fullName),
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`✅ Welcome email sent to ${email}. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error('❌ Error sending welcome email:', error);
    return false;
  }
}

/**
 * OTP Email Template
 */
function getOTPEmailTemplate(otp: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset OTP</title>
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
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
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
        .otp-box {
          background-color: #f8f9fa;
          border: 2px dashed #667eea;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          margin: 30px 0;
        }
        .otp-code {
          font-size: 36px;
          font-weight: bold;
          color: #667eea;
          letter-spacing: 8px;
          margin: 10px 0;
          font-family: 'Courier New', monospace;
        }
        .warning {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .footer {
          background-color: #f8f9fa;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #6c757d;
          border-top: 1px solid #dee2e6;
        }
        .button {
          display: inline-block;
          padding: 12px 30px;
          background-color: #667eea;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
        }
        p {
          margin: 15px 0;
          color: #495057;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Password Reset Request</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>We received a request to reset your password for your <strong>Quantum Pips</strong> account.</p>
          <p>Use the OTP code below to complete your password reset:</p>
          
          <div class="otp-box">
            <div style="font-size: 14px; color: #6c757d; margin-bottom: 10px;">Your OTP Code</div>
            <div class="otp-code">${otp}</div>
            <div style="font-size: 12px; color: #6c757d; margin-top: 10px;">Valid for ${config.OTP_EXPIRES_IN_MINUTES} minutes</div>
          </div>
          
          <div class="warning">
            <strong>⚠️ Security Notice:</strong><br>
            • This OTP will expire in <strong>${config.OTP_EXPIRES_IN_MINUTES} minutes</strong><br>
            • Never share this code with anyone<br>
            • If you didn't request this, please ignore this email
          </div>
          
          <p>After entering the OTP, you'll be able to create a new password.</p>
          <p>If you did not request a password reset, please contact our support team immediately.</p>
        </div>
        <div class="footer">
          <p><strong>Quantum Pips</strong></p>
          <p>This is an automated email. Please do not reply to this message.</p>
          <p>© ${new Date().getFullYear()} Quantum Pips. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Password Reset Confirmation Email Template
 */
function getPasswordResetConfirmationTemplate(): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset Successful</title>
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
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
          color: white;
          padding: 30px;
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
        .success-icon {
          text-align: center;
          font-size: 64px;
          margin: 20px 0;
        }
        .footer {
          background-color: #f8f9fa;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #6c757d;
          border-top: 1px solid #dee2e6;
        }
        p {
          margin: 15px 0;
          color: #495057;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Password Reset Successful</h1>
        </div>
        <div class="content">
          <div class="success-icon">🎉</div>
          <p>Hello,</p>
          <p>Your password has been <strong>successfully reset</strong>.</p>
          <p>You can now log in to your Quantum Pips account using your new password.</p>
          <p><strong>If you did not perform this action:</strong></p>
          <ul>
            <li>Please contact our support team immediately</li>
            <li>Change your password as soon as possible</li>
            <li>Review your recent account activity</li>
          </ul>
        </div>
        <div class="footer">
          <p><strong>Quantum Pips</strong></p>
          <p>This is an automated email. Please do not reply to this message.</p>
          <p>© ${new Date().getFullYear()} Quantum Pips. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Welcome Email Template
 */
function getWelcomeEmailTemplate(fullName: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Quantum Pips</title>
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
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
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
        .footer {
          background-color: #f8f9fa;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #6c757d;
          border-top: 1px solid #dee2e6;
        }
        p {
          margin: 15px 0;
          color: #495057;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Welcome to Quantum Pips!</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${fullName}</strong>,</p>
          <p>Welcome to <strong>Quantum Pips</strong>! We're excited to have you on board.</p>
          <p>Your account has been successfully created. You can now start exploring our investment platform.</p>
          <p>If you have any questions, feel free to reach out to our support team.</p>
        </div>
        <div class="footer">
          <p><strong>Quantum Pips</strong></p>
          <p>© ${new Date().getFullYear()} Quantum Pips. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export default {
  sendOTPEmail,
  sendPasswordResetConfirmation,
  sendWelcomeEmail,
};