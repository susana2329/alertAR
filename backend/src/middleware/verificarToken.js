const jwt = require('jsonwebtoken');

module.exports = function verificarToken(req, res, next) {
  const cabecera = req.headers.authorization || '';
  const token = cabecera.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ mensaje: 'Tenés que iniciar sesión' });
  }

  try {
    const datos = jwt.verify(token, process.env.JWT_SECRET);
    req.usuarioId = datos.id;
    next();
  } catch (error) {
    res.status(401).json({ mensaje: 'Tu sesión venció, volvé a iniciar sesión' });
  }
};