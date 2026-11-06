const test = require('node:test');
const assert = require('node:assert/strict');
const Alerta = require('../src/models/alerta.model');
const repositorio = require('../src/repository/alerta.repository');
const historicoRepository = require('../src/repository/alerta-historica.repository');

const originales = {
    findOne: Alerta.findOne,
    exists: Alerta.exists,
    findOneAndUpdate: Alerta.findOneAndUpdate,
    updateOne: Alerta.updateOne,
    guardarHistorico: historicoRepository.guardarDesdeIngesta
};
test.afterEach(() => {
    Alerta.findOne = originales.findOne;
    Alerta.exists = originales.exists;
    Alerta.findOneAndUpdate = originales.findOneAndUpdate;
    Alerta.updateOne = originales.updateOne;
    historicoRepository.guardarDesdeIngesta = originales.guardarHistorico;
});

const observacionAntigua = () => ({
    fuente: 'INPRES', origen: 'oficial', identificadorFuente: 'sismo-1',
    claveIdempotencia: 'INPRES:2020-01-01T00:00:00.000Z',
    fechaInicio: new Date('2020-01-01T00:00:00Z'), fechaFin: null,
    tipo: 'observacion', naturaleza: 'observacion', nivel: 'informativo', geometria: null
});

test('la ingesta conserva en históricos los registros vencidos y no los reintroduce en alertas', async () => {
    const historicos = new Map();
    let escriturasOperativas = 0;
    Alerta.findOne = () => ({ lean: async () => null });
    Alerta.findOneAndUpdate = async () => { escriturasOperativas++; };
    historicoRepository.guardarDesdeIngesta = async documento => {
        historicos.set(documento.claveIdempotencia, documento);
        return documento;
    };
    const acciones = [];
    await repositorio.guardarOficiales([observacionAntigua()], { onResultado: accion => acciones.push(accion) });
    await repositorio.guardarOficiales([observacionAntigua()], { onResultado: accion => acciones.push(accion) });
    assert.equal(historicos.size, 1);
    assert.equal(escriturasOperativas, 0);
    assert.deepEqual(acciones, ['archivada', 'archivada']);
});

test('la ruta de otras fuentes mantiene en operación observaciones recientes', async () => {
    let escriturasOperativas = 0;
    let escriturasHistoricas = 0;
    const actual = { ...observacionAntigua(), fuente: 'INPRES', claveIdempotencia: 'INPRES:actual', fechaInicio: new Date() };
    Alerta.exists = async () => false;
    Alerta.findOneAndUpdate = async (_filtro, update) => { escriturasOperativas++; return update.$set; };
    historicoRepository.guardarDesdeIngesta = async () => { escriturasHistoricas++; };
    await repositorio.guardarOficiales([actual]);
    assert.equal(escriturasOperativas, 1);
    assert.equal(escriturasHistoricas, 0);
});
