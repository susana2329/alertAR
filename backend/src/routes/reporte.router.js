const express = require('express')
const routerReporte = express.Router()
const {
    subirReporte,
    votarReporteVecinal,
    listarMisReportes,
    obtenerFotosVecinales,
    eliminarReportePropio,
    listarPendientesModeracion,
    moderarReporteController
} = require('../controllers/reporte.controller')
const multer = require('multer')
const verificarToken = require('../middleware/verificarToken')
const verificarModerador = require('../middleware/verificarModerador')
const { crearLimitador } = require('../middleware/rate-limit')
const limitarCreacionIP = crearLimitador({ maximo: 30, ventanaMs: 60 * 60 * 1000 })
const limitarCreacionUsuario = crearLimitador({ maximo: 10, ventanaMs: 60 * 60 * 1000, clave: req => req.usuarioId })
const limitarVotosIP = crearLimitador({ maximo: 120, ventanaMs: 60 * 60 * 1000 })
const limitarVotosUsuario = crearLimitador({ maximo: 60, ventanaMs: 60 * 60 * 1000, clave: req => req.usuarioId })
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { files: 3, fileSize: 5 * 1024 * 1024 }
})
const cargarImagenes = (req, res, next) => upload.array('fotos', 3)(req, res, error => {
    if (error instanceof multer.MulterError) {
        error.status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400
    }
    next(error)
})

routerReporte.get('/pendientes', verificarModerador, listarPendientesModeracion)
routerReporte.patch('/reporte/:id/moderar', verificarModerador, moderarReporteController)
routerReporte.post('/reporte', limitarCreacionIP, verificarToken, limitarCreacionUsuario, cargarImagenes, subirReporte)
routerReporte.delete('/reporte/:id', verificarToken, eliminarReportePropio)
routerReporte.post('/reporte/:id/voto', limitarVotosIP, verificarToken, limitarVotosUsuario, votarReporteVecinal)
routerReporte.get('/reporte/:id/imagenes', obtenerFotosVecinales)
routerReporte.get('/mis-reportes', verificarToken, listarMisReportes)

module.exports = routerReporte
