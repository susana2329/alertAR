const reportes = require('./model/modelos')
const mongoose = require('mongoose')
const { UMBRAL_CONFIRMACION_VECINAL, UMBRAL_CIERRE_VECINAL } = require('../service/consenso-vecinal')

exports.postReporteRepository = async (report) => {
   return reportes.create(report)
}
exports.getSegunIdRepository = async id => reportes.find({ idUser: id }, {
   tipo: 1,
   descripcion: 1,
   ubicacion: 1,
   fecha: 1,
   fotos: 1,
   estado: 1,
   geometria: 1,
   estadoVecinal: 1,
   estadoModeracion: 1,
   motivoModeracion: 1
}).sort({ fecha: -1 }).lean()

exports.obtenerParaMapa = async () => reportes.find({
   'geometria.type': 'Point',
   estadoVecinal: { $ne: 'cerrado' },
   estadoModeracion: { $ne: 'rechazado' }
}, {
   tipo: 1,
   descripcion: 1,
   fecha: 1,
   geometria: 1,
   estadoVecinal: 1,
   estadoModeracion: 1,
   votosVecinales: 1,
   fotos: 1
}).sort({ fecha: -1 }).lean()

exports.buscarPorId = async id => reportes.findById(id).select('idUser estadoVecinal estadoModeracion votosVecinales fotos').lean()

exports.obtenerPendientesModeracion = async () => reportes.find({
   estadoModeracion: 'pendiente',
   'fotos.0': { $exists: true }
}).populate('idUser', 'nombre apellido email').sort({ fecha: -1 }).lean()

exports.actualizarModeracion = async (reporteId, { estadoModeracion, motivoModeracion, moderadoPor, estadoVecinal }) => {
   const ahora = new Date();
   const update = {
      $set: {
         estadoModeracion,
         motivoModeracion: motivoModeracion || '',
         moderadoPor,
         fechaModeracion: ahora
      }
   };
   if (estadoVecinal !== undefined) update.$set.estadoVecinal = estadoVecinal;
   if (estadoVecinal === 'cerrado') update.$set.fechaCierre = ahora;

   return reportes.findOneAndUpdate(
      { _id: reporteId, estadoModeracion: 'pendiente' },
      update,
      { new: false, projection: { _id: 1, estadoVecinal: 1, fotos: 1 } }
   ).lean();
}

exports.existeReporte = async id => reportes.exists({ _id: id });

exports.buscarReportePropioParaEliminar = (reporteId, usuarioId) => reportes.findOne({
   _id: reporteId, idUser: new mongoose.Types.ObjectId(usuarioId)
}, { fotos: 1 }).lean();

exports.eliminarReportePorUsuario = async (reporteId, usuarioId, fotos) => {
   return reportes.findOneAndDelete({
      _id: reporteId,
      idUser: new mongoose.Types.ObjectId(usuarioId),
      fotos: fotos === undefined ? { $exists: false } : fotos
   }, { writeConcern: { w: 'majority' } })
}

exports.obtenerFotosActivas = async id => reportes.findOne({
   _id: id,
   'geometria.type': 'Point',
   estadoVecinal: { $ne: 'cerrado' },
   estadoModeracion: { $ne: 'rechazado' }
}, { fotos: 1, estadoModeracion: 1 }).lean()

exports.votarVecinal = async (reporteId, usuarioId, respuesta) => {
   const usuarioObjectId = new mongoose.Types.ObjectId(usuarioId)
   return reportes.findOneAndUpdate({
      _id: reporteId,
      idUser: { $ne: usuarioObjectId },
      'votosVecinales.usuario': { $ne: usuarioObjectId },
      estadoVecinal: { $ne: 'cerrado' }
   }, [{
      $set: {
         votosVecinales: {
            $concatArrays: [
               { $ifNull: ['$votosVecinales', []] },
               [{ usuario: usuarioObjectId, respuesta, fecha: new Date() }]
            ]
         }
      }
   }, {
      $set: {
         estadoVecinal: {
            $let: {
               vars: {
                  votosSigue: {
                     $size: {
                        $filter: {
                           input: '$votosVecinales',
                           as: 'voto',
                           cond: { $eq: ['$$voto.respuesta', 'sigue'] }
                        }
                     }
                  },
                  votosNoEsta: {
                     $size: {
                        $filter: {
                           input: '$votosVecinales',
                           as: 'voto',
                           cond: { $eq: ['$$voto.respuesta', 'no_esta'] }
                        }
                     }
                  }
               },
               in: {
                  $switch: {
                     branches: [{
                        case: {
                           $and: [
                              { $gte: ['$$votosNoEsta', UMBRAL_CIERRE_VECINAL] },
                              {
                                 $gte: [
                                    { $multiply: ['$$votosNoEsta', 3] },
                                    { $multiply: [{ $size: '$votosVecinales' }, 2] }
                                 ]
                              }
                           ]
                        },
                        then: 'cerrado'
                     }, {
                        case: { $gte: ['$$votosSigue', UMBRAL_CONFIRMACION_VECINAL] },
                        then: 'confirmado'
                     }],
                     default: { $ifNull: ['$estadoVecinal', 'sin_confirmar'] }
                  }
               }
            }
         }
      }
   }, {
      $set: {
         fechaCierre: {
            $cond: [
               { $eq: ['$estadoVecinal', 'cerrado'] },
               { $ifNull: ['$fechaCierre', '$$NOW'] },
               '$$REMOVE'
            ]
         }
      }
   }], { updatePipeline: true, new: true, projection: { tipo: 1, estadoVecinal: 1, votosVecinales: 1 } }).lean()
}
