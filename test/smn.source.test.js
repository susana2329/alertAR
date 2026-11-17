const test = require('node:test');
const assert = require('node:assert/strict');
const { extraerEnlacesCAP } = require('../src/ingestion/sources/smn.source');

test('extrae y deduplica enlaces CAP válidos, resolviendo referencias relativas', () => {
    const xml = `<rss><channel>
      <item><link>../feeds/CAP/xml_generados/uno.xml</link></item>
      <item><link>https://ssl.smn.gob.ar/feeds/CAP/xml_generados/dos.xml</link></item>
      <item><link>https://ssl.smn.gob.ar/feeds/CAP/xml_generados/uno.xml</link></item>
      <item><link>https://evil.example/feeds/CAP/xml_generados/afuera.xml</link></item>
      <item><link>http://ssl.smn.gob.ar/feeds/CAP/xml_generados/http.xml</link></item>
      <item><link>https://ssl.smn.gob.ar/feeds/CAP/otros/no.xml</link></item>
      <item><link>https://ssl.smn.gob.ar/feeds/CAP/xml_generados/sin-extension</link></item>
      <item><link>https://ssl.smn.gob.ar/feeds/CAP/avisocortoplazo/aviso.xml</link></item>
    </channel></rss>`;
    assert.deepEqual(extraerEnlacesCAP(xml), [
        'https://ssl.smn.gob.ar/feeds/CAP/xml_generados/uno.xml',
        'https://ssl.smn.gob.ar/feeds/CAP/xml_generados/dos.xml'
        ,'https://ssl.smn.gob.ar/feeds/CAP/avisocortoplazo/aviso.xml'
    ]);
});

test('distingue un índice XML válido sin enlaces de un índice mal formado', () => {
    assert.deepEqual(extraerEnlacesCAP('<rss><channel><item><title>Sin CAP</title></item></channel></rss>'), []);
    assert.throws(() => extraerEnlacesCAP('<rss><channel>'), /índice XML del SMN es inválido/);
});
