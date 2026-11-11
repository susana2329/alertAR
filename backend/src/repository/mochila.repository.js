const Mochila = require('./models/mochila');

const actualizarProgresoMochila = async (userId, tipoMochila, itemsCompletados) => {
    try {
        const campoUpdate = { [tipoMochila]: itemsCompletados };
        
        const mochilaActualizada = await Mochila.findOneAndUpdate(
            { usuarioId: userId }, 
            { $set: campoUpdate },
            { new: true, upsert: true } 
        );
        return mochilaActualizada;
    } catch (error) {
        throw new Error('Error al actualizar la mochila en BD');
    }
};

module.exports = { actualizarProgresoMochila };