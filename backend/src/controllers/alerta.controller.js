const alertaService = require('../service/alerta.service');

exports.listarAlertas = async (req, res, next) => {
    try {
        const alertas = await alertaService.listarAlertas();
        return res.status(200).json(alertas);
    } catch (error) {
        return next(error);
    }
}
