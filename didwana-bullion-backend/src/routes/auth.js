import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import { authLimiter, requireAuth, signAuthToken } from '../middleware/auth.js';

const router = Router();

function isStrongPassword(pw) {
  return (
    typeof pw === 'string' &&
    pw.length >= 8 &&
    /[A-Z]/.test(pw) &&
    /[a-z]/.test(pw) &&
    /[0-9]/.test(pw) &&
    /[^A-Za-z0-9]/.test(pw)
  );
}

function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length < 10) return null;
  return `+91${digits.slice(-10)}`;
}

function sanitizeUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    acceptedLegalVersion: row.accepted_legal_version,
    acceptedLegalAt: row.accepted_legal_at,
    cookieFunctional: row.cookie_functional,
    createdAt: row.created_at,
  };
}

router.post('/signup', authLimiter, async (req, res) => {
  try {
    const { name, email, phone, password, acceptedLegal } = req.body || {};

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: 'Name, email, phone, and password are required.' });
    }
    if (!acceptedLegal) {
      return res.status(400).json({
        error: 'You must accept the Terms & Conditions, Privacy Policy, and Cookie Notice.',
      });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters with uppercase, lowercase, number, and symbol.',
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone) {
      return res.status(400).json({ error: 'Valid 10-digit Indian mobile number is required.' });
    }

    const existing = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = $1 OR phone = $2 LIMIT 1',
      [cleanEmail, cleanPhone]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email or mobile already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (name, email, phone, password_hash, accepted_legal_version, accepted_legal_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id, name, email, phone, accepted_legal_version, accepted_legal_at, cookie_functional, created_at`,
      [String(name).trim(), cleanEmail, cleanPhone, passwordHash, '1.0.0']
    );

    const user = sanitizeUser(result.rows[0]);
    const token = signAuthToken(user);
    return res.status(201).json({ token, user });
  } catch (err) {
    console.error('Signup error:', err.message);
    return res.status(500).json({ error: 'Unable to create account right now.' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, phone, identifier, password } = req.body || {};
    const rawId = String(identifier || email || phone || '').trim();

    if (!rawId || !password) {
      return res.status(400).json({ error: 'Email or mobile number and password are required.' });
    }

    const isEmail = rawId.includes('@');
    const query = isEmail
      ? 'SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1'
      : 'SELECT * FROM users WHERE phone = $1 LIMIT 1';
    const param = isEmail ? rawId.toLowerCase() : normalizePhone(rawId) || rawId;

    const result = await pool.query(query, [param]);
    const row = result.rows[0];
    if (!row) {
      return res.status(401).json({ error: 'Invalid email/mobile or password.' });
    }

    const valid = await bcrypt.compare(password, row.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email/mobile or password.' });
    }

    const user = sanitizeUser(row);
    const token = signAuthToken(user);
    return res.json({ token, user });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ error: 'Unable to sign in right now.' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, phone, accepted_legal_version, accepted_legal_at, cookie_functional, created_at
       FROM users WHERE id = $1 LIMIT 1`,
      [req.user.sub]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ user: sanitizeUser(result.rows[0]) });
  } catch (err) {
    console.error('Get me error:', err.message);
    return res.status(500).json({ error: 'Unable to fetch user profile' });
  }
});

router.patch('/preferences', requireAuth, async (req, res) => {
  try {
    const { cookieFunctional } = req.body || {};
    const result = await pool.query(
      `UPDATE users
       SET cookie_functional = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, name, email, phone, accepted_legal_version, accepted_legal_at, cookie_functional, created_at`,
      [Boolean(cookieFunctional), req.user.sub]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ user: sanitizeUser(result.rows[0]) });
  } catch (err) {
    console.error('Preferences error:', err.message);
    return res.status(500).json({ error: 'Unable to update preferences' });
  }
});

router.delete('/me', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.user.sub]);
    return res.json({ success: true, message: 'Account and personal data deleted.' });
  } catch (err) {
    console.error('Delete account error:', err.message);
    return res.status(500).json({ error: 'Unable to delete account' });
  }
});

export default router;
