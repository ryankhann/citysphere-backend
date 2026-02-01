import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { db } from '../db.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

// Email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  tls: { rejectUnauthorized: false }
});

// SIGNUP
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });

    const [existing] = await db.promise().query('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(400).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    await db.promise().query(
      'INSERT INTO users (name, email, password, verification_code, verified) VALUES (?, ?, ?, ?, 0)',
      [name, email, hashedPassword, verificationCode]
    );

    await transporter.sendMail({
      from: `"CitySphere" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'CitySphere Verification Code',
      text: `Hello ${name}, your verification code is: ${verificationCode}`,
      html: `<p>Hello <b>${name}</b>,</p><p>Your verification code is: <b>${verificationCode}</b></p>`
    });

    console.log(`Verification code for ${email}: ${verificationCode}`);
    res.status(200).json({ message: 'Verification code sent', verificationCode }); // send for demo
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// VERIFY CODE
router.post('/verify', async (req, res) => {
  try {
    const { email, code } = req.body;
    const [rows] = await db.promise().query('SELECT * FROM users WHERE email = ? AND verification_code = ?', [email, code]);

    if (rows.length === 0) return res.status(400).json({ error: 'Invalid code' });

    await db.promise().query('UPDATE users SET verified = 1, verification_code = NULL WHERE email = ?', [email]);

    const user = rows[0];
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({ message: 'User verified', user: { id: user.id, name: user.name, email: user.email }, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await db.promise().query('SELECT * FROM users WHERE email = ?', [email]);

    if (rows.length === 0) return res.status(400).json({ error: 'Invalid email or password' });

    const user = rows[0];
    if (!user.verified) return res.status(400).json({ error: 'Please verify your email first' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(200).json({ user: { id: user.id, name: user.name, email: user.email }, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


export default router;
