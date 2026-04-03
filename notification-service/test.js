const connectDB = require('./src/config/db');
console.log('before connect');
connectDB().then(() => console.log('after connect')).catch(e => console.log(e));
console.log('sync end');
