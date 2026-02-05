import nodemailer from 'nodemailer';

export const sendEmail = async (to, code) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  await transporter.sendMail({
    from: `"CitySphere" <${process.env.EMAIL_USER}>`,
    to,
    subject: "CitySphere Verification Code",
    html: `
      <h2>Verify your CitySphere account</h2>
      <p>Your verification code is:</p>
      <h1>${code}</h1>
      <p>This code expires soon.</p>
    `
  });
};


