const Redis = require('ioredis');
dotenv = require('dotenv');
dotenv.config();

const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
});

const channel = 'url_resolution';

redis.subscribe(channel, (err) => {
    if (err) console.error('Error subscribing to channel:', err);
});

redis.on('message', async (channel, message) => {
    try {
        const { id, url } = JSON.parse(message);
        if (url) {
            await redis.set(`url:${id}`, url, 'EX', 3600); // Cache for 1 hour
            console.log(`Cached URL ${url} for ID ${id}`);
        }
    } catch (err) {
        console.error('Error processing channel message:', err);
    }
});