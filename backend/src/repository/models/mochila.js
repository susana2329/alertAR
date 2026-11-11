const mongoose = require('mongoose');

const mochilaSchema = new mongoose.Schema({
    usuarioId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'UserGoogle', 
        required: true,
        unique: true
    },
    individual: { type: [String], default: [] },
    familiar: { type: [String], default:[] },
    mascotas: { type: [String], default: [] },
    hogar: { type: [String], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Mochila', mochilaSchema);