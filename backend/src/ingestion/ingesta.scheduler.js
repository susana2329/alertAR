const INTERVALO_PREDETERMINADO_MS = 15 * 60 * 1000;
const loggerEstructurado = require('../logging/logger');

function resumenParaRegistro(resumen) {
    if (!resumen || typeof resumen !== 'object') return resumen;
    return Object.fromEntries(Object.entries(resumen).map(([fuente, resultado]) => [fuente, {
        estado: resultado?.estado ?? 'desconocido',
        inicio: resultado?.inicio ?? null,
        fin: resultado?.fin ?? null,
        duracionMs: resultado?.duracionMs ?? null,
        recibidos: resultado?.cantidadRecibida ?? null,
        normalizados: resultado?.cantidadNormalizada ?? 0,
        guardados: resultado?.cantidadGuardada ?? 0,
        actualizados: resultado?.cantidadActualizada ?? 0,
        eliminados: resultado?.cantidadEliminada ?? 0,
        omitidos: resultado?.cantidadOmitida ?? 0,
        fallidos: resultado?.cantidadFallida ?? 0,
        error: resultado?.error ?? null,
        erroresDocumentos: resultado?.erroresDocumentos ?? [],
        erroresPersistencia: resultado?.erroresPersistencia ?? [],
        erroresRegistros: resultado?.erroresRegistros ?? []
    }]));
}

function crearProgramadorIngesta({
    ejecutarIngesta,
    intervaloMs = INTERVALO_PREDETERMINADO_MS,
    programar = setInterval,
    limpiar = clearInterval,
    logger = loggerEstructurado
}) {
    if (typeof ejecutarIngesta !== 'function') {
        throw new TypeError('ejecutarIngesta debe ser una función');
    }
    if (!Number.isFinite(intervaloMs) || intervaloMs <= 0) {
        throw new RangeError('intervaloMs debe ser un número positivo');
    }

    let temporizador = null;
    let enEjecucion = false;
    let detenido = true;
    let rondaEnCurso = Promise.resolve();

    function ejecutarRonda() {
        if (detenido || enEjecucion) return Promise.resolve(undefined);
        enEjecucion = true;
        rondaEnCurso = (async () => {
            try {
                const resumen = await ejecutarIngesta();
                logger.info('ingesta_completada', { fuentes: resumenParaRegistro(resumen) });
                return resumen;
            } catch (error) {
                logger.error('ingesta_fallida', { mensaje: error?.message ?? String(error) });
                return undefined;
            } finally {
                enEjecucion = false;
            }
        })();
        return rondaEnCurso;
    }

    function iniciar() {
        if (!detenido) return controlador;
        detenido = false;
        temporizador = programar(() => { void ejecutarRonda(); }, intervaloMs);
        void ejecutarRonda();
        return controlador;
    }

    function detener() {
        detenido = true;
        if (temporizador !== null) {
            limpiar(temporizador);
            temporizador = null;
        }
        return rondaEnCurso;
    }

    const controlador = { iniciar, detener };
    return controlador;
}

module.exports = crearProgramadorIngesta;
module.exports.crearProgramadorIngesta = crearProgramadorIngesta;
module.exports.INTERVALO_PREDETERMINADO_MS = INTERVALO_PREDETERMINADO_MS;
