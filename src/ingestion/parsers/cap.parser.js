const he = require('he');
const { XMLParser, XMLValidator } = require('fast-xml-parser');

const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
    parseTagValue: false,
    trimValues: true
});

function comoArray(valor) {
    if (valor == null) return [];
    return Array.isArray(valor) ? valor : [valor];
}


function texto(valor) {
    if (valor == null) return null;

    if (typeof valor === 'object') {
        if (valor['#text'] != null) {
            return texto(valor['#text']);
        }

        return null;
    }

const resultado = he.decode(String(valor)).trim();
    return resultado.length > 0 ? resultado : null;
}



function extraerPoligono(valor) {
    const coordenadas = texto(valor);

    if (!coordenadas) return null;

    const puntos = coordenadas.split(/\s+/).map(par =>
        par.split(',').map(Number)
    );

    if (puntos.some(p =>
        p.length !== 2 ||
        !p.every(Number.isFinite) ||
        p[0] < -90 || p[0] > 90 ||
        p[1] < -180 || p[1] > 180
    )) {
        return null;
    }

    const distintos = new Set(
        puntos.map(([lat, lon]) => `${lat},${lon}`)
    );

    if (distintos.size < 3) return null;

    const anillo = puntos.map(([lat, lon]) => [lon, lat]);

    const primero = anillo[0];
    const ultimo = anillo[anillo.length - 1];

    if (
        primero[0] !== ultimo[0] ||
        primero[1] !== ultimo[1]
    ) {
        anillo.push([...primero]);
    }

    return anillo.length >= 4 ? anillo : null;
}


function parsearCAP(xml) {
    const validacion = XMLValidator.validate(xml);

    if (validacion !== true) {
        throw new Error('El documento CAP contiene XML inválido');
    }

    const documento = parser.parse(xml);
    const cap = documento.alert;

    if (!cap || typeof cap !== 'object') {
        throw new Error('El documento no contiene un elemento CAP alert');
    }

    const identifier = texto(cap.identifier);

    if (!identifier) {
        throw new Error('El documento CAP no contiene identifier');
    }

    const infos = comoArray(cap.info);

   const areas = infos.flatMap((info, infoIndex) =>
    comoArray(info.area).map(area => {
        const poligonos = comoArray(area.polygon)
            .map(extraerPoligono)
            .filter(Boolean);

        return {
            infoIndex,
            descripcion: texto(area.areaDesc),
            poligonos
        };
    })
);

    return {
        identifier,
        sender: texto(cap.sender),
        sent: texto(cap.sent),
        status: texto(cap.status),
        msgType: texto(cap.msgType),
        scope: texto(cap.scope),
        references: texto(cap.references),
        info: infos.map(info => ({
            category: comoArray(info.category).map(texto),
            event: texto(info.event),
            urgency: texto(info.urgency),
            severity: texto(info.severity),
            certainty: texto(info.certainty),
            onset: texto(info.onset),
            expires: texto(info.expires),
            headline: texto(info.headline),
            description: texto(info.description),
            instruction: texto(info.instruction)
        })),
        areas
    };
}

module.exports = {
    parsearCAP
};
