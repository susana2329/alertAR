const mochilaRepository = require('../repository/mochila.repository');
const {mochilagetRepository} = require('../repository/mochila.repository')
exports.guardarMochila = async (userId, tipoMochila, itemsCompletados) => {
    return await mochilaRepository.actualizarProgresoMochila(userId, tipoMochila, itemsCompletados);
};

exports.mochilagetservice  = async (userId)=> { 
    return await mochilagetRepository(userId)
}
