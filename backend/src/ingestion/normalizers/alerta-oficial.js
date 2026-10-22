function geometriaValida(geometria) {
    if (!geometria || !['Point', 'Polygon'].includes(geometria.type)) return false;
    const c = geometria.coordinates;
    if (geometria.type === 'Point') {
        return Array.isArray(c) && c.length === 2 &&
            Number.isFinite(c[0]) && c[0] >= -180 && c[0] <= 180 &&
            Number.isFinite(c[1]) && c[1] >= -90 && c[1] <= 90;
    }
    return Array.isArray(c) && c.length > 0 && c.every(anillo =>
        Array.isArray(anillo) && anillo.length >= 4 &&
        anillo.every(p => Array.isArray(p) && p.length === 2 &&
            Number.isFinite(p[0]) && p[0] >= -180 && p[0] <= 180 &&
            Number.isFinite(p[1]) && p[1] >= -90 && p[1] <= 90) &&
        JSON.stringify(anillo[0]) === JSON.stringify(anillo[anillo.length - 1])
    );
}

function claveCAP({ emisor, identificadorFuente, geometria }) {
    return `SMN:${emisor || ''}:${identificadorFuente}:${JSON.stringify(geometria)}`;
}

function validarAlertaOficial(alerta) {
    if (!alerta || alerta.origen !== 'oficial' ||
        !['SMN', 'INA', 'INPRES'].includes(alerta.fuente)) {
        throw new Error('La alerta oficial no tiene una fuente/origen admitidos');
    }
    if (!alerta.identificadorFuente || !alerta.claveIdempotencia) {
        throw new Error('La alerta oficial requiere identificador y clave de idempotencia');
    }
    if (!(alerta.fechaInicio instanceof Date) || Number.isNaN(alerta.fechaInicio.getTime())) {
        throw new Error('La alerta oficial requiere una fecha de inicio válida');
    }
    if (alerta.fechaFin != null && (!(alerta.fechaFin instanceof Date) || Number.isNaN(alerta.fechaFin.getTime()))) {
        throw new Error('La alerta oficial tiene una fecha de fin inválida');
    }
    const cancelCAP = alerta.fuente === 'SMN' && alerta.tipoMensaje === 'Cancel';
    if (!cancelCAP && !geometriaValida(alerta.geometria)) {
        throw new Error('La alerta oficial tiene una geometría GeoJSON inválida');
    }
    if (!cancelCAP && alerta.fuente === 'SMN' && alerta.geometria.type !== 'Polygon') {
        throw new Error('Cada alerta CAP debe tener una geometría Polygon');
    }
    return alerta;
}

module.exports = { claveCAP, geometriaValida, validarAlertaOficial };
