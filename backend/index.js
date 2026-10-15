const express = require('express');
require('dotenv').config();
const { getMongoDBConnection } = require('./src/database/conexion');
const app = express();




getMongoDBConnection();
const PORT = process.env.PORT;

app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});