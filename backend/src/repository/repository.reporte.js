const reportes = require('./model/modelos')

exports.postReporteRepository = async (report) => {
   return reportes.create(report)
}
exports.getReportesRepositoy = async ()=>{ 
   try{ 
      const result = await reportes.find()
      console.log(result)
      return result
   }
   catch(error){ 
       console.error("Error al obtener los reportes:", error);
       throw new error('Error al obtener los reportes')
   }
}

exports.getSegunIdRepository = async (id) => { 
   try{ 
      const reporteid = await reportes.find({idUser: id})
      if(!reporteid){
         console.log("no se pudo encontrar el reporte por el id")
      }
      return reporteid
   }
   catch{ 
      console.log("El id no es encontrado en los reportes")
   }
}
