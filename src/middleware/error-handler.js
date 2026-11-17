const logger = require('../logging/logger');

function errorHandler(error, req, res, next) {
    logger.error('http_error', { method: req.method, path: req.path, status: error.status || 500, mensaje: error.message });
    if (res.headersSent) return next(error);
    const status = error.status >= 400 && error.status < 500 ? error.status : 500;
    return res.status(status).json({
        error: { codigo: error.code || 'INTERNAL_ERROR', mensaje: status < 500 ? error.message : 'Error interno del servidor' }
    });
}

module.exports = errorHandler;
