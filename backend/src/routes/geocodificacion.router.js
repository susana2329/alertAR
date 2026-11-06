const express = require('express');
const controller = require('../controllers/geocodificacion.controller');

const router = express.Router();
router.get('/reversa', controller.reversa);
module.exports = router;
