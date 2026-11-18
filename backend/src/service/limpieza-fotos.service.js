const repositorio = require('../repository/limpieza-fotos.repository');
const { deleteimagenS3 } = require('./s3aws.service');

async function procesar(id, deps = {}) {
  const repo = deps.repositorio || repositorio;
  const eliminarImagen = deps.eliminarImagen || deleteimagenS3;
  const trabajo = await repo.obtener(id);
  if (!trabajo) return { estado: 'inexistente' };
  // Un fallo o resultado incierto al borrar MongoDB nunca debe borrar fotos de un reporte existente.
  if (await repo.existeReporte(id)) return { estado: 'reporte_existente' };
  const resultados = await Promise.allSettled(trabajo.claves.map(clave => eliminarImagen(clave)));
  if (resultados.some(resultado => resultado.status === 'rejected')) return { estado: 'pendiente' };
  await repo.eliminar(id);
  return { estado: 'completa' };
}

module.exports = { procesar };
