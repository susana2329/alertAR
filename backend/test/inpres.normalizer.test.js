const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizarINPRES } = require('../src/ingestion/normalizers/inpres.normalizer');

function item({
    id = '20261021003000',
    latitud = '-35.2',
    longitud = '-60.4',
    link = 'https://www.inpres.gob.ar/sismo/1'
} = {}) {
    return `<item><idSismo>${id}</idSismo><latitud>${latitud}</latitud><longitud>${longitud}</longitud><fecha>21/10/2026</fecha><hora>00:30</hora><mg>3.2</mg><prof>10</prof><prov>Buenos Aires</prov><link>${link}</link></item>`;
}

function xml(...items) {
    return `<lista>${items.join('')}</lista>`;
}

test('normaliza varios sismos válidos y conserva claves y GeoJSON', () => {
    const alertas = normalizarINPRES(xml(item(), item({ id: '20261021003100', latitud: '-34', longitud: '-61' })));
    assert.equal(alertas.length, 2);
    assert.equal(alertas[0].claveIdempotencia, 'INPRES:20261021003000');
    assert.deepEqual(alertas[0].geometria, { type: 'Point', coordinates: [-60.4, -35.2] });
    assert.equal(alertas[0].datosFuente.urlFuente, 'https://www.inpres.gob.ar/sismo/1');
    assert.equal(alertas[0].naturaleza, 'observacion');
});

test('descarta y registra un idSismo inválido sin perder los sismos vecinos', () => {
    const errores = [];
    const alertas = normalizarINPRES(xml(
        item({ id: '20261021003000' }),
        item({ id: 'id-invalido' }),
        item({ id: '20261021003200' })
    ), error => errores.push(error));
    assert.deepEqual(alertas.map(alerta => alerta.identificadorFuente), ['20261021003000', '20261021003200']);
    assert.deepEqual(errores, [{ indice: 1, identificador: 'id-invalido', mensaje: 'idSismo inválido: id-invalido' }]);
});

test('un enlace mal formado se registra y queda nulo sin abortar el sismo ni el lote', () => {
    const errores = [];
    const alertas = normalizarINPRES(xml(item({ link: 'http://[url-invalida' }), item({ id: '20261021003100' })), error => errores.push(error));
    assert.equal(alertas.length, 2);
    assert.equal(alertas[0].datosFuente.urlFuente, null);
    assert.equal(errores.length, 1);
    assert.equal(errores[0].indice, 0);
    assert.equal(errores[0].identificador, '20261021003000');
    assert.match(errores[0].mensaje, /Enlace INPRES inválido/);
});

test('XML inválido y estructura sin lista siguen fallando explícitamente', () => {
    assert.throws(() => normalizarINPRES('<lista>'), /XML del INPRES es inválido/);
    assert.throws(() => normalizarINPRES('<respuesta/>'), /no contiene lista/);
});

test('coordenadas inválidas no generan una ubicación inventada', () => {
    const [alerta] = normalizarINPRES(xml(item({ latitud: '95', longitud: '200' })));
    assert.equal(alerta.geometria, null);
    assert.equal(alerta.geometria, null);
});
