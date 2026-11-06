const mongoose = require('mongoose');
const Alerta = require('./alerta.model');

const alertaHistoricaSchema = Alerta.schema.clone();
alertaHistoricaSchema.clearIndexes();
alertaHistoricaSchema.index(
    { claveIdempotencia: 1 },
    { unique: true, partialFilterExpression: { claveIdempotencia: { $type: 'string' } } }
);
alertaHistoricaSchema.index({ fuente: 1, fechaInicio: -1 });

module.exports = mongoose.models.AlertaHistorica ||
    mongoose.model('AlertaHistorica', alertaHistoricaSchema, 'alertas_historicas');
