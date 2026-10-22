
const alertaRepository = require('../repository/alerta.repository');
const { obtenerPuntoRepresentativo } = require('../geo/punto-representativo');

function fechaISOValida(fecha) {
    if (!(fecha instanceof Date) || !Number.isFinite(fecha.getTime())) {
        return null;
    }

    return fecha.toISOString();
}

function mapearAlerta(doc) {
    const fechaInicio = fechaISOValida(doc.fechaInicio);
    const fechaFin = fechaISOValida(doc.fechaFin);

    let ubicacion = null;

    if (doc.geometria) {
        try {
            ubicacion = obtenerPuntoRepresentativo(doc.geometria);
        } catch (error) {
            console.warn(
                `No se pudo calcular la ubicación de la alerta ${doc._id}:`,
                error.message
            );
        }
    } else if (
        Number.isFinite(doc.ubicacion?.latitud) &&
        Number.isFinite(doc.ubicacion?.longitud)
    ) {
        ubicacion = {
            latitud: doc.ubicacion.latitud,
            longitud: doc.ubicacion.longitud
        };
    }

    return {
        id: doc._id.toString(),
        titulo: doc.titulo ?? 'Alerta sin título',
        tipo: doc.tipo ?? 'observacion',
        nivel: doc.nivel ?? 'informativo',
        origen: doc.origen ?? 'oficial',
        descripcion: doc.descripcion ?? '',
        fechaInicio,
        fechaFin,
        ubicacion,
        geometria: doc.geometria ?? null,
        ...(doc.fuente ? { fuente: doc.fuente } : {})
    };
}

exports.listarAlertas = async () => {
    const docs = await alertaRepository.obtenerTodas();
    const alertas = docs.map(mapearAlerta);

    return alertas.filter(alerta =>
        alerta.ubicacion &&
        Number.isFinite(alerta.ubicacion.latitud) &&
        Number.isFinite(alerta.ubicacion.longitud) &&
        alerta.ubicacion.latitud >= -90 &&
        alerta.ubicacion.latitud <= 90 &&
        alerta.ubicacion.longitud >= -180 &&
        alerta.ubicacion.longitud <= 180
    );
};