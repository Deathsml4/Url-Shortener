const express = require('express');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const sqsClient = new SQSClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const writeQueueUrl = process.env.WRITE_QUEUE_URL;
const readQueueUrl = process.env.READ_QUEUE_URL;

app.get('/short/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const command = new SendMessageCommand({
            QueueUrl: readQueueUrl,
            MessageBody: JSON.stringify({ id }),
        });
        await sqsClient.send(command);
        res.status(202).json({ message: 'Read request queued', id });
    } catch (err) {
        console.error('Error queuing read request:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/create', async (req, res) => {
    try {
        const { url } = req.query;
        if (!url || !/^https?:\/\//.test(url)) {
            return res.status(400).json({ error: 'Valid URL required' });
        }
        const command = new SendMessageCommand({
            QueueUrl: writeQueueUrl,
            MessageBody: JSON.stringify({ url }),
        });
        await sqsClient.send(command);
        res.status(202).json({ message: 'Write request queued' });
    } catch (err) {
        console.error('Error queuing write request:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log(`Gateway listening on port ${port}`);
});