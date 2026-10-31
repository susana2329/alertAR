const {subirReporteService} = require('../service/reporte.service')
const {getReporteService} = require('../service/reporte.service')
const {getSegunIdService} = require('../service/reporte.service')

exports.subirReporte = async (req,res) => {
    try{    
        console.log(req)
        const result = await subirReporteService(req.body, req.files, req.params.id)
        if(!result){ 
            return res.status(400).json({code:400, message:'No se pudo subir el reporte'})
        }
        return res.status(200).json(result)
    }    
    catch(error){ 
        console.log(error)
        res.status(500).send({code: 500, message:"Error al subir el reporte"})
    }
}
exports.mostrarTodosReportes = async (req,res)=>{ 
    try{ 

        const result = await getReporteService()
        if(!result){ 
            return res.status(400).json({code:400, message:'No se pudo encontrar los reportes'})
            
        }
        return res.status(200).json(result)
    }
    catch(error){ 
        console.log(error)
        res.status(500).send({
            code:500, 
            message:'No se pudo mostrar los reportes'
        })
        return
    }   
}
exports.getSegunId = async (req,res) => { 
    try{ 
        const id = req.params.iduser
        const result = await getSegunIdService(id)
        if(!result){ 
            return res.status(400).json({code:400, message:'No se pudo recopilar el reporte segun el id'})
        }
        return res.status(200).json(result)

    }
    catch(error){ 
        console.log(error)
        res.status(500).send({
            code:500, 
            message:'No hay reporte con ese id'
        })
    }
}