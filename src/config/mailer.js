const nodemailer = require('nodemailer');

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

  if (user && pass) {
    if (user.includes('@gmail.com') && !host) {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
      });
    }

    return nodemailer.createTransport({
      host: host || 'smtp.gmail.com',
      port: port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  // Fallback test transporter for local development / testing when SMTP is unconfigured
  return {
    isMock: true,
    sendMail: async (mailOptions) => {
      console.log('📧 [MOCK EMAIL DISPATCHED] (Configure SMTP_USER & SMTP_PASS in .env to send real emails)');
      console.log(`   To: ${mailOptions.to}`);
      console.log(`   Subject: ${mailOptions.subject}`);
      console.log(`   Attachments: ${(mailOptions.attachments || []).map(a => a.filename).join(', ') || 'None'}`);
      return {
        messageId: `mock-${Date.now()}`,
        response: '250 Mock email accepted',
      };
    },
  };
}

const transporter = createTransporter();

module.exports = {
  transporter,
  createTransporter,
};
