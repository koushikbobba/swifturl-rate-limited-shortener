const express = require('express');
const db = require('../db');
const { encode } = require('../utils/base62');
const { authMiddleware } = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');
const { redisClient } = require('../redis');

const router = express.Router();

router.post('/shorten', authMiddleware, rateLimiter, async (req, res) => {
  const { original_url, custom_slug } = req.body;
  const userId = req.user.id;

  if (!original_url) {
    return res.status(400).json({ error: 'original_url is required' });
  }

  try {
    let shortCode = custom_slug;

    if (custom_slug) {
      // Check if custom slug already exists
      const check = await db.query('SELECT id FROM urls WHERE short_code = $1', [custom_slug]);
      if (check.rows.length > 0) {
        return res.status(409).json({ error: 'Custom slug already in use' });
      }
    } else {
      // Generate a new code by inserting a dummy row to get an ID sequence, 
      // or use a dedicated sequence if we had one.
      // For simplicity matching the C++ version, we get the nextval of a sequence or max ID.
      // Wait, let's use the sequence of the id column (SERIAL).
      const nextIdResult = await db.query("SELECT nextval('urls_id_seq')");
      const nextId = nextIdResult.rows[0].nextval;
      shortCode = encode(nextId);
      
      // Since we just burned the sequence value, we will use it for the insert.
      const result = await db.query(
        'INSERT INTO urls (id, user_id, short_code, original_url) VALUES ($1, $2, $3, $4) RETURNING *',
        [nextId, userId, shortCode, original_url]
      );
      
      const urlRecord = result.rows[0];
      
      // Cache in Redis
      await redisClient.set(`url:${shortCode}`, original_url);
      
      return res.status(201).json(urlRecord);
    }
    
    // If custom slug
    const result = await db.query(
      'INSERT INTO urls (user_id, short_code, original_url, custom_slug) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, shortCode, original_url, custom_slug]
    );

    const urlRecord = result.rows[0];
    
    // Cache in Redis
    await redisClient.set(`url:${shortCode}`, original_url);
    
    res.status(201).json(urlRecord);
  } catch (err) {
    console.error('Error in /shorten:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
