require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cuentaRouter = require('./src/routes/cuenta.router');
const routerReporte = require('./src/routes/reporte.router');
const { getMongoDBConnection } = require('./src/database/conexion');

const app = express();

app.use(cors({
  origin: ['http://localhost:8100', 'http://localhost:4200'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

app.use('/api/auth', require('./src/routes/auth.router'));
app.use('/api/cuenta', cuentaRouter);
app.use('/reportes', routerReporte);

getMongoDBConnection();

const PORT = process.env.PORT;
app.listen(PORT, () => console.log('Servidor listo en el puerto ' + PORT));

