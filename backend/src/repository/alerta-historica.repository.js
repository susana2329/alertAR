const { isDeepStrictEqual } = require('node:util');
const { createHash } = require('node:crypto');
const mongoose = require('mongoose');
const AlertaHistorica = require('../models/alerta-historica.model');

function compararDocumento(origen, archivado) {
    if (!origen || !archivado) return false;
    const esperado = { ...origen };
    const recibido = { ...archivado };
    // Los registros nuevos que llegan ya fuera de vigencia todavía no tienen _id de Mongo.
    if (esperado._id == null) delete recibido._id;
    return isDeepStrictEqual(esperado, recibido);
}

async function guardarYVerificar(documento, porClave = false) {
    if (!documento?.claveIdempotencia) throw new Error('No se puede archivar un registro sin clave de idempotencia');
    const filtro = porClave || documento._id == null
        ? { claveIdempotencia: documento.claveIdempotencia }
        : { _id: documento._id };
    const escritura = await AlertaHistorica.collection.replaceOne(filtro, documento, { upsert: true });
    const archivado = await AlertaHistorica.collection.findOne(filtro);
    if (!compararDocumento(documento, archivado)) {
        throw new Error(`No se pudo verificar la copia histórica de ${String(documento._id ?? documento.claveIdempotencia)}`);
    }
    return { documento: archivado, nuevo: escritura.upsertedCount === 1 };
}

exports.guardarYVerificar = documento => guardarYVerificar(documento, false);
exports.guardarDesdeIngesta = async documento => {
    const existente = await AlertaHistorica.collection.findOne({ claveIdempotencia: documento.claveIdempotencia });
    const ahora = new Date();
    const documentoHistorico = {
        ...documento,
        ...(existente?._id != null ? { _id: existente._id } : {}),
        createdAt: existente?.createdAt ?? documento.createdAt ?? ahora,
        updatedAt: ahora
    };
    return (await guardarYVerificar(documentoHistorico, true)).documento;
};
function crearSnapshotINA(documento) {
    const claveOriginal = documento.claveIdempotencia;
    const huella = createHash('sha256').update(JSON.stringify(documento)).digest('hex');
    return {
        ...documento,
        _id: new mongoose.Types.ObjectId(huella.slice(0, 24)),
        claveIdempotencia: `INA:SNAPSHOT:${huella}`,
        claveIdempotenciaOriginal: claveOriginal,
        idOperativoOrigen: documento._id == null ? null : String(documento._id)
    };
}
exports.guardarSnapshotINA = async documento => {
    const snapshot = crearSnapshotINA(documento);
    const existente = await AlertaHistorica.collection.findOne({ _id: snapshot._id });
    if (existente) {
        if (!compararDocumento(snapshot, existente)) throw new Error(`Conflicto con snapshot histórico INA ${snapshot.claveIdempotencia}`);
        return { documento: existente, nuevo: false };
    }
    let nuevo = true;
    try { await AlertaHistorica.collection.insertOne(snapshot); }
    catch (error) {
        if (error?.code !== 11000) throw error;
        nuevo = false;
    }
    const archivado = await AlertaHistorica.collection.findOne({ _id: snapshot._id }) ||
        await AlertaHistorica.collection.findOne({ claveIdempotencia: snapshot.claveIdempotencia });
    if (!compararDocumento(snapshot, archivado)) throw new Error(`No se pudo verificar la copia histórica de ${snapshot.claveIdempotencia}`);
    return { documento: archivado, nuevo };
};
exports.verificarSnapshotINA = async documento => {
    const esperado = crearSnapshotINA(documento);
    const archivado = await AlertaHistorica.collection.findOne({ _id: esperado._id });
    if (!compararDocumento(esperado, archivado)) {
        throw new Error(`No existe una copia histórica verificable de ${String(documento?._id)}`);
    }
    return archivado;
};
exports.obtenerPorId = id => AlertaHistorica.findById(id).lean();
exports.obtenerPorClave = claveIdempotencia => AlertaHistorica.findOne({ claveIdempotencia }).lean();
exports.verificarCopia = async documento => {
    const filtro = documento?._id != null
        ? { _id: documento._id }
        : { claveIdempotencia: documento?.claveIdempotencia };
    const archivado = await AlertaHistorica.collection.findOne(filtro);
    if (!compararDocumento(documento, archivado)) {
        throw new Error(`No existe una copia histórica verificable de ${String(documento?._id ?? documento?.claveIdempotencia)}`);
    }
    return archivado;
};
exports._compararDocumento = compararDocumento;
