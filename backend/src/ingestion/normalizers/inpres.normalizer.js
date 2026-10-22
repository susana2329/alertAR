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
    if (valor == null || typeof valor === 'object') return null;

    const resultado = String(valor).trim();
    return resultado || null;
}

function numero(valor) {
    if (valor == null || valor === '') return null;

    const resultado = Number(valor);
    return Number.isFinite(resultado) ? resultado : null;
}

function normalizarINPRES(xml, registrarError = () => {}) {
    const validacion = XMLValidator.validate(xml);
    if (validacion !== true) {
        throw new Error('El XML del INPRES es inválido');
    }

    const documento = parser.parse(xml);
    if (!documento.lista) {
        throw new Error('El XML del INPRES no contiene lista');
    }

    const reportarError = typeof registrarError === 'function' ? registrarError : () => {};
    return comoArray(documento.lista.item).flatMap((item, indice) => {
        let identificador;
        try {
            identificador = texto(item?.idSismo);
            if (!identificador) throw new Error('Evento sísmico sin idSismo');

            const coincidencia = identificador.match(
                /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/
            );
            if (!coincidencia) throw new Error(`idSismo inválido: ${identificador}`);

            const [, anio, mes, dia, horaId, minutoId, segundoId] = coincidencia;
            const latitud = numero(item.latitud);
            const longitud = numero(item.longitud);
            const ubicacion =
                latitud !== null && longitud !== null &&
                latitud >= -90 && latitud <= 90 &&
                longitud >= -180 && longitud <= 180
                    ? { type: 'Point', coordinates: [longitud, latitud] }
                    : null;

            const horaLocal = texto(item.hora);
            const fechaFuente = texto(item.fecha);
            const fechaHoraFuente = fechaFuente && horaLocal
                ? `${anio}-${mes}-${dia}T${horaLocal}:00`
                : null;
            const fechaHoraIdentificador = `${anio}-${mes}-${dia}T${horaId}:${minutoId}:${segundoId}`;
            const fechaInicio = new Date(`${fechaHoraIdentificador}Z`);
            if (Number.isNaN(fechaInicio.getTime()) || fechaInicio.toISOString().slice(0, 19) !== fechaHoraIdentificador) {
                throw new Error(`idSismo contiene una fecha u hora inválida: ${identificador}`);
            }

            const enlace = texto(item.link)?.replace(/^['"]|['"]$/g, '') ?? null;
            let urlFuente = null;
            if (enlace) {
                try {
                    urlFuente = new URL(enlace, 'https://www.inpres.gob.ar/').href;
                } catch (error) {
                    reportarError({
                        indice,
                        identificador,
                        campo: 'link',
                        mensaje: `Enlace INPRES inválido: ${error.message}`
                    });
                }
            }

            return [{
                origen: 'oficial',
                fuente: 'INPRES',
                identificador,
                identificadorFuente: identificador,
                claveIdempotencia: `INPRES:${identificador}`,
                titulo: `Sismo ${identificador}`,
                tipo: 'sismo',
                nivel: 'informativo',
                descripcion: texto(item.prov) ? `Sismo en ${texto(item.prov)}` : 'Evento sísmico',
                fechaInicio,
                fechaFin: null,
                geometria: ubicacion,
                datosFuente: {
                    fechaFuente: texto(item.fecha),
                    horaFuente: texto(item.hora),
                    fechaHoraIdentificador,
                    magnitud: numero(item.mg),
                    profundidad: numero(item.prof),
                    provincia: texto(item.prov),
                    urlFuente
                },
                fechaHoraFuente,
                fechaFuente,
                horaFuente: horaLocal,
                fechaHoraIdentificador,
                magnitud: numero(item.mg),
                profundidad: numero(item.prof),
                provincia: texto(item.prov),
                ubicacion,
                urlFuente
            }];
        } catch (error) {
            reportarError({ indice, identificador: identificador ?? null, mensaje: error.message });
            return [];
        }
    });
}

module.exports = { normalizarINPRES };
