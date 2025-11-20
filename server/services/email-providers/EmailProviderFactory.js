const SMTPProvider = require('./SMTPProvider');
const logger = require('../../utils/logger');

class EmailProviderFactory {
  static createProvider(providerType, config) {
    const type = (providerType || 'smtp').toLowerCase();

    logger.info(`Initializing email provider: ${type}`);

    switch (type) {
      case 'smtp':
        return new SMTPProvider({
          host: config.SMTP_HOST,
          port: config.SMTP_PORT,
          secure: config.SMTP_SECURE,
          user: config.SMTP_USER,
          password: config.SMTP_PASSWORD,
          fromEmail: config.EMAIL_FROM
        });

      case 'ses':
        const SESProvider = require('./SESProvider');
        return new SESProvider({
          region: config.AWS_REGION,
          accessKeyId: config.AWS_ACCESS_KEY_ID,
          secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
          fromEmail: config.EMAIL_FROM
        });

      case 'postmark':
        const PostmarkProvider = require('./PostmarkProvider');
        return new PostmarkProvider({
          serverToken: config.POSTMARK_SERVER_TOKEN,
          fromEmail: config.EMAIL_FROM
        });

      default:
        throw new Error(`Unknown email provider: ${providerType}. Supported: smtp, ses, postmark`);
    }
  }
}

module.exports = EmailProviderFactory;
