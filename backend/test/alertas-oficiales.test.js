const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { parsearCAP } = require('../src/ingestion/parsers/cap.parser');
const { normalizarSMN } = require('../src/ingestion/normalizers/smn.normalizer');
const { normalizarINA } = require('../src/ingestion/normalizers/ina.normalizer');
const { normalizarINPRES } = require('../src/ingestion/normalizers/inpres.normalizer');
const { validarAlertaOficial, geometriaValida } = require('../src/ingestion/normalizers/alerta-oficial');
const Alerta = require('../src/models/alerta.model');
const repositorio = require('../src/repository/alerta.repository');

const poligono = (x) => ({
    type: 'Polygon',
    coordinates: [[[x, -35], [x + 1, -35], [x + 1, -34], [x, -35]]]
});

function alertaCAP({ identifier = 'cap-new', msgType = 'Update', references = 'smn@smn.gob.ar,cap-old,2026-10-20T00:00:00Z', x = -60 } = {}) {
    return normalizarSMN({
        identifier, sender: 'smn@smn.gob.ar', sent: '2026-10-21T00:00:00Z',
        status: 'Actual', msgType, scope: 'Public', references,
        info: [{ event: 'Tormenta', headline: 'Alerta', severity: 'Severe', onset: '2026-10-21T00:00:00Z', expires: '2026-10-22T00:00:00Z' }],
        areas: [{ descripcion: null, poligonos: [poligono(x).coordinates[0]] }]
    });
}

test('normalizadores producen una estructura oficial común y conservan datos de fuente', () => {
    const raiz = path.join(__dirname, '..', 'datos-muestra');
    const capFile = fs.readdirSync(path.join(raiz, 'smn/cap')).find(n => n.endsWith('.xml'));
    const cap = normalizarSMN(parsearCAP(fs.readFileSync(path.join(raiz, 'smn/cap', capFile), 'utf8')));
    const inaFile = fs.readdirSync(path.join(raiz, 'ina')).find(n => n.endsWith('.json'));
    const ina = normalizarINA(JSON.parse(fs.readFileSync(path.join(raiz, 'ina', inaFile), 'utf8')))[0];
    const inpresFile = fs.readdirSync(path.join(raiz, 'inpres')).find(n => n.endsWith('.xml'));
    const inpres = normalizarINPRES(fs.readFileSync(path.join(raiz, 'inpres', inpresFile), 'utf8'))[0];

    for (const alerta of [cap, ina, inpres]) {
        assert.equal(alerta.origen, 'oficial');
        assert.ok(alerta.fuente);
        assert.ok(alerta.identificadorFuente);
        assert.ok(alerta.claveIdempotencia);
        assert.ok(alerta.fechaInicio instanceof Date);
        assert.ok(geometriaValida(alerta.geometria));
        assert.doesNotThrow(() => validarAlertaOficial(alerta));
    }
    assert.equal(cap.geometria.type, 'Polygon');
    assert.ok(cap.datosFuente.informaciones.length);
    assert.ok(ina.serieTemporal.length);
    assert.equal(typeof inpres.magnitud, 'number');
});

test('validación rechaza polígonos abiertos e inválidos', () => {
    assert.equal(geometriaValida(poligono(-60)), true);
    assert.equal(geometriaValida({ type: 'Polygon', coordinates: [[[0, 0], [1, 0], [0, 1], [1, 1]]] }), false);
    assert.throws(() => validarAlertaOficial({ ...alertaCAP(), geometria: { type: 'Polygon', coordinates: [] } }), /geometría/);
    assert.throws(() => validarAlertaOficial({ ...alertaCAP(), fechaInicio: new Date('invalid') }), /fecha de inicio/);
});

test('CAP regionales con igual identifier y geometría distinta tienen claves distintas', () => {
    const llanura = alertaCAP({ identifier: 'compartido', msgType: 'Alert', references: null, x: -60 });
    const patagonia = alertaCAP({ identifier: 'compartido', msgType: 'Alert', references: null, x: -70 });
    assert.notEqual(llanura.claveIdempotencia, patagonia.claveIdempotencia);
    assert.equal(llanura.geometria.type, 'Polygon');
    assert.equal(patagonia.geometria.type, 'Polygon');
});

test('dos regiones CAP se conservan y reingresar el mismo polígono no duplica', async () => {
    const originals = { findOne: Alerta.findOne, findOneAndUpdate: Alerta.findOneAndUpdate, updateOne: Alerta.updateOne };
    const registros = new Map();
    let altas = 0;
    Alerta.findOne = filtro => ({ lean: async () => registros.get(filtro.claveIdempotencia) || null });
    Alerta.findOneAndUpdate = async (filtro, update) => {
        altas++;
        const doc = { _id: filtro.claveIdempotencia, ...update.$set };
        registros.set(filtro.claveIdempotencia, doc);
        return doc;
    };
    Alerta.updateOne = async (filtro, update) => {
        const doc = [...registros.values()].find(x => x._id === filtro._id);
        Object.assign(doc, update.$set);
    };
    try {
        const llanura = alertaCAP({ identifier: 'regional', msgType: 'Alert', references: null, x: -60 });
        const patagonia = alertaCAP({ identifier: 'regional', msgType: 'Alert', references: null, x: -70 });
        await repositorio.guardarOficiales([llanura, patagonia]);
        await repositorio.guardarOficiales([llanura]);
        assert.equal(registros.size, 2);
        assert.equal(altas, 2);
        assert.deepEqual(new Set([...registros.values()].map(x => x.geometria.type)), new Set(['Polygon']));
    } finally { Object.assign(Alerta, originals); }
});

test('XML reales de Tormenta Llanura y Patagonia mantienen Update y referencias ambiguas sin mutaciones', async () => {
    const dirCAP = path.join(__dirname, '..', 'datos-muestra', 'smn', 'cap');
    const archivos = [
        'CAP_20261020204542_Tormenta_Llanura_alertas_alertas_1.xml',
        'CAP_20261020204543_Tormenta_Patagonia_alertas_alertas_1.xml'
    ];
    const alertas = archivos.map(archivo => {
        const xml = fs.readFileSync(path.join(dirCAP, archivo), 'utf8');
        const alerta = normalizarSMN(parsearCAP(xml));
        validarAlertaOficial(alerta);
        return alerta;
    });
    const originales = {
        findOne: Alerta.findOne,
        find: Alerta.find,
        findOneAndUpdate: Alerta.findOneAndUpdate,
        updateOne: Alerta.updateOne
    };
    let writes = 0;
    const idReferenciado = alertas[0].referencias.split(',')[1];
    Alerta.findOne = () => ({ lean: async () => null });
    Alerta.find = () => ({ lean: async () => [
        { _id: 'llanura-anterior', fuente: 'SMN', emisor: alertas[0].emisor, identificadorFuente: idReferenciado },
        { _id: 'patagonia-anterior', fuente: 'SMN', emisor: alertas[1].emisor, identificadorFuente: idReferenciado }
    ] });
    Alerta.findOneAndUpdate = async () => { writes++; };
    Alerta.updateOne = async () => { writes++; };
    try {
        assert.equal(alertas[0].tipoMensaje, 'Update');
        assert.equal(alertas[1].tipoMensaje, 'Update');
        assert.equal(alertas[0].identificadorFuente, alertas[1].identificadorFuente);
        assert.equal(alertas[0].referencias, alertas[1].referencias);
        assert.notDeepEqual(alertas[0].geometria, alertas[1].geometria);
        assert.equal(alertas[0].geometria.type, 'Polygon');
        assert.equal(alertas[1].geometria.type, 'Polygon');
        for (const alerta of alertas) {
            await assert.rejects(repositorio.guardarOficiales([alerta]), /Update CAP ambiguo/);
        }
        assert.equal(writes, 0);
    } finally { Object.assign(Alerta, originales); }
});

test('repositorio hace upsert idempotente para la misma alerta', async () => {
    const original = Alerta.findOneAndUpdate;
    let writes = 0;
    Alerta.findOneAndUpdate = async (_filter, update, options) => {
        writes++;
        assert.equal(options.upsert, true);
        return update.$set;
    };
    try {
        const item = normalizarINA({ type: 'FeatureCollection', features: [{
            id: 'station.1', geometry: { type: 'Point', coordinates: [-60, -35] },
            properties: { unid: 1, fecha: '2026-10-21T00:00:00Z', nombre: 'Estación', timeseries: '[]' }
        }] })[0];
        await repositorio.guardarOficiales([item]);
        await repositorio.guardarOficiales([item]);
        assert.equal(writes, 2);
    } finally { Alerta.findOneAndUpdate = original; }
});

test('Update resuelve una referencia única y cambia la geometría en el mismo registro', async () => {
    const originals = { findOne: Alerta.findOne, find: Alerta.find, updateOne: Alerta.updateOne, findOneAndUpdate: Alerta.findOneAndUpdate };
    let updatedId;
    Alerta.findOne = () => ({ lean: async () => null });
    Alerta.find = () => ({ lean: async () => [{ _id: 'old-row', fuente: 'SMN', emisor: 'smn@smn.gob.ar', identificadorFuente: 'cap-old', geometria: poligono(-60) }] });
    Alerta.updateOne = async filter => { updatedId = filter._id; };
    Alerta.findOneAndUpdate = async () => assert.fail('un Update resuelto no debe insertar');
    try {
        const update = alertaCAP({ x: -61 });
        await repositorio.guardarOficiales([update]);
        assert.equal(updatedId, 'old-row');
    } finally { Object.assign(Alerta, originals); }
});

test('Update con referencia única conserva el _id del registro al cambiar la geometría', async () => {
    const originals = { findOne: Alerta.findOne, find: Alerta.find, updateOne: Alerta.updateOne, findOneAndUpdate: Alerta.findOneAndUpdate };
    const registro = {
        _id: 'persistencia-original',
        fuente: 'SMN',
        emisor: 'smn@smn.gob.ar',
        identificadorFuente: 'cap-old',
        claveIdempotencia: 'clave-anterior',
        geometria: poligono(-60)
    };
    let actualizado;
    let altas = 0;
    Alerta.findOne = () => ({ lean: async () => null });
    Alerta.find = () => ({ lean: async () => [registro] });
    Alerta.updateOne = async (filtro, update) => {
        actualizado = { ...registro, ...update.$set, _id: filtro._id };
    };
    Alerta.findOneAndUpdate = async () => { altas++; };
    try {
        const update = alertaCAP({ x: -61 });
        await repositorio.guardarOficiales([update]);
        assert.equal(actualizado._id, 'persistencia-original');
        assert.deepEqual(actualizado.geometria, update.geometria);
        assert.notDeepEqual(actualizado.geometria, registro.geometria);
        assert.equal(altas, 0);
    } finally { Object.assign(Alerta, originals); }
});

test('Update con referencia inexistente se registra como alerta nueva', async () => {
    const originals = { findOne: Alerta.findOne, find: Alerta.find, updateOne: Alerta.updateOne, findOneAndUpdate: Alerta.findOneAndUpdate };
    let insertada;
    Alerta.findOne = () => ({ lean: async () => null });
    Alerta.find = () => ({ lean: async () => [] });
    Alerta.updateOne = async () => assert.fail('sin destino no debe modificar registros');
    Alerta.findOneAndUpdate = async (filtro, update, opciones) => {
        insertada = { ...update.$set };
        assert.equal(filtro.claveIdempotencia, insertada.claveIdempotencia);
        assert.equal(opciones.upsert, true);
        return insertada;
    };
    try {
        const alerta = alertaCAP();
        const resultado = await repositorio.guardarOficiales([alerta]);
        assert.equal(resultado[0].tipoMensaje, 'Update');
        assert.equal(resultado[0].identificadorFuente, alerta.identificadorFuente);
        assert.equal(resultado[0].referencias, alerta.referencias);
        assert.equal(resultado[0].claveIdempotencia, alerta.claveIdempotencia);
        assert.deepEqual(insertada, alerta);
    } finally { Object.assign(Alerta, originals); }
});

test('Update con referencia a varios registros regionales no inserta ni modifica', async () => {
    const originals = { findOne: Alerta.findOne, find: Alerta.find, updateOne: Alerta.updateOne, findOneAndUpdate: Alerta.findOneAndUpdate };
    let writes = 0;
    Alerta.findOne = () => ({ lean: async () => null });
    Alerta.find = () => ({ lean: async () => [
        { _id: 'region-1', fuente: 'SMN', emisor: 'smn@smn.gob.ar', identificadorFuente: 'cap-old', geometria: poligono(-60) },
        { _id: 'region-2', fuente: 'SMN', emisor: 'smn@smn.gob.ar', identificadorFuente: 'cap-old', geometria: poligono(-70) }
    ] });
    Alerta.updateOne = async () => { writes++; };
    Alerta.findOneAndUpdate = async () => { writes++; };
    try {
        await assert.rejects(repositorio.guardarOficiales([alertaCAP({ x: -61 })]), /Update CAP ambiguo/);
        assert.equal(writes, 0);
    } finally { Object.assign(Alerta, originals); }
});

test('Update sin referencias se registra como alerta nueva', async () => {
    const originals = { findOne: Alerta.findOne, find: Alerta.find, updateOne: Alerta.updateOne, findOneAndUpdate: Alerta.findOneAndUpdate };
    let insertada;
    Alerta.findOne = () => ({ lean: async () => null });
    Alerta.find = () => ({ lean: async () => [] });
    Alerta.updateOne = async () => assert.fail('sin referencias no debe modificar registros');
    Alerta.findOneAndUpdate = async (_filtro, update, opciones) => {
        insertada = update.$set;
        assert.equal(opciones.upsert, true);
        return insertada;
    };
    try {
        const alerta = alertaCAP({ identifier: 'update-sin-ref', msgType: 'Update', references: null, x: -62 });
        const resultado = await repositorio.guardarOficiales([alerta]);
        assert.equal(resultado[0].tipoMensaje, 'Update');
        assert.equal(resultado[0].identificadorFuente, 'update-sin-ref');
        assert.equal(resultado[0].referencias, null);
        assert.equal(resultado[0].claveIdempotencia, alerta.claveIdempotencia);
        assert.deepEqual(insertada, alerta);
    } finally { Object.assign(Alerta, originals); }
});

test('reingesta idempotente de Update sin destino no duplica el mensaje CAP', async () => {
    const originals = { findOne: Alerta.findOne, find: Alerta.find, updateOne: Alerta.updateOne, findOneAndUpdate: Alerta.findOneAndUpdate };
    const registros = new Map();
    let inserciones = 0;
    Alerta.find = () => ({ lean: async () => [] });
    Alerta.findOne = filtro => ({ lean: async () => registros.get(filtro.claveIdempotencia) || null });
    Alerta.updateOne = async (filtro, update) => Object.assign(registros.get(filtro._id), update.$set);
    Alerta.findOneAndUpdate = async (filtro, update) => {
        inserciones++;
        const registro = { _id: filtro.claveIdempotencia, ...update.$set };
        registros.set(filtro.claveIdempotencia, registro);
        return registro;
    };
    try {
        const update = alertaCAP({ identifier: 'update-reingesta' });
        await repositorio.guardarOficiales([update]);
        await repositorio.guardarOficiales([update]);
        assert.equal(registros.size, 1);
        assert.equal(inserciones, 1);
        assert.equal([...registros.values()][0].tipoMensaje, 'Update');
    } finally { Object.assign(Alerta, originals); }
});

test('Cancel sin destino devuelve resultado explícito y no inserta ni elimina', async () => {
    const originals = { find: Alerta.find, deleteMany: Alerta.deleteMany, findOneAndUpdate: Alerta.findOneAndUpdate };
    let mutaciones = 0;
    Alerta.find = () => ({ lean: async () => [] });
    Alerta.deleteMany = async () => { mutaciones++; };
    Alerta.findOneAndUpdate = async () => { mutaciones++; };
    try {
        const cancel = alertaCAP({ identifier: 'cancel-sin-destino', msgType: 'Cancel' });
        const resultado = await repositorio.guardarOficiales([cancel]);
        assert.deepEqual(resultado[0], { cancelada: false, motivo: 'referencia-no-encontrada' });
        assert.equal(mutaciones, 0);
    } finally { Object.assign(Alerta, originals); }
});

test('Update ambiguo no inserta ni modifica y Cancel sintético elimina solo referencia única', async () => {
    const originals = { findOne: Alerta.findOne, find: Alerta.find, updateOne: Alerta.updateOne, deleteMany: Alerta.deleteMany, findOneAndUpdate: Alerta.findOneAndUpdate };
    let writes = 0;
    Alerta.findOne = () => ({ lean: async () => null });
    Alerta.find = () => ({ lean: async () => [
        { _id: 'row-1', fuente: 'SMN', emisor: 'smn@smn.gob.ar', identificadorFuente: 'cap-old', geometria: poligono(-60) },
        { _id: 'row-2', fuente: 'SMN', emisor: 'smn@smn.gob.ar', identificadorFuente: 'cap-old', geometria: poligono(-70) }
    ] });
    Alerta.updateOne = async () => { writes++; };
    Alerta.deleteMany = async () => { writes++; };
    Alerta.findOneAndUpdate = async () => { writes++; };
    try {
        await assert.rejects(repositorio.guardarOficiales([alertaCAP({ x: -61 })]), /ambiguo/);
        assert.equal(writes, 0);

        Alerta.find = () => ({ lean: async () => [
            { _id: 'row-1', fuente: 'SMN', emisor: 'smn@smn.gob.ar', identificadorFuente: 'cap-old' }
        ] });
        const capCancelXML = `<alert><identifier>cap-cancel</identifier><sender>smn@smn.gob.ar</sender><sent>2026-10-21T00:00:00Z</sent><status>Actual</status><msgType>Cancel</msgType><scope>Public</scope><references>smn@smn.gob.ar,cap-old,2026-10-20T00:00:00Z</references></alert>`;
        const cancel = normalizarSMN(parsearCAP(capCancelXML));
        const result = await repositorio.guardarOficiales([cancel]);
        assert.equal(result[0].cancelada, true);
        assert.equal(writes, 1);
    } finally { Object.assign(Alerta, originals); }
});

test('Cancel ambiguo por identifier repetido conserva todas las alertas', async () => {
    const originals = { find: Alerta.find, deleteMany: Alerta.deleteMany };
    let borrados = 0;
    Alerta.find = () => ({ lean: async () => [
        { _id: 'row-1', fuente: 'SMN', emisor: 'smn@smn.gob.ar', identificadorFuente: 'cap-old' },
        { _id: 'row-2', fuente: 'SMN', emisor: 'smn@smn.gob.ar', identificadorFuente: 'cap-old' }
    ] });
    Alerta.deleteMany = async () => { borrados++; };
    try {
        const cancel = alertaCAP({ identifier: 'cancel-ambiguous', msgType: 'Cancel' });
        await assert.rejects(repositorio.guardarOficiales([cancel]), /Cancel CAP ambiguo/);
        assert.equal(borrados, 0);
    } finally { Object.assign(Alerta, originals); }
});
