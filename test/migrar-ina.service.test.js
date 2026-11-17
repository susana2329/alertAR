const test = require('node:test');
const assert = require('node:assert/strict');
const { isDeepStrictEqual } = require('node:util');
const Alerta = require('../src/models/alerta.model');
const historico = require('../src/repository/alerta-historica.repository');
const repositorioOperativo = require('../src/repository/alerta.repository');
const { migrarINA, _planificar } = require('../src/service/migrar-ina.service');

const originales = {
    find: Alerta.collection.find,
    findOne: Alerta.collection.findOne,
    deleteOne: Alerta.collection.deleteOne,
    updateOne: Alerta.collection.updateOne,
    eliminar: repositorioOperativo.eliminarSiNoCambio,
    guardar: historico.guardarSnapshotINA,
    verificar: historico.verificarSnapshotINA
};
let documentos;
let guardados;
let eliminados;

function doc(id, { unid = 5, seriesId = 50, fecha, clave = `INA:${unid}:${fecha}` } = {}) {
    const date = new Date(fecha);
    return { _id: id, fuente: 'INA', origen: 'oficial', claveIdempotencia: clave, fechaInicio: date,
        datosFuente: { estacion: { unid, seriesId }, medicion: { fecha: date.toISOString(), valor: 3 }, serieTemporal: [] } };
}

test.beforeEach(() => {
    documentos = [doc('old', { fecha: '2026-11-04T10:00:00Z' }), doc('latest', { fecha: '2026-11-05T10:00:00Z' })];
    guardados = [];
    eliminados = [];
    Alerta.collection.find = filtro => ({ toArray: async () => documentos.filter(x => x.fuente === filtro.fuente && x.origen === filtro.origen) });
    Alerta.collection.findOne = async filtro => structuredClone(documentos.find(x =>
        filtro._id !== undefined ? x._id === filtro._id : x.claveOperativaINA === filtro.claveOperativaINA) ?? null);
    Alerta.collection.deleteOne = async filtro => {
        const expected = filtro.$expr?.$eq?.[1]?.$literal;
        const indice = documentos.findIndex(x => x._id === filtro._id && expected && isDeepStrictEqual(x, expected));
        if (indice < 0) return { deletedCount: 0 };
        documentos.splice(indice, 1); eliminados.push(filtro._id); return { deletedCount: 1 };
    };
    repositorioOperativo.eliminarSiNoCambio = documento => Alerta.collection.deleteOne({
        _id: documento._id, $expr: { $eq: ['$$ROOT', { $literal: documento }] }
    });
    Alerta.collection.updateOne = async (filtro, update) => {
        const actual = documentos.find(x => x._id === filtro._id);
        if (actual) Object.assign(actual, update.$set);
        return { matchedCount: actual ? 1 : 0, modifiedCount: actual ? 1 : 0 };
    };
    historico.guardarSnapshotINA = async documento => { guardados.push(documento._id); return { nuevo: true }; };
    historico.verificarSnapshotINA = async documento => { assert.ok(guardados.includes(documento._id) || documento._id === 'old'); return documento; };
});

test.afterEach(() => {
    Alerta.collection.find = originales.find;
    Alerta.collection.findOne = originales.findOne;
    Alerta.collection.deleteOne = originales.deleteOne;
    Alerta.collection.updateOne = originales.updateOne;
    repositorioOperativo.eliminarSiNoCambio = originales.eliminar;
    historico.guardarSnapshotINA = originales.guardar;
    historico.verificarSnapshotINA = originales.verificar;
});

test('dry-run detalla qué instantánea conservar, qué archivar y qué requiere revisión sin escribir', async () => {
    const resumen = await migrarINA({ modo: 'dry-run' });
    assert.equal(resumen.leidos, 2);
    assert.equal(resumen.estaciones, 1);
    assert.equal(resumen.candidatosArchivar, 1);
    assert.equal(resumen.detalleEstaciones[0].conservarOperativo.id, 'latest');
    assert.equal(resumen.detalleEstaciones[0].archivar[0].id, 'old');
    assert.deepEqual(guardados, []);
    assert.deepEqual(eliminados, []);
});

test('el plan excluye de decisión destructiva las identidades incompletas y los seriesId conflictivos', () => {
    const plan = _planificar([
        doc('a', { fecha: '2026-11-01T00:00:00Z' }),
        doc('b', { fecha: '2026-11-02T00:00:00Z', seriesId: 51 }),
        { _id: 'sin-id', fuente: 'INA', origen: 'oficial', fechaInicio: new Date(), datosFuente: { estacion: { unid: null } } }
    ]);
    assert.equal(plan.conflictos.length, 1);
    assert.equal(plan.sinIdentidad.length, 1);
    assert.equal(plan.candidatos.length, 0);
});

test('dry-run enumera todos los documentos y estaciones excluidas por identidad o seriesId', async () => {
    documentos = [
        doc('series-a', { fecha: '2026-11-01T00:00:00Z', seriesId: 50 }),
        doc('series-b', { fecha: '2026-11-02T00:00:00Z', seriesId: 51 }),
        { _id: 'sin-identidad', fuente: 'INA', origen: 'oficial', fechaInicio: new Date(), datosFuente: { estacion: { unid: null } } }
    ];
    const resumen = await migrarINA({ modo: 'dry-run' });
    assert.equal(resumen.conflictosSeries, 1);
    assert.equal(resumen.identidadesNoConfiables, 1);
    assert.equal(resumen.estacionesExcluidas, 1);
    assert.equal(resumen.documentosNoMigrables, 3);
    assert.deepEqual(resumen.detalleRevision.map(item => item.tipo ?? item.motivo).sort(), [
        'identidad_ina_no_confiable', 'series_id_conflictivo'
    ]);
});

test('copy es idempotente por snapshot y delete-verified solo retira duplicados tras verificar', async () => {
    let copiaExiste = false;
    historico.guardarSnapshotINA = async documento => {
        const nuevo = !copiaExiste; copiaExiste = true; guardados.push(documento._id); return { nuevo };
    };
    const primera = await migrarINA({ modo: 'copy' });
    const segunda = await migrarINA({ modo: 'copy' });
    assert.equal(primera.copiados, 1);
    assert.equal(segunda.yaCopiados, 1);
    assert.deepEqual(eliminados, []);
    const borrado = await migrarINA({ modo: 'delete-verified' });
    assert.equal(borrado.eliminados, 1);
    assert.deepEqual(documentos.map(x => x._id), ['latest']);
    assert.equal(documentos[0].claveOperativaINA, 'INA:ESTACION:5');
});

test('delete-verified no retira registros cuando falta una copia histórica', async () => {
    historico.verificarSnapshotINA = async () => { throw new Error('copia ausente'); };
    const resumen = await migrarINA({ modo: 'delete-verified' });
    assert.equal(resumen.fallidos, 1);
    assert.deepEqual(eliminados, []);
    assert.equal(documentos.length, 2);
});

test('delete-verified se detiene al fallar la primera verificación y deja intactos los candidatos siguientes', async () => {
    documentos = [
        doc('old-1', { fecha: '2026-11-03T10:00:00Z' }),
        doc('old-2', { fecha: '2026-11-04T10:00:00Z' }),
        doc('latest', { fecha: '2026-11-05T10:00:00Z' })
    ];
    const verificados = [];
    historico.verificarSnapshotINA = async documento => {
        verificados.push(documento._id);
        throw new Error('snapshot histórico distinto');
    };
    const resumen = await migrarINA({ modo: 'delete-verified' });
    assert.deepEqual(verificados, ['old-2']);
    assert.deepEqual(eliminados, []);
    assert.deepEqual(documentos.map(documento => documento._id), ['old-1', 'old-2', 'latest']);
    assert.equal(resumen.fallidos, 1);
    assert.deepEqual(resumen.errores[0], {
        id: 'old-2', unid: 5, codigo: 'candidato_no_verificado', mensaje: 'snapshot histórico distinto'
    });
});

test('delete-verified se detiene ante discrepancia de identidad antes de verificar candidatos posteriores', async () => {
    documentos = [
        doc('old-1', { fecha: '2026-11-03T10:00:00Z' }),
        doc('old-2', { fecha: '2026-11-04T10:00:00Z' }),
        doc('latest', { fecha: '2026-11-05T10:00:00Z' })
    ];
    const findOneOriginal = Alerta.collection.findOne;
    const verificados = [];
    Alerta.collection.findOne = async filtro => {
        const resultado = await findOneOriginal(filtro);
        if (filtro._id === 'old-2' && resultado) resultado.datosFuente.estacion.unid = 99;
        return resultado;
    };
    historico.verificarSnapshotINA = async documento => { verificados.push(documento._id); return documento; };
    const resumen = await migrarINA({ modo: 'delete-verified' });
    assert.deepEqual(verificados, []);
    assert.deepEqual(eliminados, []);
    assert.deepEqual(documentos.map(documento => documento._id), ['old-1', 'old-2', 'latest']);
    assert.equal(resumen.fallidos, 1);
    assert.equal(resumen.errores[0].id, 'old-2');
    assert.equal(resumen.errores[0].unid, 5);
    assert.match(resumen.errores[0].mensaje, /cambió desde el plan/);
});

test('delete-verified no procesa candidatos cuando la estación tiene seriesId inconsistentes', async () => {
    documentos.push(doc('other-station-old', { unid: 6, seriesId: 60, fecha: '2026-11-03T10:00:00Z' }));
    documentos.push(doc('other-station-latest', { unid: 6, seriesId: 61, fecha: '2026-11-05T10:00:00Z' }));
    const verificados = [];
    historico.verificarSnapshotINA = async documento => { verificados.push(documento._id); return documento; };
    const resumen = await migrarINA({ modo: 'delete-verified' });
    assert.deepEqual(verificados, []);
    assert.deepEqual(eliminados, []);
    assert.equal(documentos.length, 4);
    assert.equal(resumen.fallidos, 1);
    assert.equal(resumen.errores[0].unid, 6);
    assert.equal(resumen.errores[0].codigo, 'series_id_conflictivo');
});

test('delete-verified se detiene ante un fallo de borrado y conserva los candidatos posteriores', async () => {
    documentos = [
        doc('old-1', { fecha: '2026-11-03T10:00:00Z' }),
        doc('old-2', { fecha: '2026-11-04T10:00:00Z' }),
        doc('latest', { fecha: '2026-11-05T10:00:00Z' })
    ];
    const verificadas = [];
    const intentosBorrado = [];
    historico.verificarSnapshotINA = async documento => { verificadas.push(documento._id); return documento; };
    Alerta.collection.deleteOne = async filtro => {
        intentosBorrado.push(filtro._id);
        return { deletedCount: 0 };
    };
    const resumen = await migrarINA({ modo: 'delete-verified' });
    assert.deepEqual(verificadas, ['old-2']);
    assert.deepEqual(intentosBorrado, ['old-2']);
    assert.deepEqual(documentos.map(documento => documento._id), ['old-1', 'old-2', 'latest']);
    assert.equal(resumen.eliminados, 0);
    assert.equal(resumen.noEliminados, 1);
    assert.equal(resumen.fallidos, 1);
    assert.equal(resumen.errores[0].id, 'old-2');
    assert.equal(resumen.errores[0].codigo, 'documento_modificado_tras_verificacion');
});

test('no copia ni borra una fila que cambió después de construir el plan', async () => {
    Alerta.collection.findOne = async filtro => {
        const encontrado = documentos.find(x => x._id === filtro._id);
        return encontrado?._id === 'old' ? doc('old', { fecha: '2026-11-05T11:00:00Z' }) : encontrado;
    };
    const resumen = await migrarINA({ modo: 'copy' });
    assert.equal(resumen.fallidos, 1);
    assert.deepEqual(guardados, []);
});

test('empates con contenido distinto se informan y cada snapshot sobrante se archiva', async () => {
    const empate = doc('same-date-other-content', { fecha: '2026-11-05T10:00:00Z' });
    empate.datosFuente.medicion.valor = 99;
    documentos = [doc('old', { fecha: '2026-11-04T10:00:00Z' }), doc('latest', { fecha: '2026-11-05T10:00:00Z' }), empate];
    const resumen = await migrarINA({ modo: 'dry-run' });
    assert.equal(resumen.variantesContenidoFecha, 1);
    assert.equal(resumen.estacionesExcluidas, 0);
    assert.equal(resumen.candidatosArchivar, 2);
    assert.deepEqual(resumen.detalleVariantesMismaFecha[0].documentos.sort(), ['latest', 'same-date-other-content']);
    assert.deepEqual(eliminados, []);
});

test('migra el par legacy/nuevo de unid 1700 preservando ambas series temporales completas', async () => {
    const fecha = '2026-10-22T15:00:00Z';
    const fechaMismaCaptura = new Date('2026-10-23T00:00:00Z');
    const vieja = doc('1700-legacy', { unid: 1700, seriesId: 3306, fecha, clave: 'INA:1700' });
    vieja.createdAt = fechaMismaCaptura; vieja.updatedAt = fechaMismaCaptura;
    vieja.identificadorFuente = '1700';
    vieja.datosFuente.medicion = { fecha: new Date(fecha).toISOString(), valor: 2.46, valorPrecedente: 2.55, tendencia: 'baja' };
    vieja.datosFuente.serieTemporal = Array.from({ length: 156 }, (_, i) => ({
        fecha: new Date(Date.parse('2026-10-15T16:00:00Z') + i * 60 * 60 * 1000).toISOString(), valor: 2.8 - i / 100
    }));
    const nueva = doc('1700-normalizada', { unid: 1700, seriesId: 3306, fecha, clave: 'INA:1700:2026-10-22T15:00:00.000Z' });
    nueva.createdAt = fechaMismaCaptura; nueva.updatedAt = fechaMismaCaptura;
    nueva.identificadorFuente = '1700';
    nueva.datosFuente.medicion = { fecha: new Date(fecha).toISOString(), valor: 2.46, valorPrecedente: null, tendencia: 'baja', unidad: 'm' };
    nueva.datosFuente.metadatos = { tabla: 'alturas_varios', varId: 2, timestart: '2026-10-22T03:00:00.000Z' };
    nueva.datosFuente.serieTemporal = Array.from({ length: 13 }, (_, i) => ({
        fecha: new Date(Date.parse('2026-10-22T03:00:00Z') + i * 60 * 60 * 1000).toISOString(), valor: 2.48 - i / 100, unidad: 'm'
    }));
    documentos = [vieja, nueva];
    const historicos = new Map();
    historico.guardarSnapshotINA = async documento => {
        const id = String(documento._id);
        const nuevo = !historicos.has(id);
        historicos.set(id, structuredClone(documento));
        guardados.push(id);
        return { nuevo, documento };
    };
    historico.verificarSnapshotINA = async documento => {
        const historicoDoc = historicos.get(String(documento._id));
        assert.deepEqual(historicoDoc.datosFuente.serieTemporal, documento.datosFuente.serieTemporal);
        return historicoDoc;
    };

    const dryRun = await migrarINA({ modo: 'dry-run' });
    assert.equal(dryRun.variantesContenidoFecha, 1);
    assert.equal(dryRun.candidatosArchivar, 1);
    const copia = await migrarINA({ modo: 'copy' });
    assert.equal(copia.copiados, 1);
    const borrado = await migrarINA({ modo: 'delete-verified' });
    assert.equal(borrado.eliminados, 1);
    assert.equal(documentos.length, 1);
    assert.equal(documentos[0].claveOperativaINA, 'INA:ESTACION:1700');
    assert.equal(historicos.size, 1);
    const seriesConservadas = [documentos[0].datosFuente.serieTemporal, ...[...historicos.values()].map(d => d.datosFuente.serieTemporal)];
    assert.deepEqual(seriesConservadas.map(serie => serie.length).sort((a, b) => a - b), [13, 156]);
    assert.ok(seriesConservadas.some(serie => serie[0].unidad === 'm'));
});

test('una clave operativa ocupada excluye la estación antes de borrar candidatos', async () => {
    documentos.push(doc('ocupante', { unid: 6, seriesId: 60, fecha: '2026-11-05T09:00:00Z' }));
    documentos.find(x => x._id === 'ocupante').claveOperativaINA = 'INA:ESTACION:5';
    const resumen = await migrarINA({ modo: 'delete-verified' });
    assert.equal(resumen.conflictosClaveOperativa, 1);
    assert.equal(resumen.estacionesExcluidas, 1);
    assert.deepEqual(eliminados, []);
    assert.ok(documentos.some(x => x._id === 'old'));
});

test('una modificación posterior a verificar la copia no supera el compare-and-delete atómico', async () => {
    historico.verificarSnapshotINA = async documento => {
        documentos.find(x => x._id === documento._id).datosFuente.serieTemporal.push({ fecha: 'concurrente', valor: 8 });
        return documento;
    };
    const resumen = await migrarINA({ modo: 'delete-verified' });
    assert.equal(resumen.noEliminados, 1);
    assert.equal(resumen.fallidos, 1);
    assert.ok(documentos.some(x => x._id === 'old'));
    assert.equal(documentos.find(x => x._id === 'latest').claveOperativaINA, undefined);
});

test('un error E11000 al asignar clave queda identificado como conflicto de índice', async () => {
    Alerta.collection.updateOne = async () => { const error = new Error('duplicate key'); error.code = 11000; throw error; };
    const resumen = await migrarINA({ modo: 'delete-verified' });
    assert.equal(resumen.eliminados, 1);
    assert.equal(resumen.fallidos, 1);
    assert.equal(resumen.errores[0].codigo, 'clave_operativa_indice_unico');
    assert.equal(resumen.conflictosClaveOperativa, 1);
    assert.equal(resumen.detalleRevision[0].tipo, 'clave_operativa_indice_unico');
});

test('la reejecución recupera un fallo parcial sin duplicar snapshots ni borrar la versión modificada', async () => {
    documentos = [
        doc('old-1', { fecha: '2026-11-03T10:00:00Z' }),
        doc('old-2', { fecha: '2026-11-04T10:00:00Z' }),
        doc('latest', { fecha: '2026-11-05T10:00:00Z' })
    ];
    const copias = new Set();
    historico.guardarSnapshotINA = async documento => {
        const nuevo = !copias.has(documento._id); copias.add(documento._id); return { nuevo };
    };
    historico.verificarSnapshotINA = async documento => {
        assert.ok(copias.has(documento._id));
        return documento;
    };
    const primera = await migrarINA({ modo: 'copy' });
    assert.equal(primera.copiados, 2);
    const deleteOriginal = Alerta.collection.deleteOne;
    let fallarUnaVez = true;
    Alerta.collection.deleteOne = async filtro => {
        if (filtro._id === 'old-1' && fallarUnaVez) { fallarUnaVez = false; return { deletedCount: 0 }; }
        return deleteOriginal(filtro);
    };
    const parcial = await migrarINA({ modo: 'delete-verified' });
    assert.equal(parcial.eliminados, 1);
    assert.equal(parcial.fallidos, 1);
    assert.equal(documentos.find(x => x._id === 'latest').claveOperativaINA, undefined);
    const copiaReintento = await migrarINA({ modo: 'copy' });
    assert.equal(copiaReintento.yaCopiados, 1);
    const final = await migrarINA({ modo: 'delete-verified' });
    assert.equal(final.eliminados, 1);
    assert.equal(final.fallidos, 0);
    assert.deepEqual(documentos.map(x => x._id), ['latest']);
    assert.equal(documentos[0].claveOperativaINA, 'INA:ESTACION:5');
    assert.equal(copias.size, 2);
});
