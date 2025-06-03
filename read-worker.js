const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const Redis = require('ioredis');
require('dotenv').config();
const { findOrigin } = require('./utils');

const sqsClient = new SQSClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
});

const readQueueUrl = process.env.READ_QUEUE_URL;
const channel = 'url_resolution';

async function processReadQueue() {
    while (true) {
        try {
            const data = await sqsClient.send(new ReceiveMessageCommand({
                QueueUrl: readQueueUrl,
                MaxNumberOfMessages: 10,
                WaitTimeSeconds: 20,
            }));

            if (data.Messages) {
                for (const message of data.Messages) {
                    const { id } = JSON.parse(message.Body);
                    const url = await findOrigin(id);
                    await redis.publish(channel, JSON.stringify({ id, url }));
                    await sqsClient.send(new DeleteMessageCommand({
                        QueueUrl: readQueueUrl,
                        ReceiptHandle: message.ReceiptHandle,
                    }));
                }
            }
        } catch (err) {
            console.error('Error processing read queue:', err);
        }
    }
}

processReadQueue().catch(console.error);