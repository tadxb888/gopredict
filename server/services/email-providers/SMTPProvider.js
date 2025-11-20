const nodemailer = require('nodemailer');
const BaseEmailProvider = require('./BaseEmailProvider');
const logger = require('../../utils/logger');

class SMTPProvider extends BaseEmailProvider {
  constructor(config) {
    super(config);
    
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: parseInt(config.port || '587'),
      secure: config.secure === 'true',
      auth: {
        user: config.user,
        pass: config.password
      }
    });
  }

  async sendEmail(options) {
    try {
      const mailOptions = {
        from: this.config.fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      logger.info('Email sent via SMTP', { 
        to: options.to, 
        messageId: info.messageId 
      });

      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      logger.error('SMTP send failed', { 
        error: error.message,
        to: options.to 
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  async verify() {
    try {
      await this.transporter.verify();
      logger.info('SMTP provider verified successfully');
      return true;
    } catch (error) {
      logger.error('SMTP verification failed', { error: error.message });
      return false;
    }
  }

  getName() {
    return 'SMTP (Gmail)';
  }
}

module.exports = SMTPProvider;
