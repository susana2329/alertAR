const test = require('node:test');
const assert = require('node:assert/strict');
const { parsearCAP } = require('../src/ingestion/parsers/cap.parser');
const { normalizarSMN } = require('../src/ingestion/normalizers/smn.normalizer');
const { geometriaValida, validarAlertaOficial } = require('../src/ingestion/normalizers/alerta-oficial');
const { obtenerPuntoRepresentativo } = require('../src/geo/punto-representativo');

test('conserva áreas múltiples, su descripción y la sección info CAP asociada', () => {
    const xml = `<alert><identifier>cap-multi</identifier><sender>smn@example</sender><sent>2026-10-21T00:00:00Z</sent><status>Actual</status><msgType>Alert</msgType><scope>Public</scope>
      <info><event>Tormentas fuertes</event><severity>Severe</severity><onset>2026-10-21T00:00:00Z</onset><expires>2026-10-22T00:00:00Z</expires>
        <area><areaDesc>Zona A</areaDesc><polygon>-35,-60 -35,-59 -34,-59 -35,-60</polygon></area>
        <area><areaDesc>Zona B</areaDesc><polygon>-37,-62 -37,-61 -36,-61 -37,-62</polygon></area>
      </info></alert>`;
    const alerta = normalizarSMN(parsearCAP(xml));
    assert.equal(alerta.geometria.type, 'MultiPolygon');
    assert.equal(alerta.geometria.coordinates.length, 2);
    assert.equal(alerta.datosFuente.areas[0].infoIndex, 0);
    assert.equal(alerta.datosFuente.areas[1].descripcion, 'Zona B');
    assert.equal(geometriaValida(alerta.geometria), true);
    assert.doesNotThrow(() => validarAlertaOficial(alerta));
    assert.ok(obtenerPuntoRepresentativo(alerta.geometria));
});
