const express = require('express');
const router = express.Router();
const mochilaController = require('../controllers/mochila.controller');
const verificarToken = require('../middleware/verificarToken');

router.put('/mochila', verificarToken, mochilaController.guardarMochila);

module.exports = router;