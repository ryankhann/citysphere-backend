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
        <p>Hello ${name},</p>
        <p>Your verification code is:</p>
        <h1>${code}</h1>
        <p>This code expires in 10 minutes.</p>
      `
    });
    
    if (error) {
      console.error('Email error:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
};