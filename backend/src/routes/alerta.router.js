const express = require('express');
const alertaController = require('../controllers/alerta.controller');

const router = express.Router();

router.get('/', alertaController.listarAlertas);

module.exports = router;