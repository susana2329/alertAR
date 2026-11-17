const test = require('node:test');
const assert = require('node:assert/strict');
const servicio = require('../src/service/geocodificacion.service');

test.beforeEach(() => servicio._limpiarCache());

test('prioriza barrio/localidad y agrega la provincia usando solo campos devueltos por Nominatim', () => {
    const lugar = servicio.presentarLugar({ address: { suburb: 'Villa Lugano', city: 'Buenos Aires', state: 'Buenos Aires' } });
    assert.equal(lugar.nombre, 'Villa Lugano, Buenos Aires');
    assert.equal(lugar.localidad, 'Villa Lugano');
    assert.equal(lugar.provincia, 'Buenos Aires');
    assert.equal(lugar.atribucion, '© OpenStreetMap contributors');
    assert.equal(servicio.presentarLugar({ address: {} }).nombre, null);
});

test('redondea coordenadas para cache y reutiliza la respuesta por siete días', async () => {
    let llamadas = 0;
    const fetch = async url => {
        llamadas++;
        assert.equal(url.searchParams.get('lat'), '-34.604');
        assert.equal(url.searchParams.get('lon'), '-58.381');
        return { ok: true, json: async () => ({ address: { city: 'Lanús', state: 'Buenos Aires' } }) };
    };
    const primero = await servicio.obtenerUbicacionLegible({ latitud: -34.6044, longitud: -58.3812 }, { fetch });
    const segundo = await servicio.obtenerUbicacionLegible({ latitud: -34.6043, longitud: -58.3813 }, { fetch: assert.fail });
    assert.equal(primero.nombre, 'Lanús, Buenos Aires');
    assert.deepEqual(segundo, primero);
    assert.equal(llamadas, 1);
});

test('identifica la aplicación y no guarda errores del proveedor en caché', async () => {
    let userAgent;
    await assert.rejects(() => servicio.obtenerUbicacionLegible({ latitud: -34, longitud: -58 }, {
        fetch: async (_url, options) => {
            userAgent = options.headers['User-Agent'];
            return { ok: false, status: 429 };
        }
    }));
    assert.match(userAgent, /^AlertAR\//);
    assert.equal(servicio._cacheSize(), 0);
});
