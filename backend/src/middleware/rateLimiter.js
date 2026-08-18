const { redisClient } = require('../redis');

const WINDOW_SIZE_IN_SECONDS = 60;
const MAX_REQUESTS = 10;

async function rateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const key = `ratelimit:${ip}`;
  
  const now = Date.now();
  const windowStart = now - (WINDOW_SIZE_IN_SECONDS * 1000);

  try {
    // Start a Redis transaction pipeline
    const multi = redisClient.multi();
    
    // Add current request
    multi.zAdd(key, { score: now, value: now.toString() });
    
    // Remove requests older than 60s
    multi.zRemRangeByScore(key, 0, windowStart);
    
    // Get count of remaining requests
    multi.zCard(key);
    
    // Expire the set so it cleans up after the window
    multi.expire(key, WINDOW_SIZE_IN_SECONDS);

    const results = await multi.exec();
    const requestCount = results[2]; // Index 2 is the result of zCard

    if (requestCount > MAX_REQUESTS) {
      return res.status(429).json({ error: 'Too many requests. Please slow down.' });
    }

    next();
  } catch (error) {
    console.error('Rate limiter error:', error);
    // On Redis failure, we fail open (allow request) so we don't bring down the API
    next();
  }
}

module.exports = rateLimiter;
