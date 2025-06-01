const redis = require('redis');

const redisClient = redis.createClient({
    url: 'redis://redis-shortenurl.redis.cache.windows.net:6379',
});

redisClient.connect();

module.exports = redisClient;