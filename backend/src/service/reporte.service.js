const { postReporteRepository } = require('../repository/repository.reporte')
const { getReportesRepositoy } = require('../repository/repository.reporte')
const { getSegunIdRepository } = require('../repository/repository.reporte')
const { randomUUID } = require('node:crypto')
const { postimagenS3, getimagenS3, deleteimagenS3 } = require('./s3aws.service')

async function eliminarFotosSubidas(keys, eliminar = deleteimagenS3) {
    const resultados = await Promise.allSettled(keys.map(key => eliminar(key)))
    for (const resultado of resultados) {
        if (resultado.status === 'rejected') {
            console.error('No se pudo limpiar una imagen luego de fallar el reporte:', resultado.reason)
        }
    }
}

async function crearReporteConDependencias(body, files, iduser, dependencias = {}) {
    const subirImagen = dependencias.subirImagen || postimagenS3
    const eliminarImagen = dependencias.eliminarImagen || deleteimagenS3
    const guardarReporte = dependencias.guardarReporte || postReporteRepository
    const archivos = Array.isArray(files) ? files : []
    const fotos = []
    const clavesIntentadas = []

    try {
        const resultados = await Promise.allSettled(archivos.map(async archivo => {
            const key = `${iduser}/${randomUUID()}-${archivo.originalname}`
            clavesIntentadas.push(key)
            await subirImagen(key, archivo.buffer, archivo.mimetype)
            return {
                fieldname: archivo.fieldname,
                originalname: archivo.originalname,
                encoding: archivo.encoding,
                mimetype: archivo.mimetype,
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
            tipo: body.tipo,
            descripcion: body.descripcion,
            ubicacion: body.ubicacion,
            fecha: body.fecha,
            fotos,
            estado: body.estado,
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
exports.getReporteService = async () => {
    try {
        const result = await getReportesRepositoy()
        const arrayurlimg = await getresponses3(result.fotos)
        result.fotos = arrayurlimg
        if (!result) {
            throw new Error('No se pudo encontrar los reportes')
        }
        return result
    }
    catch (error) {
        console.log("error en servise", error)
        throw new Error("No se pudo mostrar el reporte")
    }
}
exports.getSegunIdService = async (id) => {
    try {
        const result = await getSegunIdRepository(id)
        let arrayurl=[]
        for (let i = 0; i < result.length; i++) {
            arrayurl = await getresponses3(result[i].fotos)
        }
        result.fotos = arrayurl
        console.log(arrayurl)
        if (!result) {
            throw new Error('No se pudo encontrar el reporte por el id')
        }
        return result
    }
    catch (error) {
        throw new error('No se logro encontrar el repote por el id')
    }
}

exports._crearReporteConDependencias = crearReporteConDependencias
const getresponses3 = async (array) => {
    try {
        let arrayurlimg = await  Promise.all(array.map(async (e) => {
            const result = await getimagenS3(e.key) 
            e.url = result
            return e
        }))
        if (!arrayurlimg) {
            throw new error("No se pudo encontrar los reportes")
        }

        return arrayurlimg
    }
    catch (error) {
        console.log(error)
    }
}
