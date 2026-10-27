const express = require('express');
const authController = require('../controllers/auth.controller');
const verificarToken = require('../middleware/verificarToken');

const router = express.Router();

router.post('/registro', authController.registro);
router.post('/login', authController.login);
router.post('/google', authController.google);
router.get('/me', verificarToken, authController.me);

module.exports = router;