const repositorio = require('../repository/retencion.repository');
const limpiezaRepository = require('../repository/limpieza-fotos.repository');
const limpiezaService = require('./limpieza-fotos.service');
const { eliminarReporteService } = require('./reporte.service');

const DIA_MS = 24 * 60 * 60 * 1000;

function restarMeses(fecha, meses) {
  const resultado = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth() - meses, 1,
    fecha.getUTCHours(), fecha.getUTCMinutes(), fecha.getUTCSeconds(), fecha.getUTCMilliseconds()));
  const ultimoDia = new Date(Date.UTC(resultado.getUTCFullYear(), resultado.getUTCMonth() + 1, 0)).getUTCDate();
  resultado.setUTCDate(Math.min(fecha.getUTCDate(), ultimoDia));
  return resultado;
}

function cortes(ahora = new Date()) {
  if (!(ahora instanceof Date) || Number.isNaN(ahora.getTime())) throw new TypeError('Fecha de retención inválida');
  return { cierreHasta: restarMeses(ahora, 12), rechazoHasta: new Date(ahora.getTime() - 30 * DIA_MS) };
}

async function ejecutar({ ahora = new Date(), limite = 100 } = {}, deps = {}) {
  if (!Number.isSafeInteger(limite) || limite < 1 || limite > 1000) throw new RangeError('Límite inválido');
  const listarVencidos = deps.listarVencidos || repositorio.listarVencidos;
  const eliminarReporte = deps.eliminarReporte || eliminarReporteService;
  const listarLimpiezas = deps.listarLimpiezas || limpiezaRepository.listar;
  const procesarLimpieza = deps.procesarLimpieza || limpiezaService.procesar;
  const resumen = { candidatos: 0, eliminados: 0, fallidos: 0, limpiezasCompletadas: 0, limpiezasPendientes: 0 };
  let desdeId;
  while (true) {
    const vencidos = await listarVencidos({ ...cortes(ahora), limite, desdeId });
    resumen.candidatos += vencidos.length;
    for (const reporte of vencidos) {
      try {
        await eliminarReporte(String(reporte._id), String(reporte.idUser));
        resumen.eliminados++;
      } catch {
        resumen.fallidos++;
      }
    }
    if (vencidos.length < limite) break;
    desdeId = String(vencidos.at(-1)._id);
  }

  const limpiezas = await listarLimpiezas();
  for (const trabajo of limpiezas) {
    try {
      const resultado = await procesarLimpieza(trabajo._id);
      if (resultado.estado === 'completa' || resultado.estado === 'inexistente') resumen.limpiezasCompletadas++;
      else resumen.limpiezasPendientes++;
    } catch {
      resumen.limpiezasPendientes++;
    }
  }
  return resumen;
}

module.exports = { cortes, restarMeses, ejecutar };
