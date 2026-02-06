import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import authMeRoutes from './routes/authMe.js';
import { db } from './db.js';

dotenv.config();
const app = express();

// ✅ Enable CORS for your frontend
app.use(cors({
  origin: 'https://cityspherre.netlify.app',
  credentials: true
}));

// ✅ Parse JSON requests
app.use(express.json());

// ✅ Connect to MySQL
db.connect(err => {
  if (err) {
    console.error('❌ MySQL connection error:', err);
    process.exit(1);
  } else {
    console.log('✅ MySQL connected successfully');
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/auth', authMeRoutes);


app.get('/', (req, res) => {
  res.send('CitySphere Backend is running 🚀');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

