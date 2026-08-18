const WINDOW_SIZE_IN_SECONDS = 60;
const MAX_REQUESTS = 10;

// Simple in-memory store: { "192.168.1.1": [timestamp1, timestamp2, ...] }
const rateLimitStore = new Map();

function rateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowStart = now - (WINDOW_SIZE_IN_SECONDS * 1000);

  if (!rateLimitStore.has(ip)) {
    rateLimitStore.set(ip, []);
  }

  const timestamps = rateLimitStore.get(ip);
  
  // Filter out timestamps older than 60 seconds (simulating ZREMRANGEBYSCORE)
  const validTimestamps = timestamps.filter(ts => ts > windowStart);
  
  // Add current request
  validTimestamps.push(now);
  
  // Update the store
  rateLimitStore.set(ip, validTimestamps);

  // Check limits
  if (validTimestamps.length > MAX_REQUESTS) {
    return res.status(429).json({ error: 'Too many requests. Please slow down.' });
  }

  next();
}

module.exports = rateLimiter;
