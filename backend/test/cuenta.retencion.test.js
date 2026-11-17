const test = require('node:test');
const assert = require('node:assert/strict');
const { eliminarCuenta } = require('../src/service/cuenta.service');

test('al eliminar una cuenta primero retira sus reportes y anonimiza votos, y recién después elimina el usuario', async () => {
  const orden = [];
  const resultado = await eliminarCuenta('usuario-1', {
    repositorio: {
      listarReportesDeUsuario: async () => [{ _id: 'reporte-1' }, { _id: 'reporte-2' }],
      anonimizarVotosDeUsuario: async () => { orden.push('anonimizar'); },
      anonimizarModeracionesDeUsuario: async () => { orden.push('moderaciones'); },
      deleteUsuarioById: async () => { orden.push('usuario'); return { _id: 'usuario-1' }; }
    },
    eliminarReporte: async id => { orden.push(id); }
  });
  assert.deepEqual(orden, ['reporte-1', 'reporte-2', 'anonimizar', 'moderaciones', 'usuario']);
  assert.equal(resultado._id, 'usuario-1');
});

test('si falla la limpieza de un reporte la cuenta se conserva para reintentar', async () => {
  let usuarioBorrado = false;
  await assert.rejects(eliminarCuenta('usuario-1', {
    repositorio: {
      listarReportesDeUsuario: async () => [{ _id: 'reporte-1' }],
      anonimizarVotosDeUsuario: assert.fail,
      deleteUsuarioById: async () => { usuarioBorrado = true; }
    },
    eliminarReporte: async () => { throw new Error('fallo'); }
  }));
  assert.equal(usuarioBorrado, false);
});
