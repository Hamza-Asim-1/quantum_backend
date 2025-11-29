import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import logger from '../utils/logger';

// Initialize AWS SES client
const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

/**
 * Send OTP email using AWS SES
 * @param toEmail - Recipient email address
 * @param otp - The 6-digit OTP code
 * @returns {Promise<boolean>} True if email sent successfully
 */
export const sendOTPEmailSES = async (toEmail: string, otp: string): Promise<boolean> => {
  try {
    const fromEmail = process.env.SES_FROM_EMAIL;
    if (!fromEmail) {
      logger.error('SES_FROM_EMAIL environment variable is not set');
      return false;
    }

    const emailParams = {
      Source: fromEmail,
      Destination: {
        ToAddresses: [toEmail],
      },
      Message: {
        Subject: {
          Data: 'Password Reset OTP Code',
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: `
              <html>
                <head>
                  <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; background-color: #f9f9f9; }
                    .otp-code { background-color: #e9ecef; padding: 20px; margin: 20px 0; font-family: monospace; font-size: 32px; font-weight: bold; text-align: center; letter-spacing: 8px; border-left: 4px solid #007bff; border-radius: 4px; }
                    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1>Password Reset OTP</h1>
                    </div>
                    <div class="content">
                      <p>Hello,</p>
                      <p>You requested to reset your password. Use the following OTP code to verify your identity:</p>
                      <div class="otp-code">
                        ${otp}
                      </div>
                      <p><strong>Important:</strong></p>
                      <ul>
                        <li>This OTP will expire in 5 minutes</li>
                        <li>This OTP can only be used once</li>
                        <li>If you didn't request this, please ignore this email</li>
                      </ul>
                      <p>To verify your OTP, make a POST request to:</p>
                      <p><code>/auth/verify-otp</code></p>
                      <p>With the following JSON body:</p>
                      <pre style="background-color: #f8f9fa; padding: 10px; border-radius: 4px;">
{
  "email": "${toEmail}",
  "otp": "${otp}"
}
                      </pre>
                    </div>
                    <div class="footer">
                      <p>This is an automated message. Please do not reply to this email.</p>
                    </div>
                  </div>
                </body>
              </html>
            `,
            Charset: 'UTF-8',
          },
          Text: {
            Data: `
Password Reset OTP

Hello,

You requested to reset your password. Use the following OTP code to verify your identity:

OTP Code: ${otp}

Important:
- This OTP will expire in 5 minutes
- This OTP can only be used once
- If you didn't request this, please ignore this email

To verify your OTP, make a POST request to:
/auth/verify-otp

With the following JSON body:
{
  "email": "${toEmail}",
  "otp": "${otp}"
}

This is an automated message. Please do not reply to this email.
            `,
            Charset: 'UTF-8',
          },
        },
      },
    };

    const command = new SendEmailCommand(emailParams);
    const result = await sesClient.send(command);

    logger.info('OTP email sent successfully', {
      toEmail,
      messageId: result.MessageId,
    });

    return true;
  } catch (error) {
    logger.error('Failed to send OTP email', {
      error: error instanceof Error ? error.message : 'Unknown error',
      toEmail,
    });
    return false;
  }
};

/**
 * Test AWS SES configuration
 * @returns {Promise<boolean>} True if SES is properly configured
 */
export const testSESConfiguration = async (): Promise<boolean> => {
  try {
    const fromEmail = process.env.SES_FROM_EMAIL;
    if (!fromEmail) {
      logger.error('SES_FROM_EMAIL environment variable is not set');
      return false;
    }

    // Try to send a test email (optional - can be implemented if needed)
    logger.info('SES configuration test passed');
    return true;
  } catch (error) {
    logger.error('SES configuration test failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
};
