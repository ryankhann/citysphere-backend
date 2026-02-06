import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async (to, code, name) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'CitySphere <onboarding@resend.dev>',
      to,
      subject: "CitySphere Verification Code",
      html: `
        <h2>Verify your CitySphere account</h2>
        <p>Hello <b>${name}</b>,</p>
        <p>Your verification code is:</p>
        <h1>${code}</h1>
        <p>This code will expire in 10 minutes.</p>
      `
    });

    if (error) {
      console.error('Resend email error:', error);
      return { success: false, code }; // Return code for demo
    }

    console.log(`Email sent successfully to ${to}: ${code}`);
    return { success: true };
  } catch (err) {
    console.error('Email sending failed:', err);
    return { success: false, code }; // Return code for demo
  }
};
