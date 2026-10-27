const Usuario = require('./models/UserGoogle');

async function buscarPorEmail(email, conPassword = false) {
  const consulta = Usuario.findOne({ email: email.toLowerCase().trim() });
  if (conPassword) {
    consulta.select('+password');
  }
  return consulta;
}

async function buscarPorGoogleIdOEmail(googleId, email) {
  return Usuario.findOne({ $or: [{ googleId }, { email: email.toLowerCase().trim() }] });
}

async function buscarPorId(id) {
  return Usuario.findById(id);
}

async function crear(datos) {
  return Usuario.create(datos);
}

async function guardar(usuario) {
  return usuario.save();
}

module.exports = { buscarPorEmail, buscarPorGoogleIdOEmail, buscarPorId, crear, guardar };