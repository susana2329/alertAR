const authService = require('../service/auth.service');

function responderError(res, error) {
  if (error.estado) {
    return res.status(error.estado).json({ mensaje: error.message });
  }
  console.error(error);
  res.status(500).json({ mensaje: 'Error del servidor' });
}

async function registro(req, res) {
  try {
    const resultado = await authService.registrar(req.body);
    res.status(201).json(resultado);
  } catch (error) {
    responderError(res, error);
  }
}

async function login(req, res) {
  try {
    const resultado = await authService.iniciarSesion(req.body);
    res.json(resultado);
  } catch (error) {
    responderError(res, error);
  }
}

async function google(req, res) {
  try {
    const resultado = await authService.entrarConGoogle(req.body.code);
    res.json(resultado);
  } catch (error) {
    responderError(res, error);
  }
}

async function me(req, res) {
  try {
    const resultado = await authService.obtenerPerfil(req.usuarioId);
    res.json(resultado);
  } catch (error) {
    responderError(res, error);
  }
}

module.exports = { registro, login, google, me };