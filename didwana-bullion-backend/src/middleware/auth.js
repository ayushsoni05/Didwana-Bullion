import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
});

export function signAuthToken(user, sessionId = null) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured.');
  return jwt.sign(
    { sub: user.id, email: user.email, phone: user.phone, sid: sessionId },
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
