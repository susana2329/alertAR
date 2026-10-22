const INA_URL =
    'https://alerta.ina.gob.ar/geoserver/public2/ows' +
    '?service=WFS' +
    '&version=2.0.0' +
    '&request=GetFeature' +
    '&typeNames=public2:ultimas_alturas_con_timeseries' +
    '&outputFormat=application/json' +
    '&count=500';

async function obtenerObservacionesINA(timeoutMs = 20000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(INA_URL, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'AlertAR/1.0 (integracion academica)',
                Accept: 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`INA respondió HTTP ${response.status}`);
        }

        const datos = await response.json();

        if (datos.type !== 'FeatureCollection' ||
            !Array.isArray(datos.features)) {
            throw new Error('INA devolvió un GeoJSON inválido');
        }

        return datos;
    } finally {
        clearTimeout(timeout);
    }
}

module.exports = { obtenerObservacionesINA };