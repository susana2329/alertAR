const express = require('express')
const router = express.Router();

const cuentaController = require('../controllers/cuenta.controller')


router.get('/perfil/:id',cuentaController.getPerfilUsuario);
router.patch('/perfil/:id/avatar', cuentaController.actualizarFotoPerfil);

router.get('/reportes/usuario/:id', cuentaController.getReportesPorUsuario);
router.get('/reportes/:reporteId',cuentaController.getReporteDetalle);

router.get('/mochilas/usuario/:id', cuentaController.getMochilasPorUsuario);
router.get('mochilas/mochilaId', cuentaController.getMochilaDetalle);

module.exports = router

app.use('/api/cuenta', cuentaRouter);