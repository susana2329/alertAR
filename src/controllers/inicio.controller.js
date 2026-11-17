const inicioService = require('../service/inicio.service');

exports.obtenerInicio = async (req, res, next) => {
    const { latitud, longitud } = req.query;
    if ((latitud == null) !== (longitud == null)) {
        return res.status(400).json({ mensaje: 'Se deben enviar latitud y longitud juntas.' });
    }
    let ubicacion = null;
    if (latitud != null) {
        const lat = Number(latitud);
        const lon = Number(longitud);
        if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            return res.status(400).json({ mensaje: 'La ubicación debe contener coordenadas válidas.' });
        }
        ubicacion = { latitud: lat, longitud: lon };
    }
    try {
        return res.status(200).json(await inicioService.obtenerInicio(ubicacion));
    } catch (error) {
        return next(error);
    }
};
