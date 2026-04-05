require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: { rejectUnauthorized: false },
});

console.log('Testing with:', process.env.EMAIL_USER);

transporter.verify((err) => {
  if (err) {
    console.log('FAILED:', err.message);
  } else {
    console.log('SUCCESS! Sending test email...');
    transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: 'Pharmacy Test Email',
      text: 'Email is working!',
    }, (err2, info) => {
      if (err2) console.log('Send failed:', err2.message);
      else console.log('Email sent! ID:', info.messageId);
      process.exit(0);
    });
  }
});

setTimeout(() => {
  console.log('TIMEOUT - Network is blocking SMTP port 587');
  process.exit(1);
}, 15000);
