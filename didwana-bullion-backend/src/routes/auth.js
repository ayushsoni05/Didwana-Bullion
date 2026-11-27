import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { isOwnerAccount, logAudit, pool } from '../db/pool.js';
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
    role: row.role || 'USER',
    isBlocked: Boolean(row.is_blocked),
    appVersion: row.app_version || null,
    lastCity: row.last_city || null,
    lastState: row.last_state || null,
    lastSeenAt: row.last_seen_at || null,
    acceptedLegalVersion: row.accepted_legal_version,
    acceptedLegalAt: row.accepted_legal_at,
    cookieFunctional: row.cookie_functional,
    createdAt: row.created_at,
  };
}

function extractClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) {
    return fwd.split(',')[0].trim();
  }
  return req.ip || null;
}

async function resolveGeoContext({ latitude, longitude, ipAddress }) {
  // Reverse-geocode GPS coordinates if provided
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 3000);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
          latitude
        )}&lon=${encodeURIComponent(longitude)}`,
        {
          headers: { 'User-Agent': 'DidwanaBullionBackend/9.0 (newmonikajewellers1999@gmail.com)' },
          signal: ctrl.signal,
        }
      );
      clearTimeout(t);
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        return {
          city: addr.city || addr.town || addr.village || addr.county || null,
          state: addr.state || null,
          pincode: addr.postcode || null,
          address: data.display_name ? String(data.display_name).slice(0, 320) : null,
        };
      }
    } catch {
      // Ignore reverse-geocode timeout
    }
    return null;
  }

  // Network IP fallback when GPS permission was declined
  const cleanIp = String(ipAddress || '').replace(/^::ffff:/, '').trim();
  if (!cleanIp || cleanIp === '127.0.0.1' || cleanIp === '::1') return null;

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(cleanIp)}`, {
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (res.ok) {
      const d = await res.json();
      if (d.success !== false) {
        return {
          latitude: Number.isFinite(Number(d.latitude)) ? Number(d.latitude) : null,
          longitude: Number.isFinite(Number(d.longitude)) ? Number(d.longitude) : null,
          city: d.city || null,
          state: d.region || null,
          pincode: d.postal || null,
          address: [d.city, d.region, d.country].filter(Boolean).join(', ') || null,
        };
      }
    }
  } catch {
    // Ignore IP lookup timeout
  }
  return null;
}

async function createSession(user, req) {
  const refreshToken = generateRefreshToken();
  const refreshHash = hashToken(refreshToken);
  const deviceName = String(req.headers['user-agent'] || 'Didwana Bullion Android').slice(0, 150);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const clientIp = extractClientIp(req);

  const sessionRes = await pool.query(
    `INSERT INTO user_sessions (user_id, refresh_token_hash, device_name, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [user.id, refreshHash, deviceName, clientIp, expiresAt]
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

    const ownerAccount = isOwnerAccount(cleanEmail, cleanPhone);
    if (!ownerAccount) {
      const cfgRes = await pool.query(
        "SELECT value FROM site_settings WHERE key = 'global_config' LIMIT 1"
      );
      if (cfgRes.rows[0]?.value?.registrationsOpen === false) {
        return res.status(403).json({
          error: 'New registrations are temporarily paused by Didwana Bullion Admin.',
        });
      }
    }

    const existing = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = $1 OR phone = $2 LIMIT 1',
      [cleanEmail, cleanPhone]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email or mobile already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const initialRole = ownerAccount ? 'ADMIN' : 'USER';
    const clientIp = extractClientIp(req);

    const result = await pool.query(
      `INSERT INTO users (name, email, phone, password_hash, role, last_ip, last_seen_at, accepted_legal_version, accepted_legal_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, NOW())
       RETURNING id, name, email, phone, role, is_blocked, app_version, last_city, last_state, last_seen_at, accepted_legal_version, accepted_legal_at, cookie_functional, created_at`,
      [String(name).trim(), cleanEmail, cleanPhone, passwordHash, initialRole, clientIp, '1.1.0']
    );

    const user = sanitizeUser(result.rows[0]);
    const { token, refreshToken } = await createSession(user, req);
    await logAudit(user.id, 'SIGNUP', clientIp, `Account created (${initialRole})`);
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
    const clientIp = extractClientIp(req);

    if (!rawId || !password) {
      return res.status(400).json({ error: 'Email or mobile number and password are required.' });
    }

    const isEmail = rawId.includes('@');
    const query = isEmail
      ? 'SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1'
      : 'SELECT * FROM users WHERE phone = $1 LIMIT 1';
    const param = isEmail ? rawId.toLowerCase() : normalizePhone(rawId) || rawId;

    const result = await pool.query(query, [param]);
    let row = result.rows[0];
    if (!row) {
      await logAudit(null, 'LOGIN_FAILED', clientIp, `Unknown identifier: ${param}`);
      return res.status(401).json({ error: 'Invalid email/mobile or password.' });
    }

    const valid = await bcrypt.compare(password, row.password_hash);
    if (!valid) {
      await logAudit(row.id, 'LOGIN_FAILED', clientIp, 'Incorrect password');
      return res.status(401).json({ error: 'Invalid email/mobile or password.' });
    }

    if (row.is_blocked) {
      await logAudit(row.id, 'LOGIN_BLOCKED', clientIp, 'Blocked account login attempt');
      return res.status(403).json({
        error: row.blocked_reason || 'This account has been suspended by Admin. Contact +91 9351214851.',
      });
    }

    // Ensure configured owner email/phone always retains ADMIN role
    const shouldBeAdmin = isOwnerAccount(row.email, row.phone);
    if (shouldBeAdmin && row.role !== 'ADMIN') {
      const updated = await pool.query(
        "UPDATE users SET role = 'ADMIN', last_ip = $1, last_seen_at = NOW(), updated_at = NOW() WHERE id = $2 RETURNING *",
        [clientIp, row.id]
      );
      row = updated.rows[0];
    } else {
      await pool.query('UPDATE users SET last_ip = $1, last_seen_at = NOW() WHERE id = $2', [
        clientIp,
        row.id,
      ]);
    }

    const user = sanitizeUser(row);
    const { token, refreshToken } = await createSession(user, req);
    await logAudit(user.id, 'LOGIN_SUCCESS', clientIp, `Signed in (${user.role})`);
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
      `SELECT s.*, u.id AS u_id, u.name, u.email, u.phone, u.role, u.is_blocked, u.app_version,
              u.last_city, u.last_state, u.last_seen_at,
              u.accepted_legal_version, u.accepted_legal_at, u.cookie_functional, u.created_at
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
    if (row.is_blocked) {
      return res.status(403).json({ error: 'Account suspended by Admin.' });
    }

    const nextRefresh = generateRefreshToken();
    const nextHash = hashToken(nextRefresh);
    const nextExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const clientIp = extractClientIp(req);

    await pool.query(
      `UPDATE user_sessions
       SET refresh_token_hash = $1, last_active_at = NOW(), expires_at = $2, ip_address = $3
       WHERE id = $4`,
      [nextHash, nextExpires, clientIp, row.id]
    );

    const user = sanitizeUser({ ...row, id: row.u_id });
    const token = signAuthToken(user, row.id);
    return res.json({ token, refreshToken: nextRefresh, user });
  } catch (err) {
    console.error('Refresh error:', err.message);
    return res.status(500).json({ error: 'Unable to refresh session.' });
  }
});

router.post('/telemetry', requireAuth, async (req, res) => {
  try {
    const clientIp = extractClientIp(req);
    const {
      latitude,
      longitude,
      accuracy,
      altitude,
      city,
      state,
      pincode,
      address,
      source = 'IP',
      deviceInfo = null,
      appVersion = null,
    } = req.body || {};

    const hasGps = Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));
    const latNum = hasGps ? Number(latitude) : null;
    const lngNum = hasGps ? Number(longitude) : null;
    const accNum = Number.isFinite(Number(accuracy)) ? Number(accuracy) : null;
    const altNum = Number.isFinite(Number(altitude)) ? Number(altitude) : null;

    let resolved = {
      latitude: latNum,
      longitude: lngNum,
      city: city || null,
      state: state || null,
      pincode: pincode || null,
      address: address || null,
      source: hasGps ? 'GPS' : String(source || 'IP').toUpperCase(),
    };

    if ((hasGps && !city) || !hasGps) {
      const geo = await resolveGeoContext({
        latitude: latNum,
        longitude: lngNum,
        ipAddress: clientIp,
      });
      if (geo) {
        resolved = {
          latitude: latNum ?? geo.latitude ?? null,
          longitude: lngNum ?? geo.longitude ?? null,
          city: resolved.city || geo.city || null,
          state: resolved.state || geo.state || null,
          pincode: resolved.pincode || geo.pincode || null,
          address: resolved.address || geo.address || null,
          source: hasGps ? 'GPS' : 'IP',
        };
      }
    }

    const safeDevice =
      deviceInfo && typeof deviceInfo === 'object' ? deviceInfo : { userAgent: req.headers['user-agent'] || '' };

    await pool.query(
      `UPDATE users
       SET last_ip = $1,
           last_seen_at = NOW(),
           app_version = COALESCE($2, app_version),
           last_latitude = COALESCE($3, last_latitude),
           last_longitude = COALESCE($4, last_longitude),
           last_accuracy_m = COALESCE($5, last_accuracy_m),
           last_city = COALESCE($6, last_city),
           last_state = COALESCE($7, last_state),
           last_pincode = COALESCE($8, last_pincode),
           last_address = COALESCE($9, last_address),
           last_location_source = COALESCE($10, last_location_source),
           last_device_info = COALESCE($11::jsonb, last_device_info),
           updated_at = NOW()
       WHERE id = $12`,
      [
        clientIp,
        appVersion ? String(appVersion).slice(0, 30) : null,
        resolved.latitude,
        resolved.longitude,
        accNum,
        resolved.city,
        resolved.state,
        resolved.pincode,
        resolved.address,
        resolved.source,
        JSON.stringify(safeDevice),
        req.user.sub,
      ]
    );

    if (req.user.sid) {
      await pool.query(
        'UPDATE user_sessions SET last_active_at = NOW(), ip_address = $1 WHERE id = $2',
        [clientIp, req.user.sid]
      );
    }

    // Throttle location history rows to once every 90s per user unless upgraded to GPS
    const recentPing = await pool.query(
      `SELECT id, source, created_at FROM user_locations
       WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [req.user.sub]
    );
    const lastRow = recentPing.rows[0];
    const msSince = lastRow ? Date.now() - new Date(lastRow.created_at).getTime() : Infinity;
    const upgradedToGps = lastRow && lastRow.source !== 'GPS' && resolved.source === 'GPS';

    if ((resolved.latitude !== null || resolved.city !== null) && (msSince > 90000 || upgradedToGps)) {
      await pool.query(
        `INSERT INTO user_locations
         (user_id, latitude, longitude, accuracy_meters, altitude, city, state, pincode, address_label, source, ip_address, device_model, os_version, app_version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          req.user.sub,
          resolved.latitude,
          resolved.longitude,
          accNum,
          altNum,
          resolved.city,
          resolved.state,
          resolved.pincode,
          resolved.address,
          resolved.source,
          clientIp,
          safeDevice?.model || safeDevice?.deviceName || null,
          safeDevice?.osVersion || safeDevice?.platform || null,
          appVersion || null,
        ]
      );
    }

    return res.json({ ok: true, location: resolved });
  } catch (err) {
    console.error('Telemetry error:', err.message);
    return res.status(500).json({ error: 'Unable to record telemetry.' });
  }
});

router.get('/notices', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, user_id, title, message, severity, is_read, created_at
       FROM admin_notices
       WHERE user_id = $1 OR user_id IS NULL
       ORDER BY created_at DESC LIMIT 20`,
      [req.user.sub]
    );
    return res.json({ notices: result.rows });
  } catch {
    return res.status(500).json({ error: 'Unable to load notices.' });
  }
});

router.post('/notices/:id/read', requireAuth, async (req, res) => {
  try {
    await pool.query(
      'UPDATE admin_notices SET is_read = TRUE WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)',
      [req.params.id, req.user.sub]
    );
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Unable to mark notice read.' });
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
    await logAudit(req.user.sub, 'SESSION_REVOKED', extractClientIp(req), 'Signed out all devices');
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
  } catch {
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
    await logAudit(req.user.sub, 'PASSWORD_CHANGED', extractClientIp(req), 'Password updated');
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
  } catch {
    return res.status(500).json({ error: 'Unable to load security activity.' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, phone, role, is_blocked, app_version, last_city, last_state, last_seen_at,
              accepted_legal_version, accepted_legal_at, cookie_functional, created_at
       FROM users WHERE id = $1 LIMIT 1`,
      [req.user.sub]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }
    const row = result.rows[0];
    if (row.is_blocked) {
      return res.status(403).json({ error: 'Account suspended by Admin.' });
    }
    return res.json({ user: sanitizeUser(row) });
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
       RETURNING id, name, email, phone, role, is_blocked, app_version, last_city, last_state, last_seen_at,
                 accepted_legal_version, accepted_legal_at, cookie_functional, created_at`,
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
    await logAudit(req.user.sub, 'ACCOUNT_DELETED', extractClientIp(req), 'User deleted account');
    await pool.query('DELETE FROM users WHERE id = $1', [req.user.sub]);
    return res.json({ success: true, message: 'Account and personal data deleted.' });
  } catch (err) {
    console.error('Delete account error:', err.message);
    return res.status(500).json({ error: 'Unable to delete account' });
  }
});

export default router;
