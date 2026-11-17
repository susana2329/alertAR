const mdb = require('mongoose')
const votoVecinal = new mdb.Schema({
    usuario: {
        type: mdb.Schema.Types.ObjectId,
        ref: 'usuarios',
        required: true
    },
    respuesta: {
        type: String,
        enum: ['sigue', 'no_esta'],
        required: true
    },
    fecha: {
        type: Date,
        default: Date.now
    }
}, { _id: false })

const reporte = new mdb.Schema({
    tipo: {
        type: String,
        required: true
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
    geometria: {
        type: {
            type: String,
            enum: ['Point'],
            required: true
        },
        coordinates: {
            type: [Number],
            required: true
        }
    },
    estadoVecinal: {
        type: String,
        enum: ['sin_confirmar', 'confirmado', 'cerrado'],
        default: 'sin_confirmar',
        required: true
    },
    fechaCierre: { type: Date },
    votosVecinales: {
        type: [votoVecinal],
        default: []
    },
    idUser: {
        type:  mdb.Schema.Types.ObjectId,
        ref: "Usuario",
        required: true
    },
    estadoModeracion: {
        type: String,
        enum: ['pendiente', 'aprobado', 'rechazado'],
        default: 'pendiente',
        required: true
    },
    motivoModeracion: {
        type: String,
        default: ''
    },
    moderadoPor: {
        type: mdb.Schema.Types.ObjectId,
        ref: 'usuarios'
    },
    fechaModeracion: {
        type: Date
    }
})

reporte.index({ estadoVecinal: 1, fecha: -1 })
reporte.index({ estadoModeracion: 1, fecha: -1 })
reporte.index({ estadoModeracion: 1, fechaModeracion: 1 })
reporte.index({ estadoVecinal: 1, fechaCierre: 1 })
reporte.index({ geometria: '2dsphere' })

const reportes = mdb.model('reporte', reporte)
module.exports = reportes
