const test = require('node:test');
const assert = require('node:assert/strict');
const alertaService = require('../src/service/alerta.service');
const inicioService = require('../src/service/inicio.service');

const listarOriginal = alertaService.listarAlertas;
const candidatasOriginal = alertaService.listarCandidatasInicio;
test.afterEach(() => {
    alertaService.listarAlertas = listarOriginal;
    alertaService.listarCandidatasInicio = candidatasOriginal;
});

const ahora = new Date('2026-11-05T12:00:00.000Z');
function alerta(overrides = {}) {
    return {
        id: 'a1', titulo: 'Evento', tipo: 'meteorologica', nivel: 'advertencia', origen: 'oficial',
        naturaleza: 'alerta', fuente: 'SMN', descripcion: 'Evento vigente',
        fechaInicio: '2026-11-05T11:00:00.000Z', fechaFin: '2026-11-05T15:00:00.000Z',
        geometria: { type: 'Point', coordinates: [-58.4, -34.6] },
        ubicacion: { latitud: -34.6, longitud: -58.4 },
        ...overrides
    };
}

test('destaca una alerta oficial por gravedad y proximidad sin promover observaciones', async () => {
    alertaService.listarCandidatasInicio = async () => [
        alerta({ id: 'observacion', fuente: 'INPRES', tipo: 'sismo', naturaleza: 'observacion', nivel: 'informativo', fechaFin: null }),
        alerta({ id: 'riesgo-cercano', nivel: 'precaucion', fechaFin: null }),
        alerta({ id: 'riesgo-grave', nivel: 'emergencia', ubicacion: { latitud: -34.65, longitud: -58.45 }, geometria: { type: 'Point', coordinates: [-58.45, -34.65] } })
    ];

    const resultado = await inicioService.obtenerInicio({ latitud: -34.6, longitud: -58.4 }, ahora);

    assert.equal(resultado.destacada.id, 'riesgo-grave');
    assert.equal(resultado.eventos.find(item => item.id === 'observacion').nivel, 'informativo');
    assert.equal(resultado.eventos.find(item => item.id === 'observacion').naturaleza, 'observacion');
    assert.notEqual(resultado.destacada.id, 'observacion');
});

test('no destaca una alerta fuera del área y del entorno inmediato aunque quede dentro del radio informativo', async () => {
    alertaService.listarCandidatasInicio = async () => [alerta({
        id: 'lejana', ubicacion: { latitud: -34.9, longitud: -58.6 }, geometria: { type: 'Point', coordinates: [-58.6, -34.9] }
    })];
    const resultado = await inicioService.obtenerInicio({ latitud: -34.6, longitud: -58.4 }, ahora);
    assert.equal(resultado.destacada, null);
    assert.equal(resultado.eventos.length, 1);
    assert.equal(resultado.estado, 'informacion');
});

test('detecta cobertura del polígono y ordena la alerta que incluye al usuario', async () => {
    alertaService.listarCandidatasInicio = async () => [alerta({
        id: 'cobertura',
        geometria: { type: 'Polygon', coordinates: [[[-58.5, -34.7], [-58.3, -34.7], [-58.3, -34.5], [-58.5, -34.5], [-58.5, -34.7]]] },
        ubicacion: { latitud: -34.6, longitud: -58.4 }
    })];

    const resultado = await inicioService.obtenerInicio({ latitud: -34.6, longitud: -58.4 }, ahora);

    assert.equal(resultado.destacada.dentroDelArea, true);
    assert.equal(resultado.destacada.distanciaKm, 0);
});

test('mide distancia al borde del área cuando el usuario está fuera del polígono', () => {
    const resultado = inicioService.distanciaAUbicacion(
        { latitud: -34.6, longitud: -58.2 },
        alerta({ geometria: { type: 'Polygon', coordinates: [[[-58.5, -34.7], [-58.3, -34.7], [-58.3, -34.5], [-58.5, -34.5], [-58.5, -34.7]]] } })
    );
    assert.equal(resultado.dentroDelArea, false);
    assert.ok(resultado.distanciaKm > 0 && resultado.distanciaKm < 10);
});

test('excluye vencidas, antiguas, sin localización y fuera del radio; no localiza por texto', async () => {
    alertaService.listarCandidatasInicio = async () => [
        alerta({ id: 'vencida', fechaFin: '2026-11-05T10:00:00.000Z' }),
        alerta({ id: 'antigua', fechaInicio: '2026-11-03T10:00:00.000Z', fechaFin: null }),
        alerta({ id: 'sin-geo', ubicacion: null, geometria: null }),
        alerta({ id: 'lejana', ubicacion: { latitud: -37, longitud: -60 }, geometria: { type: 'Point', coordinates: [-60, -37] } })
    ];

    const resultado = await inicioService.obtenerInicio({ latitud: -34.6, longitud: -58.4 }, ahora);

    assert.deepEqual(resultado.eventos, []);
    assert.equal(resultado.destacada, null);
    assert.equal(resultado.estado, 'sin-situaciones-relevantes');
});

test('distancia y puntaje de relevancia son finitos y priorizan la gravedad', () => {
    const usuario = { latitud: -34.6, longitud: -58.4 };
    const distancia = inicioService.distanciaAUbicacion(usuario, alerta());
    assert.equal(distancia.distanciaKm, 0);
    assert.ok(inicioService.puntuar(alerta({ nivel: 'emergencia' }), distancia, ahora) > inicioService.puntuar(alerta({ nivel: 'precaucion' }), distancia, ahora));
});
