
const test = require('node:test');
const assert = require('node:assert/strict');

const alertaRepository = require('../src/repository/alerta.repository');
const alertaService = require('../src/service/alerta.service');

const obtenerTodasOriginal = alertaRepository.obtenerTodas;

test.afterEach(() => {
    alertaRepository.obtenerTodas = obtenerTodasOriginal;
});

test('mapea un Point conservando sus coordenadas', async () => {
    alertaRepository.obtenerTodas = async () => [{
        _id: { toString: () => 'point-1' },
        titulo: 'Sismo',
        tipo: 'sismo',
        nivel: 'informativo',
        origen: 'oficial',
        descripcion: 'Prueba',
        fechaInicio: new Date('2026-10-21T12:00:00Z'),
        ubicacion: { latitud: -34.6, longitud: -58.4 },
        geometria: {
            type: 'Point',
            coordinates: [-58.4, -34.6]
        }
    }];

    const alertas = await alertaService.listarAlertas();

    assert.equal(alertas.length, 1);
    assert.deepEqual(alertas[0].ubicacion, {
        latitud: -34.6,
        longitud: -58.4
    });
    assert.equal(alertas[0].geometria.type, 'Point');
});

test('calcula un punto interior y conserva el Polygon', async () => {
    const geometria = {
        type: 'Polygon',
        coordinates: [[
            [-58.50, -34.70],
            [-58.40, -34.70],
            [-58.43, -34.66],
            [-58.46, -34.62],
            [-58.50, -34.65],
            [-58.50, -34.70]
        ]]
    };

    alertaRepository.obtenerTodas = async () => [{
        _id: { toString: () => 'polygon-1' },
        titulo: 'Alerta meteorológica',
        tipo: 'meteorologica',
        nivel: 'advertencia',
        origen: 'oficial',
        descripcion: 'Prueba',
        fechaInicio: new Date('2026-10-21T12:00:00Z'),
        geometria
    }];

    const alertas = await alertaService.listarAlertas();

    assert.equal(alertas.length, 1);
    assert.ok(alertas[0].ubicacion);
    assert.deepEqual(alertas[0].geometria, geometria);
});

test('excluye alertas sin ubicación válida', async () => {
    alertaRepository.obtenerTodas = async () => [{
        _id: { toString: () => 'sin-ubicacion' },
        titulo: 'Alerta incompleta',
        tipo: 'observacion',
        nivel: 'informativo',
        origen: 'oficial',
        descripcion: '',
        fechaInicio: null,
        ubicacion: null,
        geometria: null
    }];

    const alertas = await alertaService.listarAlertas();

    assert.deepEqual(alertas, []);
});
