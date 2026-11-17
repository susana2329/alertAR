const jwt = require('jsonwebtoken');
const authRepository = require('../repository/auth.repository');

module.exports = async function verificarModerador(req, res, next) {
  const cabecera = req.headers.authorization || '';
  const token = cabecera.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ mensaje: 'Tenés que iniciar sesión' });
  }

  let datos;
  try {
    datos = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ mensaje: 'Tu sesión venció, volvé a iniciar sesión' });
  }

  try {
    const usuario = await authRepository.buscarPorId(datos.id);
    if (!usuario || (usuario.rol !== 'moderador' && usuario.rol !== 'admin')) {
      return res.status(403).json({ mensaje: 'Acceso restringido a moderadores y administradores' });
    }

    req.usuarioId = datos.id;
    req.usuarioRol = usuario.rol;
  } catch (error) {
    return res.status(503).json({ mensaje: 'No se pudo verificar el acceso. Intentá nuevamente más tarde.' });
  }
  return next();
};
