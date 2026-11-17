const Alerta = require('../models/alerta.model');
const { validarAlertaOficial } = require('../ingestion/normalizers/alerta-oficial');
const alertaHistoricaRepository = require('./alerta-historica.repository');
const { estadoCicloVida, filtroArchivables } = require('../service/ciclo-vida-alerta');

function identificadoresReferenciados(referencias) {
    if (!referencias) return [];
    const partes = referencias.trim().split(/\s+/).flatMap(parte => parte.split(','));
    const ids = [];
    for (let i = 0; i + 1 < partes.length; i += 3) {
        if (partes[i + 1]) ids.push(partes[i + 1]);
    }
    return [...new Set(ids)];
}

async function conservarRegistroAntiguo(alerta, filtroClave, observadores) {
    const existente = await Alerta.findOne(filtroClave).lean();
    if (existente) {
        const resultado = await Alerta.updateOne({ _id: existente._id }, { $set: alerta }, { runValidators: true });
        if (resultado?.matchedCount !== 0) {
            observadores.onResultado?.('actualizada', alerta);
            return { ...existente, ...alerta };
        }
    }
    const documento = await alertaHistoricaRepository.guardarDesdeIngesta(alerta);
    observadores.onResultado?.('archivada', alerta);
    return documento;
}

async function archivarOperativa(documento, observadores) {
    await alertaHistoricaRepository.guardarYVerificar(documento);
    const resultado = await Alerta.collection.deleteOne(documento);
    observadores.onResultado?.(resultado.deletedCount === 1 ? 'archivada' : 'actualizada', documento);
    return documento;
}

async function guardarUna(alerta, observadores = {}) {
    validarAlertaOficial(alerta);
    const filtroClave = { claveIdempotencia: alerta.claveIdempotencia };

    if (alerta.fuente !== 'SMN' && estadoCicloVida(alerta) === 'historica') {
        return conservarRegistroAntiguo(alerta, filtroClave, observadores);
    }

    if (alerta.fuente !== 'SMN') {
        const existente = observadores.onResultado ? await Alerta.exists(filtroClave) : null;
        const documento = await Alerta.findOneAndUpdate(filtroClave, { $set: alerta }, {
            upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true
        });
        observadores.onResultado?.(existente ? 'actualizada' : 'guardada', alerta);
        return documento;
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
        observadores.onResultado?.('cancelada', alerta);
        return { cancelada: true, identificadores: destinos.map(doc => doc.identificadorFuente) };
    }

    const repetida = await Alerta.findOne(filtroClave).lean();
    if (repetida) {
        await Alerta.updateOne({ _id: repetida._id }, { $set: alerta }, { runValidators: true });
        if (estadoCicloVida(alerta) === 'historica') {
            const actualizada = await Alerta.findOne({ _id: repetida._id }).lean();
            if (actualizada && estadoCicloVida(actualizada) === 'historica') {
                return archivarOperativa(actualizada, observadores);
            }
        }
        observadores.onResultado?.('actualizada', alerta);
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
                if (estadoCicloVida(alerta) === 'historica') {
                    const actualizada = await Alerta.findOne({ _id: destinos[0]._id }).lean();
                    if (actualizada && estadoCicloVida(actualizada) === 'historica') {
                        return archivarOperativa(actualizada, observadores);
                    }
                }
                observadores.onResultado?.('actualizada', alerta);
                return { ...destinos[0], ...alerta };
            }
        }
        if (estadoCicloVida(alerta) === 'historica') {
            return conservarRegistroAntiguo(alerta, filtroClave, observadores);
        }
        return Alerta.findOneAndUpdate(filtroClave, { $set: alerta }, {
            upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true
        });
    }

    if (estadoCicloVida(alerta) === 'historica') {
        return conservarRegistroAntiguo(alerta, filtroClave, observadores);
    }

    const documento = await Alerta.findOneAndUpdate(filtroClave, { $set: alerta }, {
        upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true
    });
    observadores.onResultado?.('guardada', alerta);
    return documento;
}

exports.guardarOficiales = async (alertas, observadores = {}) => {
    if (!Array.isArray(alertas)) throw new Error('Se esperaba una lista de alertas oficiales');
    const resultado = [];
    for (const alerta of alertas) resultado.push(await guardarUna(alerta, observadores));
    return resultado;
};

exports.obtenerTodas = async () => Alerta.find().sort({ fechaInicio: -1 }).lean();

exports.contarArchivables = async ahora => {
    const resultado = {};
    for (const fuente of ['SMN', 'INPRES']) {
        resultado[fuente] = await Alerta.countDocuments(filtroArchivables(ahora, fuente));
    }
    return resultado;
};

exports.obtenerLoteArchivable = async (ahora, fuente, desdeId, limite = 100) => {
    const filtro = filtroArchivables(ahora, fuente);
    const consulta = desdeId ? { $and: [filtro, { _id: { $gt: desdeId } }] } : filtro;
    return Alerta.find(consulta).sort({ _id: 1 }).limit(limite).lean();
};

exports.eliminarSiNoCambio = async documento => {
    if (!documento?._id) throw new Error('Se requiere _id para eliminar una versión verificada');
    return Alerta.collection.deleteOne(exports._filtroEliminacionExacta(documento));
};
exports._filtroEliminacionExacta = documento => ({
    _id: documento._id,
    $expr: { $eq: ['$$ROOT', { $literal: documento }] }
});

const CAMPOS_PRESENTACION = [
    '_id', 'titulo', 'tipo', 'naturaleza', 'nivel', 'origen', 'fuente', 'descripcion',
    'fechaInicio', 'fechaFin', 'fechaUltimaMedicion', 'estadoActualizacion', 'updatedAt', 'createdAt', 'estadoFuente', 'tipoMensaje',
    'referencias', 'identificadorFuente', 'ubicacion', 'geometria'
].join(' ');

// La capa de mapa no necesita los detalles crudos ni la serie histórica del INA.
exports.obtenerParaMapa = async () => Alerta.find({}, {
    ...Object.fromEntries(CAMPOS_PRESENTACION.split(' ').map(campo => [campo, 1])),
    'datosFuente.estacion': 1, 'datosFuente.medicion': 1, 'datosFuente.estadoFuente': 1,
    'datosFuente.umbrales': 1, 'datosFuente.clasificacion': 1,
    'datosFuente.magnitud': 1, 'datosFuente.profundidad': 1,
    'datosFuente.informaciones.instruccion': 1
}).sort({ fechaInicio: -1 }).lean();

// El inicio solo evalúa eventos vigentes según las mismas ventanas aplicadas por el servicio.
exports.obtenerCandidatasInicio = async (ahora = new Date()) => {
    const hace24Horas = new Date(ahora.getTime() - 24 * 60 * 60 * 1000);
    const hace7Dias = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
    return Alerta.find({ origen: 'oficial', $or: [
        { fuente: 'SMN', fechaInicio: { $lte: ahora }, $or: [
            { fechaFin: { $gte: ahora } },
            { fechaFin: null, fechaInicio: { $gte: hace24Horas, $lte: ahora } }
        ] },
        { fuente: 'INA', $or: [
            { fechaInicio: { $gte: hace24Horas, $lte: ahora } },
            { estadoActualizacion: 'desactualizada' },
            { fechaUltimaMedicion: { $lt: hace24Horas } }
        ], fechaFin: null },
        { fuente: 'INPRES', fechaInicio: { $gte: hace7Dias, $lte: ahora }, $or: [{ fechaFin: null }, { fechaFin: { $gte: ahora } }] }
    ] }, {
        ...Object.fromEntries(CAMPOS_PRESENTACION.split(' ').map(campo => [campo, 1])),
        'datosFuente.estacion': 1, 'datosFuente.medicion': 1, 'datosFuente.estadoFuente': 1,
        'datosFuente.umbrales': 1, 'datosFuente.clasificacion': 1,
        'datosFuente.magnitud': 1, 'datosFuente.profundidad': 1,
        'datosFuente.informaciones.instruccion': 1
    }).lean();
};

exports.obtenerPorId = async id => Alerta.findById(id).lean();
exports._identificadoresReferenciados = identificadoresReferenciados;
