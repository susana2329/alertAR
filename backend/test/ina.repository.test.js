const test = require('node:test');
const assert = require('node:assert/strict');
const Alerta = require('../src/models/alerta.model');
const historico = require('../src/repository/alerta-historica.repository');
const repositorio = require('../src/repository/ina.repository');

const originales = {
    findOne: Alerta.collection.findOne,
    insertOne: Alerta.collection.insertOne,
    replaceOne: Alerta.collection.replaceOne,
    updateMany: Alerta.collection.updateMany,
    guardar: historico.guardarSnapshotINA
};
let operativo;
let archivos;
let secuencia;

function observacion({ unid = 7, seriesId = 70, fecha = '2026-11-05T12:00:00Z', valor = 3 } = {}) {
    const date = new Date(fecha);
    return {
        origen: 'oficial', fuente: 'INA', identificadorFuente: `${unid}:${date.toISOString()}`,
        claveIdempotencia: `INA:${unid}:${date.toISOString()}`, claveOperativaINA: `INA:ESTACION:${unid}`,
        fechaInicio: date, geometria: null,
        datosFuente: { estacion: { unid, seriesId, nombre: 'Río' }, medicion: { fecha: date.toISOString(), valor }, serieTemporal: [{ fecha: date.toISOString(), valor }] }
    };
}

test.beforeEach(() => {
    operativo = null;
    archivos = [];
    secuencia = 0;
    Alerta.collection.findOne = async filtro => filtro.claveOperativaINA === operativo?.claveOperativaINA ? structuredClone(operativo) : null;
    Alerta.collection.insertOne = async documento => {
        if (operativo?.claveOperativaINA === documento.claveOperativaINA) { const error = new Error('duplicado'); error.code = 11000; throw error; }
        operativo = structuredClone({ ...documento, _id: `op-${++secuencia}` });
        return { acknowledged: true };
    };
    Alerta.collection.replaceOne = async (filtro, documento) => {
        if (!operativo || filtro._id !== operativo._id || filtro.fechaInicio.getTime() !== operativo.fechaInicio.getTime() ||
            filtro['datosFuente.estacion.seriesId'] !== operativo.datosFuente.estacion.seriesId) return { modifiedCount: 0 };
        operativo = structuredClone(documento);
        return { modifiedCount: 1 };
    };
    Alerta.collection.updateMany = async () => ({ modifiedCount: 0 });
    historico.guardarSnapshotINA = async documento => {
        archivos.push(structuredClone(documento));
        return { nuevo: true, documento };
    };
});

test.afterEach(() => {
    Alerta.collection.findOne = originales.findOne;
    Alerta.collection.insertOne = originales.insertOne;
    Alerta.collection.replaceOne = originales.replaceOne;
    Alerta.collection.updateMany = originales.updateMany;
    historico.guardarSnapshotINA = originales.guardar;
});

test('una medición más nueva archiva y verifica la anterior antes de reemplazarla', async () => {
    const orden = [];
    historico.guardarSnapshotINA = async documento => { orden.push(['archivo', documento.fechaInicio.toISOString()]); return { nuevo: true }; };
    const replace = Alerta.collection.replaceOne;
    Alerta.collection.replaceOne = async (...args) => { orden.push(['replace']); return replace(...args); };
    await repositorio.guardarObservaciones([observacion()]);
    await repositorio.guardarObservaciones([observacion({ fecha: '2026-11-05T13:00:00Z', valor: 4 })]);
    assert.deepEqual(orden, [['archivo', '2026-11-05T12:00:00.000Z'], ['replace']]);
    assert.equal(operativo.fechaInicio.toISOString(), '2026-11-05T13:00:00.000Z');
    assert.equal(operativo.datosFuente.medicion.valor, 4);
});

test('mediciones fuera de orden quedan en históricos y nunca reemplazan la más reciente', async () => {
    await repositorio.guardarObservaciones([observacion({ fecha: '2026-11-05T13:00:00Z', valor: 4 })]);
    const resultado = await repositorio.guardarObservaciones([observacion({ fecha: '2026-11-05T11:00:00Z', valor: 2 })]);
    assert.equal(resultado[0].omitida, true);
    assert.equal(operativo.fechaInicio.toISOString(), '2026-11-05T13:00:00.000Z');
    assert.equal(archivos.length, 1);
    assert.equal(archivos[0].datosFuente.medicion.valor, 2);
});

test('dos snapshots con igual medición y seriesTemporal distinta se conservan completos', async () => {
    const anterior = observacion({ fecha: '2026-11-05T13:00:00Z', valor: 4 });
    anterior.datosFuente.serieTemporal = Array.from({ length: 20 }, (_, i) => ({ fecha: `p-${i}`, valor: i }));
    const entrante = observacion({ fecha: '2026-11-05T13:00:00Z', valor: 4 });
    entrante.datosFuente.serieTemporal = [{ fecha: 'p-19', valor: 19 }];
    await repositorio.guardarObservaciones([anterior]);
    const resultado = await repositorio.guardarObservaciones([entrante]);
    assert.equal(resultado[0].omitida, true);
    assert.equal(operativo.datosFuente.serieTemporal.length, 20);
    assert.deepEqual(archivos.map(x => x.datosFuente.serieTemporal.length), [20, 1]);
});

test('procesa escrituras concurrentes por estación y conserva la fecha máxima', async () => {
    await Promise.all([
        repositorio.guardarObservaciones([observacion({ fecha: '2026-11-05T13:00:00Z', valor: 4 })]),
        repositorio.guardarObservaciones([observacion({ fecha: '2026-11-05T15:00:00Z', valor: 6 })]),
        repositorio.guardarObservaciones([observacion({ fecha: '2026-11-05T14:00:00Z', valor: 5 })])
    ]);
    assert.equal(operativo.fechaInicio.toISOString(), '2026-11-05T15:00:00.000Z');
    assert.equal(operativo.datosFuente.medicion.valor, 6);
});

test('observaciones repetidas son idempotentes y un cambio de seriesId queda para revisión', async () => {
    await repositorio.guardarObservaciones([observacion()]);
    const repetida = await repositorio.guardarObservaciones([observacion()]);
    const revisiones = [];
    await repositorio.guardarObservaciones([observacion({ seriesId: 71, fecha: '2026-11-05T14:00:00Z' })], {
        onResultado: (accion, detalle) => { if (accion === 'revision') revisiones.push(detalle); }
    });
    assert.equal(repetida[0].motivo, 'medicion_duplicada');
    assert.equal(archivos.length, 0);
    assert.equal(operativo.datosFuente.estacion.seriesId, 70);
    assert.equal(revisiones[0].codigo, 'conflicto_series_id_ina');
});

test('un lote con seriesId contradictorios no crea estación parcialmente', async () => {
    const revisiones = [];
    const resultado = await repositorio.guardarObservaciones([
        observacion({ unid: 8, seriesId: 80 }),
        observacion({ unid: 8, seriesId: 81, fecha: '2026-11-05T13:00:00Z' })
    ], { onResultado: (accion, detalle) => { if (accion === 'revision') revisiones.push(detalle); } });
    assert.equal(resultado.length, 2);
    assert.ok(resultado.every(item => item.revision));
    assert.equal(operativo, null);
    assert.equal(revisiones.length, 2);
});

test('una falla al copiar la instantánea anterior deja intacto el documento operativo', async () => {
    await repositorio.guardarObservaciones([observacion()]);
    const original = structuredClone(operativo);
    historico.guardarSnapshotINA = async () => { throw new Error('sin escritura histórica'); };
    await assert.rejects(repositorio.guardarObservaciones([observacion({ fecha: '2026-11-05T13:00:00Z' })]), /sin escritura histórica/);
    assert.deepEqual(operativo, original);
});

test('identidad ausente se reporta y no crea ni sobrescribe estaciones', async () => {
    const revisiones = [];
    const item = observacion();
    item.datosFuente.estacion.unid = null;
    const resultado = await repositorio.guardarObservaciones([item], { onResultado: (accion, detalle) => revisiones.push([accion, detalle]) });
    assert.equal(resultado[0].revision, true);
    assert.equal(operativo, null);
    assert.equal(revisiones[0][1].codigo, 'identidad_ina_no_confiable');
});

test('marca desactualizada por fecha de medición sin retirar la estación operativa', async () => {
    let consulta; let cambio;
    Alerta.collection.updateMany = async (filtro, update) => { consulta = filtro; cambio = update; return { modifiedCount: 1 }; };
    const ahora = new Date('2026-11-06T12:00:00Z');
    const resultado = await repositorio.marcarDesactualizadas(ahora);
    assert.equal(resultado.modifiedCount, 1);
    assert.equal(consulta.fechaUltimaMedicion.$lt.toISOString(), '2026-11-05T12:00:00.000Z');
    assert.deepEqual(cambio, { $set: { estadoActualizacion: 'desactualizada' } });
});
