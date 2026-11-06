const test = require('node:test');
const assert = require('node:assert/strict');
const inicioService = require('../src/service/inicio.service');
const controller = require('../src/controllers/inicio.controller');

const original = inicioService.obtenerInicio;
test.afterEach(() => { inicioService.obtenerInicio = original; });
function response() {
    return { statusCode: 0, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

test('valida pares de coordenadas y rangos geográficos', async () => {
    const parcial = response();
    await controller.obtenerInicio({ query: { latitud: '-34' } }, parcial, assert.fail);
    assert.equal(parcial.statusCode, 400);
    const invalida = response();
    await controller.obtenerInicio({ query: { latitud: '91', longitud: '-58' } }, invalida, assert.fail);
    assert.equal(invalida.statusCode, 400);
});

test('acepta ubicación válida y propaga errores al middleware', async () => {
    const respuesta = response();
    inicioService.obtenerInicio = async ubicacion => ({ ubicacion });
    await controller.obtenerInicio({ query: { latitud: '-34.6', longitud: '-58.4' } }, respuesta, assert.fail);
    assert.deepEqual(respuesta.body.ubicacion, { latitud: -34.6, longitud: -58.4 });

    const error = new Error('Fallo de consulta');
    inicioService.obtenerInicio = async () => { throw error; };
    let recibido;
    await controller.obtenerInicio({ query: {} }, response(), e => recibido = e);
    assert.equal(recibido, error);
});
