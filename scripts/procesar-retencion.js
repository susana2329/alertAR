require('dotenv').config();
const mongoose = require('mongoose');
const { getMongoDBConnection } = require('../src/database/conexion');
const retencionRepository = require('../src/repository/retencion.repository');
const limpiezaRepository = require('../src/repository/limpieza-fotos.repository');
const retencionService = require('../src/service/retencion.service');

async function main() {
  const ejecutar = process.argv.includes('--ejecutar');
  await getMongoDBConnection();
  if (ejecutar) {
    const resumen = await retencionService.ejecutar();
    console.log(JSON.stringify({ modo: 'ejecutar', ...resumen }));
    if (resumen.fallidos || resumen.limpiezasPendientes) process.exitCode = 1;
    return;
  }
  const candidatos = await retencionRepository.listarVencidos({ ...retencionService.cortes(), limite: 100 });
  const limpiezas = await limpiezaRepository.listar();
  console.log(JSON.stringify({ modo: 'consulta', candidatosPrimerLote: candidatos.length, limpiezasPendientes: limpiezas.length }));
}

main().catch(error => {
  console.error('No se pudo procesar la retención:', error.message);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
