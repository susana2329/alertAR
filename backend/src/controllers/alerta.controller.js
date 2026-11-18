const alertaService = require('../service/alerta.service');

exports.listarAlertas = async (req, res, next) => {
    try {
        const alertas = await alertaService.listarAlertas();
        return res.status(200).json(alertas);
    } catch (error) {
        return next(error);
    }
}

exports.listarAlertasMapa = async (req, res, next) => {
    try { return res.status(200).json(await alertaService.listarAlertasMapa()); }
    catch (error) { return next(error); }
};

exports.obtenerAlerta = async (req, res, next) => {
    try {
        const alerta = await alertaService.obtenerAlerta(req.params.id);
        return alerta ? res.status(200).json(alerta) : res.status(404).json({ mensaje: 'Alerta no encontrada.' });
    } catch (error) { return next(error); }
};
