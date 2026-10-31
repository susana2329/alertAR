const reportes = require('./model/modelos')

exports.postReporteRepository = async (report) => {
   try {
      const resultmongo = await reportes.create(report)
      if(!resultmongo){ 
         console.log("no se logro subir el reporte desde repository")
      }
      console.log(resultmongo)
      return resultmongo
   }
   catch (error) {
      console.log(error)
   }
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
      const reporteid = await reportes.findOne({idUser: id})
      if(!reporteid){
         console.log("no se pudo encontrar el reporte por el id")
      }
      return reporteid
   }
   catch{ 
      console.log("El id no es encontrado en los reportes")
   }
}
