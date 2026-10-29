const alertaService = require('../service/alerta.service');

exports.listarAlertas = async (req, res) => {
    const alertas = await alertaService.listarAlertas();
    res.status(200).json(alertas);
}