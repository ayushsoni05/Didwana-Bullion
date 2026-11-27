import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { pool } from '../db/pool.js';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
});

export function signAuthToken(user, sessionId = null) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured.');
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role || 'USER',
      sid: sessionId,
    },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
}

export function generateRefreshToken() {
  return crypto.randomBytes(48).toString('hex');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }
}

export async function requireAdmin(req, res, next) {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const result = await pool.query(
      'SELECT id, role, is_blocked FROM users WHERE id = $1 LIMIT 1',
      [userId]
    );
    const row = result.rows[0];
    if (!row || row.is_blocked) {
      return res.status(403).json({ error: 'Account inactive or suspended.' });
    }
    if (row.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin privileges required.' });
    }
    req.adminUser = row;
    return next();
  } catch (err) {
    console.error('Admin verification error:', err.message);
    return res.status(500).json({ error: 'Unable to verify admin privileges.' });
  }
}
