const redis = require('redis');

const redisClient = redis.createClient({
    url: 'redis://redis-shortenurl.redis.cache.windows.net:6379',
});

module.exports = async function (context, eventGridEvent) {
    await redisClient.connect();

    const { shortCode, longUrl } = eventGridEvent.data;
    await redisClient.setEx(shortCode, 3600, longUrl);

    await redisClient.quit();
    context.res = { status: 200 };
};