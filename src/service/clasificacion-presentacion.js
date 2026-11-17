const PRESENTACION_POR_NIVEL = Object.freeze({
    emergencia: { etiqueta: 'EMERGENCIA', color: 'rojo' },
    advertencia: { etiqueta: 'ALERTA', color: 'naranja' },
    precaucion: { etiqueta: 'PRECAUCIÓN', color: 'amarillo' },
    informativo: { etiqueta: 'INFORMATIVO', color: 'azul' },
    desconocido: { etiqueta: 'DESCONOCIDO', color: 'neutro' }
});

function presentarClasificacion(nivel, naturaleza) {
    const base = PRESENTACION_POR_NIVEL[nivel] ?? PRESENTACION_POR_NIVEL.desconocido;
    if (naturaleza === 'contexto' && nivel !== 'desconocido') return { etiqueta: 'INFORMATIVO', color: 'azul' };
    return { ...base };
}

module.exports = { presentarClasificacion, PRESENTACION_POR_NIVEL };
