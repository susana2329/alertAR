const { obtenerDocumentoSMN, obtenerTexto, extraerEnlacesCAP } = require('./sources/smn.source');
const { parsearCAP } = require('./parsers/cap.parser');
const { normalizarSMN } = require('./normalizers/smn.normalizer');
const { obtenerObservacionesINA } = require('./sources/ina.source');
const { normalizarINA } = require('./normalizers/ina.normalizer');
const { obtenerSismosINPRES } = require('./sources/inpres.source');
const { normalizarINPRES } = require('./normalizers/inpres.normalizer');
const { guardarOficiales } = require('../repository/alerta.repository');

function resumenInicial() {
    return { estado: 'pendiente', cantidadNormalizada: 0, persistencia: null, resultadosPersistencia: null, erroresDocumentos: [], erroresPersistencia: [], erroresRegistros: [], error: null };
}

function clasificarResultadoPersistencia(resultado) {
    if (!resultado || typeof resultado !== 'object') return { estado: 'completado' };
    if (resultado.actualizada === false) {
        return { estado: 'no_aplicado', operacion: 'Update', motivo: resultado.motivo ?? null };
    }
    if (resultado.cancelada === false) {
        return { estado: 'no_aplicado', operacion: 'Cancel', motivo: resultado.motivo ?? null };
    }
    return { estado: 'completado' };
}

async function procesarFuente(nombre, obtener, transformar, guardar, resumen) {
    let registros;
    try {
        const documento = await obtener();
        registros = transformar(documento, resumen);
        if (!Array.isArray(registros)) throw new Error(`El normalizador de ${nombre} no devolvió una lista`);
        resumen.cantidadNormalizada = registros.length;
        resumen.estado = 'normalizada';
    } catch (error) {
        resumen.estado = 'error';
        resumen.error = { etapa: 'obtencion_o_normalizacion', mensaje: error.message };
        return;
    }

    try {
        resumen.persistencia = await guardar(registros);
        const resultados = Array.isArray(resumen.persistencia)
            ? resumen.persistencia
            : [resumen.persistencia];
        resumen.resultadosPersistencia = resultados.map(clasificarResultadoPersistencia);
        resumen.estado = resumen.erroresRegistros.length > 0 || resumen.resultadosPersistencia.some(r => r.estado === 'no_aplicado')
            ? 'parcial'
            : 'completada';
    } catch (error) {
        resumen.estado = 'error';
        resumen.error = { etapa: 'persistencia', mensaje: error.message };
    }
}

async function procesarSMN(deps, resumen) {
    let enlaces;
    try {
        const indice = await deps.obtenerDocumentoSMN();
        enlaces = deps.extraerEnlacesCAP(indice);
        if (!Array.isArray(enlaces)) throw new Error('El extractor del índice SMN no devolvió una lista');
    } catch (error) {
        resumen.estado = 'error';
        resumen.error = { etapa: 'indice', mensaje: error.message };
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

    if (enlaces.length > 0 && documentosValidos.length === 0) {
        resumen.estado = 'error';
        resumen.error = { etapa: 'documentos_cap', mensaje: 'No se pudo procesar ningún documento CAP' };
        return;
    }

    resumen.persistencia = [];
    resumen.resultadosPersistencia = [];
    const resultados = [];
    for (const { url, alerta } of documentosValidos) {
        try {
            const guardados = await deps.guardarOficiales([alerta]);
            const items = Array.isArray(guardados) ? guardados : [guardados];
            for (const resultado of items) {
                resumen.persistencia ??= [];
                resumen.resultadosPersistencia ??= [];
                resumen.persistencia.push(resultado);
                const clasificacion = clasificarResultadoPersistencia(resultado);
                resumen.resultadosPersistencia.push({ url, ...clasificacion });
                resultados.push(clasificacion);
            }
        } catch (error) {
            resumen.erroresPersistencia.push({ url, mensaje: error.message });
        }
    }

    const huboErrores = resumen.erroresDocumentos.length > 0 || resumen.erroresPersistencia.length > 0;
    const huboResultadosExitosos = resultados.length > 0;
    const persistenciaParcial = resultados.some(r => r.estado === 'no_aplicado');
    if (enlaces.length > 0 && !huboResultadosExitosos) {
        resumen.estado = 'error';
        resumen.error = { etapa: 'persistencia', mensaje: 'No se pudo persistir ningún documento CAP válido' };
    } else {
        resumen.estado = huboErrores || persistenciaParcial ? 'parcial' : 'completada';
    }
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
        procesarFuente('INA', () => deps.obtenerObservacionesINA(), documento =>
            deps.normalizarINA(documento), alertas => deps.guardarOficiales(alertas), resumen.INA),
        procesarFuente('INPRES', () => deps.obtenerSismosINPRES(), xml =>
            deps.normalizarINPRES(xml, error => resumen.INPRES.erroresRegistros.push(error)),
            alertas => deps.guardarOficiales(alertas), resumen.INPRES)
    ]);

    return resumen;
}

module.exports = ejecutarIngesta;
module.exports.ejecutarIngesta = ejecutarIngesta;
