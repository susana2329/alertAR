
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

test('presenta códigos de tendencia INA en lenguaje claro y conserva intactos los datos técnicos', async () => {
    const datosFuente = {
        estacion: { nombre: 'SFranTOR', rio: 'San Francisco' },
        medicion: { tendencia: 'crece' },
        estadoFuente: { estado: '', codigo: 'x', condicion: 'crece:x' }
    };
    const documento = {
        _id: { toString: () => 'ina-1' },
        fuente: 'INA',
        titulo: 'SFranTOR',
        tipo: 'observacion',
        nivel: 'informativo',
        origen: 'oficial',
        descripcion: 'crece:x',
        fechaInicio: new Date('2026-10-21T12:00:00Z'),
        geometria: { type: 'Point', coordinates: [-58.3, -34.7] },
        datosFuente
    };
    alertaRepository.obtenerTodas = async () => [documento];

    const [alerta] = await alertaService.listarAlertas();

    assert.equal(alerta.titulo, 'Estación del río San Francisco');
    assert.equal(alerta.descripcion, 'La altura registrada está en aumento.');
    assert.deepEqual(documento.datosFuente, datosFuente);
});

test('no inventa tendencia INA si el código técnico no puede interpretarse', async () => {
    alertaRepository.obtenerTodas = async () => [{
        _id: { toString: () => 'ina-2' },
        fuente: 'INA',
        titulo: 'SFranTOR',
        tipo: 'observacion',
        nivel: 'informativo',
        origen: 'oficial',
        descripcion: 'crece:x',
        fechaInicio: new Date('2026-10-21T12:00:00Z'),
        geometria: { type: 'Point', coordinates: [-58.3, -34.7] },
        datosFuente: {
            estacion: { nombre: 'SFranTOR', rio: null },
            medicion: { tendencia: 'codigo-desconocido' },
            estadoFuente: { estado: '', codigo: 'x', condicion: 'crece:x' }
        }
    }];

    const [alerta] = await alertaService.listarAlertas();

    assert.equal(alerta.titulo, 'Estación hidrológica INA');
    assert.equal(alerta.descripcion, 'El INA registró una medición de altura en esta estación; no hay una tendencia interpretable disponible.');
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

test('expone registros sin geometría con ubicación nula para conservar el dato', async () => {
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

    assert.equal(alertas.length, 1);
    assert.equal(alertas[0].ubicacion, null);
    assert.equal(alertas[0].nivel, 'informativo');
    assert.equal(alertas[0].color, 'azul');
});
