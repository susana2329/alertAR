const express = require('express');
const authController = require('../controllers/auth.controller');
const verificarToken = require('../middleware/verificarToken');
const { crearLimitador } = require('../middleware/rate-limit');

const router = express.Router();

const login = crearLimitador({ maximo: 10, ventanaMs: 15 * 60 * 1000 });
const registro = crearLimitador({ maximo: 5, ventanaMs: 60 * 60 * 1000 });
const google = crearLimitador({ maximo: 20, ventanaMs: 15 * 60 * 1000 });
router.post('/registro', registro, authController.registro);
router.post('/login', login, authController.login);
router.post('/google', google, authController.google);
router.get('/me', verificarToken, authController.me);

module.exports = router;
