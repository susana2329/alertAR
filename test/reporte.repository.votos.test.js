const test = require('node:test');
const assert = require('node:assert/strict');
const Reporte = require('../src/repository/model/modelos');
const { votarVecinal } = require('../src/repository/repository.reporte');

test('el voto compila con Mongoose y llega a la actualización atómica del driver', async (t) => {
    let llamadas = 0;
    t.mock.method(Reporte.collection, 'findOneAndUpdate', async (filtro, actualizacion) => {
        llamadas++;
        assert.equal(String(filtro._id), '507f1f77bcf86cd799439011');
        assert.equal(String(filtro.idUser.$ne), '507f191e810c19729de860ea');
        assert.ok(Array.isArray(actualizacion));
        assert.equal(actualizacion[0].$set.votosVecinales.$concatArrays[1][0].respuesta, 'sigue');
        return { _id: filtro._id, estadoVecinal: 'sin_confirmar', votosVecinales: [] };
    });

    const actualizado = await votarVecinal('507f1f77bcf86cd799439011', '507f191e810c19729de860ea', 'sigue');

    assert.equal(llamadas, 1);
    assert.equal(actualizado.estadoVecinal, 'sin_confirmar');
});
