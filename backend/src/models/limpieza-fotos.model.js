const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, required: true },
  claves: { type: [String], required: true },
  createdAt: { type: Date, default: Date.now }
}, { versionKey: false, collection: 'limpiezas_fotos_pendientes' });

module.exports = mongoose.model('LimpiezaFotos', schema);
