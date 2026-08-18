const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/urls', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await db.query(
      'SELECT short_code, original_url, click_count, created_at FROM urls WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching URLs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/analytics/:code', authMiddleware, async (req, res) => {
  const { code } = req.params;
  const userId = req.user.id;

  try {
    // Verify ownership
    const urlCheck = await db.query('SELECT id FROM urls WHERE short_code = $1 AND user_id = $2', [code, userId]);
    if (urlCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await db.query(
      'SELECT ip_address, user_agent, referrer, clicked_at FROM click_analytics WHERE short_code = $1 ORDER BY clicked_at DESC',
      [code]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching analytics:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
