const mochilaService = require('../service/mochila.service');
const {mochilagetservice} = require('../service/mochila.service')
const guardarMochila = async (req, res) => {
    try {
        const userId = req.usuarioId;; 
        const { tipoMochila, itemsCompletados } = req.body; 

        if (!userId || !tipoMochila || !Array.isArray(itemsCompletados)) {
           return res.status(400).json({ mensaje: 'Faltan datos requeridos' });
        }

        const mochilaActualizada = await mochilaService.guardarMochila(userId, tipoMochila, itemsCompletados);
        
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
        console.log( result)
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