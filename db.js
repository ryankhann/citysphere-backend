import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

export const db = mysql.createPool({
  host: process.env.DB_HOST,       // from .env or Render
  port: process.env.DB_PORT,       // from .env or Render
  user: process.env.DB_USER,       // from .env or Render
  password: process.env.DB_PASSWORD, // from .env or Render
  database: process.env.DB_NAME,     // from .env or Render
  ssl: { rejectUnauthorized: false } // important for Aiven self-signed certificate
});
