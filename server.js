// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import authMeRoutes from './routes/authMe.js';
import { db } from './db.js';

dotenv.config();
const app = express();

app.use(cors({
  origin: 'https://cityspherre.netlify.app',
  credentials: true
}));

app.use(express.json());

// ✅ Test MySQL connection (mysql2 pool style)
(async () => {
  try {
    await db.query('SELECT 1');
    console.log('✅ MySQL connected successfully');
  } catch (err) {
    console.error('❌ MySQL connection error:', err);
    process.exit(1);
  }
})();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', authMeRoutes);

// Health check
app.get('/', (req, res) => {
  res.send('CitySphere Backend is running 🚀');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

