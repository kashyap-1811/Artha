const { Kafka } = require('kafkajs');
const notificationService = require('../services/notificationService');

const kafka = new Kafka({
    clientId: 'notification-service-company',
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const consumer = kafka.consumer({ groupId: process.env.KAFKA_COMPANY_GROUP_ID || 'notification-service-company-group' });

const startCompanyConsumer = async () => {
    const connectAndRun = async () => {
        try {
            await consumer.connect();
            await consumer.subscribe({ topic: 'company-events', fromBeginning: true });

            console.log('Kafka Consumer connected and subscribed to company-events');

            await consumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    try {
                        const eventData = JSON.parse(message.value.toString());
                        await notificationService.handleCompanyEvent(eventData);
                    } catch (err) {
                        console.error('Error processing company Kafka message:', err);
                    }
                },
            });
        } catch (error) {
            console.error('Error starting company Kafka consumer. Retrying in 10s...', error.message);
            setTimeout(connectAndRun, 10000);
        }
    };

    // Kick off the connection attempt
    connectAndRun();
};

module.exports = { startCompanyConsumer };
