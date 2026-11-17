const mochilaRepository = require('../repository/mochila.repository');
const {mochilagetRepository} = require('../repository/mochila.repository')
exports.guardarMochila = async (userId, tipoMochila, itemsCompletados, cantidadFamilia) => {
    return await mochilaRepository.actualizarProgresoMochila(userId, tipoMochila, itemsCompletados, cantidadFamilia);
};

exports.mochilagetservice  = async (userId)=> { 
    return await mochilagetRepository(userId)
}
