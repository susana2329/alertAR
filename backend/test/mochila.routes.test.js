const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const mochilaService = require('../src/service/mochila.service');
const mochilaRouter = require('../src/routes/mochila.router');

test('solo el dueño autenticado puede guardar una mochila válida', async t => {
  const secretoAnterior = process.env.JWT_SECRET;
  const guardarOriginal = mochilaService.guardarMochila;
  process.env.JWT_SECRET = 'secreto-de-prueba-mochila';
  const escrituras = [];
  mochilaService.guardarMochila = async (...args) => {
    escrituras.push(args);
    return { usuarioId: args[0], [args[1]]: args[2] };
  };
  t.after(() => {
    mochilaService.guardarMochila = guardarOriginal;
    if (secretoAnterior === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = secretoAnterior;
  });

  const app = express();
  app.use(express.json());
  app.use('/api', mochilaRouter);
  const servidor = await new Promise((resolve, reject) => {
    const s = app.listen(0, '127.0.0.1', error => error ? reject(error) : resolve(s));
    s.on('error', reject);
  });
  t.after(() => new Promise(resolve => servidor.close(resolve)));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const token = jwt.sign({ id: 'usuario-uno' }, process.env.JWT_SECRET);
  const enviar = (id, body, bearer = token) => fetch(`${base}/api/mochila/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
    body: JSON.stringify(body)
  });
  const mochila = { tipoMochila: 'individual', itemsCompletados: [1, 2] };

  assert.equal((await enviar('usuario-uno', mochila, null)).status, 401);
  assert.equal((await enviar('usuario-dos', mochila)).status, 403);
  assert.equal((await enviar('usuario-uno', mochila, 'token-invalido')).status, 401);
  for (const body of [
    {},
    { tipoMochila: 'usuarioId', itemsCompletados: [1] },
    { tipoMochila: '$set', itemsCompletados: [1] },
    { tipoMochila: 'individual', itemsCompletados: '1,2' },
    { tipoMochila: 'individual', itemsCompletados: [0] },
    { tipoMochila: 'familiar', itemsCompletados: [1], cantidadFamilia: -1 }
  ]) {
    assert.equal((await enviar('usuario-uno', body)).status, 400);
  }
  assert.equal(escrituras.length, 0);

  const respuesta = await enviar('usuario-uno', mochila);
  assert.equal(respuesta.status, 200);
  assert.equal((await respuesta.json()).mensaje, 'Progreso guardado correctamente');
  assert.deepEqual(escrituras, [['usuario-uno', 'individual', [1, 2], undefined]]);
});
