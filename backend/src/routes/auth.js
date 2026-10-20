const express = require('express');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const Usuario = require('../repository/models/UserGoogle');

const router = express.Router();
const clienteGoogle = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'postmessage'
);

function datosPublicos(usuario) {
  return {
    id: usuario._id,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    email: usuario.email,
    foto: usuario.foto
  };
}

router.post('/google', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ mensaje: 'Falta el código de Google' });
    }

    const { tokens } = await clienteGoogle.getToken(code);
    const ticket = await clienteGoogle.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const datos = ticket.getPayload();

    if (!datos.email_verified) {
      return res.status(401).json({ mensaje: 'Tu correo de Google no está verificado' });
    }

    let usuario = await Usuario.findOne({ $or: [{ googleId: datos.sub }, { email: datos.email }] });

    if (!usuario) {
      usuario = await Usuario.create({
        nombre: datos.given_name || datos.name,
        apellido: datos.family_name || '',
        email: datos.email,
        googleId: datos.sub,
        foto: datos.picture || '',
        proveedor: 'google'
      });
    } else if (!usuario.googleId) {
      usuario.googleId = datos.sub;
      usuario.foto = usuario.foto || datos.picture || '';
      await usuario.save();
    }

    const token = jwt.sign({ id: usuario._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, usuario: datosPublicos(usuario) });
  } catch (error) {
    console.error('Error con Google:', error.message);
    res.status(401).json({ mensaje: 'No se pudo entrar con Google' });
  }
});

module.exports = router;