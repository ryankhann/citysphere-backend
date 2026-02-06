import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';
import { db } from '../db.js';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

const resend = new Resend(process.env.RESEND_API_KEY);

// SIGNUP
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields required' });
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

    const { error } = await resend.emails.send({
      from: 'Resend <no-reply@resend.dev>',
      to: [email],
      subject: 'CitySphere Verification Code',
      html: `
        <h2>CitySphere Verification</h2>
        <p>Hello <b>${name}</b>,</p>
        <p>Your verification code is:</p>
        <h1>${verificationCode}</h1>
        <p>This code expires in 10 minutes.</p>
      `
    });

    if (error) {
      console.error('❌ Resend error:', error);
      return res.status(200).json({
        emailSent: false,
        verificationCode
      });
    }

    console.log(`✅ Verification email sent to ${email}`);
    res.status(200).json({ emailSent: true });

  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
