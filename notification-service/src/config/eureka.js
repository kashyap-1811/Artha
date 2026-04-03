const Eureka = require('eureka-js-client').Eureka;
const dotenv = require('dotenv');
const os = require('os');

dotenv.config();

const PORT = parseInt(process.env.PORT, 10) || 8086;

function getLocalIpAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

const SERVICE_HOST = process.env.SERVICE_HOST || getLocalIpAddress();

const client = new Eureka({
    instance: {
        app: 'NOTIFICATION-SERVICE',
        instanceId: `${SERVICE_HOST}:notification-service:${PORT}`,
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