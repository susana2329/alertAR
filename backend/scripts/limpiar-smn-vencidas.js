require('dotenv').config();
const mongoose = require('mongoose');
const { getMongoDBConnection } = require('../src/database/conexion');
const { archivarAlertas } = require('../src/service/archivado-alertas.service');

async function ejecutar({ execute = false, ahora = new Date(), archivador = archivarAlertas, salida = console.log } = {}) {
    const resumen = await archivador({ ahora, modo: execute ? 'archive' : 'dry-run', fuentes: ['SMN'] });
    salida(JSON.stringify({ evento: 'archivo_smn_vencidas', ...resumen }));
    return resumen;
}

if (require.main === module) {
    const execute = process.argv.includes('--execute');
    if (execute && process.env.CONFIRMAR_LIMPIEZA_SMN_VENCIDAS !== 'SI') {
        console.error('Ejecución rechazada: configure CONFIRMAR_LIMPIEZA_SMN_VENCIDAS=SI además de --execute.');
        process.exitCode = 2;
    } else {
        getMongoDBConnection()
            .then(() => ejecutar({ execute }))
            .catch(error => { console.error(JSON.stringify({ evento: 'archivo_smn_fallido', mensaje: error.message })); process.exitCode = 1; })
            .finally(() => mongoose.disconnect());
    }
}

module.exports = { ejecutar };
