const ANTIGUEDAD_MAXIMA_MS = Object.freeze({
    SMN: 24 * 60 * 60 * 1000,
    INA: 24 * 60 * 60 * 1000,
    INPRES: 7 * 24 * 60 * 60 * 1000
});

function fechaValida(valor) {
    const fecha = valor instanceof Date ? valor : valor ? new Date(valor) : null;
    return fecha && Number.isFinite(fecha.getTime()) ? fecha : null;
}

function estadoCicloVida(alerta, ahora = new Date()) {
    if (alerta?.origen !== 'oficial' || !Object.hasOwn(ANTIGUEDAD_MAXIMA_MS, alerta.fuente)) return 'no-aplica';
    // INA observations are station state. Staleness is exposed independently;
    // retention is governed by a newer observation, not by a time-to-live.
    if (alerta.fuente === 'INA') return 'operativa';
    const fin = fechaValida(alerta.fechaFin);
    if (alerta.fuente === 'SMN' && fin && fin < ahora) return 'historica';

    const inicio = fechaValida(alerta.fechaInicio);
    if (!inicio) return 'indeterminada';
    if (inicio > ahora) return 'operativa';
    if (alerta.fuente === 'SMN' && fin) return 'operativa';
    return ahora.getTime() - inicio.getTime() > ANTIGUEDAD_MAXIMA_MS[alerta.fuente]
        ? 'historica' : 'operativa';
}

function filtroArchivables(ahora = new Date(), fuente) {
    const fuentes = fuente ? [fuente] : Object.keys(ANTIGUEDAD_MAXIMA_MS);
    const corte = fuenteTipo => new Date(ahora.getTime() - ANTIGUEDAD_MAXIMA_MS[fuenteTipo]);
    const ramas = [];
    if (fuentes.includes('SMN')) {
        ramas.push({ fuente: 'SMN', fechaFin: { $type: 'date', $lt: ahora } });
        ramas.push({ fuente: 'SMN', fechaFin: null, fechaInicio: { $type: 'date', $lt: corte('SMN') } });
    }
    for (const origen of ['INPRES']) {
        if (fuentes.includes(origen)) ramas.push({
            fuente: origen,
            fechaInicio: { $type: 'date', $lt: corte(origen) }
        });
    }
    // A caller that explicitly asks about INA gets an always-empty safe filter.
    if (!ramas.length) return { origen: 'oficial', _id: { $exists: false } };
    return { origen: 'oficial', $or: ramas };
}

module.exports = { ANTIGUEDAD_MAXIMA_MS, fechaValida, estadoCicloVida, filtroArchivables };
