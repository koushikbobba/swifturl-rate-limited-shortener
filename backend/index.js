require('dotenv').config();
const express = require('express');
const cors = require('cors');

const cache = require('./src/redis');
const { connectRabbitMQ, publishClickEvent } = require('./src/rabbitmq');
const { getDb } = require('./src/db');

const authRoutes = require('./src/routes/auth');
const urlRoutes = require('./src/routes/url');
const analyticsRoutes = require('./src/routes/analytics');

const app = express();

app.use(cors());
app.use(express.json());

// Main redirect route (Optimized for speed)
app.get('/r/:short_code', async (req, res) => {
  const { short_code } = req.params;

  try {
    // 1. Check In-Memory Cache First (O(1) lookup)
    let originalUrl = cache.get(`url:${short_code}`);

    // 2. Cache Miss - Check SQLite
    if (!originalUrl) {
      const db = await getDb();
      const result = await db.get('SELECT original_url FROM urls WHERE short_code = ?', [short_code]);
      
      if (!result) {
        return res.status(404).json({ error: 'URL not found' });
      }
      
      originalUrl = result.original_url;
      
      // Populate cache for future requests
      cache.set(`url:${short_code}`, originalUrl);
    }

    // 3. Publish Analytics Event Asynchronously
    publishClickEvent(
      short_code, 
      req.ip || req.connection.remoteAddress, 
      req.headers['user-agent'], 
      req.headers['referer']
    );

    // 4. Fast HTTP 302 Redirect
    return res.redirect(302, originalUrl);
  } catch (error) {
    console.error('Redirect error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', urlRoutes); // /api/shorten
app.use('/api/user', analyticsRoutes); // /api/user/urls and /api/user/analytics/:code

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'node-sqlite-backend' });
});

const PORT = process.env.PORT || 8080;

async function startServer() {
  await getDb(); // Initialize SQLite DB and tables
  await connectRabbitMQ(); // Dummy call
  
  app.listen(PORT, () => {
    console.log(`Docker-Less Node.js Backend running on port ${PORT}`);
  });
}

startServer();
