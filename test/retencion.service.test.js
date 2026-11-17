const test = require('node:test');
const assert = require('node:assert/strict');
const { cortes, ejecutar } = require('../src/service/retencion.service');
const Reporte = require('../src/repository/model/modelos');
const { listarVencidos } = require('../src/repository/retencion.repository');

test('calcula doce meses calendario y treinta días', () => {
  const resultado = cortes(new Date('2026-03-31T12:00:00.000Z'));
  assert.equal(resultado.cierreHasta.toISOString(), '2025-03-31T12:00:00.000Z');
  assert.equal(resultado.rechazoHasta.toISOString(), '2026-03-01T12:00:00.000Z');
});

test('la consulta solo considera reportes cerrados o rechazados con fecha de vencimiento', async t => {
  const original = Reporte.find;
  t.after(() => { Reporte.find = original; });
  let filtro;
  Reporte.find = query => {
    filtro = query;
    return { sort: () => ({ limit: () => ({ lean: async () => [] }) }) };
  };
  const fechas = cortes(new Date('2026-11-17T00:00:00Z'));
  await listarVencidos({ ...fechas, limite: 100 });
  assert.deepEqual(filtro.$or, [
    { estadoModeracion: 'rechazado', fechaModeracion: { $lte: fechas.rechazoHasta } },
    { estadoVecinal: 'cerrado', estadoModeracion: { $ne: 'rechazado' }, fechaCierre: { $lte: fechas.cierreHasta } }
  ]);
});

test('borra solo candidatos vencidos y reintenta limpiezas S3, sin perder el resto del lote por un fallo', async () => {
  const orden = [];
  let cortesRecibidos;
  const resumen = await ejecutar({ ahora: new Date('2026-11-17T00:00:00Z') }, {
    listarVencidos: async cortesQuery => {
      cortesRecibidos = cortesQuery;
      return [{ _id: 'reporte-1', idUser: 'usuario-1' }, { _id: 'reporte-2', idUser: 'usuario-2' }];
    },
    eliminarReporte: async (id, usuario) => {
      orden.push([id, usuario]);
      if (id === 'reporte-1') throw new Error('MongoDB');
    },
    listarLimpiezas: async () => [{ _id: 'trabajo-1' }, { _id: 'trabajo-2' }],
    procesarLimpieza: async id => ({ estado: id === 'trabajo-1' ? 'completa' : 'pendiente' })
  });
  assert.equal(cortesRecibidos.cierreHasta.toISOString(), '2025-11-17T00:00:00.000Z');
  assert.equal(cortesRecibidos.rechazoHasta.toISOString(), '2026-10-18T00:00:00.000Z');
  assert.deepEqual(orden, [['reporte-1', 'usuario-1'], ['reporte-2', 'usuario-2']]);
  assert.deepEqual(resumen, {
    candidatos: 2, eliminados: 1, fallidos: 1, limpiezasCompletadas: 1, limpiezasPendientes: 1
  });
});
