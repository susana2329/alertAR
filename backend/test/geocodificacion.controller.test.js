const test = require('node:test');
const assert = require('node:assert/strict');
const servicio = require('../src/service/geocodificacion.service');
const controller = require('../src/controllers/geocodificacion.controller');

const original = servicio.obtenerUbicacionLegible;
test.afterEach(() => { servicio.obtenerUbicacionLegible = original; });
function response() { return { statusCode: 0, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } }; }

test('rechaza coordenadas inválidas sin llamar al proveedor', async () => {
    const res = response();
    await controller.reversa({ query: { latitud: '100', longitud: '0' } }, res, assert.fail);
    assert.equal(res.statusCode, 400);
});

test('devuelve el nombre normalizado y propaga indisponibilidad como error 502', async () => {
    servicio.obtenerUbicacionLegible = async () => ({ nombre: 'San Justo, Buenos Aires' });
    const res = response();
    await controller.reversa({ query: { latitud: '-34.68', longitud: '-58.56' } }, res, assert.fail);
    assert.equal(res.body.nombre, 'San Justo, Buenos Aires');
    const fallo = new Error('provider down');
    servicio.obtenerUbicacionLegible = async () => { throw fallo; };
    let recibido;
    await controller.reversa({ query: { latitud: '-34', longitud: '-58' } }, response(), error => recibido = error);
    assert.equal(recibido.status, 502);
    assert.equal(recibido.code, 'GEOCODING_UNAVAILABLE');
});
