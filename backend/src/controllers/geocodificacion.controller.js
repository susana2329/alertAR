const geocodificacionService = require('../service/geocodificacion.service');

exports.reversa = async (req, res, next) => {
    const latitud = Number(req.query.latitud);
    const longitud = Number(req.query.longitud);
    if (req.query.latitud == null || req.query.longitud == null ||
        !Number.isFinite(latitud) || !Number.isFinite(longitud) ||
        latitud < -90 || latitud > 90 || longitud < -180 || longitud > 180) {
        return res.status(400).json({ mensaje: 'Se requieren coordenadas válidas.' });
    }
    try {
        return res.status(200).json(await geocodificacionService.obtenerUbicacionLegible({ latitud, longitud }));
    } catch (error) {
        error.status = 502;
        error.code = 'GEOCODING_UNAVAILABLE';
        return next(error);
    }
};
