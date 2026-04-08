const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const eurekaClient = require('./config/eureka');
const { startExpenseConsumer } = require('./consumers/expenseConsumer');
const { startCompanyConsumer } = require('./consumers/companyConsumer');

// Load environment variables (Terminal variables always take priority)
dotenv.config({ override: false });
dotenv.config({ path: '../.env', override: false });

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8086;

// Health check endpoint
app.get('/info', (req, res) => {
    res.json({ status: 'UP', service: 'notification-service' });
});

app.get('/health', (req, res) => {
    res.json({ status: 'UP' });
});

const startServer = async () => {
    try {
        // Connect to MongoDB
        await connectDB();

        // Start Express Server
        app.listen(PORT, () => {
            console.log(`Notification Service running on port ${PORT}`);
        });

        // Start Eureka Client
        eurekaClient.start(error => {
            if (error) {
                console.error('Eureka client startup failed:', error);
            } else {
                console.log('Eureka client registered successfully');
            }
        });

        // Start Kafka Consumer
        await startExpenseConsumer();
        await startCompanyConsumer();

    } catch (error) {
        console.error('Failed to start notification-service:', error);
        process.exit(1);
    }
};

startServer();
