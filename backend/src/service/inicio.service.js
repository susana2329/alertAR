const alertaService = require('./alerta.service');
const logger = require('../logging/logger');
const { ANTIGUEDAD_MAXIMA_MS, fechaValida } = require('./ciclo-vida-alerta');
const { booleanPointInPolygon } = require('@turf/boolean-point-in-polygon');
const nearestPointOnLine = require('@turf/nearest-point-on-line').default;
const { point, polygon, multiPolygon, lineString } = require('@turf/helpers');

const RADIO_MAXIMO_KM = 150;
const PESO_NIVEL = { emergencia: 100, advertencia: 75, precaucion: 50, informativo: 15, desconocido: 0 };
const PESO_NATURALEZA = { alerta: 30, observacion: 5, contexto: 0 };

function distanciaKm(a, b) {
    const rad = grados => grados * Math.PI / 180;
    const dLat = rad(b.latitud - a.latitud);
    const dLon = rad(b.longitud - a.longitud);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitud)) * Math.cos(rad(b.latitud)) * Math.sin(dLon / 2) ** 2;
    return 6371.0088 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function geometriaValida(geo) {
    if (!geo || !Array.isArray(geo.coordinates)) return false;
    try {
        if (geo.type === 'Polygon') polygon(geo.coordinates);
        else if (geo.type === 'MultiPolygon') multiPolygon(geo.coordinates);
        else if (geo.type !== 'Point') return false;
        return true;
    } catch { return false; }
}

function distanciaAUbicacion(usuario, alerta) {
    const geo = alerta.geometria;
    if (!usuario) return { distanciaKm: null, dentroDelArea: false };
    if (geometriaValida(geo) && geo.type === 'Point') {
        const [longitud, latitud] = geo.coordinates;
        return { distanciaKm: distanciaKm(usuario, { latitud, longitud }), dentroDelArea: false };
    }
    if (geometriaValida(geo) && ['Polygon', 'MultiPolygon'].includes(geo.type)) {
        const puntoUsuario = point([usuario.longitud, usuario.latitud]);
        const figura = geo.type === 'Polygon' ? polygon(geo.coordinates) : multiPolygon(geo.coordinates);
        if (booleanPointInPolygon(puntoUsuario, figura)) return { distanciaKm: 0, dentroDelArea: true };
        const anillos = geo.type === 'Polygon' ? geo.coordinates : geo.coordinates.flat(1);
        let distanciaMinima = Infinity;
        for (const anillo of anillos) {
            if (!Array.isArray(anillo) || anillo.length < 2) continue;
            try {
                const cercano = nearestPointOnLine(lineString(anillo), puntoUsuario, { units: 'kilometers' });
                const [longitud, latitud] = cercano.geometry.coordinates;
                distanciaMinima = Math.min(distanciaMinima, distanciaKm(usuario, { latitud, longitud }));
            } catch { /* Una geometría no interpretable no debe impedir evaluar los demás datos. */ }
        }
        if (Number.isFinite(distanciaMinima)) return { distanciaKm: distanciaMinima, dentroDelArea: false };
    }
    if (alerta.ubicacion && Number.isFinite(alerta.ubicacion.latitud) && Number.isFinite(alerta.ubicacion.longitud)) {
        return { distanciaKm: distanciaKm(usuario, alerta.ubicacion), dentroDelArea: false };
    }
    return { distanciaKm: null, dentroDelArea: false };
}

function datosVigentes(alerta, ahora) {
    const inicio = fechaValida(alerta.fechaInicio);
    if (!inicio || inicio > ahora) return false;
    const fin = fechaValida(alerta.fechaFin);
    if (fin && fin < ahora) return false;
    if (alerta.fuente === 'SMN' && fin && fin >= ahora) return true;
    const maxEdad = ANTIGUEDAD_MAXIMA_MS[alerta.fuente];
    return maxEdad != null && ahora - inicio <= maxEdad;
}

function puedeSerDestacada(alerta, geo, ubicacion) {
    if (alerta.naturaleza !== 'alerta') return false;
    if (alerta.fuente === 'SMN') {
        if (!['precaucion', 'advertencia', 'emergencia'].includes(alerta.nivel)) return false;
        return !ubicacion || geo?.dentroDelArea || (geo?.distanciaKm != null && geo.distanciaKm <= 10);
    }
    if (alerta.fuente === 'INA') {
        if (!['advertencia', 'emergencia'].includes(alerta.nivel)) return false;
        // INA publica una estación puntual, no el área de localidades afectadas.
        // Solo destacar cerca de la estación evita extrapolar su umbral a una cuenca.
        return !ubicacion || (geo?.distanciaKm != null && geo.distanciaKm <= 10);
    }
    return false;
}

function calidadDatos(alerta) {
    let calidad = 0;
    if (alerta.fuente && alerta.origen === 'oficial') calidad += 20;
    if (alerta.identificadorFuente) calidad += 15;
    if (alerta.geometria) calidad += 25;
    else if (alerta.ubicacion) calidad += 15;
    if (fechaValida(alerta.fechaInicio)) calidad += 15;
    if (alerta.fuente === 'SMN' && alerta.estadoFuente === 'Actual') calidad += 10;
    if (alerta.fuente === 'INA' && alerta.datosFuente?.clasificacion?.regla) calidad += 10;
    return calidad;
}

function puntuar(alerta, geo, ahora) {
    const edadHoras = Math.max(0, (ahora - fechaValida(alerta.fechaInicio)) / 3600000);
    const proximidad = geo.distanciaKm == null ? 0 : Math.max(0, 25 * (1 - Math.min(geo.distanciaKm, RADIO_MAXIMO_KM) / RADIO_MAXIMO_KM));
    const cobertura = geo.dentroDelArea ? 45 : 0;
    const frescura = Math.max(0, 15 * (1 - edadHoras / (ANTIGUEDAD_MAXIMA_MS[alerta.fuente] / 3600000)));
    return Math.round((PESO_NIVEL[alerta.nivel] ?? 0) + (PESO_NATURALEZA[alerta.naturaleza] ?? 0) + proximidad + cobertura + frescura + calidadDatos(alerta) * 0.2);
}

function crearEvento(alerta, geo, ahora) {
    const datos = alerta.detalle ?? {};
    const instruccionesSMN = datos.datosFuente?.informaciones
        ?.map(info => typeof info.instruccion === 'string' ? info.instruccion.trim() : '')
        .filter(Boolean) ?? [];
    const { geometria: _geometria, ...resumen } = alerta;
    return {
        ...resumen,
        geometria: null,
        distanciaKm: geo.distanciaKm == null ? null : Math.round(geo.distanciaKm * 10) / 10,
        dentroDelArea: geo.dentroDelArea,
        calidadDatos: calidadDatos(alerta),
        relevancia: puntuar(alerta, geo, ahora),
        fechaActualizacion: alerta.actualizadoEn ?? fechaValida(alerta.fechaInicio)?.toISOString() ?? null,
        informacionPreventiva: instruccionesSMN[0] ?? null,
        recomendacionesDisponibles: instruccionesSMN.length > 0
    };
}

function ordenar(a, b) {
    return b.relevancia - a.relevancia || (a.distanciaKm ?? Infinity) - (b.distanciaKm ?? Infinity);
}

async function obtenerInicio(ubicacion = null, ahora = new Date()) {
    const alertas = await (alertaService.listarCandidatasInicio
        ? alertaService.listarCandidatasInicio(ahora)
        : alertaService.listarAlertas());
    const geografiaInicio = process.hrtime.bigint();
    const eventos = [];
    for (const alerta of alertas) {
        if (!datosVigentes(alerta, ahora)) continue;
        if (alerta.origen !== 'oficial' || !['SMN', 'INA', 'INPRES'].includes(alerta.fuente)) continue;
        const geo = distanciaAUbicacion(ubicacion, alerta);
        if (ubicacion && (geo.distanciaKm == null || geo.distanciaKm > RADIO_MAXIMO_KM)) continue;
        const destacable = puedeSerDestacada(alerta, geo, ubicacion);
        if (!ubicacion && !destacable) continue;
        // Las observaciones se pueden mostrar como registros informativos; nunca se elevan a destacadas.
        eventos.push({ alerta, evento: crearEvento(alerta, geo, ahora), destacable });
    }
    eventos.sort((a, b) => ordenar(a.evento, b.evento));
    const geografiaMs = Number(process.hrtime.bigint() - geografiaInicio) / 1e6;
    const destacada = eventos.find(item => item.destacable)?.evento ?? null;
    const respuesta = {
        ubicacion,
        actualizadoEn: ahora.toISOString(),
        estado: destacada ? 'alerta' : eventos.length ? 'informacion' : 'sin-situaciones-relevantes',
        destacada,
        eventos: eventos.map(item => item.evento),
        mensaje: destacada ? null : ubicacion
            ? 'No se detectan situaciones importantes en la zona con la información disponible.'
            : 'No se detectan alertas oficiales vigentes con la información disponible.'
    };
    logger.info('inicio_calculado', { documentosProcesados: alertas.length, eventosDevueltos: eventos.length,
        geografiaMs: Math.round(geografiaMs * 10) / 10 });
    return respuesta;
}

module.exports = { obtenerInicio, distanciaKm, distanciaAUbicacion, datosVigentes, puedeSerDestacada, puntuar, RADIO_MAXIMO_KM };
