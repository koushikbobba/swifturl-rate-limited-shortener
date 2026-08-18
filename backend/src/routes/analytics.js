const express = require('express');
const { getDb } = require('../db');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/urls', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    const db = await getDb();
    const rows = await db.all(
      'SELECT short_code, original_url, click_count, created_at FROM urls WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    const result = rows.map(r => ({
      ...r,
      short_url: `http://localhost:8080/r/${r.short_code}`
    }));
    res.json(result);
  } catch (err) {
    console.error('Error fetching URLs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/analytics/:code', authMiddleware, async (req, res) => {
  const { code } = req.params;
  const userId = req.user.id;

  try {
    const db = await getDb();
    const urlCheck = await db.get('SELECT id FROM urls WHERE short_code = ? AND user_id = ?', [code, userId]);
    
    if (!urlCheck) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await db.all(
      'SELECT ip_address, user_agent, referrer, clicked_at FROM click_analytics WHERE short_code = ? ORDER BY clicked_at DESC',
      [code]
    );
    res.json(result);
  } catch (err) {
    console.error('Error fetching analytics:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
