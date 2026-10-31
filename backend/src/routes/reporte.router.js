const express = require('express')
const routerReporte = express.Router()
const { subirReporte } = require('../controllers/reporte.controller')
const multer = require('multer')
const {mostrarTodosReportes} = require('../controllers/reporte.controller')
const {getSegunId} = require('../controllers/reporte.controller')
const storage = multer.memoryStorage({
    destination: function (req, file, cb) {
        cb(null, 'fotosreporte')
    },
    filename: function (req, file, cb) {
        crypto.randomBytes(16, function (err, raw) {
            if (err) return cb(err)
            cb(null, file.fieldname + '-' + raw.toString('hex'))
        })
    }, 
    
})
const upload = multer({ storage: storage })

routerReporte.post('/reporte/:id', upload.any(), subirReporte)
routerReporte.get('/reporte', mostrarTodosReportes)
routerReporte.get('/reporte/:iduser', getSegunId)

module.exports = routerReporte