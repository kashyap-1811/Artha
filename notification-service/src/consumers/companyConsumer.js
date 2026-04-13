const fs = require('fs');
const path = require('path');
const { Kafka } = require('kafkajs');
const notificationService = require('../services/notificationService');

const kafkaConfig = {
    clientId: 'notification-service-company',
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
};

// Add SSL for Aiven Cloud Kafka
if (process.env.KAFKAJS_SSL === 'true') {
    kafkaConfig.ssl = {
        rejectUnauthorized: false,
        ca: [fs.readFileSync(path.join(__dirname, '../certs/ca.pem'), 'utf-8')],
        key: fs.readFileSync(path.join(__dirname, '../certs/service.key'), 'utf-8'),
        cert: fs.readFileSync(path.join(__dirname, '../certs/service.cert'), 'utf-8')
    };
}

const kafka = new Kafka(kafkaConfig);

const consumer = kafka.consumer({ groupId: process.env.NOTIFICATION_COMPANY_GROUP_ID || 'notification-company-group' });

const startCompanyConsumer = async () => {
    const connectAndRun = async () => {
        try {
            await consumer.connect();
            await consumer.subscribe({ topic: 'company-events' });

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
            try { await consumer.disconnect(); } catch (e) { /* ignore */ }
            setTimeout(connectAndRun, 10000);
        }
    };

    // Kick off the connection attempt
    connectAndRun();
};

module.exports = { startCompanyConsumer };
