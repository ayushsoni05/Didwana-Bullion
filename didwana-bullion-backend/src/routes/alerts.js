import crypto from 'node:crypto';
import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM price_alerts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30',
      [req.user.sub]
    );
    return res.json({ alerts: result.rows });
  } catch {
    return res.status(500).json({ error: 'Unable to load alerts.' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { terminal, metalKey, condition, targetAsk } = req.body || {};
    if (!terminal || !metalKey || !['ABOVE', 'BELOW'].includes(condition) || !Number(targetAsk)) {
      return res.status(400).json({ error: 'Valid terminal, metalKey, condition, and targetAsk are required.' });
    }

    const result = await pool.query(
      `INSERT INTO price_alerts (user_id, terminal, metal_key, condition, target_ask)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.sub, String(terminal), String(metalKey), condition, Number(targetAsk)]
    );
    return res.status(201).json({ alert: result.rows[0] });
  } catch {
    return res.status(500).json({ error: 'Unable to create alert.' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM price_alerts WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.user.sub,
    ]);
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Unable to delete alert.' });
  }
});

router.get('/webhooks', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, target_url, event_filter, is_active, last_status, created_at FROM webhooks WHERE user_id = $1',
      [req.user.sub]
    );
    return res.json({ webhooks: result.rows });
  } catch {
    return res.status(500).json({ error: 'Unable to load webhooks.' });
  }
});

router.post('/webhooks', requireAuth, async (req, res) => {
  try {
    const { targetUrl, eventFilter = 'PRICE_ALERT' } = req.body || {};
    if (!targetUrl || !String(targetUrl).startsWith('https://')) {
      return res.status(400).json({ error: 'A valid https:// webhook URL is required.' });
    }
    const secretHmac = crypto.randomBytes(24).toString('hex');
    const result = await pool.query(
      `INSERT INTO webhooks (user_id, target_url, secret_hmac, event_filter)
       VALUES ($1, $2, $3, $4)
       RETURNING id, target_url, secret_hmac, event_filter, is_active, created_at`,
      [req.user.sub, String(targetUrl).trim(), secretHmac, String(eventFilter)]
    );
    return res.status(201).json({ webhook: result.rows[0] });
  } catch {
    return res.status(500).json({ error: 'Unable to create webhook.' });
  }
});

router.delete('/webhooks/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM webhooks WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.user.sub,
    ]);
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Unable to delete webhook.' });
  }
});

export default router;
