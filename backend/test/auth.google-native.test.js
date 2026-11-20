const test = require('node:test');
const assert = require('node:assert/strict');
const { OAuth2Client } = require('google-auth-library');
const repositorio = require('../src/repository/auth.repository');
const { entrarConGoogleNativo } = require('../src/service/auth.service');

test('verifica el token y nonce de Google antes de abrir la sesión', async (t) => {
  const clientIdAnterior = process.env.GOOGLE_CLIENT_ID;
  const jwtAnterior = process.env.JWT_SECRET;
  process.env.GOOGLE_CLIENT_ID = 'cliente-web-de-prueba';
  process.env.JWT_SECRET = 'secreto-de-prueba';
  t.after(() => {
    if (clientIdAnterior === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = clientIdAnterior;
    if (jwtAnterior === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = jwtAnterior;
  });

  const verificar = t.mock.method(OAuth2Client.prototype, 'verifyIdToken', async () => ({
    getPayload: () => ({ sub: 'google-1', email: 'usuario@example.com', email_verified: true, nonce: 'nonce-de-prueba-con-longitud-suficiente' })
  }));
  const buscar = t.mock.method(repositorio, 'buscarPorGoogleIdOEmail', async () => ({
    _id: 'usuario-1', nombre: 'Usuario', apellido: 'Prueba', email: 'usuario@example.com', googleId: 'google-1', rol: 'usuario'
  }));
  t.mock.method(repositorio, 'guardar', async () => {});

  const sesion = await entrarConGoogleNativo('token-de-prueba', 'nonce-de-prueba-con-longitud-suficiente');

  assert.equal(verificar.mock.calls[0].arguments[0].audience, 'cliente-web-de-prueba');
  assert.equal(buscar.mock.callCount(), 1);
  assert.equal(sesion.usuario.email, 'usuario@example.com');
  assert.ok(sesion.token);
});

test('rechaza un token con nonce distinto antes de consultar la cuenta', async (t) => {
  t.mock.method(OAuth2Client.prototype, 'verifyIdToken', async () => ({
    getPayload: () => ({ sub: 'google-1', email: 'usuario@example.com', email_verified: true, nonce: 'otro-nonce' })
  }));
  const buscar = t.mock.method(repositorio, 'buscarPorGoogleIdOEmail', async () => assert.fail('No debe consultar la cuenta'));

  await assert.rejects(
    entrarConGoogleNativo('token-de-prueba', 'nonce-de-prueba-con-longitud-suficiente'),
    { estado: 401, message: 'La autorización de Google no coincide' }
  );
  assert.equal(buscar.mock.callCount(), 0);
});
