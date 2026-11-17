const test = require('node:test');
const assert = require('node:assert/strict');
const Alerta = require('../src/models/alerta.model');
const AlertaHistorica = require('../src/models/alerta-historica.model');
const repositorio = require('../src/repository/alerta-historica.repository');

const replaceOriginal = AlertaHistorica.collection.replaceOne;
const findOriginal = AlertaHistorica.collection.findOne;
const insertOriginal = AlertaHistorica.collection.insertOne;
let documentos;
let secuencia;

test.beforeEach(() => {
    documentos = new Map();
    secuencia = 0;
    AlertaHistorica.collection.replaceOne = async (filtro, documento) => {
        const existente = [...documentos.values()].find(actual =>
            (filtro._id != null && String(actual._id) === String(filtro._id)) ||
            (filtro.claveIdempotencia != null && actual.claveIdempotencia === filtro.claveIdempotencia));
        const archivado = { ...structuredClone({ ...documento, _id: undefined }), _id: documento._id ?? existente?._id ?? `historico-${++secuencia}` };
        documentos.set(String(archivado._id), archivado);
        return { upsertedCount: existente ? 0 : 1 };
    };
    AlertaHistorica.collection.findOne = async filtro => {
        const encontrado = [...documentos.values()].find(actual =>
            (filtro._id != null && String(actual._id) === String(filtro._id)) ||
            (filtro.claveIdempotencia != null && actual.claveIdempotencia === filtro.claveIdempotencia));
        return encontrado ? { ...structuredClone({ ...encontrado, _id: undefined }), _id: encontrado._id } : null;
    };
    AlertaHistorica.collection.insertOne = async documento => {
        if ([...documentos.values()].some(actual => String(actual._id) === String(documento._id) || actual.claveIdempotencia === documento.claveIdempotencia)) {
            const error = new Error('duplicado'); error.code = 11000; throw error;
        }
        const archivado = { ...structuredClone({ ...documento, _id: undefined }), _id: documento._id };
        documentos.set(String(archivado._id), archivado);
        return { acknowledged: true };
    };
});

test.afterEach(() => {
    AlertaHistorica.collection.replaceOne = replaceOriginal;
    AlertaHistorica.collection.findOne = findOriginal;
    AlertaHistorica.collection.insertOne = insertOriginal;
});

test('usa colecciones separadas y mantiene índices de idempotencia e investigación histórica', () => {
    assert.equal(Alerta.collection.collectionName, 'alertas');
    assert.equal(AlertaHistorica.collection.collectionName, 'alertas_historicas');
    const indices = AlertaHistorica.schema.indexes();
    assert.ok(indices.some(([campos, opciones]) => campos.claveIdempotencia === 1 && opciones.unique));
    assert.ok(indices.some(([campos]) => campos.fuente === 1 && campos.fechaInicio === -1));
});

test('copia, verifica, conserva _id y la reejecución no crea duplicados', async () => {
    const fuente = { _id: 'original-1', fuente: 'INA', claveIdempotencia: 'INA:1:fecha', fechaInicio: new Date('2026-01-01T00:00:00Z'), datosFuente: { medicion: { valor: 3 } } };
    const primero = await repositorio.guardarYVerificar(fuente);
    const segundo = await repositorio.guardarYVerificar(fuente);
    assert.equal(primero.nuevo, true);
    assert.equal(segundo.nuevo, false);
    assert.equal(segundo.documento._id, 'original-1');
    assert.equal(documentos.size, 1);
    assert.deepEqual(segundo.documento, fuente);
});

test('no considera archivada una copia que no coincide con el origen', async () => {
    AlertaHistorica.collection.replaceOne = async () => ({ upsertedCount: 1 });
    AlertaHistorica.collection.findOne = async () => ({ _id: 'original-2', fuente: 'INPRES', claveIdempotencia: 'INPRES:2', titulo: 'documento distinto' });
    await assert.rejects(repositorio.guardarYVerificar({ _id: 'original-2', fuente: 'INPRES', claveIdempotencia: 'INPRES:2', titulo: 'sismo' }), /No se pudo verificar/);
});

test('los registros viejos que llegan por ingesta se guardan idempotentemente por clave', async () => {
    const fuente = { fuente: 'INPRES', claveIdempotencia: 'INPRES:20200101000000', titulo: 'Sismo antiguo' };
    const primero = await repositorio.guardarDesdeIngesta(fuente);
    const segundo = await repositorio.guardarDesdeIngesta(fuente);
    assert.equal(primero._id, segundo._id);
    assert.equal(documentos.size, 1);
});

test('snapshot INA conserva la serie y clave original con identidad histórica determinista', async () => {
    const fuente = {
        _id: 'operativa-7', fuente: 'INA', claveIdempotencia: 'INA:7:fecha-original',
        fechaInicio: new Date('2026-11-01T00:00:00Z'),
        datosFuente: { estacion: { unid: 7, seriesId: 70 }, serieTemporal: [{ fecha: '2026-11-01T00:00:00Z', valor: 4 }] }
    };
    const primero = await repositorio.guardarSnapshotINA(fuente);
    const segundo = await repositorio.guardarSnapshotINA(fuente);
    assert.equal(primero.nuevo, true);
    assert.equal(segundo.nuevo, false);
    assert.equal(primero.documento.claveIdempotenciaOriginal, 'INA:7:fecha-original');
    assert.equal(primero.documento.idOperativoOrigen, 'operativa-7');
    assert.deepEqual(primero.documento.datosFuente.serieTemporal, fuente.datosFuente.serieTemporal);
    assert.equal(documentos.size, 1);
    assert.deepEqual(await repositorio.verificarSnapshotINA(fuente), primero.documento);
});
