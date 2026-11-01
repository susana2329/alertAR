const { postReporteRepository } = require('../repository/repository.reporte')
const { getReportesRepositoy } = require('../repository/repository.reporte')
const { getSegunIdRepository } = require('../repository/repository.reporte')
const { postimagenS3, getimagenS3 } = require('./s3aws.service')
exports.subirReporteService = async (body, files, iduser) => {
    try {
        const fotos = await valoress3(files, iduser)
        const report = {
            tipo: body.tipo,
            descripcion: body.descripcion,
            ubicacion: body.ubicacion,
            fecha: body.fecha,
            fotos: fotos,
            estado: body.estado,
            idUser: iduser
        }
        console.log(report)
        const result = await postReporteRepository(report)
        console.log(result)
        if (!result) {
            console.log("Hubo un error al recibir la confirmacion de mongo")
        }
        return result
    }
    catch (error) {
        console.log("error en servise", error)
        throw new error("No se pudo guardar el reporte")
    }
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

const valoress3 = async (array, id) => {
    try {
        const results3 = await Promise.all(array.map(async (element) => {
            const key = `${id}/${Date.now()}${element.originalname}`
            await postimagenS3(key, element.buffer, element.mimetype)
            element.buffer = null
            element.key = key
            return element
        }))
        return results3
    }
    catch (error) {
        console.log("ERROR AL SUBIR LAS FOTOS: ", error)
    }
}
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