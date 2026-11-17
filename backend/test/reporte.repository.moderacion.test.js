const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Usuario = require('../src/repository/models/UserGoogle');
const Reporte = require('../src/repository/model/modelos');
const { obtenerPendientesModeracion } = require('../src/repository/repository.reporte');

test('la consulta de pendientes resuelve idUser con el modelo Usuario', async (t) => {
    const usuarioId = new mongoose.Types.ObjectId();
    const reporteId = new mongoose.Types.ObjectId();
    const findReportes = Reporte.collection.find;
    const findUsuarios = Usuario.collection.find;
    t.after(() => {
        Reporte.collection.find = findReportes;
        Usuario.collection.find = findUsuarios;
    });

    Reporte.collection.find = (filtro) => {
        assert.equal(filtro.estadoModeracion, 'pendiente');
        return { toArray: async () => [{ _id: reporteId, idUser: usuarioId }] };
    };
    Usuario.collection.find = (filtro) => {
        assert.equal(String(filtro._id.$in[0]), String(usuarioId));
        return { toArray: async () => [{ _id: usuarioId, nombre: 'Ana', apellido: 'Pérez', email: 'ana@example.com' }] };
    };

    const pendientes = await obtenerPendientesModeracion();
    assert.equal(pendientes.length, 1);
    assert.equal(pendientes[0].idUser.nombre, 'Ana');
    assert.equal(String(pendientes[0].idUser._id), String(usuarioId));
});
