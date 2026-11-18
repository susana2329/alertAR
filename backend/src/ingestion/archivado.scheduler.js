const loggerEstructurado = require('../logging/logger');
const INTERVALO_PREDETERMINADO_MS = 15 * 60 * 1000;

function crearProgramadorArchivado({
    ejecutarArchivado,
    intervaloMs = INTERVALO_PREDETERMINADO_MS,
    programar = setInterval,
    limpiar = clearInterval,
    logger = loggerEstructurado
}) {
    if (typeof ejecutarArchivado !== 'function') throw new TypeError('ejecutarArchivado debe ser una función');
    if (!Number.isFinite(intervaloMs) || intervaloMs <= 0) throw new RangeError('intervaloMs debe ser positivo');

    let temporizador = null;
    let enEjecucion = false;
    let rondaEnCurso = Promise.resolve();

    function ejecutarRonda() {
        if (enEjecucion) return rondaEnCurso;
        enEjecucion = true;
        rondaEnCurso = Promise.resolve().then(ejecutarArchivado)
            .then(resumen => logger.info('archivado_periodico_completado', resumen))
            .catch(error => logger.error('archivado_periodico_fallido', { mensaje: error?.message ?? String(error) }))
            .finally(() => { enEjecucion = false; });
        return rondaEnCurso;
    }

    function iniciar() {
        if (temporizador !== null) return controlador;
        temporizador = programar(() => { void ejecutarRonda(); }, intervaloMs);
        temporizador?.unref?.();
        return controlador;
    }

    async function detener() {
        if (temporizador !== null) {
            limpiar(temporizador);
            temporizador = null;
        }
        await rondaEnCurso;
    }

    const controlador = { iniciar, detener, ejecutarRonda };
    return controlador;
}

module.exports = crearProgramadorArchivado;
module.exports.crearProgramadorArchivado = crearProgramadorArchivado;
module.exports.INTERVALO_PREDETERMINADO_MS = INTERVALO_PREDETERMINADO_MS;
