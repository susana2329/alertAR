const Reporte = require('./model/modelos');
const mongoose = require('mongoose');

function listarVencidos({ cierreHasta, rechazoHasta, desdeId, limite = 100 }) {
  const vencimiento = {
    $or: [
      { estadoModeracion: 'rechazado', fechaModeracion: { $lte: rechazoHasta } },
      { estadoVecinal: 'cerrado', estadoModeracion: { $ne: 'rechazado' }, fechaCierre: { $lte: cierreHasta } }
    ]
  };
  const filtro = desdeId
    ? { $and: [vencimiento, { _id: { $gt: new mongoose.Types.ObjectId(desdeId) } }] }
    : vencimiento;
  return Reporte.find(filtro, { _id: 1, idUser: 1 }).sort({ _id: 1 }).limit(limite).lean();
}

module.exports = { listarVencidos };
