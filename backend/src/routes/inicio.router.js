const express = require('express');
const inicioController = require('../controllers/inicio.controller');

const router = express.Router();
router.get('/', inicioController.obtenerInicio);
module.exports = router;
