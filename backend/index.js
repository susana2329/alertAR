
require('dotenv').config();

const express = require('express');
const { getMongoDBConnection } = require('./src/database/conexion');
const alertaRouter = require('./src/routes/alerta.router');
const ejecutarIngesta = require('./src/ingestion/ingesta.service');
const crearProgramadorIngesta = require('./src/ingestion/ingesta.scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/api/alertas', alertaRouter);

function crearCierreOrdenado({ server, programador }) {
    let cierreEnCurso;
    return function cerrarOrdenadamente() {
        if (cierreEnCurso) return cierreEnCurso;
        cierreEnCurso = (async () => {
            await programador.detener();
            await new Promise((resolve, reject) => {
                server.close(error => error ? reject(error) : resolve());
            });
        })();
        return cierreEnCurso;
    };
}

async function iniciarServidor() {
    try {
        await getMongoDBConnection();

        const server = app.listen(PORT, () => {
            console.log(`Servidor escuchando en el puerto ${PORT}`);
            const intervaloConfigurado = Number(process.env.INGESTA_INTERVALO_MS);
            const intervaloMs = Number.isFinite(intervaloConfigurado) && intervaloConfigurado > 0
                ? intervaloConfigurado
                : crearProgramadorIngesta.INTERVALO_PREDETERMINADO_MS;
            const programador = crearProgramadorIngesta({ ejecutarIngesta, intervaloMs });
            programador.iniciar();

            const cerrarOrdenadamente = crearCierreOrdenado({ server, programador });
            const manejarSenal = senal => {
                console.log(`Señal ${senal} recibida; iniciando cierre ordenado`);
                cerrarOrdenadamente().catch(error => {
                    console.error('Error durante el cierre ordenado:', error.message);
                    process.exitCode = 1;
                });
            };
            process.once('SIGINT', () => manejarSenal('SIGINT'));
            process.once('SIGTERM', () => manejarSenal('SIGTERM'));
        });
    } catch (error) {
        console.error('No se pudo iniciar el backend:', error.message);
        process.exit(1);
    }
}

if (require.main === module) iniciarServidor();

module.exports = { iniciarServidor, crearCierreOrdenado };
