const express = require('express');
const { getDb } = require('../db');
const { encode } = require('../utils/base62');
const { authMiddleware } = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');
const cache = require('../redis'); // which is now an in-memory map

const router = express.Router();

router.post('/shorten', authMiddleware, rateLimiter, async (req, res) => {
  const { original_url, custom_slug } = req.body;
  const userId = req.user.id;

  if (!original_url) {
    return res.status(400).json({ error: 'original_url is required' });
  }

  try {
    const db = await getDb();
    let shortCode = custom_slug;

    if (custom_slug) {
      const check = await db.get('SELECT id FROM urls WHERE short_code = ?', [custom_slug]);
      if (check) {
        return res.status(409).json({ error: 'Custom slug already in use' });
      }
    } else {
      // In SQLite, we can insert a dummy row to get lastID, or just calculate it
      // Let's insert the row first with a temporary dummy short_code, then update it
      const result = await db.run(
        'INSERT INTO urls (user_id, short_code, original_url) VALUES (?, ?, ?)',
        [userId, `temp_${Date.now()}_${Math.random()}`, original_url]
      );
      
      const nextId = result.lastID;
      shortCode = encode(nextId);
      
      await db.run('UPDATE urls SET short_code = ? WHERE id = ?', [shortCode, nextId]);
      
      cache.set(`url:${shortCode}`, original_url);
      
      const urlRecord = await db.get('SELECT * FROM urls WHERE id = ?', [nextId]);
      urlRecord.short_url = `http://localhost:8080/r/${shortCode}`;
      return res.status(201).json(urlRecord);
    }
    
    // If custom slug
    const result = await db.run(
      'INSERT INTO urls (user_id, short_code, original_url, custom_slug) VALUES (?, ?, ?, ?)',
      [userId, shortCode, original_url, custom_slug]
    );

    cache.set(`url:${shortCode}`, original_url);
    
    const urlRecord = await db.get('SELECT * FROM urls WHERE id = ?', [result.lastID]);
    urlRecord.short_url = `http://localhost:8080/r/${shortCode}`;
    res.status(201).json(urlRecord);
  } catch (err) {
    console.error('Error in /shorten:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
