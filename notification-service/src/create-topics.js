require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Kafka } = require('kafkajs');

async function createTopics() {
    const kafkaConfig = {
        clientId: 'topic-creator',
        brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
    };

    if (process.env.KAFKAJS_SSL === 'true') {
        kafkaConfig.ssl = {
            rejectUnauthorized: false,
            ca: [fs.readFileSync(path.join(__dirname, 'certs/ca.pem'), 'utf-8')],
            key: fs.readFileSync(path.join(__dirname, 'certs/service.key'), 'utf-8'),
            cert: fs.readFileSync(path.join(__dirname, 'certs/service.cert'), 'utf-8')
        };
    }

    const kafka = new Kafka(kafkaConfig);
    const admin = kafka.admin();

    try {
        console.log('Connecting to Kafka Admin...');
        await admin.connect();
        console.log('Connected!');

        const topics = ['expense-events', 'budget-events', 'company-events'];
        console.log(`Creating topics: ${topics.join(', ')}`);

        await admin.createTopics({
            topics: topics.map(topic => ({
                topic,
                numPartitions: 1,
                replicationFactor: 1
            }))
        });

        console.log('Topics verified/created successfully!');
    } catch (e) {
        console.error('Failed to create topics:', e);
    } finally {
        await admin.disconnect();
    }
}

createTopics();
