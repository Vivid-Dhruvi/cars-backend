const nodemailer = require('nodemailer');

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const rawUser = process.env.SMTP_USER || process.env.GMAIL_USER || process.env.EMAIL_USER;
  const rawPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASS || process.env.SMTP_PASSWORD;

  const user = rawUser ? rawUser.trim() : null;
  // Remove spaces that Google puts in 16-digit App Passwords (e.g. 'abcd efgh ijkl mnop' -> 'abcdefghijklmnop')
  const pass = rawPass ? rawPass.trim().replace(/\s+/g, '') : null;

  if (user && pass && user !== 'your_gmail_address@gmail.com' && pass !== 'your_16_digit_app_password') {
    if ((user.includes('@gmail.com') || process.env.SMTP_SERVICE === 'gmail') && !host) {
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
        response: '250 Mock email accepted (Simulated mode)',
      };
    },
  };
}

module.exports = {
  getTransporter,
};

