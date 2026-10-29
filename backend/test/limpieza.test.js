const test = require('node:test');
const assert = require('node:assert/strict');
const { ejecutar } = require('../scripts/limpiar-smn-vencidas');

test('limpieza simula candidatos, informa ids/motivo y nunca llama deleteMany', async () => {
    const ahora = new Date('2026-10-22T00:00:00Z');
    let filtroRecibido;
    let borrado = false;
    const modelo = {
        find(filtro) {
            filtroRecibido = filtro;
            return { select() { return this; }, sort() { return this; }, async lean() {
                return [{ _id: 'smn-1', fuente: 'SMN', tipoMensaje: 'Alert', estadoFuente: 'Actual', fechaFin: new Date('2026-10-21T00:00:00Z'), titulo: 'Fin de alerta' }];
            } };
        },
        async deleteMany() { borrado = true; throw new Error('no debe borrar en simulación'); }
    };
    let linea;
    const resultado = await ejecutar({ modelo, ahora, salida: valor => { linea = valor; } });
    const reporte = JSON.parse(linea);
    assert.equal(resultado.cantidadCandidata, 1);
    assert.equal(resultado.cantidadEliminada, 0);
    assert.equal(reporte.candidatos[0].id, 'smn-1');
    assert.match(reporte.candidatos[0].motivo, /vencida/);
    assert.equal(filtroRecibido.fuente, 'SMN');
    assert.equal(filtroRecibido.origen, 'oficial');
    assert.equal(borrado, false);
});
