const { ANTIGUEDAD_MAXIMA_MS, fechaValida } = require('./ciclo-vida-alerta');

function clasificarSituacionMapaINA({ valor, valorPrecedente, tendencia, estado, umbrales = {}, fechaMedicion, ahora = new Date() }) {
    const estadoNormalizado = typeof estado === 'string' ? estado.trim().toLocaleLowerCase('es') : '';
    const medicion = typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
    const precedente = typeof valorPrecedente === 'number' && Number.isFinite(valorPrecedente) ? valorPrecedente : null;
    const alerta = typeof umbrales.alerta === 'number' && Number.isFinite(umbrales.alerta) && umbrales.alerta > 0
        ? umbrales.alerta : null;
    const evacuacion = typeof umbrales.evacuacion === 'number' && Number.isFinite(umbrales.evacuacion) && umbrales.evacuacion > 0
        ? umbrales.evacuacion : null;
    const umbralesIncoherentes = alerta !== null && evacuacion !== null && alerta > evacuacion;
    const umbralesValidos = umbralesIncoherentes ? { alerta: null, evacuacion: null } : { alerta, evacuacion };
    const fecha = fechaValida(fechaMedicion);
    const edad = fecha ? ahora.getTime() - fecha.getTime() : null;
    const vigente = edad !== null && edad >= 0 && edad <= ANTIGUEDAD_MAXIMA_MS.INA;
    const recienteParaRiesgoPotencial = edad !== null && edad >= 0 && edad < ANTIGUEDAD_MAXIMA_MS.INA;
    const discrepancias = [];

    if (estadoNormalizado === 'evacuación' || estadoNormalizado === 'evacuacion') {
        if (medicion !== null && umbralesValidos.evacuacion !== null && medicion < umbralesValidos.evacuacion) {
            discrepancias.push('estado_evacuacion_bajo_umbral_numerico');
        }
    } else if (estadoNormalizado === 'alerta') {
        if ((medicion !== null && umbralesValidos.alerta !== null && medicion < umbralesValidos.alerta) ||
            (medicion !== null && umbralesValidos.evacuacion !== null && medicion >= umbralesValidos.evacuacion)) {
            discrepancias.push('estado_alerta_no_coincide_con_medicion');
        }
    }
    if (umbralesIncoherentes) discrepancias.push('umbrales_alerta_evacuacion_incoherentes');

    let situacionMapa = null;
    let regla = 'datos_insuficientes';
    if (estadoNormalizado === 'evacuación' || estadoNormalizado === 'evacuacion') {
        situacionMapa = 'emergencia';
        regla = 'estado_explicito_ina';
    } else if (medicion !== null && umbralesValidos.evacuacion !== null && medicion >= umbralesValidos.evacuacion) {
        situacionMapa = 'emergencia';
        regla = 'medicion_supera_evacuacion';
    } else if (estadoNormalizado === 'alerta') {
        situacionMapa = 'advertencia';
        regla = 'estado_explicito_ina';
    } else if (medicion !== null && umbralesValidos.alerta !== null && medicion >= umbralesValidos.alerta) {
        situacionMapa = 'advertencia';
        regla = 'medicion_supera_alerta';
    } else if (recienteParaRiesgoPotencial && tendencia === 'crece' && medicion !== null && precedente !== null && medicion > precedente) {
        const incremento = medicion - precedente;
        const proximos = [umbralesValidos.alerta, umbralesValidos.evacuacion]
            .filter(umbral => umbral !== null && umbral > medicion)
            .sort((a, b) => a - b);
        const umbralProximo = proximos[0];
        if (umbralProximo !== undefined && umbralProximo - medicion <= incremento) {
            situacionMapa = 'riesgo_potencial';
            regla = 'proximidad_por_incremento_observado';
        }
    }

    if (!vigente) {
        return { situacionMapa: null, regla: fecha ? 'medicion_desactualizada' : 'fecha_medicion_invalida', discrepancias,
            vigente: false, edadMs: edad };
    }
    return { situacionMapa, regla, discrepancias, vigente: true, edadMs: edad };
}

module.exports = { clasificarSituacionMapaINA };
