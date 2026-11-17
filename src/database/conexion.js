const mongoose = require('mongoose');
const logger = require('../logging/logger');

const { configMongoDB } = require('./config');

const parametros = new URLSearchParams({ retryWrites: 'true', w: 'majority', appName: configMongoDB.app_name || 'AlertAR' });
const URI_MONGO_DB = `mongodb+srv://${encodeURIComponent(configMongoDB.user || '')}:${encodeURIComponent(configMongoDB.password || '')}@alertarcluster.dtnbv2z.mongodb.net/${encodeURIComponent(configMongoDB.database || '')}?${parametros}`;

mongoose.connection.on('disconnected', () => logger.warn('mongodb_desconectado'));
mongoose.connection.on('error', error => logger.error('mongodb_error', { mensaje: error.message }));
exports.getMongoDBConnection = async () => {
    try {
        if (!configMongoDB.user || !configMongoDB.password || !configMongoDB.database) {
            throw new Error('Falta configuración MongoDB requerida en el entorno');
        }
        await mongoose.connect(URI_MONGO_DB);
        logger.info('mongodb_conectado', { base: configMongoDB.database });
    } catch (error) {
        logger.error('mongodb_conexion_fallida', { mensaje: error.message });
        throw error;
    }
}
