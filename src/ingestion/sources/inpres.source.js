const INPRES_URL = 'https://www.inpres.gob.ar/mapa/sismos.xml';

async function obtenerSismosINPRES(timeoutMs = 20000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(INPRES_URL, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'AlertAR/1.0 (integracion academica)',
                Accept: 'application/xml, text/xml, */*'
            }
        });

        if (!response.ok) {
            throw new Error(`INPRES respondió HTTP ${response.status}`);
        }

        const xml = await response.text();

        if (!xml.trim() || !xml.includes('<')) {
            throw new Error('INPRES devolvió un XML vacío o inválido');
        }

        return xml;
    } finally {
        clearTimeout(timeout);
    }
}

module.exports = { obtenerSismosINPRES };