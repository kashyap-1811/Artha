const Eureka = require('eureka-js-client').Eureka;
const dotenv = require('dotenv');
const os = require('os');

// Do NOT override env variables from terminal
// Load local .env and root .env (Terminal variables always take priority)
dotenv.config({ override: false });
dotenv.config({ path: '../.env', override: false });

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

function getServiceHost() {
    const serverIp = process.env.SERVER_IP;
    if (serverIp && serverIp !== 'localhost') {
        return serverIp;
    }
    return getLocalIpAddress();
}

const SERVICE_HOST = process.env.SERVICE_HOST || getServiceHost();

// 🔴 Critical fix: explicit host resolution
const EUREKA_SERVER_URL = process.env.EUREKA_SERVER_URL || 'http://localhost:8761/eureka/';
const eurekaUrl = new URL(EUREKA_SERVER_URL);
const EUREKA_HOST = eurekaUrl.hostname;
const EUREKA_PORT = parseInt(eurekaUrl.port, 10) || (eurekaUrl.protocol === 'https:' ? 443 : 80);
const EUREKA_PATH = eurekaUrl.pathname.endsWith('/') ? `${eurekaUrl.pathname}apps/` : `${eurekaUrl.pathname}/apps/`;

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
        host: EUREKA_HOST,
        port: EUREKA_PORT,
        servicePath: EUREKA_PATH,
    },
});

module.exports = client;