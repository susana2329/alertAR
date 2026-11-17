const mongoose = require('mongoose');
const cuentaService = require('../service/cuenta.service');

exports.getPerfilUsuario = async (req, res) =>{
    try{
        
        const id = req.params.id;

        if (req.usuarioId && String(req.usuarioId) !== String(id)) {
            return res.status(403).json({ code: 403, message: "No tenés permiso para acceder a este perfil" });
        }

        const usuario = await cuentaService.obtenerPerfilUsuario(id);

        if(!usuario){
            return res.status(404).send({
                code:404,
                message: `No se encontró un usuario con el id: ${id}`
            });
        }
        res.setHeader('Content-Type','application/json');
        res.status(200).send(JSON.stringify(usuario));
    }catch (error){
        res.status(500).send({
            code:500,
            message: "Error al obtener el perfil del usuario"
        });
    }
};

exports.actualizarFotoPerfil = async (req,res) =>{
    try{
        const id = req.params.id;
        const {fotoPerfil} = req.body;

        if (req.usuarioId && String(req.usuarioId) !== String(id)) {
            return res.status(403).json({ code: 403, message: "No tenés permiso para actualizar esta cuenta" });
        }

        const usuarioActualizado = await cuentaService.modificarFotoPerfil(id,fotoPerfil);

        if(!usuarioActualizado){
            return res.status(404).send({
                code:404,
                message: `No se encontró el usuario para actualizar la foto con el id: ${id}`
            });
        }
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(JSON.stringify(usuarioActualizado));



    }catch(error){
        res.status(500).send({
            code:500,
            message:"Error al actualizar la foto de perfil"
        });

    }
};

exports.eliminarCuenta = async (req, res) => {
    try {
        const id = req.params.id;

        if (req.usuarioId && String(req.usuarioId) !== String(id)) {
            return res.status(403).json({ code: 403, message: "No tenés permiso para eliminar esta cuenta" });
        }

        const resultado = await cuentaService.eliminarCuenta(id);

        if (!resultado) {
            return res.status(404).send({
                code: 404,
                message: `No se encontró un usuario con el id: ${id}`
            });
        }

        res.status(200).json({
            code: 200,
            message: "Cuenta eliminada correctamente"
        });
    } catch (error) {
        console.error("Error en CONTROLLER eliminarCuenta:", error);
        res.status(500).send({
            code: 500,
            message: "Error al eliminar la cuenta"
        });
    }
};

//Aca se enlistan todos los reportes hechos por el usuario

exports.getReportesPorUsuario = async (req, res) => {
    try{
        const idUsuario = req.params.id;

        if (req.usuarioId && String(req.usuarioId) !== String(idUsuario)) {
            return res.status(403).json({ code: 403, message: "No tenés permiso para ver estos reportes" });
        }

        if (!mongoose.isValidObjectId(idUsuario)) {
            return res.status(400).json({ code: 400, message: "El id del usuario no es válido" });
        }

        const reportes = await cuentaService.obtenerReportesPorUsuario(idUsuario);
        res.status(200).json(reportes);
    } catch (error) {
        console.error("Error en CONTROLLER getReportesPorUsuario:", error);
        res.status(500).json({ code: 500, message: "Error al obtener los reportes del usuario" });
    }
};

//Aca se detallan los reportes del usuaario

exports.getReporteDetalle = async(req,res) =>{
    try{

        const reporteId = req.params.reporteId;

        const reporte = await cuentaService.obtenerReportePorId(reporteId);
        if(!reporte){

            return res.status(404).send({
                code:404,
                message:`No se encontró el reporte con el id: ${reporteId}`
            });
        }
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(JSON.stringify(reporte));
    }catch (error){

        res.status(500).send({
            code:500,
            message:"Error al obtener el detalle del reporte"
        });
    }
};
/*
//Aca voy a listar todas las mochilas que el usuario crea

exports.getMochilasPorUsuario = async(req,res) =>{

    try{
        const idUsuario = req.params.id;

        const mochilas = await cuentaService.obtenerMochilasPorUsuario(idUsuario);

        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(JSON.stringify(mochilas));

    }catch (error){
        res.status(500).send({
            code:500,
            message:"Error al obtener las mochilas del usuario"
        });
    }
};

//Y aca se muestra en dellate la mochila invidual

exports.getMochilaDetalle = async(req,res) =>{
    try{

        const mochilaId = req.params.mochilaId;

        const mochila = await cuentaService.obtenerMochilaPorId(mochilaId);

        if(!mochila){
            return res.status(404).send({
                code:404,
                message: `No se encontró la mochila con el id: ${mochilaId}`
            });
        }

        res.setHeader('Content-Type','application/json');
        res.status(200).send(JSON.stringify(mochila));
    }catch (error){
        res.status(500).send({
            code:500,
            message:"Error al obtener el detalle de la mochila"
        });
    }
};*/

