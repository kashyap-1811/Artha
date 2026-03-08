const Eureka = require('eureka-js-client').Eureka;
const dotenv = require('dotenv');

dotenv.config();

const PORT = parseInt(process.env.PORT, 10) || 8086;
const SERVICE_HOST = process.env.SERVICE_HOST || 'notification-service';

const client = new Eureka({
    instance: {
        app: 'NOTIFICATION-SERVICE',
        hostName: SERVICE_HOST,
        ipAddr: SERVICE_HOST,
        port: {
            '$': PORT,
            '@enabled': 'true',
        },
        statusPageUrl: `http://${SERVICE_HOST}:${PORT}/info`,
        vipAddress: 'NOTIFICATION-SERVICE',
        dataCenterInfo: {
            '@class': 'com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo',
            name: 'MyOwn',
        },
    },
    eureka: {
        host: process.env.EUREKA_HOST || 'service-registry',
        port: parseInt(process.env.EUREKA_PORT, 10) || 8761,
        servicePath: '/eureka/apps/',
    },
});

module.exports = client;