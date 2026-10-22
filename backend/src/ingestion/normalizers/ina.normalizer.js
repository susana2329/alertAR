function numero(valor) {
    if (valor == null || valor === "") return null;

    const resultado = Number(valor);
    return Number.isFinite(resultado) ? resultado : null;
}

function fechaISO(valor) {
    if (!valor) return null;

    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString();
}

function normalizarSerieTemporal(valor) {
    if (!valor) return [];

    try {
        const serie = typeof valor === "string"
            ? JSON.parse(valor)
            : valor;

        if (!Array.isArray(serie)) return [];

        return serie
            .filter(punto =>
                Array.isArray(punto) &&
                punto.length >= 2 &&
                fechaISO(punto[0]) !== null &&
                numero(punto[1]) !== null
            )
            .map(([fecha, valor]) => ({
                fecha: fechaISO(fecha),
                valor: numero(valor)
            }));
    } catch {
        return [];
    }
}

function normalizarINA(documento) {
    if (
        documento?.type !== "FeatureCollection" ||
        !Array.isArray(documento.features)
    ) {
        throw new Error("La respuesta del INA no es un FeatureCollection válido");
    }

    return documento.features.map(feature => {
        const p = feature.properties ?? {};
        const coordenadas = feature.geometry?.coordinates;

        const ubicacion =
            feature.geometry?.type === "Point" &&
            Array.isArray(coordenadas) &&
            coordenadas.length >= 2 &&
            coordenadas.every(Number.isFinite) &&
            coordenadas[0] >= -180 &&
            coordenadas[0] <= 180 &&
            coordenadas[1] >= -90 &&
            coordenadas[1] <= 90
                ? {
                    type: "Point",
                    coordinates: [coordenadas[0], coordenadas[1]]
                }
                : null;

        const identificador = p.unid ?? p.series_id ?? feature.id;

        if (identificador == null) {
            throw new Error("Observación del INA sin identificador");
        }

        const fechaMedicion = fechaISO(p.fecha);
        const geometry = ubicacion;
        return {
            origen: 'oficial',
            fuente: "INA",
            identificador: String(identificador),
            identificadorFuente: String(identificador),
            claveIdempotencia: `INA:${String(identificador)}`,
            titulo: p.nombre ?? p.rio ?? `Estación INA ${identificador}`,
            tipo: 'observacion',
            nivel: 'informativo',
            descripcion: p.condicion ?? p.estado ?? 'Observación hidrológica',
            fechaInicio: fechaMedicion ? new Date(fechaMedicion) : null,
            fechaFin: null,
            geometria: geometry,
            datosFuente: {
                estacion: {
                    unid: numero(p.unid), seriesId: numero(p.series_id),
                    nombre: p.nombre ?? null, rio: p.rio ?? null
                },
                medicion: {
                    fecha: fechaMedicion, valor: numero(p.valor),
                    valorPrecedente: numero(p.valor_precedente), tendencia: p.tendencia ?? null
                },
                estadoFuente: { estado: p.estado ?? null, codigo: p.est ?? null, condicion: p.condicion ?? null },
                umbrales: {
                    alerta: numero(p.nivel_de_alerta), evacuacion: numero(p.nivel_de_evacuacion),
                    aguasBajas: numero(p.nivel_de_aguas_bajas)
                },
                serieTemporal: normalizarSerieTemporal(p.timeseries)
            },

            estacion: {
                unid: numero(p.unid),
                seriesId: numero(p.series_id),
                nombre: p.nombre ?? null,
                rio: p.rio ?? null
            },

            medicion: {
                fecha: fechaMedicion,
                valor: numero(p.valor),
                valorPrecedente: numero(p.valor_precedente),
                tendencia: p.tendencia ?? null
            },

            estadoFuente: {
                estado: p.estado ?? null,
                codigo: p.est ?? null,
                condicion: p.condicion ?? null
            },

            umbrales: {
                alerta: numero(p.nivel_de_alerta),
                evacuacion: numero(p.nivel_de_evacuacion),
                aguasBajas: numero(p.nivel_de_aguas_bajas)
            },

            ubicacion,
            serieTemporal: normalizarSerieTemporal(p.timeseries)
        };
    });
}

module.exports = { normalizarINA };
