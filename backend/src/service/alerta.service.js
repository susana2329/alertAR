
const alertaRepository = require('../repository/alerta.repository');
const alertaHistoricaRepository = require('../repository/alerta-historica.repository');
const reporteRepository = require('../repository/repository.reporte');
const { obtenerPuntoRepresentativo } = require('../geo/punto-representativo');
const { presentarClasificacion } = require('./clasificacion-presentacion');
const { clasificarSituacionMapaINA } = require('./ina-situacion-mapa');
const DURACION_CACHE_MAPA_MS = 15 * 1000;
let cacheMapa;
let cargaMapaEnCurso;

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
    if (doc.fuente === 'INA') return {
        estacion: datos.estacion ?? null,
        medicion: datos.medicion ?? null,
        estadoFuente: datos.estadoFuente ?? null,
        umbrales: datos.umbrales ?? null,
        serieTemporal: datos.serieTemporal ?? [],
        clasificacion: datos.clasificacion ?? null
    };
    if (doc.fuente === 'INPRES') return { ...datos };
    if (doc.fuente === 'SMN') return {
        estadoFuente: doc.estadoFuente ?? null,
        tipoMensaje: doc.tipoMensaje ?? null,
        referencias: doc.referencias ?? null,
        datosFuente: datos
    };
    return {};
}

function mapearAlerta(doc, ahora = new Date(), situacionMapa) {
    if (doc.fuente === 'SMN' && doc.fechaFin instanceof Date && doc.fechaFin < ahora) return null;
    let ubicacion = null;
    if (doc.geometria) {
        try {
            ubicacion = obtenerPuntoRepresentativo(doc.geometria);
        } catch (error) {
            console.warn(`No se pudo calcular la ubicación de la alerta ${doc._id}:`, error.message);
        }
    }
    if (!ubicacion && Number.isFinite(doc.ubicacion?.latitud) && Number.isFinite(doc.ubicacion?.longitud)) {
        ubicacion = { latitud: doc.ubicacion.latitud, longitud: doc.ubicacion.longitud };
    }
    if (ubicacion && (ubicacion.latitud < -90 || ubicacion.latitud > 90 || ubicacion.longitud < -180 || ubicacion.longitud > 180)) ubicacion = null;
    const presentacion = doc.fuente === 'INA'
        ? presentarAlertaINA(doc)
        : { titulo: doc.titulo || 'Alerta sin título', descripcion: doc.descripcion ?? '' };
    const nivel = doc.nivel ?? 'desconocido';
    const naturaleza = doc.naturaleza ?? (doc.fuente === 'SMN' ? 'alerta' : 'observacion');
    return {
        id: doc._id.toString(),
        titulo: presentacion.titulo,
        tipo: doc.tipo ?? 'observacion',
        naturaleza,
        nivel,
        origen: doc.origen ?? 'oficial',
        ...presentarClasificacion(nivel, naturaleza),
        descripcion: textoPreview(presentacion.descripcion),
        descripcionPreview: textoPreview(presentacion.descripcion),
        descripcionCompleta: presentacion.descripcion,
        fechaInicio: fechaISOValida(doc.fechaInicio),
        fechaFin: fechaISOValida(doc.fechaFin),
        actualizadoEn: fechaISOValida(doc.updatedAt) || fechaISOValida(doc.createdAt),
        fechaUltimaMedicion: fechaISOValida(doc.fechaUltimaMedicion) || (doc.fuente === 'INA' ? fechaISOValida(doc.fechaInicio) : null),
        estadoActualizacion: doc.fuente === 'INA'
            ? ((doc.fechaUltimaMedicion ?? doc.fechaInicio) instanceof Date &&
                Date.now() - (doc.fechaUltimaMedicion ?? doc.fechaInicio).getTime() > 24 * 60 * 60 * 1000
                ? 'desactualizada' : 'actualizada')
            : (doc.estadoActualizacion ?? null),
        ...(doc.identificadorFuente ? { identificadorFuente: doc.identificadorFuente } : {}),
        estadoFuente: doc.estadoFuente ?? null,
        ubicacion,
        geometria: doc.geometria ?? null,
        detalle: construirDetalle(doc),
        ...(situacionMapa ? { situacionMapa } : {}),
        ...(doc.fuente ? { fuente: doc.fuente } : {})
    };
}

function mapearReporteVecinal(doc) {
    if (doc.geometria?.type !== 'Point' || !Array.isArray(doc.geometria.coordinates) ||
        doc.geometria.coordinates.length !== 2) return null;
    const [longitud, latitud] = doc.geometria.coordinates;
    if (!Number.isFinite(latitud) || !Number.isFinite(longitud) ||
        latitud < -90 || latitud > 90 || longitud < -180 || longitud > 180) return null;
    const votos = doc.votosVecinales ?? [];
    const nombresTipo = {
        inundacion: 'inundación',
        tormenta: 'tormenta',
        crecida: 'crecida',
        temperaturas: 'temperaturas extremas',
        incidente: 'incidente',
        arbol: 'caída de árbol',
        transito: 'calle bloqueada',
        meteorologica: 'situación meteorológica',
        nevada: 'nevada',
        sismo: 'sismo'
    };
    const tieneFotos = Array.isArray(doc.fotos) && doc.fotos.length > 0;
    const estadoModeracion = doc.estadoModeracion || 'aprobado';
    const fotosPendientes = tieneFotos && estadoModeracion === 'pendiente';
    const cantidadFotos = tieneFotos && (doc.estadoModeracion === undefined || estadoModeracion === 'aprobado') ? doc.fotos.length : 0;
    return {
        id: `vecinal-${doc._id}`,
        reporteId: doc._id.toString(),
        titulo: `Reporte vecinal de ${nombresTipo[doc.tipo] ?? 'incidente'}`,
        tipo: doc.tipo,
        nivel: 'informativo',
        naturaleza: 'observacion',
        origen: 'vecinal',
        fuente: 'Vecinos',
        descripcion: doc.descripcion ?? '',
        fechaInicio: fechaISOValida(doc.fecha),
        fechaFin: null,
        ubicacion: { latitud, longitud },
        geometria: doc.geometria,
        estadoVecinal: doc.estadoVecinal ?? 'sin_confirmar',
        estadoModeracion,
        fotosPendientes,
        votosSigue: votos.filter(voto => voto.respuesta === 'sigue').length,
        votosNoEsta: votos.filter(voto => voto.respuesta === 'no_esta').length,
        cantidadFotos
    };
}

exports.listarAlertas = async () => {
    const docs = await alertaRepository.obtenerTodas();
    return docs.map(doc => mapearAlerta(doc)).filter(Boolean);
};

exports.listarAlertasMapa = async () => {
    if (cacheMapa && cacheMapa.expiraEn > Date.now()) return cacheMapa.alertas;
    if (cargaMapaEnCurso) return cargaMapaEnCurso;
    cargaMapaEnCurso = (async () => {
        const [documentos, reportes] = await Promise.all([
            alertaRepository.obtenerParaMapa(),
            reporteRepository.obtenerParaMapa()
        ]);
        const ahora = new Date();
        const oficiales = documentos.flatMap(doc => {
            if (doc.fuente !== 'INA') {
                const alerta = mapearAlerta(doc, ahora);
                return alerta ? [alerta] : [];
            }
            const datos = doc.datosFuente ?? {};
            const clasificacion = clasificarSituacionMapaINA({
                valor: datos.medicion?.valor,
                valorPrecedente: datos.medicion?.valorPrecedente,
                tendencia: datos.medicion?.tendencia,
                estado: datos.estadoFuente?.estado ?? doc.estadoFuente?.estado,
                umbrales: datos.umbrales,
                fechaMedicion: doc.fechaUltimaMedicion ?? datos.medicion?.fecha ?? doc.fechaInicio,
                ahora
            });
            if (!clasificacion.situacionMapa) return [];
            const alerta = mapearAlerta(doc, ahora, clasificacion.situacionMapa);
            return alerta ? [alerta] : [];
        });
        const alertas = [
            ...oficiales,
            ...reportes.map(mapearReporteVecinal).filter(Boolean)
        ];
        cacheMapa = { alertas, expiraEn: Date.now() + DURACION_CACHE_MAPA_MS };
        return alertas;
    })();
    try {
        return await cargaMapaEnCurso;
    } finally {
        cargaMapaEnCurso = undefined;
    }
};

exports.invalidarCacheMapa = () => { cacheMapa = undefined; };

exports.listarCandidatasInicio = async ahora => {
    const [docs, reportes] = await Promise.all([
        alertaRepository.obtenerCandidatasInicio(ahora),
        reporteRepository.obtenerParaMapa().catch(() => [])
    ]);
    const oficiales = docs.flatMap(doc => {
        if (doc.fuente !== 'INA') {
            const alerta = mapearAlerta(doc, ahora);
            return alerta ? [alerta] : [];
        }
        const datos = doc.datosFuente ?? {};
        const clasificacion = clasificarSituacionMapaINA({
            valor: datos.medicion?.valor,
            valorPrecedente: datos.medicion?.valorPrecedente,
            tendencia: datos.medicion?.tendencia,
            estado: datos.estadoFuente?.estado ?? doc.estadoFuente?.estado,
            umbrales: datos.umbrales,
            fechaMedicion: doc.fechaUltimaMedicion ?? datos.medicion?.fecha ?? doc.fechaInicio,
            ahora
        });
        if (!clasificacion.situacionMapa) return [];
        const alerta = mapearAlerta(doc, ahora, clasificacion.situacionMapa);
        return alerta ? [alerta] : [];
    });
    return [
        ...oficiales,
        ...reportes.map(mapearReporteVecinal).filter(Boolean)
    ];
};

exports.obtenerAlerta = async id => {
    const doc = await alertaRepository.obtenerPorId(id) || await alertaHistoricaRepository.obtenerPorId(id);
    return doc ? mapearAlerta(doc) : null;
};

exports._mapearAlerta = mapearAlerta;
exports._mapearReporteVecinal = mapearReporteVecinal;