const { postReporteRepository } = require('../repository/repository.reporte')
const { getReportesRepositoy } = require('../repository/repository.reporte')
const { getSegunIdRepository } = require('../repository/repository.reporte')
const { postimagenS3 } = require('./s3aws.service')
exports.subirReporteService = async (body, files, iduser) => {
    try {
        const fotos =  await valoress3(files, iduser)
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
        if (!result) {
            throw new error('No se pudo encontrar los reportes')
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
        if (!result) {
            throw new error('No se pudo encontrar el reporte por el id')
        }
        return result
    }
    catch (error) {
        throw new error('No se logro encontrar el repote por el id')
    }
}

const valoress3 = async (array,id) => {
    try {
        const results3 = await  Promise.all(array.map( async (element) => {
            const key = `${id}/${Date.now()}${element.originalname}`
            const result = await postimagenS3(key, element.buffer,element.mimetype)
            element.buffer = null  
            element.key = key
            return element
        }))
        return results3
    }
    catch(error) {
        console.log("error por parte de aws: ", error )
    }
}