const cuentaService = require('../repository/cuenta.repository');

//Con esto se obtiene los datos basicos del perfil

exports.obtenerPerfilUsuario = async (id) =>{
    try{

        console.log("SERVICE - obtenerPerfilUsuario id:", id);

        const usuario = await cuentaRepository.findUsuarioById(id);

        if(!usuario){
            return null;
        }

        return{
            id:usuaurio._id || usuario.id,
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            email: usuario.email,
            fotoPerfil: usuario.fotoPerfil || null

        };
    }catch (error){
        console.error("Error en SERVICE obtenerPerfilUusario:",error);
        throw error;
    }   
};

//Aca se maneja la actualizacion de foto de perfil

exports.modificarFotoPerfil = async (id,nuevaFotoUrl) =>{
    try{
        console.log("SERVICE -modificarFotoPerfil id:", id);

        if(!nuevaFotoUrl){
            throw new Error("La URL de la foto perfil es obligatoria");
        }

        const usuaurioActualizado = await cuentaRepository.updateFotoPerfil(id,nuevaFotoUrl);
        return usuaurioActualizado;

    }catch (error){
        console.error("Error de SERVICE modificarFotoPerfil:",error);
        throw error;
    }
};


//Aca se obtienen los reportes del usuario

exports.obtenerReportesPorUsuario = async (idUsuario)=>{
    try{
        console.log("SERVICE - obtenerReportesPorUsuario idUsuario:", idUsuario);

        const reportes = await cuentaRepository.findReportesByUsuario(idUsuario);
        return reportes || [];
    }catch (error){
        console.error("Error en SERVICE obtenerReportesPorUsuario", error);
        throw error;
    }
};

//Aca se trae los reportes individuales

exports.obtenerReportesPorId = async (reporteId) =>{
    try{

        console.log("SERVICE - obtenerReportePorId reporte Id:",reporteId);

        const reporte = await cuentaRepository.findReporteById(reporteId);
        return reporte;
    }catch (error){
        console.error("Error en SERVICE obtenerReportePorId:", error);
        throw error;
    }
};

//Aca voy a enlistar las mochilas creadas por el usuario

exports.obtenerMochilasPorUsuario = async (idUsuario) =>{
    try{
        console.log("SERVICE - obtenerMochilasPorUsuarios idUsuario:", idUsuario);

        const mochilas = await cuentaRepository.findMochilasByUsuarioId(idUsuario);
        return mochilas || [];

    }catch (error){
        console.error("Error en SERVICE obtenerMochilasPorUsuarios:", error);
        throw error;
    }
};


//Aca se obtienen detalle de mochila individual

exports.obtenerMochilaPorId = async (mochilaId) =>{
    try{

        console.log("SERVICE - obtenerMochilaPorId mochilaId:",mochilaId);

        const mochila = await cuentaRepository.findMochilaById(mochilaId);
        return mochila;
    }catch (error){
        console.log("Error en SERVICE obtenerMochilaPorId", error);
        throw error;
    }
};

