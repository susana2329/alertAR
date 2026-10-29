require('dotenv').config();
const mongoose = require('mongoose');
const Alerta = require('../src/models/alerta.model');
const { configMongoDB } = require('../src/database/config');
const logger = require('../src/logging/logger');

function construirUri() {
    if (!configMongoDB.user || !configMongoDB.password || !configMongoDB.database) {
        throw new Error('Falta configuración MongoDB requerida en el entorno');
    }
    const params = new URLSearchParams({ retryWrites: 'true', w: 'majority', appName: configMongoDB.app_name || 'AlertAR' });
    return `mongodb+srv://${encodeURIComponent(configMongoDB.user)}:${encodeURIComponent(configMongoDB.password)}@alertarcluster.dtnbv2z.mongodb.net/${encodeURIComponent(configMongoDB.database)}?${params}`;
}

async function ejecutar({ execute = false, ahora = new Date(), modelo = Alerta, salida = console.log } = {}) {
    const filtro = {
        fuente: 'SMN', origen: 'oficial', tipoMensaje: { $in: ['Alert', 'Update'] },
        estadoFuente: 'Actual', fechaFin: { $type: 'date', $lt: ahora },
        'datosFuente.mock': { $ne: true }, 'datosFuente.esPrueba': { $ne: true }
    };
    const candidatos = await modelo.find(filtro).select('_id fuente tipoMensaje estadoFuente fechaFin titulo').sort({ fechaFin: 1 }).lean();
    const reporte = candidatos.map(doc => ({
        id: String(doc._id), fuente: doc.fuente, titulo: doc.titulo ?? null,
        fechaFin: doc.fechaFin.toISOString(), motivo: 'alerta oficial SMN vencida (fechaFin anterior a la fecha de simulación)'
    }));
    salida(JSON.stringify({ evento: 'limpieza_smn_vencidas', modo: execute ? 'ejecucion' : 'simulacion', fechaCorte: ahora.toISOString(), cantidad: reporte.length, candidatos: reporte }));
    if (execute && reporte.length) {
        const resultado = await modelo.deleteMany({ _id: { $in: candidatos.map(doc => doc._id) }, ...filtro });
        return { cantidadCandidata: reporte.length, cantidadEliminada: resultado.deletedCount };
    }
    return { cantidadCandidata: reporte.length, cantidadEliminada: 0 };
}

if (require.main === module) {
    const execute = process.argv.includes('--execute');
    if (execute && process.env.CONFIRMAR_LIMPIEZA_SMN_VENCIDAS !== 'SI') {
        console.error('Ejecución rechazada: configure CONFIRMAR_LIMPIEZA_SMN_VENCIDAS=SI además de --execute.');
        process.exitCode = 2;
    } else {
        mongoose.connect(construirUri())
            .then(() => ejecutar({ execute }))
            .then(resultado => console.log(JSON.stringify({ evento: 'limpieza_finalizada', ...resultado })))
            .catch(error => { logger.error('limpieza_fallida', { mensaje: error.message }); process.exitCode = 1; })
            .finally(() => mongoose.disconnect());
    }
}

module.exports = { ejecutar, construirUri };
