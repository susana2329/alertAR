
const pointOnFeature = require('@turf/point-on-feature').default;
const booleanPointInPolygon =
    require('@turf/boolean-point-in-polygon').default;

function obtenerPuntoRepresentativo(geometria) {
    if (!geometria) {
        throw new Error('La alerta no tiene geometría');
    }

    if (geometria.type === 'Point') {
        const [longitud, latitud] = geometria.coordinates;

        if (
            !Number.isFinite(longitud) ||
            !Number.isFinite(latitud) ||
            longitud < -180 ||
            longitud > 180 ||
            latitud < -90 ||
            latitud > 90
        ) {
            throw new Error('La geometría Point tiene coordenadas inválidas');
        }

        return { latitud, longitud };
    }

    if (geometria.type !== 'Polygon') {
        throw new Error(`Geometría no soportada: ${geometria.type}`);
    }

    const feature = {
        type: 'Feature',
        properties: {},
        geometry: geometria
    };

    const punto = pointOnFeature(feature);
    const [longitud, latitud] = punto.geometry.coordinates;

    if (!booleanPointInPolygon(punto, feature)) {
        throw new Error('No se pudo obtener un punto dentro del polígono');
    }

    return { latitud, longitud };
}

module.exports = { obtenerPuntoRepresentativo };
