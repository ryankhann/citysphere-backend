import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';
import { db } from '../db.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

/* ===========================
   SIGNUP – SEND VERIFICATION
=========================== */
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }

    // Check if user already exists
    const [existing] = await db.promise().query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Save user
    await db.promise().query(
      'INSERT INTO users (name, email, password, verification_code, verified) VALUES (?, ?, ?, ?, 0)',
      [name, email, hashedPassword, verificationCode]
    );

    console.log('🟡 Sending verification email to:', email);

    // Send verification email
    const { error } = await resend.emails.send({
      from: 'CitySphere <noreply@resend.dev>',
      to: [email],
      subject: 'CitySphere Verification Code',
      html: `
        <h2>Verify your CitySphere account</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your verification code is:</p>
        <h1>${verificationCode}</h1>
        <p>This code expires in 10 minutes.</p>
      `
    });

    // If email fails, still allow verification (dev-friendly)
    if (error) {
      console.error('❌ Resend email failed:', error);
      console.log(`🟡 Verification code for ${email}: ${verificationCode}`);

      return res.status(200).json({
        message: 'Account created but email failed. Use code shown in console.',
        verificationCode // dev fallback
      });
    }

    console.log('✅ Verification email sent to:', email);

    return res.status(200).json({
      message: 'Verification code sent to email'
    });

  } catch (err) {
    console.error('❌ Signup error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/* ===========================
   VERIFY CODE & LOGIN
=========================== */
router.post('/verify', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code required' });
    }

    const [rows] = await db.promise().query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'User not found' });
    }

    const user = rows[0];

    if (user.verified) {
      return res.status(400).json({ error: 'User already verified' });
    }

    if (user.verification_code !== code) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // Mark user verified
    await db.promise().query(
      'UPDATE users SET verified = 1, verification_code = NULL WHERE email = ?',
      [email]
    );

    // Create JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      message: 'Account verified successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });

  } catch (err) {
    console.error('❌ Verification error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/* ===========================
   RESEND VERIFICATION CODE
=========================== */
router.post('/resend-code', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const [rows] = await db.promise().query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'User not found' });
    }

    const user = rows[0];

    if (user.verified) {
      return res.status(400).json({ error: 'User already verified' });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    await db.promise().query(
      'UPDATE users SET verification_code = ? WHERE email = ?',
      [verificationCode, email]
    );

    console.log('🟡 Resending verification code to:', email);

    const { error } = await resend.emails.send({
      from: 'CitySphere <noreply@resend.dev>',
      to: [email],
      subject: 'CitySphere – New Verification Code',
      html: `
        <h2>New verification code</h2>
        <p>Hello <strong>${user.name}</strong>,</p>
        <p>Your new verification code is:</p>
        <h1>${verificationCode}</h1>
      `
    });

    if (error) {
      console.error('❌ Resend failed:', error);
      console.log(`🟡 Resent code for ${email}: ${verificationCode}`);

      return res.status(200).json({
        message: 'Email failed. Use code from console.',
        verificationCode
      });
    }

    console.log('✅ Verification code resent to:', email);

    return res.status(200).json({
      message: 'Verification code resent successfully'
    });

  } catch (err) {
    console.error('❌ Resend error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
