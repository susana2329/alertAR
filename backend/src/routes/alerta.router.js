const express = require('express');
const alertaController = require('../controllers/alerta.controller');

const router = express.Router();

router.get('/mapa', alertaController.listarAlertasMapa);
router.get('/:id', alertaController.obtenerAlerta);
router.get('/', alertaController.listarAlertas);

module.exports = router;
