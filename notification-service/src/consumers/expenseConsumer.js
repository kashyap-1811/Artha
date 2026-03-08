const { Kafka } = require('kafkajs');
const notificationService = require('../services/notificationService');

const kafka = new Kafka({
    clientId: 'notification-service',
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const consumer = kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID || 'notification-service-group' });

const startExpenseConsumer = async () => {
    try {
        await consumer.connect();
        await consumer.subscribe({ topic: 'expense-events', fromBeginning: true });

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
        console.error('Error starting Kafka consumer:', error);
    }
};

module.exports = { startExpenseConsumer };
