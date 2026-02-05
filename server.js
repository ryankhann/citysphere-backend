import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import authMeRoutes from './routes/authMe.js';
import { db } from './db.js';

dotenv.config();
const app = express();


app.use(cors({
  origin: 'https://urbancitysphere.netlify.app',
  credentials: true
}));


app.use(express.json());

db.connect(err => {
  if (err) {
    console.error('❌ MySQL connection error:', err);
    process.exit(1); // stop server if DB not connected
  } else {
    console.log('✅ MySQL connected successfully');
  }
});

// ✅ Routes
app.use('/api/auth', authRoutes);   // signup, login, verify, resend-code
app.use('/api/auth', authMeRoutes); // /me route to get current user info

// ✅ Default route for testing
app.get('/', (req, res) => {
  res.send('CitySphere Backend is running 🚀');
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
