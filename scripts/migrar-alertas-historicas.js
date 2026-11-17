require('dotenv').config();
const mongoose = require('mongoose');
const { getMongoDBConnection } = require('../src/database/conexion');
const { archivarAlertas, MODOS } = require('../src/service/archivado-alertas.service');

function modoDesdeArgumentos(argumentos) {
    const modosPermitidos = MODOS.filter(modo => modo !== 'archive');
    const desconocidos = argumentos.filter(argumento => !modosPermitidos.includes(argumento.replace(/^--/, '')) || !argumento.startsWith('--'));
    if (desconocidos.length) throw new Error(`Argumento no reconocido: ${desconocidos.join(', ')}`);
    const modos = modosPermitidos.filter(modo => argumentos.includes(`--${modo}`));
    if (modos.length > 1) throw new Error('Elegí un solo modo: --dry-run, --copy o --delete-verified');
    return modos[0] ?? 'dry-run';
}

async function ejecutar(modo = 'dry-run') {
    await getMongoDBConnection();
    return archivarAlertas({ modo });
}

if (require.main === module) {
    let modo;
    try { modo = modoDesdeArgumentos(process.argv.slice(2)); }
    catch (error) {
        console.error(error.message);
        process.exitCode = 2;
    }
    if (modo) {
        ejecutar(modo)
            .then(resumen => {
                console.log(JSON.stringify({ evento: 'migracion_alertas_historicas', ...resumen }));
                if (resumen.fallidos > 0) process.exitCode = 1;
            })
            .catch(error => {
                console.error(JSON.stringify({ evento: 'migracion_alertas_historicas_fallida', mensaje: error.message }));
                process.exitCode = 1;
            })
            .finally(() => mongoose.disconnect());
    }
}

module.exports = { ejecutar, modoDesdeArgumentos };
