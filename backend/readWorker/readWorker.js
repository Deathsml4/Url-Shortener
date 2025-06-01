const { QueueClient } = require('@azure/storage-queue');
const { Client } = require('pg');
const redis = require('redis');
const { EventGridPublisherClient, AzureKeyCredential } = require('@azure/eventgrid');

const queueClient = new QueueClient(
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

const redisClient = redis.createClient({
    url: 'redis://redis-shortenurl.redis.cache.windows.net:6379',
});

const eventGridClient = new EventGridPublisherClient(
    "https://mypubsubtopic.eastus-1.eventgrid.azure.net/api/events",
    "EventGrid",
    new AzureKeyCredential("7VMPVJ9IJE9lyWhBPbffP6M0fuNmwejvUt9UzpexGfWlGIjhtHNiJQQJ99BFACYeBjFXJ3w3AAABAZEGD6ky")
);

module.exports = async function (context) {
    await pgClient.connect();
    await redisClient.connect();

    const receivedMessages = await queueClient.receiveMessages({ maxMessages: 10 });
    if (!receivedMessages.receivedMessageItems.length) {
        context.res = { status: 200 };
        return;
    }

    for (const message of receivedMessages.receivedMessageItems) {
        const { shortCode } = JSON.parse(Buffer.from(message.messageText, 'base64').toString());
        let longUrl = await redisClient.get(shortCode);

        if (!longUrl) {
            const result = await pgClient.query(
                'SELECT long_url FROM urls WHERE short_code = $1',
                [shortCode]
            );
            longUrl = result.rows[0]?.long_url;
            if (longUrl) {
                await redisClient.setEx(shortCode, 3600, longUrl);
                await eventGridClient.publishEvents([
                    {
                        subject: `url-update/${shortCode}`,
                        eventType: "Microsoft.EventGrid.GenericEvent",
                        data: { shortCode, longUrl },
                        dataVersion: "1.0"
                    }
                ]);
            }
        }

        await queueClient.deleteMessage(message.messageId, message.popReceipt);
    }

    await pgClient.end();
    await redisClient.quit();
    context.res = { status: 200 };
};