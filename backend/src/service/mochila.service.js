const mochilaRepository = require('../repository/mochila.repository');

const guardarMochila = async (userId, tipoMochila, itemsCompletados) => {
    return await mochilaRepository.actualizarProgresoMochila(userId, tipoMochila, itemsCompletados);
};

module.exports = { guardarMochila };