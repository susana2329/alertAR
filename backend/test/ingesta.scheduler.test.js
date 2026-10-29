const test = require('node:test');
const assert = require('node:assert/strict');
const crearProgramadorIngesta = require('../src/ingestion/ingesta.scheduler');

function relojFalso() {
    const estado = { callback: null, intervalo: null, token: { id: 'timer' }, limpiado: null };
    return {
        estado,
        programar: (callback, intervalo) => {
            estado.callback = callback;
            estado.intervalo = intervalo;
            return estado.token;
        },
        limpiar: token => { estado.limpiado = token; }
    };
}

function loggerFalso() {
    return { infos: [], errores: [],
        info(...args) { this.infos.push(args); },
        error(...args) { this.errores.push(args); }
    };
}

const siguienteTurno = () => new Promise(resolve => setImmediate(resolve));

test('inicia una ronda sincrónicamente y programa el intervalo configurado', async () => {
    const reloj = relojFalso();
    const logger = loggerFalso();
    let rondas = 0;
    const programador = crearProgramadorIngesta({
        ejecutarIngesta: async () => { rondas++; return { SMN: { estado: 'completada' } }; },
        intervaloMs: 1234,
        programar: reloj.programar,
        limpiar: reloj.limpiar,
        logger
    });

    programador.iniciar();
    assert.equal(rondas, 1);
    assert.equal(reloj.estado.intervalo, 1234);
    await siguienteTurno();
    assert.equal(logger.infos.length, 1);
    assert.equal(logger.infos[0][0], 'ingesta_completada');
    assert.deepEqual(logger.infos[0][1].fuentes.SMN, {
        estado: 'completada', inicio: null, fin: null, duracionMs: null, recibidos: null,
        normalizados: 0, guardados: 0, actualizados: 0, eliminados: 0, omitidos: 0, fallidos: 0,
        error: null, erroresDocumentos: [], erroresPersistencia: [], erroresRegistros: []
    });
    programador.detener();
});

test('ejecuta una ronda en cada tick periódico posterior', async () => {
    const reloj = relojFalso();
    let rondas = 0;
    const programador = crearProgramadorIngesta({
        ejecutarIngesta: async () => { rondas++; return {}; },
        intervaloMs: 500,
        programar: reloj.programar,
        limpiar: reloj.limpiar,
        logger: loggerFalso()
    });
    programador.iniciar();
    await siguienteTurno();
    reloj.estado.callback();
    await siguienteTurno();
    reloj.estado.callback();
    await siguienteTurno();
    assert.equal(rondas, 3);
    programador.detener();
});

test('omite ticks mientras una ronda anterior sigue en ejecución', async () => {
    const reloj = relojFalso();
    const resoluciones = [];
    let rondas = 0;
    const programador = crearProgramadorIngesta({
        ejecutarIngesta: () => {
            rondas++;
            return new Promise(resolve => resoluciones.push(resolve));
        },
        intervaloMs: 500,
        programar: reloj.programar,
        limpiar: reloj.limpiar,
        logger: loggerFalso()
    });
    programador.iniciar();
    reloj.estado.callback();
    assert.equal(rondas, 1);
    resoluciones.shift()({});
    await siguienteTurno();
    reloj.estado.callback();
    assert.equal(rondas, 2);
    resoluciones.shift()({});
    await siguienteTurno();
    programador.detener();
});

test('registra excepciones de una ronda y sigue ejecutando en ticks posteriores', async () => {
    const reloj = relojFalso();
    const logger = loggerFalso();
    let rondas = 0;
    const programador = crearProgramadorIngesta({
        ejecutarIngesta: async () => {
            rondas++;
            if (rondas === 1) throw new Error('fallo de prueba');
            return { INA: { estado: 'parcial', erroresDocumentos: [{ mensaje: 'CAP inaccesible' }] } };
        },
        intervaloMs: 500,
        programar: reloj.programar,
        limpiar: reloj.limpiar,
        logger
    });
    programador.iniciar();
    await siguienteTurno();
    assert.equal(logger.errores[0][0], 'ingesta_fallida');
    assert.equal(logger.errores[0][1].mensaje, 'fallo de prueba');
    reloj.estado.callback();
    await siguienteTurno();
    assert.equal(rondas, 2);
    assert.equal(logger.infos.length, 1);
    assert.equal(logger.infos[0][1].fuentes.INA.erroresDocumentos[0].mensaje, 'CAP inaccesible');
    programador.detener();
});

test('detener limpia el intervalo e impide nuevas rondas', async () => {
    const reloj = relojFalso();
    let rondas = 0;
    const programador = crearProgramadorIngesta({
        ejecutarIngesta: async () => { rondas++; return {}; },
        intervaloMs: 500,
        programar: reloj.programar,
        limpiar: reloj.limpiar,
        logger: loggerFalso()
    });
    programador.iniciar();
    await siguienteTurno();
    programador.detener();
    reloj.estado.callback();
    await siguienteTurno();
    assert.equal(rondas, 1);
    assert.equal(reloj.estado.limpiado, reloj.estado.token);
});
