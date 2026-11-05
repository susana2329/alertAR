const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const authRepository = require('../repository/auth.repository');

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
  return jwt.sign({ id: usuario._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function datosPublicos(usuario) {
  return {
    id: usuario._id,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    email: usuario.email,
    foto: usuario.foto
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
  if (!email || !password) {
    throw new ErrorApp('Completá tu correo y tu contraseña', 400);
  }

  const usuario = await authRepository.buscarPorEmail(email, true);

  if (!usuario) {
    throw new ErrorApp('Correo o contraseña incorrectos', 401);
  }

  if (!usuario.password) {
    throw new ErrorApp('Esa cuenta se creó con Google. Iniciá sesión con el botón de Google.', 401);
  }

  const coincide = await bcrypt.compare(password, usuario.password);
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

module.exports = { registrar, iniciarSesion, entrarConGoogle, obtenerPerfil, ErrorApp };