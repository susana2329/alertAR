const cuentaRepository = require('../repository/cuenta.repository');

//Con esto se obtiene los datos basicos del perfil
exports.obtenerPerfilUsuario = async (id) =>{
    try{
        console.log("SERVICE - obtenerPerfilUsuario id:", id);

        const usuario = await cuentaRepository.findUsuarioById(id);
        if(!usuario){
            return null;
        }

        return{
            _id: usuario._id,
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            email: usuario.email,
            foto: usuario.foto || null,
            proveedor: usuario.proveedor
        };
    } catch(error){
        console.error("Error en SERVICE obtenerPerfilUsuario:", error);
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

        return await cuentaRepository.updateFotoPerfil(id, nuevaFotoUrl);
    }catch (error){
        console.error("Error de SERVICE modificarFotoPerfil:",error);
        throw error;
    }
};

//Aca se obtienen los reportes del usuario
exports.obtenerReportesPorUsuario = async (idUsuario)=>{
    try{
        console.log("SERVICE - obtenerReportesPorUsuario idUsuario:", idUsuario);
        const reportes = await cuentaRepository.findReportesByUsuarioId(idUsuario);
        return reportes || [];
    } catch (error) {
        console.error("Error en SERVICE obtenerReportesPorUsuario:", error);
        throw error;
    }
};

//Aca se trae los reportes individuales
exports.obtenerReportePorId = async (reporteId)=>{
    try{
        console.log("SERVICE - obtenerReportePorId reporteId:", reporteId);
        return await cuentaRepository.findReporteById(reporteId);
    }catch (error){
        console.error("Error en SERVICE obtenerReportePorId:", error);
        throw error;
    }
};

//Aca voy a enlistar las mochilas creadas por el usuario

exports.obtenerMochilasPorUsuario = async (idUsuario) =>{
    try{
        console.log("SERVICE - obtenerMochilasPorUsuario idUsuario:", idUsuario);
        const mochilas = await cuentaRepository.findMochilasByUsuarioId(idUsuario);
        return mochilas || [];
    }catch (error){
        console.error("Error en SERVICE obtenerMochilasPorUsuario:", error);
        throw error;
    }
};

//Aca se obtienen detalle de mochila individual
exports.obtenerMochilaPorId = async (mochilaId) =>{
    try{
        console.log("SERVICE - obtenerMochilaPorId mochilaId:", mochilaId);
        return await cuentaRepository.findMochilaById(mochilaId);
    }catch (error){
        console.error("Error en SERVICE obtenerMochilaPorId:", error);
        throw error;
    }
};

