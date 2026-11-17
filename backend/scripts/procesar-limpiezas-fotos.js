require('dotenv').config();
const mongoose = require('mongoose');
const { getMongoDBConnection } = require('../src/database/conexion');
const repositorio = require('../src/repository/limpieza-fotos.repository');
const { procesar } = require('../src/service/limpieza-fotos.service');

async function main() {
  const ejecutar = process.argv.includes('--ejecutar');
  await getMongoDBConnection();
  const trabajos = await repositorio.listar();
  const resumen = { modo: ejecutar ? 'ejecutar' : 'consulta', total: trabajos.length, completa: 0, pendiente: 0, reporte_existente: 0, inexistente: 0, errores: 0 };
  if (ejecutar) {
    for (const trabajo of trabajos) {
      try { resumen[(await procesar(trabajo._id)).estado]++; }
      catch { resumen.errores++; }
    }
  }
  console.log(JSON.stringify(resumen));
  if (resumen.errores || resumen.pendiente) process.exitCode = 1;
}

main().catch(() => { console.error('No se pudo procesar la limpieza de fotos'); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
