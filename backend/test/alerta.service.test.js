
const test = require('node:test');
const assert = require('node:assert/strict');

const alertaRepository = require('../src/repository/alerta.repository');
const alertaHistoricaRepository = require('../src/repository/alerta-historica.repository');
const alertaService = require('../src/service/alerta.service');

const obtenerTodasOriginal = alertaRepository.obtenerTodas;
const obtenerParaMapaOriginal = alertaRepository.obtenerParaMapa;
const obtenerPorIdOriginal = alertaRepository.obtenerPorId;
const historicaPorIdOriginal = alertaHistoricaRepository.obtenerPorId;

test.afterEach(() => {
    alertaRepository.obtenerTodas = obtenerTodasOriginal;
    alertaRepository.obtenerParaMapa = obtenerParaMapaOriginal;
    alertaRepository.obtenerPorId = obtenerPorIdOriginal;
    alertaHistoricaRepository.obtenerPorId = historicaPorIdOriginal;
    alertaService.invalidarCacheMapa();
});

test('mantiene el detalle histórico por id con el mismo formato de presentación', async () => {
    alertaRepository.obtenerPorId = async () => null;
    alertaHistoricaRepository.obtenerPorId = async id => ({
        _id: { toString: () => id }, fuente: 'INPRES', tipo: 'sismo', nivel: 'informativo',
        origen: 'oficial', titulo: 'Sismo histórico', descripcion: 'Registro',
        fechaInicio: new Date('2020-01-01T00:00:00Z'), datosFuente: { magnitud: 4.1 }
    });
    const alerta = await alertaService.obtenerAlerta('historica-1');
    assert.equal(alerta.id, 'historica-1');
    assert.equal(alerta.titulo, 'Sismo histórico');
    assert.deepEqual(alerta.detalle, { magnitud: 4.1 });
});

test('obtiene por id y adapta el documento al contrato que consume la pantalla de detalle', async () => {
    alertaRepository.obtenerPorId = async id => ({
        _id: { toString: () => id }, fuente: 'INPRES', tipo: 'sismo', nivel: 'informativo',
        origen: 'oficial', titulo: 'Sismo en Mendoza', descripcion: 'Registro INPRES',
        fechaInicio: new Date('2026-11-05T10:00:00Z'), fechaFin: null,
        geometria: { type: 'Point', coordinates: [-69, -32] },
        datosFuente: { magnitud: 3.2, profundidad: 12, provincia: 'Mendoza' }
    });
    const alerta = await alertaService.obtenerAlerta('id-prueba');
    assert.equal(alerta.id, 'id-prueba');
    assert.equal(alerta.fuente, 'INPRES');
    assert.equal(alerta.titulo, 'Sismo en Mendoza');
    assert.deepEqual(alerta.detalle, { magnitud: 3.2, profundidad: 12, provincia: 'Mendoza' });
});

test('reutiliza el listado compacto del mapa hasta que se invalida la caché', async () => {
    let consultas = 0;
    alertaRepository.obtenerParaMapa = async () => {
        consultas++;
        return [{ _id: { toString: () => 'mapa-1' }, fuente: 'INPRES', tipo: 'sismo', nivel: 'informativo',
            origen: 'oficial', fechaInicio: new Date(), geometria: { type: 'Point', coordinates: [-58, -34] } }];
    };
    const primera = await alertaService.listarAlertasMapa();
    const segunda = await alertaService.listarAlertasMapa();
    assert.equal(consultas, 1);
    assert.equal(segunda, primera);
    alertaService.invalidarCacheMapa();
    await alertaService.listarAlertasMapa();
    assert.equal(consultas, 2);
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
