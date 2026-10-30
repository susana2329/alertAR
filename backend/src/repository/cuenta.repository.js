const Usuario = require('../models/usuario.model');
const Reporte = require('../models/reporte.model');
const Mochila = require('../models/mochila.model');

exports.findUsuarioById = async (id) =>{
    try{
        console.log("REPOSITORY - findUsuarioById id:", id);

        return await Usuario.findById(id).lean();
    }catch (error){
        console.error("Error en REPOSITORY findUsuarioById:", error);
        throw error;
    }
};

exports.updateFotoPerfil = async (id,nuevaFotoUrl) =>{
    try{
        console.log("REPOSITORY - updateFotoPerfil id:", id);

        return await Usuario.findByIdAndUpdate(
            id,
            {fotoPerfil: nuevaFotoUrl},
            {new:true}
        ).lean();

    }catch (error){
        console.error("Error en REPOSITORY updateFotoPerfil", error);
        throw error;
    }
};

//Aca voy a buscar todos los reportes creados pro un usuario

exports.findReportesByUsuarioId = async (idUsuario) =>{
    try{

        console.log("REPOSITORY - findReportesByUsuarioId idUsuario:", idUsuario);
        return await Reporte.find({usuarioId:idUsuario}).lean();
    }catch (error){
        console.log("Error en REPOSITORY findReportesByUsuarioId:",error);
        throw error;
    }
};

//Aca se detalla el reporte del usuario de manera individual
exports.findReporteBiId = async (reporteId)=>{
    try{

        console.log("REPOSITORY -findReporteById reporteId:", reporteId);
        return await Reporte.findById(reporteId).lean();
    }catch(error){
        console.error("Error en REPOSITORY findReporteById:", error);
        throw error;
    }
};