import jwt from 'jsonwebtoken';
import { db } from '../db.js';

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [rows] = await db.promise().query(
      'SELECT id, name, email FROM users WHERE id = ?',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = rows[0]; // ✅ THIS is what frontend needs
    next();
  } catch (err) {
    console.error('JWT error:', err);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export default authMiddleware;
