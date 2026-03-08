const Eureka = require('eureka-js-client').Eureka;
const dotenv = require('dotenv');

dotenv.config();

const PORT = parseInt(process.env.PORT, 10) || 8086;
const EUREKA_HOST = process.env.EUREKA_HOST || 'localhost';
const EUREKA_PORT = parseInt(process.env.EUREKA_PORT, 10) || 8761;

const client = new Eureka({
    instance: {
        app: 'NOTIFICATION-SERVICE',
        hostName: 'localhost',
        ipAddr: '127.0.0.1',
        statusPageUrl: `http://localhost:${PORT}/info`,
        port: {
            '$': PORT,
            '@enabled': 'true',
        },
        vipAddress: 'NOTIFICATION-SERVICE',
        dataCenterInfo: {
            '@class': 'com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo',
            name: 'MyOwn',
        },
    },
    eureka: {
        host: EUREKA_HOST,
        port: EUREKA_PORT,
        servicePath: '/eureka/apps/'
    },
});

module.exports = client;
