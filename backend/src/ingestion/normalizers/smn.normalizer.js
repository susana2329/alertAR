const { claveCAP } = require('./alerta-oficial');

function fecha(valor) {
    if (!valor) return null;
    const resultado = new Date(valor);
    return Number.isNaN(resultado.getTime()) ? null : resultado;
}

function normalizarSMN(cap) {
    if (!cap || typeof cap !== "object" || !cap.identifier) {
        throw new Error("Documento CAP sin identifier");
    }

    const informaciones = (cap.info ?? []).map(info => ({
        categorias: info.category ?? [],
        evento: info.event ?? null,
        titulo: info.headline ?? null,
        descripcion: info.description ?? null,
        instruccion: info.instruction ?? null,
        urgenciaOriginal: info.urgency ?? null,
        severidadOriginal: info.severity ?? null,
        certezaOriginal: info.certainty ?? null,
        inicio: info.onset ?? null,
        vencimiento: info.expires ?? null
    }));
    const areas = (cap.areas ?? []).map(area => ({
        descripcion: area.descripcion ?? null,
        geometrías: (area.poligonos ?? []).map(coordenadas => ({
            type: 'Polygon', coordinates: [coordenadas]
        }))
    }));
    const geometrías = areas.flatMap(area => area.geometrías);
    const esCancelacion = cap.msgType === 'Cancel';
    if (!esCancelacion && geometrías.length !== 1) {
        throw new Error(`CAP ${cap.identifier}: se esperaba exactamente un Polygon; se recibieron ${geometrías.length}`);
    }
    const infoPrincipal = informaciones[0] ?? {};
    const fechaInicio = fecha(infoPrincipal.inicio) || fecha(cap.sent);
    const fechaFin = fecha(infoPrincipal.vencimiento);
    const alerta = {
        fuente: 'SMN', origen: 'oficial',
        identificadorFuente: cap.identifier,
        emisor: cap.sender ?? null,
        estadoFuente: cap.status ?? null,
        tipoMensaje: cap.msgType ?? null,
        referencias: cap.references ?? null,
        titulo: infoPrincipal.titulo || infoPrincipal.evento || cap.identifier,
        tipo: 'meteorologica',
        nivel: ({ Extreme: 'emergencia', Severe: 'advertencia', Moderate: 'precaucion', Minor: 'informativo' })[infoPrincipal.severidadOriginal] || 'informativo',
        descripcion: infoPrincipal.descripcion || '',
        fechaInicio,
        fechaFin,
        geometria: geometrías[0] ?? null,
        claveIdempotencia: null,
        datosFuente: {
            fechaEmision: cap.sent ?? null,
            alcance: cap.scope ?? null,
            informaciones,
            areas
        }
    };
    alerta.claveIdempotencia = esCancelacion
        ? `SMN:CANCEL:${alerta.emisor || ''}:${alerta.identificadorFuente}`
        : claveCAP(alerta);
    return {
        ...alerta,
        fuente: "SMN",
        identificador: cap.identifier,
        emisor: cap.sender ?? null,
        fechaEmision: cap.sent ?? null,

        estadoFuente: cap.status ?? null,
        tipoMensaje: cap.msgType ?? null,
        alcance: cap.scope ?? null,
        referencias: cap.references ?? null,

        informaciones,
        areas
    };
}

module.exports = { normalizarSMN };
