const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluarEstadoVecinal } = require('../src/service/consenso-vecinal');
const { votarReporteVecinal } = require('../src/service/reporte.service');

const votos = respuestas => respuestas.map(respuesta => ({ respuesta }));

test('confirma un reporte tras tres vecinos distintos que indican que sigue ahí', () => {
    assert.equal(evaluarEstadoVecinal(votos(['sigue', 'sigue', 'sigue'])), 'confirmado');
});

test('cierra un reporte con tres votos negativos y al menos dos tercios de consenso', () => {
    assert.equal(evaluarEstadoVecinal(votos(['no_esta', 'no_esta', 'no_esta'])), 'cerrado');
    assert.equal(evaluarEstadoVecinal(votos(['no_esta', 'no_esta', 'no_esta', 'sigue'])), 'cerrado');
    assert.equal(evaluarEstadoVecinal(votos(['no_esta', 'no_esta', 'no_esta', 'sigue', 'sigue'])), 'sin_confirmar');
});

test('mantiene el estado actual mientras no se alcanza el consenso', () => {
    assert.equal(evaluarEstadoVecinal(votos(['sigue', 'no_esta']), 'sin_confirmar'), 'sin_confirmar');
    assert.equal(evaluarEstadoVecinal(votos(['sigue', 'sigue', 'no_esta']), 'confirmado'), 'confirmado');
});

test('no permite registrar un voto con respuesta inválida', async () => {
    await assert.rejects(
        votarReporteVecinal('507f1f77bcf86cd799439011', 'usuario-2', 'tal_vez', {
            votar: assert.fail,
            buscar: assert.fail
        }),
        { status: 400 }
    );
});

test('devuelve los contadores actualizados después de votar', async () => {
    const resultado = await votarReporteVecinal('507f1f77bcf86cd799439011', 'usuario-2', 'sigue', {
        votar: async () => ({
            _id: 'reporte-1',
            estadoVecinal: 'sin_confirmar',
            votosVecinales: [{ respuesta: 'sigue' }, { respuesta: 'no_esta' }]
        }),
        buscar: assert.fail
    });

    assert.deepEqual(resultado, {
        id: 'reporte-1',
        estadoVecinal: 'sin_confirmar',
        votosSigue: 1,
        votosNoEsta: 1
    });
});

test('rechaza la respuesta del autor del reporte', async () => {
    await assert.rejects(
        votarReporteVecinal('507f1f77bcf86cd799439011', 'autor-1', 'sigue', {
            votar: async () => null,
            buscar: async () => ({ idUser: 'autor-1', estadoVecinal: 'sin_confirmar', votosVecinales: [] })
        }),
        { status: 403 }
    );
});

test('rechaza una segunda respuesta del mismo vecino', async () => {
    await assert.rejects(
        votarReporteVecinal('507f1f77bcf86cd799439011', 'vecino-1', 'no_esta', {
            votar: async () => null,
            buscar: async () => ({
                idUser: 'autor-1',
                estadoVecinal: 'sin_confirmar',
                votosVecinales: [{ usuario: 'vecino-1', respuesta: 'sigue' }]
            })
        }),
        { status: 409 }
    );
});
