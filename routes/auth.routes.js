import express from 'express';
import {
  signup,
  verify,
  login,
  me
} from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/verify', verify);
router.post('/login', login);
router.get('/me', authMiddleware, me);

export default router;
