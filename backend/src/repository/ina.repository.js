const Alerta = require('../models/alerta.model');
const historico = require('./alerta-historica.repository');
const { isDeepStrictEqual } = require('node:util');

const MAX_REINTENTOS = 12;
const MAX_DESACTUALIZADA_MS = 24 * 60 * 60 * 1000;
const colas = new Map();

function esperarTurno(clave, tarea) {
    const anterior = colas.get(clave) ?? Promise.resolve();
    const actual = anterior.catch(() => {}).then(tarea);
    colas.set(clave, actual);
    return actual.finally(() => { if (colas.get(clave) === actual) colas.delete(clave); });
}

function validarIdentidad(alerta) {
    const estacion = alerta.datosFuente?.estacion;
    const { unid, seriesId } = estacion ?? {};
    if (!Number.isSafeInteger(unid) || unid <= 0 || !Number.isSafeInteger(seriesId) || seriesId <= 0 ||
        alerta.claveOperativaINA !== `INA:ESTACION:${unid}`) {
        return 'La observación no tiene unid/seriesId confiables o su clave operativa no coincide';
    }
    if (!(alerta.fechaInicio instanceof Date) || !Number.isFinite(alerta.fechaInicio.getTime())) {
        return 'La observación no tiene una fecha de medición válida';
    }
    return null;
}

function mismoContenidoINA(actual, entrante) {
    const limpiar = documento => {
        const copia = { ...documento };
        delete copia._id;
        delete copia.fechaUltimaMedicion;
        delete copia.estadoActualizacion;
        delete copia.createdAt;
        delete copia.updatedAt;
        return copia;
    };
    return isDeepStrictEqual(limpiar(actual), limpiar(entrante));
}

async function escribir(alerta, onResultado = () => {}, ahora = new Date()) {
    const problema = validarIdentidad(alerta);
    if (problema) {
        onResultado('revision', { codigo: 'identidad_ina_no_confiable', unid: alerta.datosFuente?.estacion?.unid, mensaje: problema });
        return { revision: true, motivo: problema };
    }
    return esperarTurno(alerta.claveOperativaINA, async () => {
        for (let intento = 0; intento < MAX_REINTENTOS; intento++) {
            const actual = await Alerta.collection.findOne({ claveOperativaINA: alerta.claveOperativaINA });
            const fechaNueva = alerta.fechaInicio;
            if (actual) {
                const estacionActual = actual.datosFuente?.estacion ?? {};
                if (estacionActual.unid !== alerta.datosFuente.estacion.unid ||
                    estacionActual.seriesId !== alerta.datosFuente.estacion.seriesId) {
                    const detalle = { codigo: 'conflicto_series_id_ina', unid: alerta.datosFuente.estacion.unid,
                        seriesIdRecibido: alerta.datosFuente.estacion.seriesId, seriesIdOperativo: estacionActual.seriesId };
                    onResultado('revision', detalle);
                    return { revision: true, ...detalle };
                }
                if (actual.fechaInicio instanceof Date && actual.fechaInicio >= fechaNueva) {
                    if (actual.fechaInicio.getTime() === fechaNueva.getTime() && mismoContenidoINA(actual, alerta)) {
                        onResultado('omitida', alerta);
                        return { omitida: true, motivo: 'medicion_duplicada' };
                    }
                    if (actual.fechaInicio.getTime() === fechaNueva.getTime()) {
                        await historico.guardarSnapshotINA(actual);
                        onResultado('revision', { codigo: 'duplicado_ina_con_contenido_distinto', unid: estacionActual.unid, fecha: fechaNueva.toISOString() });
                    }
                    await historico.guardarSnapshotINA(alerta);
                    onResultado('omitida', alerta);
                    return { omitida: true, motivo: 'medicion_no_mas_reciente' };
                }

                // Copy and verify the full old state before attempting a compare-and-swap.
                await historico.guardarSnapshotINA(actual);
                const reemplazo = {
                    ...alerta, _id: actual._id, claveOperativaINA: alerta.claveOperativaINA,
                    fechaUltimaMedicion: fechaNueva,
                    createdAt: actual.createdAt ?? ahora,
                    updatedAt: ahora,
                    estadoActualizacion: ahora.getTime() - fechaNueva.getTime() > MAX_DESACTUALIZADA_MS
                        ? 'desactualizada' : 'actualizada'
                };
                const resultado = await Alerta.collection.replaceOne({
                    _id: actual._id,
                    'datosFuente.estacion.seriesId': estacionActual.seriesId,
                    fechaInicio: actual.fechaInicio
                }, reemplazo);
                if (resultado.modifiedCount === 1) {
                    onResultado('actualizada', reemplazo);
                    return reemplazo;
                }
                continue;
            }

            const nuevo = {
                ...alerta, fechaUltimaMedicion: fechaNueva,
                createdAt: alerta.createdAt ?? ahora,
                updatedAt: ahora,
                estadoActualizacion: ahora.getTime() - fechaNueva.getTime() > MAX_DESACTUALIZADA_MS
                    ? 'desactualizada' : 'actualizada'
            };
            try {
                await Alerta.collection.insertOne(nuevo);
                onResultado('guardada', nuevo);
                return nuevo;
            } catch (error) {
                if (error?.code !== 11000) throw error;
            }
        }
        throw new Error(`No se pudo actualizar INA ${alerta.claveOperativaINA}: demasiados cambios concurrentes`);
    });
}

exports.guardarObservaciones = async (alertas, observadores = {}) => {
    const grupos = new Map();
    for (const alerta of alertas) {
        const unid = alerta.datosFuente?.estacion?.unid;
        if (!Number.isSafeInteger(unid) || unid <= 0) continue;
        if (!grupos.has(unid)) grupos.set(unid, []);
        grupos.get(unid).push(alerta);
    }
    const conflictivas = new Set();
    for (const [unid, grupo] of grupos) {
        const series = new Set(grupo.map(alerta => alerta.datosFuente?.estacion?.seriesId));
        if (series.size > 1) {
            for (const alerta of grupo) {
                conflictivas.add(alerta);
                observadores.onResultado?.('revision', { codigo: 'series_id_conflictivo_en_lote', unid,
                    seriesIdRecibidos: [...series], identificador: alerta.identificadorFuente });
            }
        }
    }
    const ordenadas = alertas.filter(alerta => !conflictivas.has(alerta)).sort((a, b) => {
        const unidA = a.datosFuente?.estacion?.unid ?? Number.MAX_SAFE_INTEGER;
        const unidB = b.datosFuente?.estacion?.unid ?? Number.MAX_SAFE_INTEGER;
        return unidA - unidB || a.fechaInicio - b.fechaInicio;
    });
    const resultados = [];
    for (const alerta of alertas) {
        if (conflictivas.has(alerta)) resultados.push({ revision: true, codigo: 'series_id_conflictivo_en_lote' });
    }
    for (const alerta of ordenadas) resultados.push(await escribir(alerta,
        (accion, detalle) => observadores.onResultado?.(accion, detalle)));
    return resultados;
};

exports.marcarDesactualizadas = async (ahora = new Date()) => {
    const corte = new Date(ahora.getTime() - MAX_DESACTUALIZADA_MS);
    return Alerta.collection.updateMany({ fuente: 'INA', origen: 'oficial', fechaUltimaMedicion: { $lt: corte }, estadoActualizacion: { $ne: 'desactualizada' } },
        { $set: { estadoActualizacion: 'desactualizada' } });
};

exports._validarIdentidad = validarIdentidad;
