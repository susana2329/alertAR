const test = require('node:test');
const assert = require('node:assert/strict');
const { clasificarSituacionMapaINA } = require('../src/service/ina-situacion-mapa');

const ahora = new Date('2026-11-09T12:00:00.000Z');
const fechaReciente = new Date('2026-11-09T11:00:00.000Z');
const umbrales = { alerta: 5, evacuacion: 6 };

function clasificar(overrides = {}) {
    return clasificarSituacionMapaINA({ valor: 4, valorPrecedente: 3.8, tendencia: 'crece', estado: 'normal',
        umbrales, fechaMedicion: fechaReciente, ahora, ...overrides });
}

test('clasifica emergencia por estado explícito aunque falten medición y umbrales', () => {
    assert.equal(clasificar({ estado: 'evacuación', valor: null, umbrales: {} }).situacionMapa, 'emergencia');
});

test('clasifica emergencia al alcanzar el umbral de evacuación', () => {
    assert.equal(clasificar({ valor: 6 }).situacionMapa, 'emergencia');
});

test('clasifica advertencia por estado explícito aunque no se alcance el umbral', () => {
    assert.equal(clasificar({ estado: 'alerta', valor: 4 }).situacionMapa, 'advertencia');
});

test('clasifica advertencia al alcanzar el umbral de alerta', () => {
    assert.equal(clasificar({ valor: 5 }).situacionMapa, 'advertencia');
});

test('clasifica riesgo potencial cuando la distancia al umbral próximo cabe en el último incremento', () => {
    const resultado = clasificar({ valor: 4.8, valorPrecedente: 4.6 });
    assert.equal(resultado.situacionMapa, 'riesgo_potencial');
    assert.equal(resultado.regla, 'proximidad_por_incremento_observado');
});

test('excluye tendencia ascendente cuya medición permanece lejos del umbral', () => {
    assert.equal(clasificar({ valor: 2, valorPrecedente: 1.9 }).situacionMapa, null);
});

test('excluye mediciones estables o descendentes sin estado de alerta explícito', () => {
    assert.equal(clasificar({ tendencia: 'permanece', valor: 4, valorPrecedente: 4 }).situacionMapa, null);
    assert.equal(clasificar({ tendencia: 'baja', valor: 4, valorPrecedente: 4.2 }).situacionMapa, null);
});

test('excluye medición con más de 24 horas de antigüedad', () => {
    const resultado = clasificar({ estado: 'evacuación', fechaMedicion: new Date(ahora.getTime() - 24 * 60 * 60 * 1000 - 1) });
    assert.equal(resultado.situacionMapa, null);
    assert.equal(resultado.regla, 'medicion_desactualizada');
});

test('reutiliza el corte INA existente: a las 24 horas conserva alertas explícitas, pero no riesgo potencial', () => {
    const fechaCorte = new Date(ahora.getTime() - 24 * 60 * 60 * 1000);
    assert.equal(clasificar({ estado: 'alerta', fechaMedicion: fechaCorte }).situacionMapa, 'advertencia');
    assert.equal(clasificar({ estado: 'normal', valor: 4.8, valorPrecedente: 4.6, fechaMedicion: fechaCorte }).situacionMapa, null);
});

test('excluye datos insuficientes para determinar una situación', () => {
    assert.equal(clasificar({ valor: null, valorPrecedente: null, tendencia: null, estado: '', umbrales: {} }).situacionMapa, null);
});

test('no infiere riesgo con umbrales ausentes o incoherentes', () => {
    assert.equal(clasificar({ umbrales: {} }).situacionMapa, null);
    const resultado = clasificar({ valor: 4.8, valorPrecedente: 4.6, umbrales: { alerta: 5, evacuacion: 4.5 } });
    assert.equal(resultado.situacionMapa, null);
    assert.ok(resultado.discrepancias.includes('umbrales_alerta_evacuacion_incoherentes'));
});

test('conserva autoridad de estados explícitos y devuelve discrepancias numéricas para auditoría', () => {
    const emergencia = clasificar({ estado: 'evacuación', valor: 5.5 });
    assert.equal(emergencia.situacionMapa, 'emergencia');
    assert.ok(emergencia.discrepancias.includes('estado_evacuacion_bajo_umbral_numerico'));

    const alerta = clasificar({ estado: 'alerta', valor: 4 });
    assert.equal(alerta.situacionMapa, 'advertencia');
    assert.ok(alerta.discrepancias.includes('estado_alerta_no_coincide_con_medicion'));

    const medicionMasGrave = clasificar({ estado: 'alerta', valor: 6 });
    assert.equal(medicionMasGrave.situacionMapa, 'emergencia');
    assert.ok(medicionMasGrave.discrepancias.includes('estado_alerta_no_coincide_con_medicion'));
});
