const test = require('node:test');
const assert = require('node:assert/strict');

const Alerta = require('../src/models/alerta.model');
const alertaRepository = require('../src/repository/alerta.repository');

const findOriginal = Alerta.find;

test.afterEach(() => {
    Alerta.find = findOriginal;
});

test('declara un índice descendente compatible con el orden de listar alertas', () => {
    const indices = Alerta.schema.indexes();
    assert.ok(indices.some(([campos]) =>
        Object.keys(campos).length === 1 && campos.fechaInicio === -1
    ));
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
