const test = require('node:test');
const assert = require('node:assert/strict');
const { ejecutar } = require('../scripts/limpiar-smn-vencidas');

test('el comando de limpieza en modo simulación solo informa y no archiva ni elimina', async () => {
    let opciones;
    let linea;
    const resultado = await ejecutar({
        ahora: new Date('2026-10-22T00:00:00Z'),
        archivador: async args => { opciones = args; return { modo: args.modo, candidatos: 2, migrados: 0, eliminados: 0 }; },
        salida: valor => { linea = valor; }
    });
    assert.equal(opciones.modo, 'dry-run');
    assert.deepEqual(opciones.fuentes, ['SMN']);
    assert.equal(resultado.eliminados, 0);
    assert.equal(JSON.parse(linea).candidatos, 2);
});

test('el comando legado con ejecución archiva y verifica antes de retirar alertas SMN de operativas', async () => {
    let opciones;
    const resultado = await ejecutar({
        execute: true,
        archivador: async args => { opciones = args; return { modo: args.modo, migrados: 1, verificados: 1, eliminados: 1 }; },
        salida: () => undefined
    });
    assert.equal(opciones.modo, 'archive');
    assert.equal(resultado.migrados, 1);
    assert.equal(resultado.eliminados, 1);
});
