const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/verificarToken');
const cuentaController = require('../controllers/cuenta.controller');

router.get('/perfil/:id', verificarToken, cuentaController.getPerfilUsuario);
router.patch('/perfil/:id/avatar', verificarToken, cuentaController.actualizarFotoPerfil);
router.delete('/perfil/:id', verificarToken, cuentaController.eliminarCuenta);
router.get('/reportes/usuario/:id', verificarToken, cuentaController.getReportesPorUsuario);

module.exports = router;