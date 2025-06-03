const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const { shortUrl } = require('./utils');
require('dotenv').config();

const sqsClient = new SQSClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const writeQueueUrl = process.env.WRITE_QUEUE_URL;

async function processWriteQueue() {
    const batch = [];
    const batchInterval = 10000; // 10 seconds

    setInterval(async () => {
        if (batch.length === 0) return;

        try {
            for (const { url, receiptHandle } of batch) {
                const newID = await shortUrl(url);
                console.log(`Shortened URL ${url} to ID ${newID}`);
                await sqsClient.send(new DeleteMessageCommand({
                    QueueUrl: writeQueueUrl,
                    ReceiptHandle: receiptHandle,
                }));
            }
            batch.length = 0; // Clear batch
        } catch (err) {
            console.error('Error processing batch:', err);
        }
    }, batchInterval);

    while (true) {
        try {
            const data = await sqsClient.send(new ReceiveMessageCommand({
                QueueUrl: writeQueueUrl,
                MaxNumberOfMessages: 10,
                WaitTimeSeconds: 20,
            }));

            if (data.Messages) {
                for (const message of data.Messages) {
                    const { url } = JSON.parse(message.Body);
                    batch.push({ url, receiptHandle: message.ReceiptHandle });
                }
            }
        } catch (err) {
            console.error('Error receiving messages:', err);
        }
    }
}

processWriteQueue().catch(console.error);