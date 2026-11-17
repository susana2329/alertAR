const test = require('node:test');
const assert = require('node:assert/strict');
const { crearLimitador } = require('../src/middleware/rate-limit');

function ejecutar(middleware, req) {
  const res = {
    headers: {},
    set(nombre, valor) { this.headers[nombre] = valor; return this; },
    status(codigo) { this.codigo = codigo; return this; },
    json(body) { this.body = body; return this; }
  };
  let permitido = false;
  middleware(req, res, () => { permitido = true; });
  return { permitido, ...res };
}

test('permite solicitudes, limita por cliente y reinicia la ventana', () => {
  let tiempo = 1000;
  const limitar = crearLimitador({ maximo: 2, ventanaMs: 5000, ahora: () => tiempo });
  assert.equal(ejecutar(limitar, { ip: 'cliente-a' }).permitido, true);
  assert.equal(ejecutar(limitar, { ip: 'cliente-a' }).permitido, true);
  const bloqueada = ejecutar(limitar, { ip: 'cliente-a' });
  assert.equal(bloqueada.codigo, 429);
  assert.equal(bloqueada.headers['Retry-After'], '5');
  assert.deepEqual(bloqueada.body, { error: { codigo: 'RATE_LIMITED', mensaje: 'Demasiadas solicitudes. Intentá nuevamente más tarde.' } });
  assert.equal(ejecutar(limitar, { ip: 'cliente-b' }).permitido, true);
  tiempo += 5000;
  assert.equal(ejecutar(limitar, { ip: 'cliente-a' }).permitido, true);
});

test('separa usuarios y no utiliza cabeceras aportadas por el cliente', () => {
  const limitar = crearLimitador({ maximo: 1, ventanaMs: 10000, clave: req => req.usuarioId });
  assert.equal(ejecutar(limitar, { usuarioId: 'uno', headers: { 'x-forwarded-for': 'falsa' } }).permitido, true);
  assert.equal(ejecutar(limitar, { usuarioId: 'uno', headers: { 'x-forwarded-for': 'otra' } }).codigo, 429);
  assert.equal(ejecutar(limitar, { usuarioId: 'dos' }).permitido, true);
});

test('capacidad acotada devuelve 429 sin desalojar límites activos', () => {
  const limitar = crearLimitador({ maximo: 1, ventanaMs: 10000, capacidad: 1, ahora: () => 1000 });
  assert.equal(ejecutar(limitar, { ip: 'uno' }).permitido, true);
  assert.equal(ejecutar(limitar, { ip: 'dos' }).codigo, 429);
  assert.equal(ejecutar(limitar, { ip: 'uno' }).codigo, 429);
});
