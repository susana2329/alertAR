const {
    subirReporteService,
    votarReporteVecinal,
    listarReportesUsuario,
    obtenerFotosReporteVecinal,
    eliminarReporteService,
    listarReportesPendientesModeracion,
    moderarReporte
} = require('../service/reporte.service')
const alertaService = require('../service/alerta.service')

exports.subirReporte = async (req, res, next) => {
    try {
        const result = await subirReporteService(req.body, req.files, req.usuarioId)
        alertaService.invalidarCacheMapa()
        const reporte = typeof result.toObject === 'function' ? result.toObject() : result
        const fotos = (reporte.fotos || []).map(({ fieldname, originalname, mimetype, size }) => ({ fieldname, originalname, mimetype, size }))
        return res.status(201).json({ ...reporte, fotos })
    } catch (error) {
        return next(error)
    }
}

exports.votarReporteVecinal = async (req, res, next) => {
    try {
        const result = await votarReporteVecinal(req.params.id, req.usuarioId, req.body?.respuesta)
        alertaService.invalidarCacheMapa()
        return res.status(200).json(result)
    } catch (error) {
        return next(error)
    }
}
exports.listarMisReportes = async (req, res, next) => {
    try {
        return res.status(200).json(await listarReportesUsuario(req.usuarioId))
    } catch (error) {
        return next(error)
    }
}

exports.obtenerFotosVecinales = async (req, res, next) => {
    try {
        return res.status(200).json(await obtenerFotosReporteVecinal(req.params.id))
    } catch (error) {
        return next(error)
    }
}

exports.eliminarReportePropio = async (req, res, next) => {
    try {
        const result = await eliminarReporteService(req.params.id, req.usuarioId)
        alertaService.invalidarCacheMapa()
        return res.status(200).json(result)
    } catch (error) {
        return next(error)
    }
}

exports.listarPendientesModeracion = async (req, res, next) => {
    try {
        const reportes = await listarReportesPendientesModeracion()
        return res.status(200).json(reportes)
    } catch (error) {
        return next(error)
    }
}

exports.moderarReporteController = async (req, res, next) => {
    try {
        const { accion, motivo } = req.body || {}
        const result = await moderarReporte(req.params.id, req.usuarioId, accion, motivo)
        alertaService.invalidarCacheMapa()
        return res.status(200).json(result)
    } catch (error) {
        return next(error)
    }
}
