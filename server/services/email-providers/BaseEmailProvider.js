class BaseEmailProvider {
  constructor(config) {
    this.config = config;
  }

  async sendEmail(options) {
    throw new Error('sendEmail() must be implemented by provider');
  }

  async verify() {
    throw new Error('verify() must be implemented by provider');
  }

  getName() {
    throw new Error('getName() must be implemented by provider');
  }
}

module.exports = BaseEmailProvider;
