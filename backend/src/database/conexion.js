const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');

const { configMongoDB } = require('./config');

const URI_MONGO_DB =
    `mongodb+srv://${configMongoDB.user}:${configMongoDB.password}@alertarcluster.dtnbv2z.mongodb.net/${configMongoDB.database}?retryWrites=true&w=majority&appName=${configMongoDB.app_name}`;
exports.getMongoDBConnection = async () => {
    try {
        console.log(URI_MONGO_DB)
        await mongoose.connect(URI_MONGO_DB);
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
}