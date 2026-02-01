import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import authMeRoutes from './routes/authMe.js';
import { db } from './db.js';

dotenv.config();
const app = express();

app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(express.json());

// Test DB connection
db.connect(err => {
  if (err) throw err;
  console.log('✅ MySQL connected successfully');
});

app.use('/api/auth', authRoutes);
app.use('/api/auth', authMeRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
