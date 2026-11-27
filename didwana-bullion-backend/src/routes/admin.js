import { Router } from 'express';
import { DEFAULT_SITE_CONFIG, logAudit, pool } from '../db/pool.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth, requireAdmin);

// 1. Live Command Center Overview KPIs
router.get('/overview', async (_req, res) => {
  try {
    const [countsRes, cityRes, logsRes] = await Promise.all([
      pool.query(`
        SELECT
          (SELECT COUNT(*)::int FROM users) AS total_users,
          (SELECT COUNT(*)::int FROM users WHERE last_seen_at > NOW() - INTERVAL '15 minutes') AS online_now,
          (SELECT COUNT(*)::int FROM users WHERE last_seen_at > NOW() - INTERVAL '24 hours') AS active_24h,
          (SELECT COUNT(*)::int FROM users WHERE is_blocked = TRUE) AS blocked_users,
          (SELECT COUNT(*)::int FROM users WHERE last_location_source = 'GPS') AS gps_verified_users,
          (SELECT COUNT(*)::int FROM user_sessions WHERE revoked_at IS NULL AND expires_at > NOW()) AS active_sessions,
          (SELECT COUNT(*)::int FROM price_alerts WHERE is_active = TRUE) AS active_alerts,
          (SELECT COUNT(*)::int FROM news_posts WHERE is_published = TRUE) AS published_news
      `),
      pool.query(`
        SELECT COALESCE(last_city, 'Unknown') AS city,
               COALESCE(last_state, '') AS state,
               COUNT(*)::int AS user_count
        FROM users
        GROUP BY COALESCE(last_city, 'Unknown'), COALESCE(last_state, '')
        ORDER BY user_count DESC
        LIMIT 12
      `),
      pool.query(`
        SELECT a.id, a.event_type, a.ip_address, a.details, a.created_at,
               u.name AS user_name, u.email AS user_email
        FROM audit_logs a
        LEFT JOIN users u ON u.id = a.user_id
        ORDER BY a.created_at DESC
        LIMIT 25
      `),
    ]);

    return res.json({
      stats: countsRes.rows[0] || {},
      cities: cityRes.rows || [],
      recentAudit: logsRes.rows || [],
    });
  } catch (err) {
    console.error('Admin overview error:', err.message);
    return res.status(500).json({ error: 'Unable to load admin overview.' });
  }
});

// 2. Searchable User Directory with Latest Precise Location & Device Info
router.get('/users', async (req, res) => {
  try {
    const { q = '', role = 'ALL', status = 'ALL', limit = 100 } = req.query;
    const lim = Math.min(Math.max(Number(limit) || 100, 1), 300);
    const params = [];
    const clauses = [];

    if (q && String(q).trim()) {
      params.push(`%${String(q).trim()}%`);
      const idx = params.length;
      clauses.push(
        `(u.name ILIKE $${idx} OR u.email ILIKE $${idx} OR u.phone ILIKE $${idx} OR COALESCE(u.last_city, '') ILIKE $${idx} OR COALESCE(u.last_ip, '') ILIKE $${idx})`
      );
    }

    if (role !== 'ALL') {
      params.push(String(role).toUpperCase());
      clauses.push(`u.role = $${params.length}`);
    }

    if (status === 'BLOCKED') {
      clauses.push('u.is_blocked = TRUE');
    } else if (status === 'ACTIVE') {
      clauses.push('u.is_blocked = FALSE');
    } else if (status === 'ONLINE') {
      clauses.push("u.last_seen_at > NOW() - INTERVAL '15 minutes'");
    }

    const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    params.push(lim);

    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.is_blocked, u.blocked_reason,
              u.admin_notes, u.app_version, u.last_ip, u.last_seen_at,
              u.last_latitude, u.last_longitude, u.last_accuracy_m,
              u.last_city, u.last_state, u.last_pincode, u.last_address,
              u.last_location_source, u.last_device_info,
              u.accepted_legal_version, u.accepted_legal_at, u.cookie_functional,
              u.created_at, u.updated_at,
              (SELECT COUNT(*)::int FROM user_sessions s WHERE s.user_id = u.id AND s.revoked_at IS NULL AND s.expires_at > NOW()) AS active_sessions_count,
              (SELECT COUNT(*)::int FROM price_alerts pa WHERE pa.user_id = u.id AND pa.is_active = TRUE) AS active_alerts_count,
              (SELECT COUNT(*)::int FROM user_locations ul WHERE ul.user_id = u.id) AS location_pings_count
       FROM users u
       ${whereClause}
       ORDER BY u.last_seen_at DESC NULLS LAST, u.created_at DESC
       LIMIT $${params.length}`,
      params
    );

    return res.json({ users: result.rows });
  } catch (err) {
    console.error('Admin users list error:', err.message);
    return res.status(500).json({ error: 'Unable to load users directory.' });
  }
});

// 3. Export Full User Directory + Precise Locations (JSON)
router.get('/users/export', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, phone, role, is_blocked, app_version, last_ip, last_seen_at,
              last_latitude, last_longitude, last_accuracy_m, last_city, last_state,
              last_pincode, last_address, last_location_source, last_device_info,
              accepted_legal_version, accepted_legal_at, created_at
       FROM users
       ORDER BY created_at DESC`
    );
    return res.json({ exportedAt: new Date().toISOString(), count: result.rows.length, users: result.rows });
  } catch {
    return res.status(500).json({ error: 'Unable to export users.' });
  }
});

// 4. Complete 360° User Dossier (Profile + Location Trail + Sessions + Alerts + Logs)
router.get('/users/:id', async (req, res) => {
  try {
    const userRes = await pool.query(
      `SELECT id, name, email, phone, role, is_blocked, blocked_reason, admin_notes,
              app_version, last_ip, last_seen_at,
              last_latitude, last_longitude, last_accuracy_m,
              last_city, last_state, last_pincode, last_address,
              last_location_source, last_device_info,
              accepted_legal_version, accepted_legal_at, cookie_functional,
              created_at, updated_at
       FROM users WHERE id = $1 LIMIT 1`,
      [req.params.id]
    );
    if (!userRes.rows.length) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const [locationsRes, sessionsRes, alertsRes, webhooksRes, logsRes, noticesRes] =
      await Promise.all([
        pool.query(
          'SELECT * FROM user_locations WHERE user_id = $1 ORDER BY created_at DESC LIMIT 25',
          [req.params.id]
        ),
        pool.query(
          'SELECT id, device_name, ip_address, last_active_at, expires_at, revoked_at, created_at FROM user_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
          [req.params.id]
        ),
        pool.query(
          'SELECT * FROM price_alerts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30',
          [req.params.id]
        ),
        pool.query(
          'SELECT id, target_url, event_filter, is_active, last_status, created_at FROM webhooks WHERE user_id = $1 ORDER BY created_at DESC',
          [req.params.id]
        ),
        pool.query(
          'SELECT id, event_type, ip_address, details, created_at FROM audit_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 40',
          [req.params.id]
        ),
        pool.query(
          'SELECT * FROM admin_notices WHERE user_id = $1 ORDER BY created_at DESC LIMIT 15',
          [req.params.id]
        ),
      ]);

    return res.json({
      user: userRes.rows[0],
      locations: locationsRes.rows,
      sessions: sessionsRes.rows,
      alerts: alertsRes.rows,
      webhooks: webhooksRes.rows,
      auditLogs: logsRes.rows,
      notices: noticesRes.rows,
    });
  } catch (err) {
    console.error('Admin user dossier error:', err.message);
    return res.status(500).json({ error: 'Unable to load user dossier.' });
  }
});

// 5. Modify User (Block/Unblock, Role, Admin Notes, Contact Info)
router.patch('/users/:id', async (req, res) => {
  try {
    const targetId = req.params.id;
    const { role, isBlocked, blockedReason, adminNotes, name } = req.body || {};

    if (targetId === req.user.sub && (isBlocked === true || (role && role !== 'ADMIN'))) {
      return res.status(400).json({ error: 'You cannot block or demote your own admin session.' });
    }

    const existing = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [targetId]);
    if (!existing.rows.length) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const prev = existing.rows[0];

    const nextRole = role && ['USER', 'ADMIN'].includes(String(role).toUpperCase())
      ? String(role).toUpperCase()
      : prev.role;
    const nextBlocked = typeof isBlocked === 'boolean' ? isBlocked : prev.is_blocked;
    const nextReason = blockedReason !== undefined ? blockedReason : prev.blocked_reason;
    const nextNotes = adminNotes !== undefined ? adminNotes : prev.admin_notes;
    const nextName = name && String(name).trim() ? String(name).trim() : prev.name;

    const updated = await pool.query(
      `UPDATE users
       SET role = $1, is_blocked = $2, blocked_reason = $3, admin_notes = $4, name = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING id, name, email, phone, role, is_blocked, blocked_reason, admin_notes, updated_at`,
      [nextRole, nextBlocked, nextReason, nextNotes, nextName, targetId]
    );

    if (nextBlocked) {
      await pool.query(
        'UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
        [targetId]
      );
    }

    await logAudit(
      req.user.sub,
      'ADMIN_USER_UPDATE',
      req.ip,
      `Updated user ${targetId}: role=${nextRole}, blocked=${nextBlocked}`
    );

    return res.json({ user: updated.rows[0] });
  } catch (err) {
    console.error('Admin patch user error:', err.message);
    return res.status(500).json({ error: 'Unable to update user.' });
  }
});

// 6. Force-Logout User Across All Devices
router.post('/users/:id/revoke-sessions', async (req, res) => {
  try {
    await pool.query(
      'UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
      [req.params.id]
    );
    await logAudit(req.user.sub, 'ADMIN_REVOKE_SESSIONS', req.ip, `Revoked sessions for ${req.params.id}`);
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Unable to revoke user sessions.' });
  }
});

// 7. Send Direct or Broadcast Notice
router.post('/notices', async (req, res) => {
  try {
    const { userId = null, title, message, severity = 'INFO' } = req.body || {};
    if (!title || !message) {
      return res.status(400).json({ error: 'Notice title and message are required.' });
    }
    const result = await pool.query(
      `INSERT INTO admin_notices (user_id, title, message, severity, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId || null, String(title).trim(), String(message).trim(), String(severity), req.user.sub]
    );
    await logAudit(
      req.user.sub,
      'ADMIN_NOTICE_SENT',
      req.ip,
      `${userId ? `To ${userId}` : 'Broadcast'}: ${String(title).slice(0, 80)}`
    );
    return res.status(201).json({ notice: result.rows[0] });
  } catch {
    return res.status(500).json({ error: 'Unable to send notice.' });
  }
});

// 8. Admin Newsroom CMS (List all including drafts, Create, Update, Delete)
router.get('/news', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.*, COALESCE(u.name, 'Admin') AS author_name
       FROM news_posts n
       LEFT JOIN users u ON u.id = n.author_id
       ORDER BY n.is_pinned DESC, n.created_at DESC
       LIMIT 100`
    );
    return res.json({ news: result.rows });
  } catch {
    return res.status(500).json({ error: 'Unable to load CMS articles.' });
  }
});

router.post('/news', async (req, res) => {
  try {
    const {
      title,
      summary,
      content,
      category = 'GOLD_OUTLOOK',
      impact = 'NEUTRAL',
      priority = 'NORMAL',
      imageUrl = null,
      isPublished = true,
      isPinned = false,
    } = req.body || {};

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and full content are required.' });
    }

    const cleanSummary = summary && String(summary).trim()
      ? String(summary).trim().slice(0, 480)
      : String(content).trim().slice(0, 220);

    const result = await pool.query(
      `INSERT INTO news_posts
       (title, summary, content, category, impact, priority, image_url, is_published, is_pinned, author_id, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       RETURNING *`,
      [
        String(title).trim(),
        cleanSummary,
        String(content).trim(),
        String(category).toUpperCase(),
        String(impact).toUpperCase(),
        String(priority).toUpperCase(),
        imageUrl ? String(imageUrl).trim() : null,
        Boolean(isPublished),
        Boolean(isPinned),
        req.user.sub,
      ]
    );

    await logAudit(req.user.sub, 'NEWS_CREATED', req.ip, String(title).trim().slice(0, 80));
    return res.status(201).json({ article: result.rows[0] });
  } catch (err) {
    console.error('Admin create news error:', err.message);
    return res.status(500).json({ error: 'Unable to publish news post.' });
  }
});

router.patch('/news/:id', async (req, res) => {
  try {
    const existing = await pool.query('SELECT * FROM news_posts WHERE id = $1 LIMIT 1', [req.params.id]);
    if (!existing.rows.length) {
      return res.status(404).json({ error: 'Article not found.' });
    }
    const prev = existing.rows[0];
    const b = req.body || {};

    const result = await pool.query(
      `UPDATE news_posts
       SET title = $1, summary = $2, content = $3, category = $4, impact = $5,
           priority = $6, image_url = $7, is_published = $8, is_pinned = $9, updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [
        b.title !== undefined ? String(b.title).trim() : prev.title,
        b.summary !== undefined ? String(b.summary).trim() : prev.summary,
        b.content !== undefined ? String(b.content).trim() : prev.content,
        b.category !== undefined ? String(b.category).toUpperCase() : prev.category,
        b.impact !== undefined ? String(b.impact).toUpperCase() : prev.impact,
        b.priority !== undefined ? String(b.priority).toUpperCase() : prev.priority,
        b.imageUrl !== undefined ? (b.imageUrl ? String(b.imageUrl).trim() : null) : prev.image_url,
        typeof b.isPublished === 'boolean' ? b.isPublished : prev.is_published,
        typeof b.isPinned === 'boolean' ? b.isPinned : prev.is_pinned,
        req.params.id,
      ]
    );
    await logAudit(req.user.sub, 'NEWS_UPDATED', req.ip, `Updated article ${req.params.id}`);
    return res.json({ article: result.rows[0] });
  } catch {
    return res.status(500).json({ error: 'Unable to update news post.' });
  }
});

router.delete('/news/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM news_posts WHERE id = $1', [req.params.id]);
    await logAudit(req.user.sub, 'NEWS_DELETED', req.ip, `Deleted article ${req.params.id}`);
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Unable to delete news post.' });
  }
});

// 9. Global Website / App Controls (`site_settings`)
router.get('/site-config', async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT value, updated_at FROM site_settings WHERE key = 'global_config' LIMIT 1"
    );
    return res.json({
      config: { ...DEFAULT_SITE_CONFIG, ...(result.rows[0]?.value || {}) },
      updatedAt: result.rows[0]?.updated_at || null,
    });
  } catch {
    return res.status(500).json({ error: 'Unable to load site configuration.' });
  }
});

router.put('/site-config', async (req, res) => {
  try {
    const curRes = await pool.query(
      "SELECT value FROM site_settings WHERE key = 'global_config' LIMIT 1"
    );
    const current = { ...DEFAULT_SITE_CONFIG, ...(curRes.rows[0]?.value || {}) };
    const next = { ...current, ...(req.body || {}) };

    await pool.query(
      `INSERT INTO site_settings (key, value, updated_by, updated_at)
       VALUES ('global_config', $1::jsonb, $2, NOW())
       ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
      [JSON.stringify(next), req.user.sub]
    );
    await logAudit(req.user.sub, 'SITE_CONFIG_UPDATED', req.ip, 'Updated live site/app settings');
    return res.json({ config: next });
  } catch (err) {
    console.error('Admin site config error:', err.message);
    return res.status(500).json({ error: 'Unable to save site configuration.' });
  }
});

// 10. System-Wide Audit Stream & Alerts Monitor
router.get('/audit-logs', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.id, a.event_type, a.ip_address, a.details, a.created_at,
              u.name AS user_name, u.email AS user_email, u.phone AS user_phone
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       ORDER BY a.created_at DESC
       LIMIT 100`
    );
    return res.json({ logs: result.rows });
  } catch {
    return res.status(500).json({ error: 'Unable to load audit logs.' });
  }
});

router.get('/alerts', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT pa.*, u.name AS user_name, u.phone AS user_phone, u.email AS user_email
       FROM price_alerts pa
       JOIN users u ON u.id = pa.user_id
       ORDER BY pa.created_at DESC
       LIMIT 100`
    );
    return res.json({ alerts: result.rows });
  } catch {
    return res.status(500).json({ error: 'Unable to load user price alerts.' });
  }
});

export default router;
