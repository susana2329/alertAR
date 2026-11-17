const Usuario = require('./models/UserGoogle');
const Reporte = require('./model/modelos');
const mongoose = require('mongoose');
//const Mochila = require('./models/mochila.model');

exports.findUsuarioById = async (id) =>{
    try{

        return await Usuario.findById(id).lean();
    }catch (error){
        console.error("Error en REPOSITORY findUsuarioById:", error);
        throw error;
    }
};

exports.updateFotoPerfil = async (id,nuevaFotoUrl) =>{
    try{

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
        return await Reporte.find({ idUser: idUsuario }).select('-fotos').sort({ fecha: -1 }).lean();
    } catch (error) {
        console.error("Error en REPOSITORY findReportesByUsuarioId:", error);
        throw error;
    }
};

// Un reporte individual

exports.deleteUsuarioById = async (id) => {
    try {
        return await Usuario.findByIdAndDelete(id).lean();
    } catch (error) {
        console.error("Error en REPOSITORY deleteUsuarioById:", error);
        throw error;
    }
};

exports.listarReportesDeUsuario = id => Reporte.find(
    { idUser: new mongoose.Types.ObjectId(id) },
    { _id: 1 }
).lean();

exports.anonimizarVotosDeUsuario = id => {
    const usuario = new mongoose.Types.ObjectId(id);
    const anonimo = new mongoose.Types.ObjectId();
    return Reporte.updateMany(
        { 'votosVecinales.usuario': usuario },
        { $set: { 'votosVecinales.$[voto].usuario': anonimo } },
        { arrayFilters: [{ 'voto.usuario': usuario }] }
    );
};

exports.anonimizarModeracionesDeUsuario = id => Reporte.updateMany(
    { moderadoPor: new mongoose.Types.ObjectId(id) },
    { $unset: { moderadoPor: '' } }
);

// Un reporte individual
exports.findReporteById = async (reporteId) => {
    try {
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
        return await Mochila.find({ usuarioId: idUsuario }).lean();
    } catch (error) {
        console.error("Error en REPOSITORY findMochilasByUsuarioId:", error);
        throw error;
    }
};

// Una mochila individual
exports.findMochilaById = async (mochilaId) => {
    try {
        return await Mochila.findById(mochilaId).lean();
    } catch (error) {
        console.error("Error en REPOSITORY findMochilaById:", error);
        throw error;
    }
};*/
