const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const authRepository = require('../repository/auth.repository');
const { randomUUID } = require('node:crypto');
const logger = require('../logging/logger');

const clienteGoogle = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'postmessage'
);

class ErrorApp extends Error {
  constructor(mensaje, estado) {
    super(mensaje);
    this.estado = estado;
  }
}

function crearToken(usuario) {
  return jwt.sign({ id: usuario._id, rol: usuario.rol || 'usuario' }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function datosPublicos(usuario) {
  return {
    id: usuario._id,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    email: usuario.email,
    foto: usuario.foto,
    rol: usuario.rol || 'usuario'
  };
}

function respuestaConSesion(usuario) {
  return { token: crearToken(usuario), usuario: datosPublicos(usuario) };
}

function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function registrar({ nombre, apellido, email, password }) {
  if (!nombre || !apellido || !email || !password) {
    throw new ErrorApp('Completá todos los campos', 400);
  }
  if (!emailValido(email)) {
    throw new ErrorApp('Escribí un correo válido', 400);
  }
  if (password.length < 6) {
    throw new ErrorApp('La contraseña tiene que tener al menos 6 caracteres', 400);
  }

  const existente = await authRepository.buscarPorEmail(email);
  if (existente) {
    throw new ErrorApp('Ya existe una cuenta con ese correo', 409);
  }

  const hash = await bcrypt.hash(password, 10);

  const usuario = await authRepository.crear({
    nombre,
    apellido,
    email,
    password: hash,
    proveedor: 'local'
  });

  return respuestaConSesion(usuario);
}

async function iniciarSesion({ email, password }) {
  const idSolicitud = randomUUID();
  let usuarioEncontrado = false;
  let proveedorLocal = false;
  let comparacionBcryptExitosa = false;
  const registrarDiagnostico = () => logger.info('diagnostico_login_local', {
    idSolicitud,
    usuarioEncontrado,
    proveedorLocal,
    comparacionBcryptExitosa
  });

  if (!email || !password) {
    registrarDiagnostico();
    throw new ErrorApp('Completá tu correo y tu contraseña', 400);
  }

  const usuario = await authRepository.buscarPorEmail(email, true);
  usuarioEncontrado = Boolean(usuario);
  proveedorLocal = usuario?.proveedor === 'local';

  if (!usuario) {
    registrarDiagnostico();
    throw new ErrorApp('Correo o contraseña incorrectos', 401);
  }

  if (!usuario.password) {
    registrarDiagnostico();
    throw new ErrorApp('Esa cuenta se creó con Google. Iniciá sesión con el botón de Google.', 401);
  }

  const coincide = await bcrypt.compare(password, usuario.password);
  comparacionBcryptExitosa = coincide;
  registrarDiagnostico();
  if (!coincide) {
    throw new ErrorApp('Correo o contraseña incorrectos', 401);
  }

  usuario.ultimoAcceso = new Date();
  await authRepository.guardar(usuario);

  return respuestaConSesion(usuario);
}


async function entrarConGoogle(code) {
  if (!code) {
    throw new ErrorApp('Falta el código de Google', 400);
  }

  let datos;
  try {
    const { tokens } = await clienteGoogle.getToken(code);
    const ticket = await clienteGoogle.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    datos = ticket.getPayload();
  } catch (error) {
    console.error('Error con Google:', error.message);
    throw new ErrorApp('No se pudo entrar con Google', 401);
  }

  return completarEntradaGoogle(datos);
}

async function entrarConGoogleNativo(idToken, nonce) {
  if (typeof idToken !== 'string' || !idToken || idToken.length > 10000 ||
      typeof nonce !== 'string' || nonce.length < 20 || nonce.length > 200) {
    throw new ErrorApp('Falta la credencial de Google', 400);
  }
  let datos;
  try {
    const ticket = await clienteGoogle.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    datos = ticket.getPayload();
  } catch (error) {
    console.error('Error al verificar Google nativo:', error.message);
    throw new ErrorApp('No se pudo entrar con Google', 401);
  }
  if (datos?.nonce !== nonce) throw new ErrorApp('La autorización de Google no coincide', 401);
  return completarEntradaGoogle(datos);
}

async function completarEntradaGoogle(datos) {
  if (!datos?.sub || !datos?.email) throw new ErrorApp('Google no devolvió los datos de la cuenta', 401);
  if (!datos.email_verified) {
    throw new ErrorApp('Tu correo de Google no está verificado', 401);
  }

 
  let usuario = await authRepository.buscarPorGoogleIdOEmail(datos.sub, datos.email);

  if (!usuario) {
    usuario = await authRepository.crear({
      nombre: datos.given_name || datos.name,
      apellido: datos.family_name || '',
      email: datos.email,
      googleId: datos.sub,
      foto: datos.picture || '',
      proveedor: 'google'
    });
  } else {
    if (!usuario.googleId) {
      usuario.googleId = datos.sub;
    }
    if (!usuario.foto) {
      usuario.foto = datos.picture || '';
    }
    usuario.ultimoAcceso = new Date();
    await authRepository.guardar(usuario);
  }

  return respuestaConSesion(usuario);
}

async function obtenerPerfil(id) {
  const usuario = await authRepository.buscarPorId(id);
  if (!usuario) {
    throw new ErrorApp('Usuario no encontrado', 404);
  }
  return { usuario: datosPublicos(usuario) };
}

module.exports = { registrar, iniciarSesion, entrarConGoogle, entrarConGoogleNativo, obtenerPerfil, ErrorApp };
