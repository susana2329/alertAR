const mdb = require('mongoose')
const reporte = mdb.Schema({
    tipo: {
        type: String,
        requiered: true
    },
    descripcion: {
        type: String,
        required: true
    },
    ubicacion: {
        type: String,
        required: true
    },
    fecha: {
        type: Date,
        required: true
    },
    fotos: {
        type: [Object]
    },
    estado: {
        type: String,
        required: true
    },
    idUser: {
        type:  mdb.Schema.Types.ObjectId,
        ref: "usuarios",
        required: true

    }
})

const reportes = mdb.model('reporte', reporte)
module.exports = reportes