require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getMongoDBConnection } = require('./src/database/conexion');
const alertaRouter = require('./src/routes/alerta.router');
const ejecutarIngesta = require('./src/ingestion/ingesta.service');
const crearProgramadorIngesta = require('./src/ingestion/ingesta.scheduler');
const crearProgramadorArchivado = require('./src/ingestion/archivado.scheduler');
const alertaService = require('./src/service/alerta.service');
const { archivarAlertas } = require('./src/service/archivado-alertas.service');
const inaRepository = require('./src/repository/ina.repository');
const logger = require('./src/logging/logger');
const errorHandler = require('./src/middleware/error-handler');
const routerReporte = require('./src/routes/reporte.router');
const cuentaRouter = require('./src/routes/cuenta.router');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: ['http://localhost:8100', 'http://localhost:4200'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

app.use((req, res, next) => {
  const inicio = Date.now();
  const path = req.originalUrl.split('?')[0];
  res.on('finish', () => logger.info('http_request', {
    method: req.method, path, status: res.statusCode, duracionMs: Date.now() - inicio,
    bytesRespuesta: Number(res.getHeader('content-length')) || null
  }));
  next();
});
app.use('/api/alertas', alertaRouter);
app.use('/api/inicio', require('./src/routes/inicio.router'));
app.use('/api/geocodificacion', require('./src/routes/geocodificacion.router'));
app.use('/api/auth', require('./src/routes/auth.router'));
app.use('/api/cuenta', cuentaRouter);
app.use('/reportes', routerReporte);
app.use(errorHandler);


function crearCierreOrdenado({ server, programador, programadorArchivado }) {
    let cierreEnCurso;
    return function cerrarOrdenadamente() {
        if (cierreEnCurso) return cierreEnCurso;
        cierreEnCurso = (async () => {
            await Promise.all([programador.detener(), programadorArchivado?.detener()]);
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
            const ejecutarIngestaEInvalidarCache = async () => {
                try { return await ejecutarIngesta(); }
                finally { alertaService.invalidarCacheMapa(); }
            };
            const programador = crearProgramadorIngesta({ ejecutarIngesta: ejecutarIngestaEInvalidarCache, intervaloMs });
            programador.iniciar();

            const programadorArchivado = crearProgramadorArchivado({
                ejecutarArchivado: async () => {
                    try {
                        const frescuraINA = await inaRepository.marcarDesactualizadas();
                        const archivo = await archivarAlertas({ modo: 'archive' });
                        return { ...archivo, INA_desactualizadas: frescuraINA.modifiedCount ?? 0 };
                    }
                    finally { alertaService.invalidarCacheMapa(); }
                },
                intervaloMs
            });
            programadorArchivado.iniciar();

            const cerrarOrdenadamente = crearCierreOrdenado({ server, programador, programadorArchivado });
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

