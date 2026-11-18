const mochilaService = require('../service/mochila.service');
const {mochilagetservice} = require('../service/mochila.service')
const guardarMochila = async (req, res) => {
    try {
        const userId = req.params.id;
        const { tipoMochila, itemsCompletados, cantidadFamilia} = req.body || {};

        if (String(req.usuarioId) !== String(userId)) {
            return res.status(403).json({ mensaje: 'No tenés permiso para modificar esta mochila' });
        }
        if (!['individual', 'familiar', 'mascotas', 'hogar'].includes(tipoMochila) ||
            !Array.isArray(itemsCompletados) ||
            itemsCompletados.some(id => !Number.isSafeInteger(id) || id < 1) ||
            (cantidadFamilia !== undefined && (!Number.isSafeInteger(cantidadFamilia) || cantidadFamilia < 1))) {
            return res.status(400).json({ mensaje: 'Los datos de la mochila no son válidos' });
        }

        const mochilaActualizada = await mochilaService.guardarMochila(userId, tipoMochila, itemsCompletados, cantidadFamilia);
        
        res.status(200).json({ 
            mensaje: 'Progreso guardado correctamente', 
            mochila: mochilaActualizada 
        });
    } catch (error) {
        res.status(500).json({ mensaje: error.message });
    }
};
const getMochilabyid = async (req,res) => { 
    try{
        const iduser = req.usuarioId;
        const result = await mochilagetservice(iduser)
        if(!result){ 
            return res.status(404).json({mensaje:'No se encontro la mochila'})
        }
        return res.status(200).json(result)
    }
    catch(error){ 
        res.status(500).json(error)
    }
}

module.exports = { guardarMochila , getMochilabyid};
