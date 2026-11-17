const mongoose = require('mongoose');
const Limpieza = require('../models/limpieza-fotos.model');
const Reporte = require('./model/modelos');

exports.registrar = async (reporteId, claves) => {
  await Limpieza.updateOne(
    { _id: new mongoose.Types.ObjectId(reporteId) },
    { $addToSet: { claves: { $each: claves } }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true, setDefaultsOnInsert: false, writeConcern: { w: 'majority' } }
  );
};
exports.obtener = id => Limpieza.findById(id).lean();
exports.listar = limite => {
  const consulta = Limpieza.find({}, { _id: 1 }).sort({ createdAt: 1 });
  return (limite ? consulta.limit(limite) : consulta).lean();
};
exports.existeReporte = id => Reporte.exists({ _id: id });
exports.eliminar = id => Limpieza.deleteOne({ _id: id }, { writeConcern: { w: 'majority' } });
