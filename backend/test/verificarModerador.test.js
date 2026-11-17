const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const authRepository = require('../src/repository/auth.repository');
const verificarModerador = require('../src/middleware/verificarModerador');

test('autoriza únicamente el rol actual y rechaza errores de autenticación o base', async t => {
  const secretAnterior = process.env.JWT_SECRET;
  const buscarOriginal = authRepository.buscarPorId;
  process.env.JWT_SECRET = 'clave-de-prueba';
  t.after(() => {
    authRepository.buscarPorId = buscarOriginal;
    if (secretAnterior === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = secretAnterior;
  });

  async function verificar(token, usuario, falla = false) {
    let consultas = 0;
    authRepository.buscarPorId = async id => {
      consultas++;
      assert.equal(id, 'usuario-prueba');
      if (falla) throw new Error('detalle interno de MongoDB');
      return usuario;
    };
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = {
      status(code) { this.code = code; return this; },
      json(body) { this.body = body; return this; }
    };
    let autorizado = false;
    await verificarModerador(req, res, () => { autorizado = true; });
    return { autorizado, req, res, consultas };
  }

  const token = rol => jwt.sign({ id: 'usuario-prueba', rol }, process.env.JWT_SECRET, { expiresIn: '1h' });
  for (const rol of ['moderador', 'admin']) {
    const resultado = await verificar(token(rol), { rol });
    assert.equal(resultado.autorizado, true);
    assert.equal(resultado.req.usuarioRol, rol);
    assert.equal(resultado.req.usuarioId, 'usuario-prueba');
    assert.equal(resultado.consultas, 1);
  }
  for (const [rolToken, usuario] of [
    ['moderador', { rol: 'usuario' }], // rol revocado o falsamente declarado
    ['admin', { rol: 'usuario' }],
    ['usuario', { rol: 'usuario' }],
    ['moderador', null]
  ]) {
    const resultado = await verificar(token(rolToken), usuario);
    assert.equal(resultado.autorizado, false);
    assert.equal(resultado.res.code, 403);
    assert.equal(resultado.consultas, 1);
  }
  const fallo = await verificar(token('moderador'), null, true);
  assert.equal(fallo.autorizado, false);
  assert.equal(fallo.res.code, 503);
  assert.doesNotMatch(JSON.stringify(fallo.res.body), /MongoDB|detalle interno/);
  for (const invalido of ['jwt-invalido', jwt.sign({ id: 'usuario-prueba' }, process.env.JWT_SECRET, { expiresIn: -1 })]) {
    const resultado = await verificar(invalido, { rol: 'admin' });
    assert.equal(resultado.autorizado, false);
    assert.equal(resultado.res.code, 401);
    assert.equal(resultado.consultas, 0);
  }
});
