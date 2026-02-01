import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { sendEmail } from '../utils/sendEmail.js';

export const signup = async (req, res) => {
  const { name, email, password } = req.body;
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await db.query(
      `INSERT INTO users (name, email, password, verification_code)
       VALUES (?, ?, ?, ?)`,
      [name, email, hashedPassword, code]
    );

    await sendEmail(email, code);
    res.json({ message: 'Verification code sent', verificationCode: code });
  } catch (err) {
    res.status(400).json({ error: 'Email already exists' });
  }
};

export const verify = async (req, res) => {
  const { email, code } = req.body;

  const [rows] = await db.query(
    `SELECT * FROM users WHERE email = ? AND verification_code = ?`,
    [email, code]
  );

  if (!rows.length) {
    return res.status(400).json({ error: 'Invalid code' });
  }

  await db.query(
    `UPDATE users SET is_verified = true, verification_code = NULL WHERE email = ?`,
    [email]
  );

  const user = rows[0];
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

  res.json({
    user: { id: user.id, name: user.name, email: user.email },
    token
  });
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  const [rows] = await db.query(`SELECT * FROM users WHERE email = ?`, [email]);
  if (!rows.length) return res.status(400).json({ error: 'Invalid credentials' });

  const user = rows[0];
  if (!user.is_verified) return res.status(403).json({ error: 'Email not verified' });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

  res.json({
    user: { id: user.id, name: user.name, email: user.email },
    token
  });
};

export const me = async (req, res) => {
  const [rows] = await db.query(
    `SELECT id, name, email FROM users WHERE id = ?`,
    [req.userId]
  );
  res.json({ user: rows[0] });
};
