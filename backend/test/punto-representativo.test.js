
const test = require('node:test');
const assert = require('node:assert/strict');
const { point } = require('@turf/helpers');
const booleanPointInPolygon =
    require('@turf/boolean-point-in-polygon').default;
const { obtenerPuntoRepresentativo } =
    require('../src/geo/punto-representativo');

function poligono(coordenadas) {
    return { type: 'Polygon', coordinates: coordenadas };
}

test('devuelve las coordenadas de un Point válido', () => {
    assert.deepEqual(
        obtenerPuntoRepresentativo({
            type: 'Point',
            coordinates: [-58.45, -34.65]
        }),
        { latitud: -34.65, longitud: -58.45 }
    );
});

test('obtiene un punto dentro de un polígono irregular', () => {
    const geometria = poligono([[
        [-58.50, -34.70],
        [-58.40, -34.70],
        [-58.43, -34.66],
        [-58.46, -34.62],
        [-58.50, -34.65],
        [-58.50, -34.70]
    ]]);

    const { latitud, longitud } =
        obtenerPuntoRepresentativo(geometria);

    assert.equal(
        booleanPointInPolygon(point([longitud, latitud]), geometria),
        true
    );
});

test('rechaza geometrías ausentes o no soportadas', () => {
    assert.throws(() => obtenerPuntoRepresentativo(null));
    assert.throws(() =>
        obtenerPuntoRepresentativo({
            type: 'LineString',
            coordinates: [[-58.5, -34.7], [-58.4, -34.6]]
        })
    );
});
