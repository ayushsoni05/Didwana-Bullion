import { Router } from 'express';
import { DEFAULT_SITE_CONFIG, pool } from '../db/pool.js';

const router = Router();

router.get('/config', async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT value, updated_at FROM site_settings WHERE key = 'global_config' LIMIT 1"
    );
    const saved = result.rows[0]?.value || {};
    return res.json({
      config: { ...DEFAULT_SITE_CONFIG, ...saved },
      updatedAt: result.rows[0]?.updated_at || new Date().toISOString(),
    });
  } catch (err) {
    console.error('Public config error:', err.message);
    return res.json({ config: DEFAULT_SITE_CONFIG });
  }
});

export default router;
