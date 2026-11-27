import { Router } from 'express';
import { pool } from '../db/pool.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { category = 'ALL', search = '', limit = 50 } = req.query;
    const lim = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const params = [];
    const clauses = ['n.is_published = TRUE'];

    if (category && category !== 'ALL') {
      if (category === 'BREAKING') {
        clauses.push("n.priority = 'BREAKING'");
      } else {
        params.push(String(category));
        clauses.push(`n.category = $${params.length}`);
      }
    }

    if (search && String(search).trim()) {
      params.push(`%${String(search).trim()}%`);
      clauses.push(`(n.title ILIKE $${params.length} OR n.summary ILIKE $${params.length})`);
    }

    params.push(lim);
    const result = await pool.query(
      `SELECT n.id, n.title, n.summary, n.content, n.category, n.impact, n.priority,
              n.image_url, n.is_pinned, n.views_count, n.published_at, n.created_at,
              COALESCE(u.name, 'Didwana Bullion Desk') AS author_name
       FROM news_posts n
       LEFT JOIN users u ON u.id = n.author_id
       WHERE ${clauses.join(' AND ')}
       ORDER BY (n.priority = 'BREAKING') DESC, n.is_pinned DESC, n.published_at DESC
       LIMIT $${params.length}`,
      params
    );

    return res.json({ news: result.rows });
  } catch (err) {
    console.error('News list error:', err.message);
    return res.status(500).json({ error: 'Unable to load bullion news.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.*, COALESCE(u.name, 'Didwana Bullion Desk') AS author_name
       FROM news_posts n
       LEFT JOIN users u ON u.id = n.author_id
       WHERE n.id = $1 AND n.is_published = TRUE
       LIMIT 1`,
      [req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Article not found.' });
    }
    return res.json({ article: result.rows[0] });
  } catch {
    return res.status(500).json({ error: 'Unable to load article.' });
  }
});

router.post('/:id/view', async (req, res) => {
  try {
    await pool.query(
      'UPDATE news_posts SET views_count = views_count + 1 WHERE id = $1',
      [req.params.id]
    );
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: 'Unable to record view.' });
  }
});

export default router;
