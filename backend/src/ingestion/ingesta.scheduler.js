const INTERVALO_PREDETERMINADO_MS = 15 * 60 * 1000;

function resumenParaRegistro(resumen) {
    if (!resumen || typeof resumen !== 'object') return resumen;
    return Object.fromEntries(Object.entries(resumen).map(([fuente, resultado]) => [fuente, {
        estado: resultado?.estado ?? 'desconocido',
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
    logger = console
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
                logger.info('[Ingesta] Resumen por fuente:', resumenParaRegistro(resumen));
                return resumen;
            } catch (error) {
                logger.error('[Ingesta] Falló la ronda:', error?.message ?? String(error));
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
