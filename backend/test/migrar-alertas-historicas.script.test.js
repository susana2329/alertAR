const test = require('node:test');
const assert = require('node:assert/strict');
const { modoDesdeArgumentos } = require('../scripts/migrar-alertas-historicas');

test('la migración por defecto es simulación no destructiva', () => {
    assert.equal(modoDesdeArgumentos([]), 'dry-run');
});

test('requiere elegir fases separadas para copiar o borrar copias verificadas', () => {
    assert.equal(modoDesdeArgumentos(['--copy']), 'copy');
    assert.equal(modoDesdeArgumentos(['--delete-verified']), 'delete-verified');
    assert.throws(() => modoDesdeArgumentos(['--copy', '--delete-verified']), /Elegí un solo modo/);
    assert.throws(() => modoDesdeArgumentos(['--archive']), /Argumento/);
});
