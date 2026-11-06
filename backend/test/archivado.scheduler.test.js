const test = require('node:test');
const assert = require('node:assert/strict');
const crearProgramadorArchivado = require('../src/ingestion/archivado.scheduler');

function relojFalso() {
    const estado = { callback: null, intervalo: null, token: { id: 'archiver' }, limpiado: null };
    return {
        estado,
        programar: (callback, intervalo) => { estado.callback = callback; estado.intervalo = intervalo; return estado.token; },
        limpiar: token => { estado.limpiado = token; }
    };
}

const turno = () => new Promise(resolve => setImmediate(resolve));

test('programa el archivado sin ejecutarlo automáticamente al iniciar', async () => {
    const reloj = relojFalso();
    let rondas = 0;
    const scheduler = crearProgramadorArchivado({ ejecutarArchivado: async () => { rondas++; }, intervaloMs: 1500, programar: reloj.programar, limpiar: reloj.limpiar, logger: { info() {}, error() {} } });
    scheduler.iniciar();
    assert.equal(rondas, 0);
    assert.equal(reloj.estado.intervalo, 1500);
    reloj.estado.callback();
    await turno();
    assert.equal(rondas, 1);
    await scheduler.detener();
    assert.equal(reloj.estado.limpiado, reloj.estado.token);
});

test('no permite rondas simultáneas y registra errores sin detener el programador', async () => {
    const reloj = relojFalso();
    let resolver;
    let rondas = 0;
    const logs = { infos: [], errores: [], info(...args) { this.infos.push(args); }, error(...args) { this.errores.push(args); } };
    const scheduler = crearProgramadorArchivado({
        ejecutarArchivado: () => {
            rondas++;
            if (rondas === 1) return new Promise(resolve => { resolver = resolve; });
            throw new Error('fallo recuperable');
        },
        intervaloMs: 1000, programar: reloj.programar, limpiar: reloj.limpiar, logger: logs
    });
    scheduler.iniciar();
    const primera = scheduler.ejecutarRonda();
    reloj.estado.callback();
    assert.equal(rondas, 0);
    await turno();
    assert.equal(rondas, 1);
    resolver({ eliminados: 1 });
    await primera;
    reloj.estado.callback();
    await turno();
    assert.equal(rondas, 2);
    assert.equal(logs.infos[0][0], 'archivado_periodico_completado');
    assert.equal(logs.errores[0][0], 'archivado_periodico_fallido');
    await scheduler.detener();
});
