
require('dotenv').config();


const express = require('express');
const { getMongoDBConnection } = require('./src/database/conexion');
const alertaRouter = require('./src/routes/alerta.router');
const ejecutarIngesta = require('./src/ingestion/ingesta.service');
const crearProgramadorIngesta = require('./src/ingestion/ingesta.scheduler');
const logger = require('./src/logging/logger');
const errorHandler = require('./src/middleware/error-handler');

const app = express();
const PORT = process.env.PORT || 3000;

const cors = require('cors');

app.use(cors({
  origin: 'http://localhost:4200'
}));

app.use(express.json());
app.use((req, res, next) => {
  const inicio = Date.now();
  res.on('finish', () => logger.info('http_request', {
    method: req.method, path: req.path, status: res.statusCode, duracionMs: Date.now() - inicio
  }));
  next();
});
app.use('/api/alertas', alertaRouter);
app.use(errorHandler);

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
            logger.info('servidor_iniciado', { puerto: PORT });
            const intervaloConfigurado = Number(process.env.INGESTA_INTERVALO_MS);
            const intervaloMs = Number.isFinite(intervaloConfigurado) && intervaloConfigurado > 0
                ? intervaloConfigurado
                : crearProgramadorIngesta.INTERVALO_PREDETERMINADO_MS;
            const programador = crearProgramadorIngesta({ ejecutarIngesta, intervaloMs });
            programador.iniciar();

            const cerrarOrdenadamente = crearCierreOrdenado({ server, programador });
            const manejarSenal = senal => {
                logger.info('cierre_solicitado', { senal });
                cerrarOrdenadamente().catch(error => {
                    logger.error('cierre_fallido', { mensaje: error.message });
                    process.exitCode = 1;
                });
            };
            process.once('SIGINT', () => manejarSenal('SIGINT'));
            process.once('SIGTERM', () => manejarSenal('SIGTERM'));
        });
    } catch (error) {
        logger.error('inicio_fallido', { mensaje: error.message });
        process.exit(1);
    }
}

if (require.main === module) iniciarServidor();

module.exports = { iniciarServidor, crearCierreOrdenado, app };
