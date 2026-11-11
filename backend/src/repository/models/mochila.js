const mongoose = require('mongoose');

const mochilaSchema = new mongoose.Schema({
    usuarioId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'UserGoogle', 
        required: true,
        unique: true
    },
    individual: { type: [Number], default: [] },
    familiar: { type: [Number], default: [] },
    mascotas: { type: [Number], default: [] },
    hogar: { type: [Number], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Mochila', mochilaSchema);