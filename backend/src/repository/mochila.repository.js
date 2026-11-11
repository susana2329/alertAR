const Mochila = require('./models/mochila');

exports.actualizarProgresoMochila = async (userId, tipoMochila, itemsCompletados) => {
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

exports.mochilagetRepository = async (userId)=>{
    try{ 
        console.log(userId)
        const result = await Mochila.find({usuarioId:userId})
        console.log( result)
        return result
    }
    catch(error){ 
        throw new Error('No hay una mochila con ese id')
    }
}