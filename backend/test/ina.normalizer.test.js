const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizarINA, clasificarMedicion } = require('../src/ingestion/normalizers/ina.normalizer');

function feature(overrides = {}) {
    return {
        id: 'station.1', geometry: { type: 'Point', coordinates: [-60, -35] },
        properties: { unid: 1, fecha: '2026-10-21T00:00:00Z', valor: 5, valor_precedente: 4.9,
            tendencia: 'crece', estado: 'normal', nivel_de_alerta: 4.7,
            nivel_de_evacuacion: 6, nivel_de_aguas_bajas: 0, timeseries: '[]', ...overrides }
    };
}

test('compara alturas en metros con umbrales positivos y distingue observación de alerta', () => {
    const [lectura] = normalizarINA({ type: 'FeatureCollection', features: [feature()] });
    assert.equal(lectura.nivel, 'advertencia');
    assert.equal(lectura.naturaleza, 'alerta');
    assert.equal(lectura.tipo, 'observacion');
    assert.equal(lectura.datosFuente.medicion.unidad, 'm');
    assert.equal(lectura.datosFuente.umbrales.fuenteAutoridad, 'autoridades locales de protección civil');
    assert.equal(lectura.datosFuente.clasificacion.regla, 'medicion_supera_alerta');
    assert.match(lectura.claveIdempotencia, /2026-10-21T00:00:00.000Z$/);
});

test('umbral de evacuación supera el nivel de alerta y tendencia sola no aumenta gravedad', () => {
    const [evacuacion] = normalizarINA({ type: 'FeatureCollection', features: [feature({ valor: 6.2, tendencia: 'baja' })] });
    assert.equal(evacuacion.nivel, 'emergencia');
    const [sinUmbrales] = normalizarINA({ type: 'FeatureCollection', features: [feature({ valor: 100, estado: '', nivel_de_alerta: 0, nivel_de_evacuacion: 0, nivel_de_aguas_bajas: 0 })] });
    assert.equal(sinUmbrales.nivel, 'desconocido');
    assert.equal(sinUmbrales.naturaleza, 'observacion');
});

test('prioriza el estado explícito y deja desconocidos los umbrales incoherentes', () => {
    assert.equal(clasificarMedicion({ valor: null, estado: 'evacuación', umbrales: {} }).nivel, 'emergencia');
    assert.equal(clasificarMedicion({ valor: 5, estado: '', umbrales: { alerta: 8, evacuacion: 4 } }).nivel, 'desconocido');
});

test('aísla fecha, identificador y geometría inválidos y conserva observaciones sin punto', () => {
    const errores = [];
    const registros = normalizarINA({ type: 'FeatureCollection', features: [
        feature({ fecha: 'no-es-fecha' }),
        { ...feature(), id: null, properties: { fecha: '2026-10-21T00:00:00Z' } },
        { ...feature(), geometry: { type: 'LineString', coordinates: [] } },
        feature()
    ] }, error => errores.push(error));
    assert.equal(registros.length, 2);
    assert.equal(registros[0].geometria, null);
    assert.equal(registros[1].geometria.type, 'Point');
    assert.equal(errores.length, 3);
    assert.equal(normalizarINA({ type: 'FeatureCollection', features: [] }).length, 0);
});
