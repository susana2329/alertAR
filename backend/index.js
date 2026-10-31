const express = require('express');
require('dotenv').config();
const { getMongoDBConnection } = require('./src/database/conexion');
const app = express();
const routerReporte = require('./src/routes/reporte.router');
const cors = require('cors')

getMongoDBConnection();
const PORT = process.env.PORT;

app.use(cors({
  origin: 'http://localhost:4200',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use('/reportes', routerReporte)

app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});

