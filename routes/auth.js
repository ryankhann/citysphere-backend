import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';
import { db } from '../db.js';

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

// =======================
// SIGNUP → SEND CODE
// =======================
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const [existing] = await db.promise().query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    await db.promise().query(
      `INSERT INTO users (name, email, password, verification_code, verified)
       VALUES (?, ?, ?, ?, 0)`,
      [name, email, hashedPassword, verificationCode]
    );

    await resend.emails.send({
      from: 'CitySphere <onboarding@resend.dev>', // ✅ REQUIRED
      to: email,
      subject: 'Verify your CitySphere account',
      html: `
        <h2>Welcome to CitySphere</h2>
        <p>Your verification code is:</p>
        <h1>${verificationCode}</h1>
        <p>This code expires in 10 minutes.</p>
      `
    });

    res.json({ message: 'Verification code sent' });

  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// =======================
// VERIFY CODE
// =======================
router.post('/verify', async (req, res) => {
  try {
    const { email, code } = req.body;

    const [rows] = await db.promise().query(
      'SELECT * FROM users WHERE email = ? AND verification_code = ?',
      [email, code]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    const user = rows[0];

    await db.promise().query(
      'UPDATE users SET verified = 1, verification_code = NULL WHERE id = ?',
      [user.id]
    );

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });

  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// =======================
// LOGIN
// =======================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const [rows] = await db.promise().query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];

    if (!user.verified) {
      return res.status(403).json({ error: 'Please verify your email first' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
