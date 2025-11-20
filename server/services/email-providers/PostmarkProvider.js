const postmark = require('postmark');
const BaseEmailProvider = require('./BaseEmailProvider');
const logger = require('../../utils/logger');

class PostmarkProvider extends BaseEmailProvider {
  constructor(config) {
    super(config);
    
    this.client = new postmark.ServerClient(config.serverToken);
  }

  async sendEmail(options) {
    try {
      const response = await this.client.sendEmail({
        From: this.config.fromEmail,
        To: options.to,
        Subject: options.subject,
        HtmlBody: options.html,
        TextBody: options.text,
        MessageStream: 'outbound'
      });
      
      logger.info('Email sent via Postmark', { 
        to: options.to, 
        messageId: response.MessageID
      });

      return {
        success: true,
        messageId: response.MessageID
      };
    } catch (error) {
      logger.error('Postmark send failed', { 
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
      await this.client.getServer();
      logger.info('Postmark provider verified successfully');
      return true;
    } catch (error) {
      logger.error('Postmark verification failed', { error: error.message });
      return false;
    }
  }

  getName() {
    return 'Postmark';
  }
}

module.exports = PostmarkProvider;
