import nodemailer from 'nodemailer';

/**
 * Configure SMTP transporter using env variables
 */
const getTransporter = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    console.warn('\n[MAILER WARNING] Email credentials (EMAIL_USER/EMAIL_PASS) are not configured in your server/.env file. Emails will be simulated and logged below instead.\n');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true', // true for port 465, false for 587
    auth: {
      user: user,
      pass: pass,
    },
  });
};

/**
 * Send an email to the specified recipient
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject line
 * @param {string} [options.text] - Plain text content
 * @param {string} [options.html] - HTML content
 */
export const sendEmail = async ({ to, subject, text, html }) => {
  const transporter = getTransporter();
  
  if (!transporter) {
    console.log('========================================================================');
    console.log(`[EMAIL SIMULATED SEND]`);
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    if (text) console.log(`Text:\n${text}`);
    if (html) console.log(`HTML Length: ${html.length} chars (contains premium formatting)`);
    console.log('========================================================================\n');
    return { message: 'Transporter not configured. Simulation logged to console.', messageId: 'simulated' };
  }

  const mailOptions = {
    from: `"VendorBridge ERP" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[MAILER SUCCESS] Email sent to ${to}: messageId=${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[MAILER ERROR] Failed to send email to ${to}:`, error.message);
    throw error;
  }
};
