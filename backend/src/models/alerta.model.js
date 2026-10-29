const mongoose = require('mongoose');

const TIPOS = ['inundacion', 'tormenta', 'nevada', 'crecida', 'temperaturas', 'incidente', 'arbol', 'transito', 'meteorologica', 'sismo', 'observacion'];
const NIVELES = ['precaucion', 'advertencia', 'emergencia', 'informativo', 'desconocido'];
const NATURALEZAS = ['alerta', 'observacion', 'contexto'];
const ORIGENES = ['vecinal', 'oficial'];

const geoJsonSchema = new mongoose.Schema({
    type: { type: String, enum: ['Point', 'Polygon', 'MultiPolygon'], required: true },
    coordinates: { type: mongoose.Schema.Types.Mixed, required: true }
}, { _id: false });

const alertaSchema = new mongoose.Schema({
    titulo: { type: String, trim: true },
    tipo: { type: String, enum: TIPOS },
    naturaleza: { type: String, enum: NATURALEZAS, default: 'alerta' },
    nivel: { type: String, enum: NIVELES },
    origen: { type: String, enum: ORIGENES, default: 'oficial' },
    fuente: { type: String, trim: true },
    descripcion: { type: String },
    fechaInicio: { type: Date },
    fechaFin: { type: Date },
    ubicacion: {
        latitud: { type: Number, min: -90, max: 90 },
        longitud: { type: Number, min: -180, max: 180 }
    },

    claveIdempotencia: { type: String },
    identificadorFuente: { type: String },
    emisor: { type: String },
    estadoFuente: { type: mongoose.Schema.Types.Mixed },
    tipoMensaje: { type: String },
    referencias: { type: String },
    geometria: { type: geoJsonSchema },
    datosFuente: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true, strict: true });

alertaSchema.index(
    { claveIdempotencia: 1 },
    { unique: true, partialFilterExpression: { claveIdempotencia: { $type: 'string' } } }
);
alertaSchema.index({ fechaInicio: -1 });

module.exports = mongoose.model('Alerta', alertaSchema);
module.exports.TIPOS = TIPOS;
module.exports.NIVELES = NIVELES;
module.exports.NATURALEZAS = NATURALEZAS;
