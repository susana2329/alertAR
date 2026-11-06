const test = require('node:test');
const assert = require('node:assert/strict');
const { modoDesdeArgumentos } = require('../scripts/migrar-ina-estaciones');

test('la migración INA inicia en dry-run y separa fases', () => {
    assert.equal(modoDesdeArgumentos([]), 'dry-run');
    assert.equal(modoDesdeArgumentos(['--copy']), 'copy');
    assert.equal(modoDesdeArgumentos(['--delete-verified']), 'delete-verified');
    assert.throws(() => modoDesdeArgumentos(['--copy', '--delete-verified']), /una sola fase/);
    assert.throws(() => modoDesdeArgumentos(['--archive']), /Argumento no reconocido/);
});
