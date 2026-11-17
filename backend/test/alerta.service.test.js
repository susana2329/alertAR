
const test = require('node:test');
const assert = require('node:assert/strict');

const alertaRepository = require('../src/repository/alerta.repository');
const alertaHistoricaRepository = require('../src/repository/alerta-historica.repository');
const reporteRepository = require('../src/repository/repository.reporte');
const alertaService = require('../src/service/alerta.service');

const obtenerTodasOriginal = alertaRepository.obtenerTodas;
const obtenerParaMapaOriginal = alertaRepository.obtenerParaMapa;
const obtenerPorIdOriginal = alertaRepository.obtenerPorId;
const historicaPorIdOriginal = alertaHistoricaRepository.obtenerPorId;
const obtenerReportesParaMapaOriginal = reporteRepository.obtenerParaMapa;

test.beforeEach(() => {
    reporteRepository.obtenerParaMapa = async () => [];
});
test.afterEach(() => {
    alertaRepository.obtenerTodas = obtenerTodasOriginal;
    alertaRepository.obtenerParaMapa = obtenerParaMapaOriginal;
    alertaRepository.obtenerPorId = obtenerPorIdOriginal;
    alertaHistoricaRepository.obtenerPorId = historicaPorIdOriginal;
    reporteRepository.obtenerParaMapa = obtenerReportesParaMapaOriginal;
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

test('incluye reportes vecinales con estado y conteo de respuestas en el mapa', async () => {
    alertaRepository.obtenerParaMapa = async () => [];
    reporteRepository.obtenerParaMapa = async () => [{
        _id: { toString: () => 'reporte-1' },
        tipo: 'inundacion',
        descripcion: 'Agua acumulada',
        fecha: new Date('2026-11-11T12:00:00Z'),
        geometria: { type: 'Point', coordinates: [-58.4, -34.6] },
        estadoVecinal: 'confirmado',
        votosVecinales: [{ respuesta: 'sigue' }, { respuesta: 'sigue' }, { respuesta: 'sigue' }],
        fotos: [{ key: 'privado/foto.jpg' }, { key: 'privado/foto-2.jpg' }]
    }];

    const alertas = await alertaService.listarAlertasMapa();
    assert.equal(alertas.length, 1);
    assert.equal(alertas[0].id, 'vecinal-reporte-1');
    assert.equal(alertas[0].titulo, 'Reporte vecinal de inundación');
    assert.equal(alertas[0].origen, 'vecinal');
    assert.deepEqual(alertas[0].ubicacion, { latitud: -34.6, longitud: -58.4 });
    assert.equal(alertas[0].estadoVecinal, 'confirmado');
    assert.equal(alertas[0].votosSigue, 3);
    assert.equal(alertas[0].votosNoEsta, 0);
    assert.equal(alertas[0].cantidadFotos, 2);
    assert.equal(Object.hasOwn(alertas[0], 'fotos'), false);
});

test('filtra INA por situacionMapa y mantiene sin cambios las fuentes SMN e INPRES', async () => {
    const ahora = new Date();
    alertaRepository.obtenerParaMapa = async () => [
        { _id: { toString: () => 'ina-riesgo' }, fuente: 'INA', naturaleza: 'observacion', nivel: 'informativo',
            fechaInicio: ahora, fechaUltimaMedicion: ahora, origen: 'oficial',
            datosFuente: { medicion: { valor: 4.8, valorPrecedente: 4.6, tendencia: 'crece' },
                estadoFuente: { estado: 'normal' }, umbrales: { alerta: 5, evacuacion: 6 } } },
        { _id: { toString: () => 'ina-normal' }, fuente: 'INA', naturaleza: 'observacion', nivel: 'informativo',
            fechaInicio: ahora, fechaUltimaMedicion: ahora, origen: 'oficial',
            datosFuente: { medicion: { valor: 2, valorPrecedente: 1.9, tendencia: 'crece' },
                estadoFuente: { estado: 'normal' }, umbrales: { alerta: 5, evacuacion: 6 } } },
        { _id: { toString: () => 'ina-vencida' }, fuente: 'INA', naturaleza: 'alerta', nivel: 'emergencia',
            fechaInicio: new Date(ahora.getTime() - 25 * 60 * 60 * 1000),
            fechaUltimaMedicion: new Date(ahora.getTime() - 25 * 60 * 60 * 1000), origen: 'oficial',
            datosFuente: { medicion: { valor: 7, valorPrecedente: 6, tendencia: 'crece' },
                estadoFuente: { estado: 'evacuación' }, umbrales: { alerta: 5, evacuacion: 6 } } },
        { _id: { toString: () => 'smn-1' }, fuente: 'SMN', tipo: 'meteorologica', nivel: 'advertencia',
            naturaleza: 'alerta', origen: 'oficial', titulo: 'SMN vigente', fechaInicio: ahora, fechaFin: null },
        { _id: { toString: () => 'inpres-1' }, fuente: 'INPRES', tipo: 'sismo', nivel: 'informativo',
            naturaleza: 'observacion', origen: 'oficial', titulo: 'Sismo vigente', fechaInicio: ahora }
    ];

    const alertas = await alertaService.listarAlertasMapa();
    assert.deepEqual(alertas.map(alerta => alerta.id), ['ina-riesgo', 'smn-1', 'inpres-1']);
    assert.equal(alertas[0].situacionMapa, 'riesgo_potencial');
    assert.equal(alertas[0].nivel, 'informativo');
    assert.equal(alertas[0].naturaleza, 'observacion');
    assert.equal(alertas[1].situacionMapa, undefined);
    assert.equal(alertas[2].situacionMapa, undefined);
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
