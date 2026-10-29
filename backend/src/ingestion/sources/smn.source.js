
const SMN_URL = 'https://ssl.smn.gob.ar/CAP/AR.php';
const { XMLParser, XMLValidator } = require('fast-xml-parser');

const parserIndice = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
    parseTagValue: false,
    trimValues: true
});

async function obtenerTexto(url, timeoutMs = 45000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'AlertAR/1.0 (integracion academica)',
                Accept: 'application/xml, text/xml, */*'
            }
        });

        if (!response.ok) {
            throw new Error(`El SMN respondió HTTP ${response.status}`);
        }

        return await response.text();
    } finally {
        clearTimeout(timeout);
    }
}

async function obtenerDocumentoSMN() {
    const xml = await obtenerTexto(SMN_URL);

    if (!xml.trim() || !xml.includes('<')) {
        throw new Error('El endpoint del SMN devolvió una respuesta vacía o inválida');
    }

    return xml;
}

function comoArray(valor) {
    if (valor == null) return [];
    return Array.isArray(valor) ? valor : [valor];
}

function extraerEnlacesCAP(xml) {
    const validacion = XMLValidator.validate(xml);
    if (validacion !== true) throw new Error('El índice XML del SMN es inválido');

    const indice = parserIndice.parse(xml);
    const items = comoArray(indice?.rss?.channel?.item);
    const enlaces = new Set();

    for (const item of items) {
        for (const valor of [...comoArray(item?.link), ...comoArray(item?.guid)]) {
            const texto = typeof valor === 'object' ? valor['#text'] : valor;
            if (typeof texto !== 'string' || !texto.trim()) continue;

            try {
                const url = new URL(texto.trim(), SMN_URL);
                if (url.protocol !== 'https:' || url.host !== 'ssl.smn.gob.ar') continue;
                if (!/^\/feeds\/CAP\/(?:xml_generados|avisocortoplazo)\//.test(url.pathname)) continue;
                if (!url.pathname.endsWith('.xml')) continue;
                enlaces.add(url.href);
            } catch {
                continue;
            }
        }
    }

    return [...enlaces];
}

module.exports = {
    obtenerTexto,
    obtenerDocumentoSMN,
    extraerEnlacesCAP
};
