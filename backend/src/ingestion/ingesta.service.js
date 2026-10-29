const { obtenerDocumentoSMN, obtenerTexto, extraerEnlacesCAP } = require('./sources/smn.source');
const { parsearCAP } = require('./parsers/cap.parser');
const { normalizarSMN } = require('./normalizers/smn.normalizer');
const { obtenerObservacionesINA } = require('./sources/ina.source');
const { normalizarINA } = require('./normalizers/ina.normalizer');
const { obtenerSismosINPRES } = require('./sources/inpres.source');
const { normalizarINPRES } = require('./normalizers/inpres.normalizer');
const { guardarOficiales } = require('../repository/alerta.repository');

function resumenInicial() {
    return { estado: 'pendiente', cantidadRecibida: null, cantidadNormalizada: 0, cantidadGuardada: 0, cantidadActualizada: 0, cantidadEliminada: 0, cantidadOmitida: 0, cantidadFallida: 0, inicio: null, fin: null, duracionMs: null, persistencia: null, resultadosPersistencia: null, erroresDocumentos: [], erroresPersistencia: [], erroresRegistros: [], error: null };
}

function clasificarResultadoPersistencia(resultado) {
    if (!resultado || typeof resultado !== 'object') return { estado: 'completado' };
    if (resultado.actualizada === false) {
        return { estado: 'no_aplicado', operacion: 'Update', motivo: resultado.motivo ?? null };
    }
    if (resultado.cancelada === false) {
        return { estado: 'no_aplicado', operacion: 'Cancel', motivo: resultado.motivo ?? null };
    }
    if (resultado.cancelada === true) {
        return { estado: 'completado', operacion: 'Cancel', cantidadEliminada: resultado.identificadores?.length ?? 0 };
    }
    return { estado: 'completado' };
}

async function procesarFuente(nombre, obtener, transformar, guardar, resumen) {
    resumen.inicio = new Date().toISOString();
    const reloj = Date.now();
    let registros;
    try {
        const documento = await obtener();
        resumen.cantidadRecibida = Array.isArray(documento?.features) ? documento.features.length : null;
        registros = transformar(documento, resumen);
        if (!Array.isArray(registros)) throw new Error(`El normalizador de ${nombre} no devolvió una lista`);
        resumen.cantidadNormalizada = registros.length;
        resumen.cantidadOmitida = resumen.erroresRegistros.length;
        resumen.estado = 'normalizada';
    } catch (error) {
        resumen.estado = 'error';
        resumen.error = { etapa: 'obtencion_o_normalizacion', mensaje: error.message };
        resumen.cantidadFallida++;
        resumen.fin = new Date().toISOString();
        resumen.duracionMs = Date.now() - reloj;
        return;
    }

    try {
        const guardadosPrevios = resumen.cantidadGuardada + resumen.cantidadActualizada;
        resumen.persistencia = await guardar(registros);
        const resultados = Array.isArray(resumen.persistencia)
            ? resumen.persistencia
            : [resumen.persistencia];
        resumen.resultadosPersistencia = resultados.map(clasificarResultadoPersistencia);
        if (resumen.cantidadGuardada + resumen.cantidadActualizada === guardadosPrevios) {
            resumen.cantidadGuardada += resumen.resultadosPersistencia.filter(r => r.estado === 'completado').length;
        }
        resumen.cantidadFallida = resumen.erroresRegistros.length + resumen.erroresPersistencia.length;
        resumen.estado = resumen.erroresRegistros.length > 0 || resumen.erroresPersistencia.length > 0 || resumen.resultadosPersistencia.some(r => r.estado === 'no_aplicado')
            ? 'parcial'
            : 'completada';
    } catch (error) {
        resumen.estado = 'error';
        resumen.error = { etapa: 'persistencia', mensaje: error.message };
        resumen.cantidadFallida += registros.length;
    } finally {
        resumen.fin = new Date().toISOString();
        resumen.duracionMs = Date.now() - reloj;
    }
}

async function guardarRegistrosAislados(registros, deps, resumen) {
    const resultados = [];
    for (let indice = 0; indice < registros.length; indice++) {
        const registro = registros[indice];
        try {
            const guardados = await deps.guardarOficiales([registro], { onResultado(accion) {
                if (accion === 'guardada') resumen.cantidadGuardada++;
                if (accion === 'actualizada') resumen.cantidadActualizada++;
            } });
            resultados.push(...(Array.isArray(guardados) ? guardados : [guardados]));
        } catch (error) {
            resumen.erroresPersistencia.push({ indice, identificador: registro.identificadorFuente, mensaje: error.message });
        }
    }
    return resultados;
}

async function procesarSMN(deps, resumen) {
    resumen.inicio = new Date().toISOString();
    const reloj = Date.now();
    let enlaces;
    try {
        const indice = await deps.obtenerDocumentoSMN();
        enlaces = deps.extraerEnlacesCAP(indice);
        if (!Array.isArray(enlaces)) throw new Error('El extractor del índice SMN no devolvió una lista');
        resumen.cantidadRecibida = enlaces.length;
    } catch (error) {
        resumen.estado = 'error';
        resumen.error = { etapa: 'indice', mensaje: error.message };
        resumen.cantidadFallida++;
        resumen.fin = new Date().toISOString();
        resumen.duracionMs = Date.now() - reloj;
        return;
    }

    const documentos = await Promise.all(enlaces.map(async url => {
        try {
            const xml = await deps.obtenerTexto(url);
            return { url, alerta: deps.normalizarSMN(deps.parsearCAP(xml)) };
        } catch (error) {
            resumen.erroresDocumentos.push({ url, mensaje: error.message });
            return null;
        }
    }));
    const documentosValidos = documentos.filter(Boolean);
    resumen.cantidadNormalizada = documentosValidos.length;
    resumen.cantidadOmitida = resumen.erroresDocumentos.length;

    if (enlaces.length > 0 && documentosValidos.length === 0) {
        resumen.estado = 'error';
        resumen.error = { etapa: 'documentos_cap', mensaje: 'No se pudo procesar ningún documento CAP' };
        resumen.fin = new Date().toISOString();
        resumen.duracionMs = Date.now() - reloj;
        resumen.cantidadFallida = resumen.erroresDocumentos.length;
        return;
    }

    resumen.persistencia = [];
    resumen.resultadosPersistencia = [];
    const resultados = [];
    for (const { url, alerta } of documentosValidos) {
        let conteoObservado = 0;
        try {
            const guardados = await deps.guardarOficiales([alerta], { onResultado(accion) {
                conteoObservado++;
                if (accion === 'guardada') resumen.cantidadGuardada++;
                if (accion === 'actualizada') resumen.cantidadActualizada++;
                if (accion === 'cancelada') resumen.cantidadEliminada++;
            } });
            const items = Array.isArray(guardados) ? guardados : [guardados];
            for (const resultado of items) {
                resumen.persistencia ??= [];
                resumen.resultadosPersistencia ??= [];
                resumen.persistencia.push(resultado);
                const clasificacion = clasificarResultadoPersistencia(resultado);
                resumen.resultadosPersistencia.push({ url, ...clasificacion });
                resultados.push(clasificacion);
                if (clasificacion.estado === 'completado' && !conteoObservado) {
                    if (clasificacion.operacion === 'Cancel') resumen.cantidadEliminada += clasificacion.cantidadEliminada;
                    else resumen.cantidadGuardada++;
                }
            }
        } catch (error) {
            resumen.erroresPersistencia.push({ url, mensaje: error.message });
        }
    }

    const huboErrores = resumen.erroresDocumentos.length > 0 || resumen.erroresPersistencia.length > 0;
    resumen.cantidadFallida = resumen.erroresDocumentos.length + resumen.erroresPersistencia.length;
    resumen.cantidadOmitida += resumen.resultadosPersistencia.filter(r => r.estado === 'no_aplicado').length;
    const huboResultadosExitosos = resultados.length > 0;
    const persistenciaParcial = resultados.some(r => r.estado === 'no_aplicado');
    if (enlaces.length > 0 && !huboResultadosExitosos) {
        resumen.estado = 'error';
        resumen.error = { etapa: 'persistencia', mensaje: 'No se pudo persistir ningún documento CAP válido' };
    } else {
        resumen.estado = huboErrores || persistenciaParcial ? 'parcial' : 'completada';
    }
    resumen.fin = new Date().toISOString();
    resumen.duracionMs = Date.now() - reloj;
}

async function ejecutarIngesta(dependencias = {}) {
    const deps = {
        obtenerDocumentoSMN, obtenerTexto, extraerEnlacesCAP, parsearCAP, normalizarSMN,
        obtenerObservacionesINA, normalizarINA,
        obtenerSismosINPRES, normalizarINPRES,
        guardarOficiales,
        ...dependencias
    };
    const resumen = { SMN: resumenInicial(), INA: resumenInicial(), INPRES: resumenInicial() };

    await Promise.all([
        procesarSMN(deps, resumen.SMN),
        procesarFuente('INA', () => deps.obtenerObservacionesINA(), (documento, estado) => {
            const alertas = deps.normalizarINA(documento, error => estado.erroresRegistros.push(error));
            estado.cantidadRecibida = documento.features.length;
            return alertas;
        }, alertas => guardarRegistrosAislados(alertas, deps, resumen.INA), resumen.INA),
        procesarFuente('INPRES', () => deps.obtenerSismosINPRES(), (xml, estado) => {
            const alertas = deps.normalizarINPRES(xml, error => estado.erroresRegistros.push(error));
            estado.cantidadRecibida = alertas.length + estado.erroresRegistros.length;
            return alertas;
        },
            alertas => guardarRegistrosAislados(alertas, deps, resumen.INPRES), resumen.INPRES)
    ]);

    return resumen;
}

module.exports = ejecutarIngesta;
module.exports.ejecutarIngesta = ejecutarIngesta;
