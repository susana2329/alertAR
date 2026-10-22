const Alerta = require('../models/alerta.model');
const { validarAlertaOficial } = require('../ingestion/normalizers/alerta-oficial');

function identificadoresReferenciados(referencias) {
    if (!referencias) return [];
    const partes = referencias.trim().split(/\s+/).flatMap(parte => parte.split(','));
    const ids = [];
    for (let i = 0; i + 1 < partes.length; i += 3) {
        if (partes[i + 1]) ids.push(partes[i + 1]);
    }
    return [...new Set(ids)];
}

async function guardarUna(alerta) {
    validarAlertaOficial(alerta);
    const filtroClave = { claveIdempotencia: alerta.claveIdempotencia };

    if (alerta.fuente !== 'SMN') {
        return Alerta.findOneAndUpdate(filtroClave, { $set: alerta }, {
            upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true
        });
    }

    if (alerta.tipoMensaje === 'Cancel') {
        const ids = identificadoresReferenciados(alerta.referencias);
        if (!ids.length) return { cancelada: false, motivo: 'sin-referencias' };
        const destinos = await Alerta.find({
            fuente: 'SMN', emisor: alerta.emisor, identificadorFuente: { $in: ids }
        }).lean();
        const porIdentificador = new Map();
        for (const destino of destinos) {
            porIdentificador.set(destino.identificadorFuente,
                (porIdentificador.get(destino.identificadorFuente) || 0) + 1);
        }
        const ambiguos = [...porIdentificador].filter(([, cantidad]) => cantidad > 1).map(([id]) => id);
        if (ambiguos.length) {
            throw new Error(`Cancel CAP ambiguo: ${ambiguos.join(', ')} identifica varias regiones; no se eliminó ninguna`);
        }
        if (destinos.length === 0) return { cancelada: false, motivo: 'referencia-no-encontrada' };
        await Alerta.deleteMany({ _id: { $in: destinos.map(doc => doc._id) } });
        return { cancelada: true, identificadores: destinos.map(doc => doc.identificadorFuente) };
    }

    const repetida = await Alerta.findOne(filtroClave).lean();
    if (repetida) {
        await Alerta.updateOne({ _id: repetida._id }, { $set: alerta }, { runValidators: true });
        return { ...repetida, ...alerta };
    }

    if (alerta.tipoMensaje === 'Update') {
        const ids = identificadoresReferenciados(alerta.referencias);
        if (ids.length) {
            const destinos = await Alerta.find({
                fuente: 'SMN', emisor: alerta.emisor, identificadorFuente: { $in: ids }
            }).lean();
            if (destinos.length > 1) {
                throw new Error(`Update CAP ambiguo: referencias ${ids.join(', ')} coinciden con varias alertas; no se modificó ninguna`);
            }
            if (destinos.length === 1) {
                await Alerta.updateOne({ _id: destinos[0]._id }, { $set: alerta }, { runValidators: true });
                return { ...destinos[0], ...alerta };
            }
        }
        return Alerta.findOneAndUpdate(filtroClave, { $set: alerta }, {
            upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true
        });
    }

    return Alerta.findOneAndUpdate(filtroClave, { $set: alerta }, {
        upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true
    });
}

exports.guardarOficiales = async alertas => {
    if (!Array.isArray(alertas)) throw new Error('Se esperaba una lista de alertas oficiales');
    const resultado = [];
    for (const alerta of alertas) resultado.push(await guardarUna(alerta));
    return resultado;
};

exports.obtenerTodas = async () => Alerta.find().sort({ fechaInicio: -1 }).lean();
exports._identificadoresReferenciados = identificadoresReferenciados;
