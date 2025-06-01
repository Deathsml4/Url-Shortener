const { QueueClient } = require("@azure/storage-queue");

const queueClient = new QueueClient(
    "https://myshortenurl.queue.core.windows.net/write-queue",
    "write-queue"
);

module.exports = async function (context) {
    const receivedMessages = await queueClient.receiveMessages({ maxMessages: 10, visibilityTimeout: 10 });

    if (!receivedMessages.receivedMessageItems.length) {
        context.res = { status: 200 };
        return;
    }

    for (const message of receivedMessages.receivedMessageItems) {
        await queueClient.deleteMessage(message.messageId, message.popReceipt);
    }

    context.res = { status: 200 };
};