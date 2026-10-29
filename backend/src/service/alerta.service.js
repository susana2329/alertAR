const alertaRepository = require('../repository/alerta.repository');
const { obtenerPuntoRepresentativo } = require('../geo/punto-representativo');
const { presentarClasificacion } = require('./clasificacion-presentacion');

function fechaISOValida(fecha) {
    return fecha instanceof Date && Number.isFinite(fecha.getTime()) ? fecha.toISOString() : null;
}

function presentarAlertaINA(doc) {
    const datos = doc.datosFuente ?? {};
    const estacion = datos.estacion ?? {};
    const medicion = datos.medicion ?? {};
    const nombre = typeof estacion.nombre === 'string' ? estacion.nombre.trim() : '';
    const rio = typeof estacion.rio === 'string' ? estacion.rio.trim() : '';
    const tituloTecnico = /[a-z][A-Z]{2,}$/.test(nombre);
    const titulo = tituloTecnico
        ? (/[a-záéíóúñ]/i.test(rio) ? `Estación del río ${rio}` : 'Estación hidrológica INA')
        : (nombre || doc.titulo || 'Estación hidrológica INA');
    const textosTendencia = { crece: 'La altura registrada está en aumento.', baja: 'La altura registrada está en descenso.', permanece: 'La altura registrada se mantiene estable.' };
    const estado = datos.estadoFuente?.estado;
    const tendencia = textosTendencia[medicion.tendencia];
    const descripcionEstado = ['alerta', 'evacuación', 'evacuacion'].includes(String(estado ?? '').toLowerCase())
        ? `Estado informado por INA: ${estado}.` : '';
    const descripcion = [tendencia, descripcionEstado].filter(Boolean).join(' ') ||
        (estado ? `Estado informado por INA: ${estado}.` : 'El INA registró una medición de altura en esta estación; no hay una tendencia interpretable disponible.');
    const lectura = Number.isFinite(medicion.valor) ? ` Medición: ${medicion.valor} ${medicion.unidad || 'm'}.` : '';
    return { titulo, descripcion: `${descripcion}${lectura}`.trim() };
}

function textoPreview(texto, limite = 180) {
    const limpio = String(texto ?? '').trim().replace(/\s+/g, ' ');
    return limpio.length > limite ? `${limpio.slice(0, limite - 1).trimEnd()}…` : limpio;
}

function construirDetalle(doc) {
    const datos = doc.datosFuente ?? {};
    if (doc.fuente === 'INA') {
        return {
            estacion: datos.estacion ?? null,
            medicion: datos.medicion ?? null,
            estadoFuente: datos.estadoFuente ?? null,
            umbrales: datos.umbrales ?? null,
            serieTemporal: datos.serieTemporal ?? [],
            clasificacion: datos.clasificacion ?? null
        };
    }
    if (doc.fuente === 'INPRES') return { ...datos };
    if (doc.fuente === 'SMN') return {
        estadoFuente: doc.estadoFuente ?? null,
        tipoMensaje: doc.tipoMensaje ?? null,
        referencias: doc.referencias ?? null,
        datosFuente: datos
    };
    return {};
}

function mapearAlerta(doc, ahora = new Date()) {
    if (doc.fuente === 'SMN' && doc.fechaFin instanceof Date && doc.fechaFin < ahora) return null;
    let ubicacion = null;
    if (doc.geometria) {
        try { ubicacion = obtenerPuntoRepresentativo(doc.geometria); }
        catch (error) { console.warn(JSON.stringify({ nivel: 'warn', evento: 'geometria_no_presentable', id: String(doc._id), mensaje: error.message })); }
    }
    if (!ubicacion && Number.isFinite(doc.ubicacion?.latitud) && Number.isFinite(doc.ubicacion?.longitud)) {
        ubicacion = { latitud: doc.ubicacion.latitud, longitud: doc.ubicacion.longitud };
    }
    if (ubicacion && (ubicacion.latitud < -90 || ubicacion.latitud > 90 || ubicacion.longitud < -180 || ubicacion.longitud > 180)) ubicacion = null;

    const presentacion = doc.fuente === 'INA'
        ? presentarAlertaINA(doc)
        : { titulo: doc.titulo || 'Alerta sin título', descripcion: doc.descripcion ?? '' };
    const nivel = doc.nivel ?? 'desconocido';
    const completa = String(presentacion.descripcion ?? '').trim();
    const naturaleza = doc.naturaleza ?? (doc.fuente === 'SMN' ? 'alerta' : 'observacion');
    return {
        id: doc._id.toString(), titulo: presentacion.titulo,
        tipo: doc.tipo ?? 'observacion', naturaleza,
        nivel, origen: doc.origen ?? 'oficial',
        ...presentarClasificacion(nivel, naturaleza),
        descripcion: textoPreview(completa), descripcionPreview: textoPreview(completa), descripcionCompleta: completa,
        fechaInicio: fechaISOValida(doc.fechaInicio), fechaFin: fechaISOValida(doc.fechaFin),
        estadoFuente: doc.estadoFuente ?? null,
        ubicacion, geometria: doc.geometria ?? null,
        detalle: construirDetalle(doc),
        ...(doc.fuente ? { fuente: doc.fuente } : {})
    };
}

exports.listarAlertas = async () => {
    const docs = await alertaRepository.obtenerTodas();
    return docs.map(doc => mapearAlerta(doc)).filter(Boolean);
};
exports._mapearAlerta = mapearAlerta;
exports._textoPreview = textoPreview;
