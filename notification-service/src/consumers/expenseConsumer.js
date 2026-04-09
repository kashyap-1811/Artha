const { Kafka } = require('kafkajs');
const notificationService = require('../services/notificationService');

const kafka = new Kafka({
    clientId: 'notification-service',
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const consumer = kafka.consumer({ groupId: process.env.NOTIFICATION_EXPENSE_GROUP_ID || 'notification-expense-group' });

const startExpenseConsumer = async () => {
    const connectAndRun = async () => {
        try {
            await consumer.connect();
            await consumer.subscribe({ topic: 'expense-events' });

            console.log('Kafka Consumer connected and subscribed to expense-events');

            await consumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    try {
                        const eventData = JSON.parse(message.value.toString());
                        await notificationService.handleExpenseEvent(eventData);
                    } catch (err) {
                        console.error('Error processing Kafka message:', err);
                    }
                },
            });
        } catch (error) {
            console.error('Error starting Kafka consumer. Retrying in 10s...', error.message);
            try { await consumer.disconnect(); } catch (e) { /* ignore */ }
            setTimeout(connectAndRun, 10000);
        }
    };

    // Kick off the connection attempt
    connectAndRun();
};

module.exports = { startExpenseConsumer };
