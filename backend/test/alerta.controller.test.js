const test = require('node:test');
const assert = require('node:assert/strict');
const alertaService = require('../src/service/alerta.service');
const { listarAlertas, listarAlertasMapa, obtenerAlerta } = require('../src/controllers/alerta.controller');

const listarOriginal = alertaService.listarAlertas;
const listarMapaOriginal = alertaService.listarAlertasMapa;
const obtenerOriginal = alertaService.obtenerAlerta;
test.afterEach(() => {
    alertaService.listarAlertas = listarOriginal;
    alertaService.listarAlertasMapa = listarMapaOriginal;
    alertaService.obtenerAlerta = obtenerOriginal;
});

function respuestaHttp() {
    return {
        statusCode: 0,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
    };
}

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

test('responde el resumen compacto del mapa', async () => {
    alertaService.listarAlertasMapa = async () => [{ id: 'a1', detalle: {} }];
    const res = respuestaHttp();
    await listarAlertasMapa({}, res, assert.fail);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, [{ id: 'a1', detalle: {} }]);
});

test('recupera una alerta individual y devuelve 404 si no existe', async () => {
    alertaService.obtenerAlerta = async id => id === 'existente' ? { id } : null;
    const encontrada = respuestaHttp();
    await obtenerAlerta({ params: { id: 'existente' } }, encontrada, assert.fail);
    assert.equal(encontrada.statusCode, 200);
    assert.deepEqual(encontrada.body, { id: 'existente' });
    const ausente = respuestaHttp();
    await obtenerAlerta({ params: { id: 'ausente' } }, ausente, assert.fail);
    assert.equal(ausente.statusCode, 404);
});
