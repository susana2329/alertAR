const test = require('node:test');
const assert = require('node:assert/strict');
const alertaService = require('../src/service/alerta.service');
const { listarAlertas } = require('../src/controllers/alerta.controller');

const listarOriginal = alertaService.listarAlertas;
test.afterEach(() => { alertaService.listarAlertas = listarOriginal; });

test('responde con las alertas cuando el servicio termina', async () => {
    alertaService.listarAlertas = async () => [{ id: 'a1' }];
    const res = {
        statusCode: 0,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
    };

    await listarAlertas({}, res, assert.fail);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, [{ id: 'a1' }]);
});

test('pasa errores de consulta al middleware HTTP en lugar de dejar la petición abierta', async () => {
    const fallo = new Error('MongoDB no disponible');
    alertaService.listarAlertas = async () => { throw fallo; };
    let recibido;

    await listarAlertas({}, {}, error => { recibido = error; });

    assert.equal(recibido, fallo);
});
