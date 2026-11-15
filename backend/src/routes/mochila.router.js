const express = require('express');
const router = express.Router();
const mochilaController = require('../controllers/mochila.controller').guardarMochila;
const verificarToken = require('../middleware/verificarToken');
const getMochilaController= require('../controllers/mochila.controller').getMochilabyid

router.put('/mochila/:id', mochilaController);
router.get('/mochila/:id',verificarToken, getMochilaController)
module.exports = router;