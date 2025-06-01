const express = require('express');
const { QueueClient } = require('@azure/storage-queue');
const { Client } = require('pg');
const redis = require('redis');
const rateLimit = require('express-rate-limit');
const shortid = require('shortid');

const app = express();
app.use(express.json());

const writeQueueClient = new QueueClient(
    "https://myshortenurl.queue.core.windows.net/write-queue",
    "write-queue"
);
const readQueueClient = new QueueClient(
    "https://myshortenurl.queue.core.windows.net/read-queue",
    "read-queue"
);

const pgClient = new Client({
    user: 'pgadmin',
    host: 'url-shortener-db.cmnwyi0i2y3j.us-east-1.rds.amazonaws.com',
    database: 'postgres',
    password: 'Welcome123',
    port: 5432,
});
pgClient.connect();

const redisClient = redis.createClient({
    url: 'redis://redis-shortenurl.redis.cache.windows.net:6379',
});
redisClient.connect();

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
});
app.use(limiter);

app.post('/shorten', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const shortCode = shortid.generate();
    const message = Buffer.from(JSON.stringify({ shortCode, url })).toString('base64');

    try {
        await writeQueueClient.sendMessage(message);
        res.json({ shortUrl: `http://your-domain/${shortCode}` });
    } catch (err) {
        res.status(500).json({ error: 'Failed to queue write request' });
    }
});

app.get('/:shortCode', async (req, res) => {
    const { shortCode } = req.params;

    try {
        let longUrl = await redisClient.get(shortCode);
        if (longUrl) {
            return res.json({ redirectUrl: longUrl });
        }

        const message = Buffer.from(JSON.stringify({ shortCode })).toString('base64');
        await readQueueClient.sendMessage(message);

        let attempts = 0;
        while (attempts < 5) {
            longUrl = await redisClient.get(shortCode);
            if (longUrl) {
                return res.json({ redirectUrl: longUrl });
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
            attempts++;
        }

        res.status(404).json({ error: 'URL not found' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to process read request' });
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));