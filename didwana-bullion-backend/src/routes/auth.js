import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { logAudit, pool } from '../db/pool.js';
import {
  authLimiter,
  generateRefreshToken,
  hashToken,
  requireAuth,
  signAuthToken,
} from '../middleware/auth.js';

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

async function createSession(user, req) {
  const refreshToken = generateRefreshToken();
  const refreshHash = hashToken(refreshToken);
  const deviceName = String(req.headers['user-agent'] || 'Didwana Bullion Android').slice(0, 150);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const sessionRes = await pool.query(
    `INSERT INTO user_sessions (user_id, refresh_token_hash, device_name, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [user.id, refreshHash, deviceName, req.ip || null, expiresAt]
  );

  const sessionId = sessionRes.rows[0].id;
  const token = signAuthToken(user, sessionId);
  return { token, refreshToken, sessionId };
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
    const { token, refreshToken } = await createSession(user, req);
    await logAudit(user.id, 'SIGNUP', req.ip, 'Account created');
    return res.status(201).json({ token, refreshToken, user });
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
      await logAudit(null, 'LOGIN_FAILED', req.ip, `Unknown identifier: ${param}`);
      return res.status(401).json({ error: 'Invalid email/mobile or password.' });
    }

    const valid = await bcrypt.compare(password, row.password_hash);
    if (!valid) {
      await logAudit(row.id, 'LOGIN_FAILED', req.ip, 'Incorrect password');
      return res.status(401).json({ error: 'Invalid email/mobile or password.' });
    }

    const user = sanitizeUser(row);
    const { token, refreshToken } = await createSession(user, req);
    await logAudit(user.id, 'LOGIN_SUCCESS', req.ip, 'Signed in');
    return res.json({ token, refreshToken, user });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ error: 'Unable to sign in right now.' });
  }
});

router.post('/refresh', authLimiter, async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required.' });
    }

    const tokenHash = hashToken(refreshToken);
    const sessionRes = await pool.query(
      `SELECT s.*, u.id AS u_id, u.name, u.email, u.phone, u.accepted_legal_version, u.accepted_legal_at, u.cookie_functional, u.created_at
       FROM user_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.refresh_token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > NOW()
       LIMIT 1`,
      [tokenHash]
    );

    if (!sessionRes.rows.length) {
      return res.status(401).json({ error: 'Session expired or revoked. Please sign in again.' });
    }

    const row = sessionRes.rows[0];
    const nextRefresh = generateRefreshToken();
    const nextHash = hashToken(nextRefresh);
    const nextExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await pool.query(
      `UPDATE user_sessions
       SET refresh_token_hash = $1, last_active_at = NOW(), expires_at = $2, ip_address = $3
       WHERE id = $4`,
      [nextHash, nextExpires, req.ip || null, row.id]
    );

    const user = sanitizeUser({ ...row, id: row.u_id });
    const token = signAuthToken(user, row.id);
    return res.json({ token, refreshToken: nextRefresh, user });
  } catch (err) {
    console.error('Refresh error:', err.message);
    return res.status(500).json({ error: 'Unable to refresh session.' });
  }
});

router.post('/logout', requireAuth, async (req, res) => {
  try {
    if (req.user.sid) {
      await pool.query('UPDATE user_sessions SET revoked_at = NOW() WHERE id = $1 AND user_id = $2', [
        req.user.sid,
        req.user.sub,
      ]);
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('Logout error:', err.message);
    return res.status(500).json({ error: 'Unable to log out cleanly.' });
  }
});

router.post('/logout-all', requireAuth, async (req, res) => {
  try {
    await pool.query(
      'UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
      [req.user.sub]
    );
    await logAudit(req.user.sub, 'SESSION_REVOKED', req.ip, 'Signed out all devices');
    return res.json({ success: true });
  } catch (err) {
    console.error('Logout all error:', err.message);
    return res.status(500).json({ error: 'Unable to revoke sessions.' });
  }
});

router.get('/sessions', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, device_name, ip_address, last_active_at, created_at
       FROM user_sessions
       WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
       ORDER BY last_active_at DESC LIMIT 20`,
      [req.user.sub]
    );
    return res.json({
      sessions: result.rows.map((r) => ({ ...r, isCurrent: r.id === req.user.sid })),
    });
  } catch (err) {
    console.error('Sessions error:', err.message);
    return res.status(500).json({ error: 'Unable to load active sessions.' });
  }
});

router.delete('/sessions/:id', requireAuth, async (req, res) => {
  try {
    await pool.query(
      'UPDATE user_sessions SET revoked_at = NOW() WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.sub]
    );
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Unable to revoke session.' });
  }
});

router.post('/change-password', requireAuth, authLimiter, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required.' });
    }
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        error: 'New password must be 8+ chars with uppercase, lowercase, number, and symbol.',
      });
    }

    const result = await pool.query('SELECT id, password_hash FROM users WHERE id = $1 LIMIT 1', [
      req.user.sub,
    ]);
    if (!result.rows.length) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const nextHash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
      nextHash,
      req.user.sub,
    ]);
    await logAudit(req.user.sub, 'PASSWORD_CHANGED', req.ip, 'Password updated');
    return res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Change password error:', err.message);
    return res.status(500).json({ error: 'Unable to update password.' });
  }
});

router.get('/audit-logs', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, event_type, ip_address, details, created_at
       FROM audit_logs WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 20`,
      [req.user.sub]
    );
    return res.json({ logs: result.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Unable to load security activity.' });
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
    await logAudit(req.user.sub, 'ACCOUNT_DELETED', req.ip, 'User deleted account');
    await pool.query('DELETE FROM users WHERE id = $1', [req.user.sub]);
    return res.json({ success: true, message: 'Account and personal data deleted.' });
  } catch (err) {
    console.error('Delete account error:', err.message);
    return res.status(500).json({ error: 'Unable to delete account' });
  }
});

export default router;
