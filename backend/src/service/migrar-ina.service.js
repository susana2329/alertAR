const Alerta = require('../models/alerta.model');
const historial = require('../repository/alerta-historica.repository');
const alertaRepository = require('../repository/alerta.repository');
const { isDeepStrictEqual } = require('node:util');

function identificar(documento) {
    const unid = documento?.datosFuente?.estacion?.unid;
    const seriesId = documento?.datosFuente?.estacion?.seriesId;
    const fecha = documento?.datosFuente?.medicion?.fecha ?? documento?.fechaInicio;
    const medicion = fecha instanceof Date ? fecha : fecha ? new Date(fecha) : null;
    if (!Number.isSafeInteger(unid) || unid <= 0 || !Number.isSafeInteger(seriesId) || seriesId <= 0 ||
        !medicion || !Number.isFinite(medicion.getTime())) return null;
    return { unid, seriesId, fecha: medicion };
}

function fechaSnapshot(documento) {
    const fecha = documento?.updatedAt ?? documento?.createdAt;
    const resultado = fecha instanceof Date ? fecha : fecha ? new Date(fecha) : null;
    return resultado && Number.isFinite(resultado.getTime()) ? resultado.getTime() : 0;
}

function puntajeCompletitud(documento) {
    const datos = documento?.datosFuente ?? {};
    const medicion = datos.medicion ?? {};
    const metadatos = datos.metadatos ?? {};
    const campos = [medicion.valor, medicion.valorPrecedente, medicion.tendencia, datos.clasificacion,
        datos.umbrales?.unidad, datos.estadoFuente?.estado, documento?.geometria,
        documento?.ubicacion?.latitud, documento?.ubicacion?.longitud];
    return (datos.serieTemporal?.length ?? 0) + campos.filter(valor => valor != null).length +
        Object.values(metadatos).filter(valor => valor != null).length;
}

function compararVersiones(a, b) {
    const porFechaMedicion = b.fecha - a.fecha;
    if (porFechaMedicion) return porFechaMedicion;
    const porFechaSnapshot = (b.doc.__prioridadFechaSnapshot ?? fechaSnapshot(b.doc)) -
        (a.doc.__prioridadFechaSnapshot ?? fechaSnapshot(a.doc));
    if (porFechaSnapshot) return porFechaSnapshot;
    const porCompletitud = (b.doc.__prioridadCompletitud ?? puntajeCompletitud(b.doc)) -
        (a.doc.__prioridadCompletitud ?? puntajeCompletitud(a.doc));
    if (porCompletitud) return porCompletitud;
    return String(a.doc._id).localeCompare(String(b.doc._id));
}

function planificar(documentos, variantesContenido = []) {
    const grupos = new Map();
    const sinIdentidad = [];
    for (const doc of documentos) {
        const id = identificar(doc);
        if (!id) { sinIdentidad.push(doc); continue; }
        if (!grupos.has(id.unid)) grupos.set(id.unid, []);
        grupos.get(id.unid).push({ doc, ...id });
    }
    const estaciones = [];
    const conflictos = [];
    const candidatos = [];
    const docsCambiados = new Map(variantesContenido.filter(item => item.tipo === 'documento_cambio_durante_auditoria')
        .map(item => [item.unid, item]));
    for (const [unid, registros] of grupos) {
        if (docsCambiados.has(unid)) {
            conflictos.push({ ...docsCambiados.get(unid),
                documentosEstacion: registros.map(({ doc }) => String(doc._id)) });
            continue;
        }
        const series = [...new Set(registros.map(registro => registro.seriesId))];
        if (series.length > 1) {
            conflictos.push({ tipo: 'series_id_conflictivo', unid, seriesId: series, documentos: registros.map(({ doc }) => String(doc._id)) });
            continue;
        }
        registros.sort(compararVersiones);
        const vigente = registros[0];
        const anteriores = registros.slice(1).map(registro => registro.doc);
        candidatos.push(...anteriores);
        const variantes = variantesContenido.filter(variacion => variacion.unid === unid);
        estaciones.push({
            unid, seriesId: series[0], cantidadDocumentos: registros.length,
            documentos: registros.map(({ doc }) => String(doc._id)),
            conservarOperativo: { id: String(vigente.doc._id), fechaMedicion: vigente.fecha.toISOString(), claveIdempotencia: vigente.doc.claveIdempotencia ?? null },
            archivar: anteriores.map(doc => ({ id: String(doc._id), fechaMedicion: (identificar(doc)?.fecha).toISOString(), claveIdempotencia: doc.claveIdempotencia ?? null })),
            variantesMismaFecha: variantes
        });
    }
    return { estaciones, conflictos, sinIdentidad, candidatos };
}

function contenidoComparable(documento) {
    const copia = { ...documento };
    for (const campo of ['_id', 'claveIdempotencia', 'claveOperativaINA', 'createdAt', 'updatedAt',
        'fechaUltimaMedicion', 'estadoActualizacion']) delete copia[campo];
    return copia;
}

async function detectarVariantesContenido(documentos, modelo) {
    const grupos = new Map();
    for (const documento of documentos) {
        const identidad = identificar(documento);
        if (!identidad) continue;
        const clave = `${identidad.unid}:${identidad.fecha.toISOString()}`;
        if (!grupos.has(clave)) grupos.set(clave, []);
        grupos.get(clave).push(documento);
    }
    const conflictos = [];
    for (const grupo of grupos.values()) {
        if (grupo.length < 2) continue;
        const fechaPlanificada = identificar(grupo[0]).fecha.getTime();
        const referencia = await modelo.collection.findOne({ _id: grupo[0]._id });
        if (!referencia) {
            const identidad = identificar(grupo[0]);
            conflictos.push({ tipo: 'documento_cambio_durante_auditoria', unid: identidad.unid,
                fechaMedicion: identidad.fecha.toISOString(), documentos: grupo.map(doc => String(doc._id)) });
            continue;
        }
        const docReferencia = grupo[0];
        docReferencia.__prioridadFechaSnapshot = fechaSnapshot(referencia);
        docReferencia.__prioridadCompletitud = puntajeCompletitud(referencia);
        let cambio = identificar(referencia)?.fecha.getTime() !== fechaPlanificada;
        let contenidoDistinto = false;
        for (const candidato of grupo.slice(1)) {
            const completo = await modelo.collection.findOne({ _id: candidato._id });
            if (!completo || identificar(completo)?.fecha.getTime() !== fechaPlanificada) {
                cambio = true;
                break;
            }
            candidato.__prioridadFechaSnapshot = fechaSnapshot(completo);
            candidato.__prioridadCompletitud = puntajeCompletitud(completo);
            if (!isDeepStrictEqual(contenidoComparable(referencia), contenidoComparable(completo))) contenidoDistinto = true;
        }
        if (cambio) {
            const identidad = identificar(grupo[0]);
            conflictos.push({ tipo: 'documento_cambio_durante_auditoria', unid: identidad.unid,
                fechaMedicion: identidad.fecha.toISOString(), documentos: grupo.map(doc => String(doc._id)) });
            continue;
        }
        if (contenidoDistinto) {
            const identidad = identificar(grupo[0]);
            conflictos.push({ tipo: 'snapshots_distintos_misma_fecha', unid: identidad.unid,
                fechaMedicion: identidad.fecha.toISOString(), documentos: grupo.map(doc => String(doc._id)) });
        }
    }
    return conflictos;
}

async function detectarClavesOcupadas(estaciones, modelo) {
    const conflictos = [];
    for (const estacion of estaciones) {
        const clave = `INA:ESTACION:${estacion.unid}`;
        const ocupante = await modelo.collection.findOne({ claveOperativaINA: clave }, { projection: { _id: 1 } });
        if (ocupante && String(ocupante._id) !== estacion.conservarOperativo.id &&
            !estacion.documentos.includes(String(ocupante._id))) {
            conflictos.push({ tipo: 'clave_operativa_ocupada', unid: estacion.unid, claveOperativaINA: clave,
                documentoConservado: estacion.conservarOperativo.id, documentoOcupante: String(ocupante._id) });
        }
    }
    return conflictos;
}

async function migrarINA({ modo = 'dry-run', modelo = Alerta, repositorioHistorico = historial,
    repositorioOperativo = alertaRepository } = {}) {
    if (!['dry-run', 'copy', 'delete-verified'].includes(modo)) throw new Error(`Modo de migración INA inválido: ${modo}`);
    const docs = await modelo.collection.find({ fuente: 'INA', origen: 'oficial' }, { projection: {
        _id: 1, fuente: 1, origen: 1, claveIdempotencia: 1, claveOperativaINA: 1, fechaInicio: 1,
        'datosFuente.estacion.unid': 1, 'datosFuente.estacion.seriesId': 1, 'datosFuente.medicion.fecha': 1
    } }).toArray();
    const variantesContenido = await detectarVariantesContenido(docs, modelo);
    const plan = planificar(docs, variantesContenido);
    const conflictosClave = await detectarClavesOcupadas(plan.estaciones, modelo);
    const estacionesConClaveOcupada = new Set(conflictosClave.map(conflicto => conflicto.unid));
    const estacionesMigrables = plan.estaciones.filter(estacion => !estacionesConClaveOcupada.has(estacion.unid));
    const idsMigrables = new Set(estacionesMigrables.flatMap(estacion => estacion.documentos));
    const candidatosMigrables = plan.candidatos.filter(doc => idsMigrables.has(String(doc._id)));
    const estacionesRevision = new Set([...plan.conflictos, ...conflictosClave].map(conflicto => conflicto.unid));
    const documentosEnRevision = new Set(plan.sinIdentidad.map(doc => String(doc._id)));
    for (const conflicto of plan.conflictos) {
        for (const id of conflicto.documentosEstacion ?? conflicto.documentos ?? []) documentosEnRevision.add(String(id));
    }
    for (const conflicto of conflictosClave) {
        documentosEnRevision.add(conflicto.documentoOcupante);
        const estacion = plan.estaciones.find(item => item.unid === conflicto.unid);
        for (const id of estacion?.documentos ?? []) documentosEnRevision.add(id);
        conflicto.documentos = estacion?.documentos ?? [];
    }
    const resumen = {
        modo, leidos: docs.length, estaciones: plan.estaciones.length,
        estacionesExcluidas: estacionesRevision.size,
        documentosNoMigrables: documentosEnRevision.size,
        documentosOperativosConservar: estacionesMigrables.length,
        candidatosArchivar: candidatosMigrables.length,
        identidadesNoConfiables: plan.sinIdentidad.length,
        conflictosSeries: plan.conflictos.filter(conflicto => conflicto.tipo === 'series_id_conflictivo').length,
        variantesContenidoFecha: variantesContenido.filter(item => item.tipo === 'snapshots_distintos_misma_fecha').length,
        snapshotsVariantesAConservar: variantesContenido.filter(item => item.tipo === 'snapshots_distintos_misma_fecha')
            .reduce((total, variante) => total + Math.max(0, variante.documentos.length - 1), 0),
        auditoriasConCambioConcurrente: variantesContenido.filter(item => item.tipo === 'documento_cambio_durante_auditoria').length,
        conflictosClaveOperativa: conflictosClave.length,
        copiados: 0, yaCopiados: 0, verificados: 0, eliminados: 0, noEliminados: 0, fallidos: 0,
        detalleEstaciones: estacionesMigrables,
        detalleVariantesMismaFecha: variantesContenido.filter(item => item.tipo === 'snapshots_distintos_misma_fecha'),
        detalleRevision: [
            ...plan.sinIdentidad.map(doc => ({ id: String(doc._id), motivo: 'identidad_ina_no_confiable', unid: doc.datosFuente?.estacion?.unid ?? null })),
            ...plan.conflictos,
            ...conflictosClave
        ], errores: []
    };
    if (modo === 'dry-run') return resumen;

    if (modo === 'delete-verified') {
        const conflictoPrevio = plan.sinIdentidad[0] ?? plan.conflictos[0] ?? conflictosClave[0];
        if (conflictoPrevio) {
            const esDocumento = conflictoPrevio._id != null;
            const documentoId = esDocumento ? String(conflictoPrevio._id) :
                String(conflictoPrevio.documentos?.[0] ?? conflictoPrevio.documentosEstacion?.[0] ?? 'no disponible');
            const motivo = conflictoPrevio.tipo ?? 'identidad_ina_no_confiable';
            resumen.fallidos++;
            resumen.errores.push({ id: documentoId,
                unid: conflictoPrevio.unid ?? conflictoPrevio.datosFuente?.estacion?.unid ?? null,
                codigo: motivo, mensaje: `Conflicto detectado antes de borrar: ${motivo}` });
            return resumen;
        }
    }

    const candidatos = candidatosMigrables;
    for (const doc of candidatos) {
        try {
            const completo = await modelo.collection.findOne({ _id: doc._id });
            const planificado = identificar(doc);
            const vigente = identificar(completo);
            if (!completo || !planificado || !vigente || planificado.unid !== vigente.unid ||
                planificado.seriesId !== vigente.seriesId || planificado.fecha.getTime() !== vigente.fecha.getTime()) {
                throw new Error('El documento cambió desde el plan; se conserva en operación para reintento');
            }
            if (modo === 'copy') {
                const resultado = await repositorioHistorico.guardarSnapshotINA(completo);
                resumen.verificados++;
                if (resultado.nuevo) resumen.copiados++;
                else resumen.yaCopiados++;
            } else {
                await repositorioHistorico.verificarSnapshotINA(completo);
                resumen.verificados++;
                const resultado = await repositorioOperativo.eliminarSiNoCambio(completo);
                if (resultado.deletedCount === 1) resumen.eliminados++;
                else {
                    resumen.noEliminados++;
                    const id = identificar(doc)?.unid;
                    const error = new Error('El documento cambió durante la verificación; se conservó en operación');
                    error.code = 'documento_modificado_tras_verificacion';
                    error.unid = id ?? null;
                    throw error;
                }
            }
        } catch (error) {
            resumen.fallidos++;
            const unid = identificar(doc)?.unid;
            resumen.errores.push({ id: String(doc._id), unid: error.unid ?? unid ?? doc.datosFuente?.estacion?.unid ?? null,
                codigo: error.code ?? 'candidato_no_verificado', mensaje: error.message });
            if (modo === 'delete-verified') return resumen;
        }
    }

    if (modo === 'delete-verified') {
        for (const estacion of estacionesMigrables) {
            const vigente = docs.find(doc => String(doc._id) === estacion.conservarOperativo.id);
            if (!vigente) continue;
            try {
                const clave = `INA:ESTACION:${estacion.unid}`;
                const ocupante = await modelo.collection.findOne({ claveOperativaINA: clave }, { projection: { _id: 1 } });
                if (ocupante && String(ocupante._id) !== String(vigente._id)) {
                    resumen.conflictosClaveOperativa++;
                    const documentosEstacion = estacion.documentos;
                    resumen.detalleRevision.push({ tipo: 'clave_operativa_ocupada', unid: estacion.unid,
                        claveOperativaINA: clave, documentoConservado: String(vigente._id), documentoOcupante: String(ocupante._id),
                        documentos: documentosEstacion });
                    estacionesRevision.add(estacion.unid);
                    resumen.estacionesExcluidas = estacionesRevision.size;
                    documentosEnRevision.add(String(ocupante._id));
                    for (const id of documentosEstacion) documentosEnRevision.add(id);
                    resumen.documentosNoMigrables = documentosEnRevision.size;
                    resumen.fallidos++;
                    resumen.errores.push({ id: String(vigente._id), unid: estacion.unid,
                        codigo: 'clave_operativa_ocupada', mensaje: `La clave ${clave} está ocupada por otro documento` });
                    return resumen;
                }
                const actualizado = await modelo.collection.updateOne({
                    _id: vigente._id, fechaInicio: vigente.fechaInicio,
                    'datosFuente.estacion.unid': estacion.unid,
                    'datosFuente.estacion.seriesId': estacion.seriesId
                }, {
                    $set: {
                        claveOperativaINA: `INA:ESTACION:${estacion.unid}`,
                        fechaUltimaMedicion: identificar(vigente).fecha,
                        estadoActualizacion: Date.now() - identificar(vigente).fecha.getTime() > 24 * 60 * 60 * 1000 ? 'desactualizada' : 'actualizada'
                    }
                });
                if (actualizado.matchedCount !== 1) throw new Error('La observación más reciente cambió al finalizar la migración');
            } catch (error) {
                resumen.fallidos++;
                const codigo = error?.code === 11000 ? 'clave_operativa_indice_unico' : 'actualizacion_operativa_fallida';
                if (error?.code === 11000) {
                    resumen.conflictosClaveOperativa++;
                    estacionesRevision.add(estacion.unid);
                    resumen.estacionesExcluidas = estacionesRevision.size;
                    for (const id of estacion.documentos) documentosEnRevision.add(id);
                    resumen.documentosNoMigrables = documentosEnRevision.size;
                    resumen.detalleRevision.push({ tipo: codigo, unid: estacion.unid,
                        claveOperativaINA: `INA:ESTACION:${estacion.unid}`, documentos: estacion.documentos });
                }
                resumen.errores.push({ id: String(vigente._id), unid: estacion.unid, codigo, mensaje: error.message });
                return resumen;
            }
        }
    }
    return resumen;
}

exports.migrarINA = migrarINA;
exports._planificar = planificar;
exports._identificar = identificar;
exports._detectarVariantesContenido = detectarVariantesContenido;
exports._compararVersiones = compararVersiones;
