import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { initDb, pool } from './db/pool.js';
import authRoutes from './routes/auth.js';
import alertRoutes from './routes/alerts.js';
import newsRoutes from './routes/news.js';
import publicConfigRoutes from './routes/publicConfig.js';
import adminRoutes from './routes/admin.js';

const app = express();
const PORT = Number(process.env.PORT || 5050);

// Required behind Render's reverse proxy for accurate rate limiting & client IPs
app.set('trust proxy', 1);

const extraOrigins = String(process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  'https://localhost',
  'http://localhost',
  'http://localhost:5173',
  'http://localhost:4173',
  'capacitor://localhost',
  ...extraOrigins,
]);

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      if (
        /^https:\/\/[a-z0-9-]+\.(onrender\.com|github\.io|vercel\.app|netlify\.app)$/i.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '250kb' }));

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.json({ status: 'ok', database: 'postgresql', version: '9.0.0' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/public', publicConfigRoutes);
app.use('/api/admin', adminRoutes);

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Didwana Bullion PostgreSQL Backend v9 running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize PostgreSQL database:', err.message);
    process.exit(1);
  });
