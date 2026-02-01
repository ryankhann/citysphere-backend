import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// GET current logged-in user
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

export default router;
