const { randomUUID } = require('node:crypto')
const { postimagenS3, getimagenS3, deleteimagenS3 } = require('./s3aws.service')
const reporteRepository = require('../repository/repository.reporte')
const { postReporteRepository, getSegunIdRepository } = reporteRepository
const { evaluarEstadoVecinal } = require('./consenso-vecinal')
const limpiezaRepository = require('../repository/limpieza-fotos.repository')
const limpiezaService = require('./limpieza-fotos.service')
const { validarImagenes } = require('./validar-imagen')

function normalizarTipoReporte(tipo) {
    const normalizado = String(tipo ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
    const alias = {
        inundacion: 'inundacion',
        inundaciones: 'inundacion',
        indundaciones: 'inundacion',
        tormenta: 'tormenta',
        crecida: 'crecida',
        temperaturas: 'temperaturas',
        incidente: 'incidente',
        otro: 'incidente',
        arbol: 'arbol',
        'caida de arbol': 'arbol',
        transito: 'transito',
        'calle bloqueada': 'transito',
        'corte de luz': 'incidente',
        incendios: 'incidente',
        meteorologica: 'meteorologica',
        nevada: 'nevada',
        sismo: 'sismo'
    }
    return alias[normalizado] || 'incidente'
}

async function eliminarFotosSubidas(keys, eliminar = deleteimagenS3) {
    const resultados = await Promise.allSettled(keys.map(key => eliminar(key)))
    for (const resultado of resultados) {
        if (resultado.status === 'rejected') {
            console.error('No se pudo eliminar una imagen del almacenamiento')
        }
    }
    return resultados.every(resultado => resultado.status === 'fulfilled')
}

async function crearReporteConDependencias(body, files, iduser, dependencias = {}) {
    const subirImagen = dependencias.subirImagen || postimagenS3
    const eliminarImagen = dependencias.eliminarImagen || deleteimagenS3
    const guardarReporte = dependencias.guardarReporte || postReporteRepository
    const archivos = Array.isArray(files) ? files : []
    const latitud = typeof body.latitud === 'number' || (typeof body.latitud === 'string' && body.latitud.trim())
        ? Number(body.latitud) : NaN
    const longitud = typeof body.longitud === 'number' || (typeof body.longitud === 'string' && body.longitud.trim())
        ? Number(body.longitud) : NaN
    const fecha = new Date(body.fecha)
    if (!Number.isFinite(latitud) || latitud < -90 || latitud > 90 ||
        !Number.isFinite(longitud) || longitud < -180 || longitud > 180) {
        const error = new Error('Se requiere una ubicación válida para publicar el reporte')
        error.status = 400
        throw error
    }
    if (typeof body.tipo !== 'string' || !body.tipo.trim() ||
        typeof body.descripcion !== 'string' || !body.descripcion.trim() ||
        body.descripcion.length > 200 || !Number.isFinite(fecha.getTime())) {
        const error = new Error('El tipo, la descripción y una fecha válida son obligatorios (máximo 200 caracteres)')
        error.status = 400
        throw error
    }
    if (body.cantidadFotos !== undefined) {
        const cantidadEsperada = Number(body.cantidadFotos)
        if (!Number.isInteger(cantidadEsperada) || cantidadEsperada < 0 || cantidadEsperada > 3 || cantidadEsperada !== archivos.length) {
            const error = new Error('No se recibieron todas las fotos del reporte. Volvé a seleccionarlas e intentá nuevamente.')
            error.status = 400
            throw error
        }
    }
    const imagenesValidadas = validarImagenes(archivos)
    const fotos = []
    const clavesIntentadas = []

    try {
        const resultados = await Promise.allSettled(imagenesValidadas.map(async ({ archivo, mimetype, extension }) => {
            const key = `${iduser}/${randomUUID()}.${extension}`
            clavesIntentadas.push(key)
            await subirImagen(key, archivo.buffer, mimetype)
            return {
                fieldname: archivo.fieldname,
                originalname: archivo.originalname,
                encoding: archivo.encoding,
                mimetype,
                size: archivo.size,
                key
            }
        }))

        resultados.forEach((resultado, indice) => {
            if (resultado.status === 'fulfilled') {
                fotos[indice] = resultado.value
            }
        })
        const falloSubida = resultados.find(resultado => resultado.status === 'rejected')
        if (falloSubida) throw falloSubida.reason

        const report = {
            tipo: normalizarTipoReporte(body.tipo),
            descripcion: body.descripcion,
            ubicacion: body.ubicacion,
            fecha,
            geometria: { type: 'Point', coordinates: [longitud, latitud] },
            estadoVecinal: 'sin_confirmar',
            votosVecinales: [],
            fotos,
            estado: 'En revisión',
            estadoModeracion: fotos.length > 0 ? 'pendiente' : 'aprobado',
            idUser: iduser
        }
        const resultado = await guardarReporte(report)
        if (!resultado) throw new Error('MongoDB no confirmó el guardado del reporte')
        return resultado
    } catch (error) {
        await eliminarFotosSubidas(clavesIntentadas, eliminarImagen)
        throw error
    }
}

exports.subirReporteService = async (body, files, iduser) => {
    return crearReporteConDependencias(body, files, iduser)
}

exports.votarReporteVecinal = async (reporteId, usuarioId, respuesta, dependencias = {}) => {
    if (!['sigue', 'no_esta'].includes(respuesta)) {
        const error = new Error('La respuesta debe ser “sigue” o “no_esta”')
        error.status = 400
        throw error
    }
    if (typeof reporteId !== 'string' || !/^[a-f\d]{24}$/i.test(reporteId)) {
        const error = new Error('El identificador del reporte no es válido')
        error.status = 400
        throw error
    }
    const votar = dependencias.votar || reporteRepository.votarVecinal
    const buscar = dependencias.buscar || reporteRepository.buscarPorId
    const actualizado = await votar(reporteId, usuarioId, respuesta)
    if (actualizado) {
        const votos = actualizado.votosVecinales || []
        return {
            id: String(actualizado._id),
            estadoVecinal: actualizado.estadoVecinal,
            votosSigue: votos.filter(voto => voto.respuesta === 'sigue').length,
            votosNoEsta: votos.filter(voto => voto.respuesta === 'no_esta').length
        }
    }

    const reporte = await buscar(reporteId)
    if (!reporte) {
        const error = new Error('No se encontró el reporte vecinal')
        error.status = 404
        throw error
    }
    if (String(reporte.idUser) === String(usuarioId)) {
        const error = new Error('No podés confirmar tu propio reporte')
        error.status = 403
        throw error
    }
    if (reporte.estadoVecinal === 'cerrado') {
        const error = new Error('Este reporte ya fue cerrado')
        error.status = 409
        throw error
    }
    if ((reporte.votosVecinales || []).some(voto => String(voto.usuario) === String(usuarioId))) {
        const error = new Error('Ya registraste una respuesta para este reporte')
        error.status = 409
        throw error
    }
    throw new Error('No se pudo registrar la respuesta vecinal')
}

exports._evaluarEstadoVecinal = evaluarEstadoVecinal
exports._normalizarTipoReporte = normalizarTipoReporte

async function firmarFotos(fotos, firmarImagen = getimagenS3) {
    if (!Array.isArray(fotos)) return []
    return Promise.all(fotos.map(async foto => {
        if (!foto || typeof foto.key !== 'string' || !foto.key) {
            throw new Error('El reporte contiene una referencia de imagen inválida')
        }
        return {
            fieldname: foto.fieldname,
            originalname: foto.originalname,
            mimetype: foto.mimetype,
            size: foto.size,
            url: await firmarImagen(foto.key)
        }
    }))
}

async function adjuntarFotosFirmadas(reporte, firmarImagen) {
    const fotos = reporte.estadoModeracion === 'rechazado' ? [] : await firmarFotos(reporte.fotos, firmarImagen)
    return { ...reporte, fotos }
}

exports.listarReportesUsuario = async (usuarioId, dependencias = {}) => {
    const listar = dependencias.listar || getSegunIdRepository
    const firmarImagen = dependencias.firmarImagen || getimagenS3
    const reportes = await listar(usuarioId)
    return Promise.all(reportes.map(reporte => adjuntarFotosFirmadas(reporte, firmarImagen)))
}

exports.obtenerFotosReporteVecinal = async (reporteId, dependencias = {}) => {
    if (typeof reporteId !== 'string' || !/^[a-f\d]{24}$/i.test(reporteId)) {
        const error = new Error('El identificador del reporte no es válido')
        error.status = 400
        throw error
    }
    const obtener = dependencias.obtener || reporteRepository.obtenerFotosActivas
    const firmarImagen = dependencias.firmarImagen || getimagenS3
    const reporte = await obtener(reporteId)
    if (!reporte) {
        const error = new Error('No se encontró el reporte vecinal o ya fue cerrado')
        error.status = 404
        throw error
    }
    if (reporte.estadoModeracion === 'pendiente' || reporte.estadoModeracion === 'rechazado') {
        return []
    }
    return firmarFotos(reporte.fotos, firmarImagen)
}

exports.listarReportesPendientesModeracion = async (dependencias = {}) => {
    const listar = dependencias.listar || reporteRepository.obtenerPendientesModeracion
    const firmarImagen = dependencias.firmarImagen || getimagenS3
    const reportes = await listar()
    return Promise.all(reportes.map(async reporte => {
        const fotos = await firmarFotos(reporte.fotos, firmarImagen)
        return {
            _id: String(reporte._id),
            tipo: reporte.tipo,
            descripcion: reporte.descripcion,
            ubicacion: reporte.ubicacion,
            fecha: reporte.fecha,
            estadoVecinal: reporte.estadoVecinal,
            estadoModeracion: reporte.estadoModeracion,
            fotos,
            usuario: reporte.idUser ? {
                id: String(reporte.idUser._id || reporte.idUser),
                nombre: reporte.idUser.nombre || 'Vecino',
                apellido: reporte.idUser.apellido || '',
                email: reporte.idUser.email || ''
            } : null
        }
    }))
}

exports.moderarReporte = async (reporteId, moderadorId, accion, motivo = '', dependencias = {}) => {
    if (!['aprobar', 'rechazar'].includes(accion)) {
        const error = new Error('La acción debe ser "aprobar" o "rechazar"')
        error.status = 400
        throw error
    }
    if (typeof reporteId !== 'string' || !/^[a-f\d]{24}$/i.test(reporteId)) {
        const error = new Error('El identificador del reporte no es válido')
        error.status = 400
        throw error
    }
    const actualizar = dependencias.actualizar || reporteRepository.actualizarModeracion
    const existe = dependencias.existe || reporteRepository.existeReporte
    const eliminarImagen = dependencias.eliminarImagen || deleteimagenS3

    if (accion === 'aprobar') {
        const actualizado = await actualizar(reporteId, {
            estadoModeracion: 'aprobado',
            motivoModeracion: '',
            moderadoPor: moderadorId
        })
        if (!actualizado) {
            const yaExiste = await existe(reporteId)
            const error = new Error(yaExiste ? 'El reporte ya fue procesado' : 'No se encontró el reporte')
            error.status = yaExiste ? 409 : 404
            throw error
        }
        return {
            mensaje: 'Reporte y fotos aprobados correctamente',
            reporte: {
                id: String(reporteId),
                estadoModeracion: 'aprobado',
                estadoVecinal: actualizado.estadoVecinal
            }
        }
    } else {
        const actualizado = await actualizar(reporteId, {
            estadoModeracion: 'rechazado',
            motivoModeracion: motivo || 'Fotos o contenido no válidos',
            moderadoPor: moderadorId,
            estadoVecinal: 'cerrado'
        })
        if (!actualizado) {
            const yaExiste = await existe(reporteId)
            const error = new Error(yaExiste ? 'El reporte ya fue procesado' : 'No se encontró el reporte')
            error.status = yaExiste ? 409 : 404
            throw error
        }
        const fotos = Array.isArray(actualizado.fotos) ? actualizado.fotos : []
        const claves = fotos.map(foto => foto?.key).filter(key => typeof key === 'string' && key.length > 0)
        const eliminadas = await eliminarFotosSubidas(claves, eliminarImagen)
        const limpiezaCompleta = claves.length === fotos.length && eliminadas
        return {
            mensaje: limpiezaCompleta ? 'Reporte rechazado y fotos eliminadas' : 'Reporte rechazado; no se pudieron eliminar todas las fotos',
            limpiezaFotos: limpiezaCompleta ? 'completa' : 'pendiente',
            reporte: {
                id: String(reporteId),
                estadoModeracion: 'rechazado',
                estadoVecinal: 'cerrado'
            }
        }
    }
}

exports.eliminarReporteService = async (reporteId, usuarioId, dependencias = {}) => {
    if (typeof reporteId !== 'string' || !/^[a-f\d]{24}$/i.test(reporteId)) {
        const error = new Error('El identificador del reporte no es válido')
        error.status = 400
        throw error
    }
    const buscar = dependencias.buscar || reporteRepository.buscarReportePropioParaEliminar
    const eliminar = dependencias.eliminar || reporteRepository.eliminarReportePorUsuario
    const registrar = dependencias.registrar || limpiezaRepository.registrar
    const procesar = dependencias.procesar || limpiezaService.procesar
    const reporte = await buscar(reporteId, usuarioId)
    if (!reporte) {
        const error = new Error('No se encontró el reporte o no tenés permiso para eliminarlo')
        error.status = 404
        throw error
    }
    const fotos = reporte.fotos ?? []
    if (!Array.isArray(fotos) || fotos.some(foto => typeof foto?.key !== 'string' || !foto.key.startsWith(`${usuarioId}/`) || foto.key.length <= String(usuarioId).length + 1)) {
        throw new Error('El reporte contiene referencias de imágenes inválidas')
    }
    if (fotos.length) await registrar(reporteId, [...new Set(fotos.map(foto => foto.key))])
    const eliminado = await eliminar(reporteId, usuarioId, reporte.fotos)
    if (!eliminado) {
        const error = new Error('No se encontró el reporte o no tenés permiso para eliminarlo')
        error.status = 404
        throw error
    }
    if (!fotos.length) return { mensaje: 'Reporte eliminado correctamente' }
    let limpiezaFotos = 'pendiente'
    try {
        const resultado = await procesar(reporteId)
        if (resultado.estado === 'completa' || resultado.estado === 'inexistente') limpiezaFotos = 'completa'
    } catch {
        console.error('No se pudo completar la limpieza de fotos del reporte')
    }
    return { mensaje: 'Reporte eliminado correctamente', limpiezaFotos }
}

exports._crearReporteConDependencias = crearReporteConDependencias
exports._firmarFotos = firmarFotos
