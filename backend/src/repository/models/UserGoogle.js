const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  apellido: { type: String, default: '', trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, select: false },
  googleId: { type: String, unique: true, sparse: true },
  foto: { type: String, default: '' },
  proveedor: { type: String, enum: ['local', 'google'], default: 'local' },
  ultimoAcceso: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Usuario', usuarioSchema);