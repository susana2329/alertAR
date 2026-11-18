const test = require('node:test');
const assert = require('node:assert/strict');
const { eliminarReporteService } = require('../src/service/reporte.service');
const { procesar } = require('../src/service/limpieza-fotos.service');
const Limpieza = require('../src/models/limpieza-fotos.model');
const limpiezaRepo = require('../src/repository/limpieza-fotos.repository');

const id = '507f1f77bcf86cd799439011';

function entorno(fotos) {
  let reporte = { fotos };
  let trabajo;
  let fallaS3 = false;
  const repo = {
    obtener: async () => trabajo,
    existeReporte: async () => Boolean(reporte),
    eliminar: async () => { trabajo = undefined; }
  };
  const deps = {
    buscar: async (reporteId, usuario) => usuario === 'dueno' ? reporte : null,
    registrar: async (reporteId, claves) => { trabajo = { claves }; },
    eliminar: async () => { const previo = reporte; reporte = null; return previo; },
    procesar: reporteId => procesar(reporteId, { repositorio: repo, eliminarImagen: async () => { if (fallaS3) throw new Error('S3'); } })
  };
  return { deps, repo, get reporte() { return reporte; }, get trabajo() { return trabajo; }, fallarS3(valor) { fallaS3 = valor; } };
}

test('guarda las claves en MongoDB con confirmación mayoritaria antes de borrar', async t => {
  const original = Limpieza.updateOne;
  t.after(() => { Limpieza.updateOne = original; });
  let observado;
  Limpieza.updateOne = async (...args) => { observado = args; };
  await limpiezaRepo.registrar(id, ['objeto-a']);
  assert.equal(String(observado[0]._id), id);
  assert.deepEqual(observado[1].$addToSet.claves.$each, ['objeto-a']);
  assert.equal(observado[2].writeConcern.w, 'majority');
});

test('elimina sin fotos sin crear trabajo', async () => {
  const e = entorno([]);
  await eliminarReporteService(id, 'dueno', e.deps);
  assert.equal(e.reporte, null);
  assert.equal(e.trabajo, undefined);
});

test('con fotos persiste antes de borrar y completa la limpieza', async () => {
  const e = entorno([{ key: 'dueno/objeto-a' }]);
  const eliminar = e.deps.eliminar;
  e.deps.eliminar = async (...args) => { assert.deepEqual(e.trabajo.claves, ['dueno/objeto-a']); return eliminar(...args); };
  const resultado = await eliminarReporteService(id, 'dueno', e.deps);
  assert.equal(resultado.limpiezaFotos, 'completa');
  assert.equal(e.trabajo, undefined);
  assert.doesNotMatch(JSON.stringify(resultado), /objeto-a/);
});

test('fallo parcial de S3 conserva claves y reintentos repetidos son seguros', async () => {
  const e = entorno([{ key: 'dueno/objeto-a' }, { key: 'dueno/objeto-b' }]);
  const intentos = [];
  e.deps.procesar = reporteId => procesar(reporteId, { repositorio: e.repo, eliminarImagen: async clave => {
    intentos.push(clave);
    if (clave === 'dueno/objeto-b') throw new Error('S3');
  } });
  const resultado = await eliminarReporteService(id, 'dueno', e.deps);
  assert.equal(resultado.limpiezaFotos, 'pendiente');
  assert.deepEqual(e.trabajo.claves, ['dueno/objeto-a', 'dueno/objeto-b']);
  assert.deepEqual(intentos.sort(), ['dueno/objeto-a', 'dueno/objeto-b']);
  assert.doesNotMatch(JSON.stringify(resultado), /objeto-/);
  assert.equal((await procesar(id, { repositorio: e.repo, eliminarImagen: async () => {} })).estado, 'completa');
  assert.equal((await e.deps.procesar(id)).estado, 'inexistente');
});

test('fallo al registrar nunca elimina el reporte', async () => {
  const e = entorno([{ key: 'dueno/objeto-a' }]);
  e.deps.registrar = async () => { throw new Error('Mongo'); };
  e.deps.eliminar = assert.fail;
  await assert.rejects(eliminarReporteService(id, 'dueno', e.deps));
  assert.ok(e.reporte);
});

test('reporte ajeno o repetido devuelve 404 sin crear ni procesar trabajos', async () => {
  const e = entorno([{ key: 'dueno/objeto-a' }]);
  await assert.rejects(eliminarReporteService(id, 'otro', e.deps), { status: 404 });
  assert.equal(e.trabajo, undefined);
  await eliminarReporteService(id, 'dueno', e.deps);
  await assert.rejects(eliminarReporteService(id, 'dueno', e.deps), { status: 404 });
});

test('fallo MongoDB al borrar conserva trabajo; el procesador no toca fotos de reportes existentes', async () => {
  const e = entorno([{ key: 'dueno/objeto-a' }]);
  e.deps.eliminar = async () => { throw new Error('Mongo'); };
  await assert.rejects(eliminarReporteService(id, 'dueno', e.deps));
  assert.deepEqual(e.trabajo.claves, ['dueno/objeto-a']);
  assert.equal((await procesar(id, { repositorio: e.repo, eliminarImagen: assert.fail })).estado, 'reporte_existente');
});

test('fallo MongoDB al cerrar trabajo conserva las referencias para reintentar', async () => {
  const e = entorno([{ key: 'dueno/objeto-a' }]);
  e.repo.eliminar = async () => { throw new Error('Mongo'); };
  const resultado = await eliminarReporteService(id, 'dueno', e.deps);
  assert.equal(resultado.limpiezaFotos, 'pendiente');
  assert.deepEqual(e.trabajo.claves, ['dueno/objeto-a']);
});

test('rechaza una referencia de fotos perteneciente a otro usuario antes de crear el trabajo', async () => {
  const e = entorno([{ key: 'otro/foto' }]);
  await assert.rejects(eliminarReporteService(id, 'dueno', e.deps), /referencias de imágenes inválidas/);
  assert.ok(e.reporte);
  assert.equal(e.trabajo, undefined);
});
