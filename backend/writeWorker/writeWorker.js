const { QueueClient } = require("@azure/storage-queue");
const { Client } = require('pg');

const queueClient = new QueueClient(
    "https://myshortenurl.queue.core.windows.net/write-queue",
    "write-queue"
);

const pgClient = new Client({
    user: 'pgadmin',
    host: 'url-shortener-db.cmnwyi0i2y3j.us-east-1.rds.amazonaws.com',
    database: 'postgres',
    password: 'Welcome123',
    port: 5432,
});

module.exports = async function (context) {
    await pgClient.connect();

    const receivedMessages = await queueClient.receiveMessages({ maxMessages: 10 });
    if (!receivedMessages.receivedMessageItems.length) {
        context.res = { status: 200 };
        return;
    }

    for (const message of receivedMessages.receivedMessageItems) {
        const { shortCode, url } = JSON.parse(Buffer.from(message.messageText, 'base64').toString());
        await pgClient.query(
            'INSERT INTO urls (short_code, long_url) VALUES ($1, $2)',
            [shortCode, url]
        );
        await queueClient.deleteMessage(message.messageId, message.popReceipt);
    }

    await pgClient.end();
    context.res = { status: 200 };
};