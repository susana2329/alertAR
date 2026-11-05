const Usuario = require('./models/UserGoogle');
const Reporte = require('./model/modelos');
//const Mochila = require('./models/mochila.model');

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
            {foto:nuevaFotoUrl},
            {new:true}
        ).lean();

    }catch (error){
        console.error("Error en REPOSITORY updateFotoPerfil:", error);
        throw error;
    }
};

// Todos los reportes creados por un usuario
exports.findReportesByUsuarioId = async (idUsuario) => {
    try {
        console.log("REPOSITORY - findReportesByUsuarioId idUsuario:", idUsuario);
        return await Reporte.find({ idUser: idUsuario }).select('-fotos').sort({ fecha: -1 }).lean();
    } catch (error) {
        console.error("Error en REPOSITORY findReportesByUsuarioId:", error);
        throw error;
    }
};

// Un reporte individual
exports.findReporteById = async (reporteId) => {
    try {
        console.log("REPOSITORY - findReporteById reporteId:", reporteId);
        return await Reporte.findById(reporteId).select('-fotos').lean();
    } catch (error) {
        console.error("Error en REPOSITORY findReporteById:", error);
        throw error;
    }
};

/*
// Todas las mochilas de un usuario
exports.findMochilasByUsuarioId = async (idUsuario) => {
    try {
        console.log("REPOSITORY - findMochilasByUsuarioId idUsuario:", idUsuario);
        return await Mochila.find({ usuarioId: idUsuario }).lean();
    } catch (error) {
        console.error("Error en REPOSITORY findMochilasByUsuarioId:", error);
        throw error;
    }
};

// Una mochila individual
exports.findMochilaById = async (mochilaId) => {
    try {
        console.log("REPOSITORY - findMochilaById mochilaId:", mochilaId);
        return await Mochila.findById(mochilaId).lean();
    } catch (error) {
        console.error("Error en REPOSITORY findMochilaById:", error);
        throw error;
    }
};*/