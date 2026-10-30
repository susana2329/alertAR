const cuentaService = require('../service/cuenta.service');

exports.getPerfilUsuario = async (req, res) =>{
    try{
        const id = req.params.id;
        console.log("CONTROLLER - getPerfilUsuario id:", id);

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
        console.log("Error en CONTROLLER getPerfilUsuario:", error);
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
        console.log("CONTROLLER - actualizarFotoPerfil id: ", id);

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
        console.log("Error en CONTROLLER actualizarFotoPerfil:", error);
        res.status(500).send({
            code:500,
            message:"Error al actualizar la foto de perfil"
        });

    }
};

//Aca se enlistan todos los reportes hechos por el usuario

exports.getReportesPorUsuario= async(req,res) =>{
    try{    

        const idUsuario = req.params.id;
        console.log("CONTROLLER - getReportesPorUsuario idUsuario: ", idUsuario);

        const reportes = await cuentaService.obtenerReportesPorUsuario(idUsuario);

        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(JSON.stringify(reportes));

    }catch (error){
        console.log("Error en CONTROLLER getReportesPorUsuario", error);
        res.status(500).send({
            code:500,
            message:"Error al obtener los reportes del usuario"
        });
    }
};

//Aca se detallan los reportes del usuaario

exports.getReporteDetalle = async(req,res) =>{
    try{

        const reporteId = req.params.reporteId;
        console.log("CONTROLLER -getReporteDetalle id:",reporteId);

        if(!reporte){

            return res.status(404).send({
                code:404,
                message:`No se encontró el reporte con el id: ${reporteId}`
            });
        }
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(JSON.stringify(reporte));
    }catch (error){

        console.log("Error en CONTROLLER getReporteDetalle",error);
        res.status(500).send({
            code:500,
            message:"Error al obtener el detalle del reporte"
        });
    }
};

//Aca voy a listar todas las mochilas que el usuario crea

exports.getMochilasUsuario = async(req,res) =>{

    try{
        const idUsuario = req.params.id;
        console.log("CONTROLLER -getMochilasPorUsuario idUsuario", idUsuario);

        const mochilas = await cuentaService.obtenerMochilasPorUsuario(idUsuario);

        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(JSON.stringify(mochilas));

    }catch (error){
        console.log("Error en CONTROLLER getMochilasPorUsuario",erorr);
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
        console.log("CONTROLLER - getMochilaDetalle id:", mochilaId);

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
        console.log("Error en CONTROLLER getMochilaDetalle", error);
        res.status(500).send({
            code:500,
            message:"Error al obtener el detalle de la mochila"
        });
    }
};

