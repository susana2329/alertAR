const test = require('node:test');
const assert = require('node:assert/strict');
const { estadoCicloVida, filtroArchivables } = require('../src/service/ciclo-vida-alerta');

const ahora = new Date('2026-11-05T12:00:00.000Z');

test('SMN usa fechaFin y aplica 24 horas solo cuando la fecha de fin falta', () => {
    assert.equal(estadoCicloVida({ fuente: 'SMN', origen: 'oficial', fechaInicio: new Date('2026-11-05T11:00Z'), fechaFin: new Date('2026-11-05T11:30Z') }, ahora), 'historica');
    assert.equal(estadoCicloVida({ fuente: 'SMN', origen: 'oficial', fechaInicio: new Date('2026-11-04T11:00Z'), fechaFin: null }, ahora), 'historica');
    assert.equal(estadoCicloVida({ fuente: 'SMN', origen: 'oficial', fechaInicio: new Date('2026-11-05T13:00Z'), fechaFin: new Date('2026-11-05T14:00Z') }, ahora), 'operativa');
    assert.equal(estadoCicloVida({ fuente: 'SMN', origen: 'oficial', fechaFin: null }, ahora), 'indeterminada');
});

test('INA conserva el último estado operativo independientemente de la antigüedad; INPRES usa siete días', () => {
    assert.equal(estadoCicloVida({ fuente: 'INA', origen: 'oficial', fechaInicio: new Date('2020-01-01') }, ahora), 'operativa');
    assert.equal(estadoCicloVida({ fuente: 'INPRES', origen: 'oficial', fechaInicio: new Date('2026-10-29T11:00Z') }, ahora), 'historica');
    assert.equal(estadoCicloVida({ fuente: 'INPRES', origen: 'oficial', fechaInicio: new Date('2026-10-29T13:00Z') }, ahora), 'operativa');
});

test('no archiva fuentes vecinales ni fuentes o fechas desconocidas', () => {
    assert.equal(estadoCicloVida({ fuente: 'SMN', origen: 'vecinal', fechaInicio: new Date('2020-01-01') }, ahora), 'no-aplica');
    assert.equal(estadoCicloVida({ fuente: 'otra', origen: 'oficial', fechaInicio: new Date('2020-01-01') }, ahora), 'no-aplica');
    assert.equal(estadoCicloVida({ fuente: 'INA', origen: 'oficial', fechaInicio: 'fecha-inválida' }, ahora), 'operativa');
});

test('construye filtros por fuente y por fecha sin tocar registros no clasificables', () => {
    const filtro = filtroArchivables(ahora);
    assert.equal(filtro.origen, 'oficial');
    assert.deepEqual(filtro.$or.map(rama => rama.fuente), ['SMN', 'SMN', 'INPRES']);
    assert.equal(filtro.$or[0].fechaFin.$lt, ahora);
    assert.equal(filtro.$or[1].fechaInicio.$lt.toISOString(), '2026-11-04T12:00:00.000Z');
    assert.equal(filtroArchivables(ahora, 'INPRES').$or[0].fechaInicio.$lt.toISOString(), '2026-10-29T12:00:00.000Z');
    assert.deepEqual(filtroArchivables(ahora, 'INA'), { origen: 'oficial', _id: { $exists: false } });
});
