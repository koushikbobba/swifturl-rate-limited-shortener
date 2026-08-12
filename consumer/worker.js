const amqp = require('amqplib');
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://shortener_user:shortener_pass@postgres:5432/shortener_db';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';
const QUEUE_NAME = 'analytics_queue';

const pool = new Pool({ connectionString: DATABASE_URL });

async function startConsumer() {
    try {
        console.log('🔄 Connecting to RabbitMQ analytics queue...');
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();
        
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        console.log(`✅ RabbitMQ Consumer active. Listening on queue: "${QUEUE_NAME}"`);

        channel.consume(QUEUE_NAME, async (msg) => {
            if (msg !== null) {
                try {
                    const event = JSON.parse(msg.content.toString());
                    console.log(`📥 Received Click Event: ShortCode [${event.short_code}] from IP ${event.ip}`);

                    // 1. Insert detailed click log into PostgreSQL click_analytics table
                    await pool.query(
                        `INSERT INTO click_analytics (short_code, clicked_at, ip_address, user_agent, referrer)
                         VALUES ($1, NOW(), $2, $3, $4)`,
                        [event.short_code, event.ip, event.user_agent, event.referrer]
                    );

                    // 2. Increment cumulative click count on urls table
                    await pool.query(
                        `UPDATE urls SET click_count = click_count + 1 WHERE short_code = $1`,
                        [event.short_code]
                    );

                    console.log(`💾 Successfully persisted click analytics for [${event.short_code}]`);
                    channel.ack(msg);
                } catch (err) {
                    console.error('❌ Error processing click event:', err.message);
                    channel.nack(msg, false, true); // Requeue message on failure
                }
            }
        });
    } catch (err) {
        console.error('⚠️ RabbitMQ Consumer connection retry in 5s:', err.message);
        setTimeout(startConsumer, 5000);
    }
}

startConsumer();
