const test = require('node:test');
const assert = require('node:assert/strict');
const alertaRepository = require('../src/repository/alerta.repository');
const alertaController = require('../src/controllers/alerta.controller');
const errorHandler = require('../src/middleware/error-handler');
const Alerta = require('../src/models/alerta.model');

function respuestaFalsa() {
    return {
        statusCode: null, body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
    };
}

test('esquema conserva datos específicos en datosFuente y descarta duplicados no declarados', () => {
    const doc = new Alerta({ fuente: 'INPRES', magnitud: 4, datosFuente: { magnitud: 4 }, naturaleza: 'observacion' });
    const objeto = doc.toObject();
    assert.equal(objeto.magnitud, undefined);
    assert.equal(objeto.datosFuente.magnitud, 4);
    assert.equal(objeto.naturaleza, 'observacion');
});

test('controlador devuelve array con preview, detalle INA y presentación de gravedad', async () => {
    const original = alertaRepository.obtenerTodas;
    alertaRepository.obtenerTodas = async () => [{
        _id: { toString: () => 'ina-1' }, fuente: 'INA', tipo: 'observacion', naturaleza: 'alerta',
        nivel: 'advertencia', origen: 'oficial', titulo: 'Estación', descripcion: 'lectura extensa',
        fechaInicio: new Date('2026-10-21T00:00:00Z'), geometria: { type: 'Point', coordinates: [-60, -35] },
        datosFuente: { estacion: { nombre: 'Estación' }, medicion: { valor: 5, unidad: 'm' }, umbrales: { alerta: 4 } }
    }];
    try {
        const res = respuestaFalsa();
        await alertaController.listarAlertas({}, res);
        assert.equal(res.statusCode, 200);
        assert.ok(Array.isArray(res.body));
        assert.equal(res.body[0].descripcion, res.body[0].descripcionPreview);
        assert.equal(res.body[0].detalle.medicion.valor, 5);
        assert.equal(res.body[0].etiqueta, 'ALERTA');
        assert.equal(res.body[0].color, 'naranja');
    } finally { alertaRepository.obtenerTodas = original; }
});

test('presentación omite SMN vencidas y conserva eventos sísmicos históricos', async () => {
    const original = alertaRepository.obtenerTodas;
    alertaRepository.obtenerTodas = async () => [
        { _id: { toString: () => 'old-smn' }, fuente: 'SMN', fechaFin: new Date('2020-01-01'), geometria: { type: 'Point', coordinates: [-60, -35] } },
        { _id: { toString: () => 'quake' }, fuente: 'INPRES', tipo: 'sismo', nivel: 'informativo', fechaInicio: new Date('2000-01-01'), geometria: { type: 'Point', coordinates: [-60, -35] }, datosFuente: {} }
    ];
    try {
        const res = respuestaFalsa();
        await alertaController.listarAlertas({}, res);
        assert.deepEqual(res.body.map(item => item.id), ['quake']);
    } finally { alertaRepository.obtenerTodas = original; }
});

test('middleware responde JSON genérico y no revela fallos internos', () => {
    const res = respuestaFalsa();
    const errorLogOriginal = console.error;
    console.error = () => {};
    try {
        errorHandler(new Error('detalle interno confidencial'), { method: 'GET', path: '/api/alertas' }, res, () => {});
    } finally { console.error = errorLogOriginal; }
    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { error: { codigo: 'INTERNAL_ERROR', mensaje: 'Error interno del servidor' } });
});
