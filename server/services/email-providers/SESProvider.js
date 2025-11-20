const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const BaseEmailProvider = require('./BaseEmailProvider');
const logger = require('../../utils/logger');

class SESProvider extends BaseEmailProvider {
  constructor(config) {
    super(config);
    
    this.client = new SESClient({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    });
  }

  async sendEmail(options) {
    try {
      const command = new SendEmailCommand({
        Source: this.config.fromEmail,
        Destination: {
          ToAddresses: [options.to]
        },
        Message: {
          Subject: {
            Data: options.subject,
            Charset: 'UTF-8'
          },
          Body: {
            Html: {
              Data: options.html,
              Charset: 'UTF-8'
            },
            Text: {
              Data: options.text,
              Charset: 'UTF-8'
            }
          }
        }
      });

      const response = await this.client.send(command);
      
      logger.info('Email sent via AWS SES', { 
        to: options.to, 
        messageId: response.MessageId
      });

      return {
        success: true,
        messageId: response.MessageId
      };
    } catch (error) {
      logger.error('AWS SES send failed', { 
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
      if (this.config.accessKeyId && this.config.secretAccessKey) {
        logger.info('AWS SES provider configured');
        return true;
      }
      return false;
    } catch (error) {
      logger.error('AWS SES verification failed', { error: error.message });
      return false;
    }
  }

  getName() {
    return 'AWS SES';
  }
}

module.exports = SESProvider;
