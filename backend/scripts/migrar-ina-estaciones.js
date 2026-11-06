require('dotenv').config();
const mongoose = require('mongoose');
const { getMongoDBConnection } = require('../src/database/conexion');
const { migrarINA } = require('../src/service/migrar-ina.service');

function modoDesdeArgumentos(argumentos) {
    const permitidos = ['--dry-run', '--copy', '--delete-verified'];
    const invalidos = argumentos.filter(arg => !permitidos.includes(arg));
    if (invalidos.length) throw new Error(`Argumento no reconocido: ${invalidos.join(', ')}`);
    const modos = permitidos.filter(arg => argumentos.includes(arg));
    if (modos.length > 1) throw new Error('Elegí una sola fase: --dry-run, --copy o --delete-verified');
    return modos[0]?.slice(2) ?? 'dry-run';
}

async function ejecutar(modo = 'dry-run') {
    await getMongoDBConnection();
    return migrarINA({ modo });
}

if (require.main === module) {
    let modo;
    try { modo = modoDesdeArgumentos(process.argv.slice(2)); }
    catch (error) { console.error(error.message); process.exitCode = 2; }
    if (modo) ejecutar(modo)
        .then(resumen => {
            console.log(JSON.stringify({ evento: 'migracion_ina_estaciones', ...resumen }));
            if (resumen.fallidos > 0) process.exitCode = 1;
        })
        .catch(error => {
            console.error(JSON.stringify({ evento: 'migracion_ina_estaciones_fallida', mensaje: error.message }));
            process.exitCode = 1;
        })
        .finally(() => mongoose.disconnect());
}

module.exports = { ejecutar, modoDesdeArgumentos };
