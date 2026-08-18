const amqp = require('amqplib');

let channel = null;

async function connectRabbitMQ() {
  const url = `amqp://${process.env.RABBITMQ_USER || 'guest'}:${process.env.RABBITMQ_PASSWORD || 'guest'}@${process.env.RABBITMQ_HOST || 'rabbitmq'}:${process.env.RABBITMQ_PORT || 5672}/`;
  
  try {
    const connection = await amqp.connect(url);
    channel = await connection.createChannel();
    await channel.assertQueue('analytics_queue', { durable: true });
    console.log('Connected to RabbitMQ and asserted analytics_queue');
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error);
    // In production, we'd implement a retry mechanism here
  }
}

function publishClickEvent(shortCode, ipAddress, userAgent, referrer) {
  if (!channel) {
    console.error('RabbitMQ channel not established, dropping analytics event');
    return;
  }

  const event = {
    short_code: shortCode,
    ip_address: ipAddress || '0.0.0.0',
    user_agent: userAgent || 'Unknown',
    referrer: referrer || '',
    timestamp: new Date().toISOString()
  };

  channel.sendToQueue(
    'analytics_queue',
    Buffer.from(JSON.stringify(event)),
    { persistent: true }
  );
}

module.exports = {
  connectRabbitMQ,
  publishClickEvent
};
