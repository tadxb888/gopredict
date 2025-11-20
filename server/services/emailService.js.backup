const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
require('dotenv').config();

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

// Verify connection
transporter.verify((error) => {
  if (error) {
    logger.error('SMTP connection failed:', error);
  } else {
    logger.info('SMTP server ready to send emails');
  }
});

/**
 * Send magic link email
 */
async function sendMagicLink(email, token, firstName = null) {
  const magicLink = `${process.env.APP_BASE_URL}/auth/verify?token=${token}`;
  const name = firstName || email.split('@')[0];

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Your GoPredict Login Link',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #21222C; padding: 20px; text-align: center; }
          .header h1 { color: #68FF8E; margin: 0; }
          .content { background-color: #f9f9f9; padding: 30px; }
          .button { 
            display: inline-block; 
            padding: 12px 30px; 
            background-color: #00A2FF; 
            color: white !important; 
            text-decoration: none; 
            border-radius: 5px;
            font-weight: bold;
          }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          .warning { color: #FF6B6B; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>GoPredict</h1>
          </div>
          <div class="content">
            <h2>Hello ${name},</h2>
            <p>Click the button below to securely log in to your GoPredict account:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${magicLink}" class="button">Log In to GoPredict</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${magicLink}</p>
            <div class="warning">
              <p><strong>Important:</strong></p>
              <ul>
                <li>This link expires in 15 minutes</li>
                <li>Only one session is allowed per account</li>
                <li>Do not share this link with anyone</li>
              </ul>
            </div>
            <p>If you didn't request this login link, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} GoPredict. All rights reserved.</p>
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Hello ${name},

      Click the link below to log in to your GoPredict account:
      ${magicLink}

      This link expires in 15 minutes and can only be used once.
      
      If you didn't request this login link, please ignore this email.

      ---
      GoPredict - Market Predictions Platform
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info('Magic link sent', { email, messageId: info.messageId });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Failed to send magic link', { email, error: error.message });
    throw new Error('Failed to send email');
  }
}

/**
 * Send admin notification email
 */
async function sendAdminNotification(subject, message, details = {}) {
  const adminEmail = process.env.ADMIN_EMAIL;
  
  if (!adminEmail) {
    logger.warn('Admin email not configured, skipping notification');
    return;
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: adminEmail,
    subject: `[GoPredict Alert] ${subject}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .alert { background-color: #FF6B6B; color: white; padding: 20px; margin-bottom: 20px; }
          .details { background-color: #f9f9f9; padding: 20px; border-left: 4px solid #00A2FF; }
          pre { background-color: #21222C; color: #68FF8E; padding: 10px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="alert">
            <h2>⚠️ System Alert</h2>
            <p><strong>${subject}</strong></p>
          </div>
          <div class="details">
            <p>${message}</p>
            ${Object.keys(details).length > 0 ? `
              <h3>Details:</h3>
              <pre>${JSON.stringify(details, null, 2)}</pre>
            ` : ''}
            <p><em>Timestamp: ${new Date().toISOString()}</em></p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      GOPREDICT SYSTEM ALERT
      
      ${subject}
      
      ${message}
      
      ${Object.keys(details).length > 0 ? `Details:\n${JSON.stringify(details, null, 2)}` : ''}
      
      Timestamp: ${new Date().toISOString()}
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info('Admin notification sent', { subject, messageId: info.messageId });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Failed to send admin notification', { subject, error: error.message });
  }
}

module.exports = {
  sendMagicLink,
  sendAdminNotification
};
