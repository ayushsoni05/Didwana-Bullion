import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { initDb, pool } from './db/pool.js';
import authRoutes from './routes/auth.js';

const app = express();
const PORT = Number(process.env.PORT || 5050);

app.use(helmet());
app.use(
  cors({
    origin: [
      'https://localhost',
      'http://localhost',
      'http://localhost:5173',
      'capacitor://localhost',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '100kb' }));

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.json({ status: 'ok', database: 'postgresql' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

app.use('/api/auth', authRoutes);

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Didwana Bullion PostgreSQL Auth Backend running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize PostgreSQL database:', err.message);
    process.exit(1);
  });
