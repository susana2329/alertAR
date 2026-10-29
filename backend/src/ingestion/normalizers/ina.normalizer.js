// La capa ultimas_alturas_con_timeseries publica alturas hidrométricas en metros.
// INA documenta que los umbrales de alerta/evacuación son determinados localmente.
function numero(valor) {
    if (valor == null || (typeof valor === 'string' && !valor.trim())) return null;
    if (!['number', 'string'].includes(typeof valor)) return null;
    const resultado = Number(valor);
    return Number.isFinite(resultado) ? resultado : null;
}

function fechaISO(valor) {
    if (typeof valor !== 'string' || !valor.trim()) return null;
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString();
}

function normalizarSerieTemporal(valor) {
    try {
        const serie = typeof valor === 'string' ? JSON.parse(valor) : valor;
        if (!Array.isArray(serie)) return [];
        return serie.flatMap(punto => {
            if (!Array.isArray(punto) || punto.length < 2) return [];
            const fecha = fechaISO(punto[0]);
            const lectura = numero(punto[1]);
            return fecha && lectura !== null ? [{ fecha, valor: lectura, unidad: 'm' }] : [];
        });
    } catch { return []; }
}

function clasificarMedicion({ valor, estado, umbrales }) {
    const estadoNormalizado = typeof estado === 'string'
        ? estado.trim().toLocaleLowerCase('es') : '';
    if (['evacuación', 'evacuacion'].includes(estadoNormalizado)) {
        return { nivel: 'emergencia', naturaleza: 'alerta', regla: 'estado_explicito_ina' };
    }
    if (estadoNormalizado === 'alerta') {
        return { nivel: 'advertencia', naturaleza: 'alerta', regla: 'estado_explicito_ina' };
    }

    const alerta = umbrales.alerta;
    const evacuacion = umbrales.evacuacion;
    // Inferencia conservadora de las muestras: 0 parece representar una referencia no establecida.
    // Como la metadata no define el centinela, no se usa 0 para elevar gravedad.
    const tieneAlerta = alerta !== null && alerta > 0;
    const tieneEvacuacion = evacuacion !== null && evacuacion > 0;
    if (tieneAlerta && tieneEvacuacion && alerta > evacuacion) {
        return { nivel: 'desconocido', naturaleza: 'observacion', regla: 'umbrales_incoherentes' };
    }
    if (valor !== null && tieneEvacuacion && valor >= evacuacion) {
        return { nivel: 'emergencia', naturaleza: 'alerta', regla: 'medicion_supera_evacuacion' };
    }
    if (valor !== null && tieneAlerta && valor >= alerta) {
        return { nivel: 'advertencia', naturaleza: 'alerta', regla: 'medicion_supera_alerta' };
    }
    const aguasBajas = umbrales.aguasBajas;
    if (valor !== null && aguasBajas !== null && aguasBajas > 0 && valor <= aguasBajas) {
        return { nivel: 'informativo', naturaleza: 'observacion', regla: 'medicion_bajo_referencia_aguas_bajas' };
    }
    if (valor !== null && (tieneAlerta || tieneEvacuacion) &&
        (!tieneAlerta || valor < alerta) && (!tieneEvacuacion || valor < evacuacion)) {
        return { nivel: 'informativo', naturaleza: 'observacion', regla: 'medicion_bajo_umbrales' };
    }
    if (estadoNormalizado === 'normal') {
        return { nivel: 'informativo', naturaleza: 'observacion', regla: 'estado_explicito_ina' };
    }
    return { nivel: 'desconocido', naturaleza: 'observacion', regla: 'datos_insuficientes' };
}

function normalizarINA(documento, registrarError = () => {}) {
    if (documento?.type !== 'FeatureCollection' || !Array.isArray(documento.features)) {
        throw new Error('La respuesta del INA no es un FeatureCollection válido');
    }
    if (documento.features.length === 0) return [];
    const reportarError = typeof registrarError === 'function' ? registrarError : () => {};

    return documento.features.flatMap((feature, indice) => {
        try {
            if (!feature || typeof feature !== 'object') throw new Error('Feature inválido');
            const p = feature.properties && typeof feature.properties === 'object' ? feature.properties : {};
            const identificador = p.unid ?? p.series_id ?? feature.id;
            if (identificador == null || String(identificador).trim() === '') throw new Error('Observación del INA sin identificador');
            const fecha = fechaISO(p.fecha);
            if (!fecha) throw new Error('Observación del INA sin fecha válida');

            const c = feature.geometry?.coordinates;
            const geometria = feature.geometry?.type === 'Point' && Array.isArray(c) && c.length >= 2 &&
                ['number', 'string'].includes(typeof c[0]) && ['number', 'string'].includes(typeof c[1]) &&
                String(c[0]).trim() !== '' && String(c[1]).trim() !== '' && Number.isFinite(Number(c[0])) && Number.isFinite(Number(c[1])) &&
                Number(c[0]) >= -180 && Number(c[0]) <= 180 && Number(c[1]) >= -90 && Number(c[1]) <= 90
                ? { type: 'Point', coordinates: [Number(c[0]), Number(c[1])] } : null;
            if (!geometria) reportarError({ indice, identificador: String(identificador), campo: 'geometry', mensaje: 'Geometría Point ausente o inválida; se conserva la observación sin ubicación' });

            const medicion = numero(p.valor);
            const umbrales = {
                alerta: numero(p.nivel_de_alerta), evacuacion: numero(p.nivel_de_evacuacion),
                aguasBajas: numero(p.nivel_de_aguas_bajas)
            };
            const clasificacion = clasificarMedicion({ valor: medicion, estado: p.estado, umbrales });
            const nombre = typeof p.nombre === 'string' && p.nombre.trim() ? p.nombre.trim() : null;
            const rio = typeof p.rio === 'string' && p.rio.trim() ? p.rio.trim() : null;
            const estacion = { unid: numero(p.unid), seriesId: numero(p.series_id), nombre, rio };
            const tendencia = typeof p.tendencia === 'string' ? p.tendencia.trim().toLowerCase() : null;
            return [{
                origen: 'oficial', fuente: 'INA', identificadorFuente: String(identificador),
                claveIdempotencia: `INA:${String(identificador)}:${fecha}`,
                titulo: nombre || rio || `Estación INA ${identificador}`,
                tipo: 'observacion', naturaleza: clasificacion.naturaleza, nivel: clasificacion.nivel,
                descripcion: typeof p.condicion === 'string' && p.condicion.trim() ? p.condicion.trim() : 'Observación hidrológica',
                fechaInicio: new Date(fecha), fechaFin: null, geometria,
                estadoFuente: { estado: p.estado ?? null, codigo: p.est ?? null, condicion: p.condicion ?? null },
                datosFuente: {
                    estacion, medicion: { fecha, valor: medicion, valorPrecedente: numero(p.valor_precedente), tendencia, unidad: 'm' },
                    estadoFuente: { estado: p.estado ?? null, codigo: p.est ?? null, condicion: p.condicion ?? null },
                    umbrales: { ...umbrales, unidad: 'm', fuenteAutoridad: 'autoridades locales de protección civil' },
                    serieTemporal: normalizarSerieTemporal(p.timeseries),
                    clasificacion: { ...clasificacion, criterio: 'comparación de nivel hidrométrico (m) con umbrales positivos publicados por INA' },
                    geometriaOriginal: feature.geometry ?? null,
                    metadatos: { tabla: p.tabla ?? null, ceroIgn: numero(p.cero_ign), varId: numero(p.var_id), percentil: numero(p.percentil), timestart: p.timestart ?? null, timeend: p.timeend ?? null }
                }
            }];
        } catch (error) {
            reportarError({ indice, identificador: feature?.id ?? feature?.properties?.unid ?? null, mensaje: error.message });
            return [];
        }
    });
}

module.exports = { normalizarINA, clasificarMedicion, normalizarSerieTemporal };
