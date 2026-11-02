require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getMongoDBConnection } = require('./src/database/conexion');

const app = express();

app.use(cors({ origin: 'http://localhost:8100' }));
app.use(express.json());
app.use('/api/auth', require('./src/routes/auth.router'));

getMongoDBConnection();

const PORT = process.env.PORT;
app.listen(PORT, () => console.log('Servidor listo en el puerto ' + PORT));