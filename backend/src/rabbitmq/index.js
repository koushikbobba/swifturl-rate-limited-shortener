const { getDb } = require('../db');

function publishClickEvent(shortCode, ipAddress, userAgent, referrer) {
  // Instead of RabbitMQ, we just run the DB write asynchronously
  // using setTimeout to prevent blocking the HTTP redirect response.
  setTimeout(async () => {
    try {
      const db = await getDb();
      
      const ip = ipAddress || '0.0.0.0';
      const agent = userAgent || 'Unknown';
      const ref = referrer || '';

      await db.run(
        'INSERT INTO click_analytics (short_code, ip_address, user_agent, referrer) VALUES (?, ?, ?, ?)',
        [shortCode, ip, agent, ref]
      );

      await db.run(
        'UPDATE urls SET click_count = click_count + 1 WHERE short_code = ?',
        [shortCode]
      );
      
      // console.log(`[Fake RabbitMQ] Click logged for ${shortCode}`);
    } catch (error) {
      console.error('Failed to log click event:', error);
    }
  }, 0);
}

// Dummy connect function so index.js doesn't break
async function connectRabbitMQ() {
  console.log('Skipping RabbitMQ (Running in local Docker-less mode)');
}

module.exports = {
  connectRabbitMQ,
  publishClickEvent
};
