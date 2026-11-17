const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const auth = require('../src/controllers/auth.controller');
const reportes = require('../src/controllers/reporte.controller');

auth.login = (req, res) => res.json({ ok: true });
auth.registro = (req, res) => res.json({ ok: true });
auth.google = (req, res) => res.json({ ok: true });
reportes.subirReporte = (req, res) => res.status(201).json({ ok: true });
reportes.votarReporteVecinal = (req, res) => res.json({ ok: true });
const authRouter = require('../src/routes/auth.router');
const reportesRouter = require('../src/routes/reporte.router');

test('rutas existentes responden y aplican límites antes de procesar reportes', async t => {
  const anterior = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'clave-solo-para-prueba';
  t.after(() => { if (anterior === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = anterior; });
  const app = express();
  app.use('/api/auth', authRouter);
  app.use('/api/reportes', reportesRouter);
  app.use('/reportes', reportesRouter);
  app.get('/api/alertas/mapa', (req, res) => res.json([]));
  const servidor = await new Promise((resolve, reject) => {
    const s = app.listen(0, '127.0.0.1', error => error ? reject(error) : resolve(s));
    s.on('error', reject);
  });
  t.after(() => new Promise(resolve => servidor.close(resolve)));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  for (let i = 0; i < 10; i++) {
    assert.equal((await fetch(`${base}/api/auth/login`, { method: 'POST' })).status, 200);
  }
  const loginLimitado = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'X-Forwarded-For': '203.0.113.1' } });
  assert.equal(loginLimitado.status, 429);
  assert.equal((await loginLimitado.json()).error.codigo, 'RATE_LIMITED');
  assert.ok(Number(loginLimitado.headers.get('retry-after')) > 0);
  assert.equal((await fetch(`${base}/api/auth/registro`, { method: 'POST' })).status, 200);
  assert.equal((await fetch(`${base}/api/auth/google`, { method: 'POST' })).status, 200);
  const tokenUno = jwt.sign({ id: 'usuario-uno' }, process.env.JWT_SECRET);
  const tokenDos = jwt.sign({ id: 'usuario-dos' }, process.env.JWT_SECRET);
  const enviar = (ruta, token) => fetch(`${base}${ruta}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  for (let i = 0; i < 10; i++) assert.equal((await enviar('/reportes/reporte', tokenUno)).status, 201);
  const bloqueado = await enviar('/api/reportes/reporte', tokenUno);
  assert.equal(bloqueado.status, 429);
  assert.equal((await bloqueado.json()).error.codigo, 'RATE_LIMITED');
  assert.ok(Number(bloqueado.headers.get('retry-after')) > 0);
  assert.equal((await enviar('/api/reportes/reporte', tokenDos)).status, 201);
  for (let i = 0; i < 60; i++) assert.equal((await enviar('/reportes/reporte/123/voto', tokenUno)).status, 200);
  assert.equal((await enviar('/api/reportes/reporte/123/voto', tokenUno)).status, 429);
  assert.equal((await enviar('/reportes/reporte/123/voto', tokenDos)).status, 200);
  assert.equal((await fetch(`${base}/api/alertas/mapa`)).status, 200);
});
