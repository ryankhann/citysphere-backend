import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { Resend } from 'resend';

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

// =====================
// SIGNUP → SEND CODE
// =====================
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const [existing] = await db.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await db.query(
      `INSERT INTO users (name, email, password, verification_code, is_verified)
       VALUES (?, ?, ?, ?, false)`,
      [name, email, hashedPassword, code]
    );

    // Send email
    try {
      await resend.emails.send({
        from: 'CitySphere <onboarding@resend.dev>',
        to: email,
        subject: 'Your CitySphere Verification Code',
        html: `<h2>Your verification code</h2><p><b>${code}</b></p>`
      });
    } catch (emailErr) {
      console.error('Email failed:', emailErr);
    }

    res.json({
      message: 'Verification code sent',
      verificationCode: code // dev/demo fallback
    });

  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// =====================
// VERIFY CODE
// =====================
router.post('/verify', async (req, res) => {
  try {
    const { email, code } = req.body;

    const [rows] = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'User not found' });
    }

    const user = rows[0];

    if (user.verification_code !== code) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    await db.query(
      'UPDATE users SET is_verified = true, verification_code = NULL WHERE id = ?',
      [user.id]
    );

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      user: { id: user.id, name: user.name, email: user.email },
      token
    });

  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// =====================
// LOGIN
// =====================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const [rows] = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];

    if (!user.is_verified) {
      return res.status(403).json({ error: 'Email not verified' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      user: { id: user.id, name: user.name, email: user.email },
      token
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;