const test = require('node:test');
const assert = require('node:assert/strict');

const Alerta = require('../src/models/alerta.model');
const alertaRepository = require('../src/repository/alerta.repository');

const findOriginal = Alerta.find;
const countDocumentsOriginal = Alerta.countDocuments;
const deleteOneOriginal = Alerta.collection.deleteOne;

test.afterEach(() => {
    Alerta.find = findOriginal;
    Alerta.countDocuments = countDocumentsOriginal;
    Alerta.collection.deleteOne = deleteOneOriginal;
});

test('declara un índice descendente compatible con el orden de listar alertas', () => {
    const indices = Alerta.schema.indexes();
    assert.ok(indices.some(([campos]) =>
        Object.keys(campos).length === 1 && campos.fechaInicio === -1
    ));
    assert.ok(indices.some(([campos]) => campos.origen === 1 && campos.fuente === 1 && campos.fechaInicio === -1));
    assert.ok(indices.some(([campos]) => campos.origen === 1 && campos.fuente === 1 && campos.fechaFin === 1));
    assert.ok(indices.some(([campos, opciones]) => campos.claveOperativaINA === 1 && opciones.unique && opciones.partialFilterExpression.claveOperativaINA.$type === 'string'));
    assert.ok(indices.some(([campos]) => campos.fuente === 1 && campos.origen === 1 && campos.fechaUltimaMedicion === 1));
});

test('obtenerCandidatasInicio filtra por fuentes oficiales y ventanas de vigencia', async () => {
    const ahora = new Date('2026-11-05T12:00:00Z');
    let filtro;
    let proyeccion;
    Alerta.find = (consulta, campos) => {
        filtro = consulta;
        proyeccion = campos;
        return { lean: async () => [] };
    };
    await alertaRepository.obtenerCandidatasInicio(ahora);
    assert.equal(filtro.origen, 'oficial');
    assert.deepEqual(filtro.$or.map(rama => rama.fuente), ['SMN', 'INA', 'INPRES']);
    assert.equal(filtro.$or[0].$or[0].fechaFin.$gte.toISOString(), ahora.toISOString());
    assert.equal(filtro.$or[1].$or[0].fechaInicio.$gte.toISOString(), '2026-11-04T12:00:00.000Z');
    assert.equal(filtro.$or[2].fechaInicio.$gte.toISOString(), '2026-10-29T12:00:00.000Z');
    assert.equal(proyeccion['datosFuente.serieTemporal'], undefined);
    assert.equal(proyeccion.geometria, 1);
});

test('las consultas operativas permanecen ligadas exclusivamente a alertas', () => {
    assert.equal(Alerta.collection.collectionName, 'alertas');
});

test('obtiene lotes archivables ordenados por id y acota el cursor a la colección operativa', async () => {
    const documentos = [{ _id: 'a2' }];
    let filtro;
    let orden;
    let limite;
    Alerta.find = consulta => {
        filtro = consulta;
        return {
            sort(valor) { orden = valor; return this; },
            limit(valor) { limite = valor; return this; },
            lean: async () => documentos
        };
    };
    const ahora = new Date('2026-11-05T12:00:00Z');
    const resultado = await alertaRepository.obtenerLoteArchivable(ahora, 'SMN', 'a1', 40);
    assert.equal(resultado, documentos);
    assert.deepEqual(orden, { _id: 1 });
    assert.equal(limite, 40);
    assert.equal(filtro.$and[1]._id.$gt, 'a1');
    assert.equal(filtro.$and[0].$or[0].fuente, 'SMN');
});

test('cuenta candidatos por fuente y elimina solo usando la versión completa copiada', async () => {
    let filtros = [];
    Alerta.countDocuments = async filtro => { filtros.push(filtro); return filtros.length; };
    const fecha = new Date('2026-11-05T12:00:00Z');
    assert.deepEqual(await alertaRepository.contarArchivables(fecha), { SMN: 1, INPRES: 2 });
    assert.deepEqual(filtros.map(filtro => filtro.$or[0].fuente), ['SMN', 'INPRES']);

    let borrado;
    Alerta.collection.deleteOne = async filtro => { borrado = filtro; return { deletedCount: 1 }; };
    const documento = { _id: 'a1', claveIdempotencia: 'INA:1', updatedAt: fecha, datosFuente: { medicion: { valor: 2 } } };
    assert.deepEqual(await alertaRepository.eliminarSiNoCambio(documento), { deletedCount: 1 });
    assert.equal(borrado._id, documento._id);
    assert.deepEqual(borrado.$expr, { $eq: ['$$ROOT', { $literal: documento }] });
});

test('obtenerTodas consulta sin filtros y ordena por fechaInicio descendente', async () => {
    const documentos = [{ _id: 'reciente' }, { _id: 'anterior' }];
    let filtroRecibido;
    let ordenRecibido;
    Alerta.find = filtro => {
        filtroRecibido = filtro;
        return {
            sort(orden) {
                ordenRecibido = orden;
                return this;
            },
            lean() {
                return Promise.resolve(documentos);
            }
        };
    };

    const resultado = await alertaRepository.obtenerTodas();

    assert.equal(filtroRecibido, undefined);
    assert.deepEqual(ordenRecibido, { fechaInicio: -1 });
    assert.equal(resultado, documentos);
});
