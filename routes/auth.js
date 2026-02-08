// routes/auth.js
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';
import { db } from '../db.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

// ---------------------------
// SIGNUP
// ---------------------------
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const [existing] = await db.promise().query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    await db.promise().query(
      'INSERT INTO users (name, email, password, verification_code, verified) VALUES (?, ?, ?, ?, 0)',
      [name, email, hashedPassword, verificationCode]
    );

    // Send email via Resend
    try {
      await resend.emails.send({
        from: `CitySphere <${process.env.EMAIL_FROM}>`,
        to: [email],
        subject: 'CitySphere Verification Code',
        html: `<p>Hello <b>${name}</b>,</p><p>Your verification code is: <b>${verificationCode}</b></p><p>This code will expire in 10 minutes.</p>`
      });
      console.log(`Verification code sent to ${email}`);
      return res.status(200).json({ message: 'Verification code sent to email' });
    } catch (err) {
      console.error('Resend email error:', err);
      console.log(`Fallback verification code for ${email}: ${verificationCode}`);
      return res.status(200).json({
        message: 'Account created but email failed. Check console for code.',
        verificationCode
      });
    }

  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const [rows] = await db.promise().query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(400).json({ error: 'User not found' });

    const user = rows[0];

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Incorrect password' });

    if (!user.verified) return res.status(400).json({ error: 'Account not verified' });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ user: { id: user.id, name: user.name, email: user.email }, token });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


// ---------------------------
// RESEND VERIFICATION CODE
// ---------------------------
router.post('/resend-code', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const [rows] = await db.promise().query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(400).json({ error: 'User not found' });

    const user = rows[0];
    if (user.verified) return res.status(400).json({ error: 'User already verified' });

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    await db.promise().query(
      'UPDATE users SET verification_code = ? WHERE email = ?',
      [verificationCode, email]
    );

    try {
      await resend.emails.send({
        from: `CitySphere <${process.env.EMAIL_FROM}>`,
        to: [email],
        subject: 'CitySphere - New Verification Code',
        html: `<p>Hello <b>${user.name}</b>,</p><p>Your new verification code is: <b>${verificationCode}</b></p><p>This code will expire in 10 minutes.</p>`
      });
      console.log(`Resent verification code for ${email}`);
      res.status(200).json({ message: 'Verification code resent to email' });
    } catch (err) {
      console.error('Resend email error:', err);
      console.log(`Fallback code for ${email}: ${verificationCode}`);
      res.status(200).json({
        message: 'Code generated but email failed. Check console.',
        verificationCode
      });
    }

  } catch (err) {
    console.error('Resend code error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
