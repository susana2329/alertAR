const mongoose = require('mongoose');

const mochilaSchema = new mongoose.Schema({
    usuarioId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'UserGoogle', 
        required: true,
        unique: true
    },
    individual: { items:{type:[String], default:[]}, default: {} },
    familiar: { personasMayores:{ type:[String], default:[]}, personasDiscapacitadas:{type:[String],default:[]}, default:{}},
    mascotas: { items:{type:[String],default:[]}, default: {} },
    hogar: { items:{type:[String], default:[]}, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('Mochila', mochilaSchema);