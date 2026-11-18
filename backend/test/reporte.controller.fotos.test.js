const test = require('node:test');
const assert = require('node:assert/strict');
const service = require('../src/service/reporte.service');

test('crear reporte no expone las claves de las fotos', async t => {
  const original = service.subirReporteService;
  service.subirReporteService = async () => ({
    toObject: () => ({ _id: 'reporte', fotos: [{ key: 'privado/clave', originalname: 'imagen.jpg', mimetype: 'image/jpeg', size: 10 }] })
  });
  t.after(() => { service.subirReporteService = original; });
  const controller = require('../src/controllers/reporte.controller');
  const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await controller.subirReporte({ body: {}, files: [], usuarioId: 'usuario' }, res, assert.fail);
  assert.equal(res.code, 201);
  assert.equal(res.body.fotos[0].originalname, 'imagen.jpg');
  assert.equal(Object.hasOwn(res.body.fotos[0], 'key'), false);
  assert.doesNotMatch(JSON.stringify(res.body), /privado/);
});
