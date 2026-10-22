const test = require('node:test');
const assert = require('node:assert/strict');
const ejecutarIngesta = require('../src/ingestion/ingesta.service');
const { extraerEnlacesCAP } = require('../src/ingestion/sources/smn.source');
const { normalizarINPRES } = require('../src/ingestion/normalizers/inpres.normalizer');

const alerta = fuente => ({ fuente, claveIdempotencia: `${fuente}:1` });

test('procesa SMN, INA e INPRES respetando los documentos que devuelve cada fuente', async () => {
    const xmlSMN = '<smn/>';
    const xmlINPRES = '<inpres/>';
    const documentoINA = { type: 'FeatureCollection', features: [] };
    const llamadas = [];
    const resumen = await ejecutarIngesta({
        obtenerDocumentoSMN: async () => xmlSMN,
        extraerEnlacesCAP: () => ['https://ssl.smn.gob.ar/feeds/CAP/xml_generados/smn.xml'],
        obtenerTexto: async url => { assert.match(url, /smn\.xml$/); return xmlSMN; },
        parsearCAP: xml => { assert.equal(xml, xmlSMN); return { cap: true }; },
        normalizarSMN: cap => { assert.deepEqual(cap, { cap: true }); return alerta('SMN'); },
        obtenerObservacionesINA: async () => documentoINA,
        normalizarINA: documento => { assert.equal(documento, documentoINA); return [alerta('INA')]; },
        obtenerSismosINPRES: async () => xmlINPRES,
        normalizarINPRES: xml => { assert.equal(xml, xmlINPRES); return [alerta('INPRES')]; },
        guardarOficiales: async registros => { llamadas.push(registros); return registros.map(x => ({ guardado: x.fuente })); }
    });

    assert.deepEqual(llamadas.map(x => x[0].fuente).sort(), ['INA', 'INPRES', 'SMN']);
    for (const fuente of ['SMN', 'INA', 'INPRES']) {
        assert.equal(resumen[fuente].estado, 'completada');
        assert.equal(resumen[fuente].cantidadNormalizada, 1);
        assert.deepEqual(resumen[fuente].persistencia, [{ guardado: fuente }]);
        assert.deepEqual(resumen[fuente].resultadosPersistencia, fuente === 'SMN'
            ? [{ url: 'https://ssl.smn.gob.ar/feeds/CAP/xml_generados/smn.xml', estado: 'completado' }]
            : [{ estado: 'completado' }]);
        assert.equal(resumen[fuente].error, null);
    }
});

test('un fallo de descarga o normalización no impide intentar las otras fuentes', async () => {
    const intentadas = [];
    const resumen = await ejecutarIngesta({
        obtenerDocumentoSMN: async () => { throw new Error('sin servicio'); },
        obtenerObservacionesINA: async () => { intentadas.push('INA'); return {}; },
        normalizarINA: () => { throw new Error('documento inválido'); },
        obtenerSismosINPRES: async () => { intentadas.push('INPRES'); return '<x/>'; },
        normalizarINPRES: () => [alerta('INPRES')],
        guardarOficiales: async items => items
    });
    assert.deepEqual(intentadas, ['INA', 'INPRES']);
    assert.equal(resumen.SMN.estado, 'error');
    assert.equal(resumen.SMN.error.etapa, 'indice');
    assert.equal(resumen.INA.estado, 'error');
    assert.equal(resumen.INPRES.estado, 'completada');
});

test('registra errores y resultados de persistencia por separado para cada fuente', async () => {
    const resumen = await ejecutarIngesta({
        obtenerDocumentoSMN: async () => '<smn/>', extraerEnlacesCAP: () => ['cap.xml'],
        obtenerTexto: async () => '<cap/>', parsearCAP: () => ({}), normalizarSMN: () => alerta('SMN'),
        obtenerObservacionesINA: async () => ({ type: 'FeatureCollection', features: [] }),
        normalizarINA: () => [alerta('INA')],
        obtenerSismosINPRES: async () => '<inpres/>', normalizarINPRES: () => [],
        guardarOficiales: async items => {
            if (items[0]?.fuente === 'SMN') throw new Error('validación rechazada');
            return { guardados: items.length };
        }
    });
    assert.equal(resumen.SMN.estado, 'error');
    assert.equal(resumen.SMN.cantidadNormalizada, 1);
    assert.deepEqual(resumen.SMN.error, { etapa: 'persistencia', mensaje: 'No se pudo persistir ningún documento CAP válido' });
    assert.deepEqual(resumen.SMN.erroresPersistencia, [{ url: 'cap.xml', mensaje: 'validación rechazada' }]);
    assert.deepEqual(resumen.INA.persistencia, { guardados: 1 });
    assert.equal(resumen.INPRES.estado, 'completada');
    assert.equal(resumen.INPRES.cantidadNormalizada, 0);
});

function dependenciasSMN(resultadoPersistencia) {
    return {
        obtenerDocumentoSMN: async () => '<smn/>',
        extraerEnlacesCAP: () => ['cap.xml'],
        obtenerTexto: async () => '<cap/>',
        parsearCAP: () => ({}),
        normalizarSMN: () => alerta('SMN'),
        obtenerObservacionesINA: async () => ({ type: 'FeatureCollection', features: [] }),
        normalizarINA: () => [],
        obtenerSismosINPRES: async () => '<inpres/>',
        normalizarINPRES: () => [],
        guardarOficiales: async registros => registros[0].fuente === 'SMN'
            ? resultadoPersistencia
            : []
    };
}

test('clasifica Update sin destino como parcial y conserva el resultado CAP completo', async () => {
    const resultado = { actualizada: false, motivo: 'update-referencia-no-encontrada' };
    const resumen = await ejecutarIngesta(dependenciasSMN([resultado]));
    assert.equal(resumen.SMN.estado, 'parcial');
    assert.deepEqual(resumen.SMN.persistencia, [resultado]);
    assert.deepEqual(resumen.SMN.resultadosPersistencia, [{
        url: 'cap.xml', estado: 'no_aplicado', operacion: 'Update', motivo: 'update-referencia-no-encontrada'
    }]);
    assert.equal(resumen.SMN.error, null);
});

test('clasifica operación CAP ambigua como error técnico de persistencia', async () => {
    const resumen = await ejecutarIngesta(dependenciasSMN(Promise.reject(new Error('Update CAP ambiguo'))));
    assert.equal(resumen.SMN.estado, 'error');
    assert.deepEqual(resumen.SMN.error, { etapa: 'persistencia', mensaje: 'No se pudo persistir ningún documento CAP válido' });
    assert.deepEqual(resumen.SMN.erroresPersistencia, [{ url: 'cap.xml', mensaje: 'Update CAP ambiguo' }]);
    assert.deepEqual(resumen.SMN.persistencia, []);
});

test('clasifica resultados mixtos y conserva documentos, objetos y null sin inferir fallos', async () => {
    const documentoMongoose = { _id: 'mongo-1', fuente: 'SMN' };
    const noAplicado = { cancelada: false, motivo: 'referencia-no-encontrada' };
    const resultados = [documentoMongoose, noAplicado, null, false];
    const resumen = await ejecutarIngesta(dependenciasSMN(resultados));
    assert.equal(resumen.SMN.estado, 'parcial');
    assert.deepEqual(resumen.SMN.persistencia, resultados);
    assert.deepEqual(resumen.SMN.resultadosPersistencia, [
        { url: 'cap.xml', estado: 'completado' },
        { url: 'cap.xml', estado: 'no_aplicado', operacion: 'Cancel', motivo: 'referencia-no-encontrada' },
        { url: 'cap.xml', estado: 'completado' },
        { url: 'cap.xml', estado: 'completado' }
    ]);
});

test('procesa CAP individuales aunque falle una descarga o un documento sea inválido', async () => {
    const urls = [
        '../feeds/CAP/xml_generados/uno.xml',
        'https://ssl.smn.gob.ar/feeds/CAP/xml_generados/dos.xml',
        'https://ssl.smn.gob.ar/feeds/CAP/xml_generados/invalido.xml',
        'https://ssl.smn.gob.ar/feeds/CAP/xml_generados/falla.xml',
        'https://otro.example/feeds/CAP/xml_generados/ignorado.xml'
    ];
    const xmlIndice = `<rss><channel>${urls.map(url => `<item><link>${url}</link></item>`).join('')}</channel></rss>`;
    const descargados = [];
    let persistidas;
    const resumen = await ejecutarIngesta({
        obtenerDocumentoSMN: async () => xmlIndice,
        extraerEnlacesCAP,
        obtenerTexto: async url => {
            descargados.push(url);
            if (url.endsWith('/falla.xml')) throw new Error('descarga individual fallida');
            return url.endsWith('/invalido.xml') ? '<invalid/>': `<cap>${url.endsWith('/uno.xml') ? 'uno' : 'dos'}</cap>`;
        },
        parsearCAP: xml => {
            if (xml.includes('<invalid/>')) throw new Error('CAP inválido');
            return { identifier: xml.includes('uno') ? 'uno' : 'dos' };
        },
        normalizarSMN: cap => ({ ...alerta('SMN'), identificadorFuente: cap.identifier }),
        obtenerObservacionesINA: async () => ({ type: 'FeatureCollection', features: [] }),
        normalizarINA: () => [],
        obtenerSismosINPRES: async () => '<inpres/>',
        normalizarINPRES: () => [],
        guardarOficiales: async alertas => { persistidas = [...(persistidas || []), ...alertas]; return alertas.map(a => ({ guardado: a.identificadorFuente })); }
    });

    assert.equal(descargados.length, 4);
    assert.equal(resumen.SMN.estado, 'parcial');
    assert.equal(resumen.SMN.cantidadNormalizada, 2);
    assert.deepEqual(resumen.SMN.erroresDocumentos.map(e => e.mensaje).sort(), [
        'CAP inválido', 'descarga individual fallida'
    ]);
    assert.deepEqual(persistidas.map(a => a.identificadorFuente).sort(), ['dos', 'uno']);
});

test('un fallo de persistencia de un CAP no impide los siguientes y conserva resultados por URL', async () => {
    const urls = ['uno.xml', 'dos.xml', 'tres.xml'].map(nombre => `https://ssl.smn.gob.ar/feeds/CAP/xml_generados/${nombre}`);
    const intentadas = [];
    const noAplicada = { actualizada: false, motivo: 'update-referencia-no-encontrada' };
    const resultadoFinal = { _id: 'guardada-tres', fuente: 'SMN' };
    const resumen = await ejecutarIngesta({
        obtenerDocumentoSMN: async () => '<rss/>',
        extraerEnlacesCAP: () => urls,
        obtenerTexto: async url => `<cap>${url.split('/').pop()}</cap>`,
        parsearCAP: xml => ({ identifier: xml.match(/<cap>(.*)<\/cap>/)[1] }),
        normalizarSMN: cap => ({ ...alerta('SMN'), identificadorFuente: cap.identifier }),
        obtenerObservacionesINA: async () => ({ type: 'FeatureCollection', features: [] }),
        normalizarINA: () => [],
        obtenerSismosINPRES: async () => '<inpres/>',
        normalizarINPRES: () => [],
        guardarOficiales: async ([item]) => {
            intentadas.push(item.identificadorFuente);
            if (item.identificadorFuente === 'dos.xml') throw new Error('validación fallida');
            return [item.identificadorFuente === 'uno.xml' ? noAplicada : resultadoFinal];
        }
    });

    assert.deepEqual(intentadas.sort(), ['dos.xml', 'tres.xml', 'uno.xml']);
    assert.equal(resumen.SMN.estado, 'parcial');
    assert.deepEqual(resumen.SMN.erroresPersistencia, [{ url: urls[1], mensaje: 'validación fallida' }]);
    assert.deepEqual(resumen.SMN.persistencia, [noAplicada, resultadoFinal]);
    assert.deepEqual(resumen.SMN.resultadosPersistencia, [
        { url: urls[0], estado: 'no_aplicado', operacion: 'Update', motivo: 'update-referencia-no-encontrada' },
        { url: urls[2], estado: 'completado' }
    ]);
    assert.deepEqual(resumen.SMN.erroresDocumentos, []);
});

test('todos los CAP fallidos al persistir producen estado error con error por URL', async () => {
    const urls = ['uno.xml', 'dos.xml'];
    const resumen = await ejecutarIngesta({
        obtenerDocumentoSMN: async () => '<rss/>', extraerEnlacesCAP: () => urls,
        obtenerTexto: async url => url, parsearCAP: xml => ({ identifier: xml }),
        normalizarSMN: cap => ({ ...alerta('SMN'), identificadorFuente: cap.identifier }),
        obtenerObservacionesINA: async () => ({ type: 'FeatureCollection', features: [] }), normalizarINA: () => [],
        obtenerSismosINPRES: async () => '<inpres/>', normalizarINPRES: () => [],
        guardarOficiales: async () => { throw new Error('persistencia no disponible'); }
    });
    assert.equal(resumen.SMN.estado, 'error');
    assert.deepEqual(resumen.SMN.erroresPersistencia, urls.map(url => ({ url, mensaje: 'persistencia no disponible' })));
    assert.deepEqual(resumen.SMN.persistencia, []);
});

test('un índice SMN válido sin enlaces se completa con cero CAP', async () => {
    let intentosDePersistencia = 0;
    const resumen = await ejecutarIngesta({
        obtenerDocumentoSMN: async () => '<rss><channel/></rss>',
        extraerEnlacesCAP,
        guardarOficiales: async alertas => { if (alertas.length) intentosDePersistencia++; return []; },
        obtenerObservacionesINA: async () => ({ type: 'FeatureCollection', features: [] }),
        normalizarINA: () => [],
        obtenerSismosINPRES: async () => '<inpres/>',
        normalizarINPRES: () => []
    });
    assert.equal(resumen.SMN.estado, 'completada');
    assert.equal(resumen.SMN.cantidadNormalizada, 0);
    assert.deepEqual(resumen.SMN.erroresDocumentos, []);
    assert.equal(intentosDePersistencia, 0);
});

test('incorpora rechazos por registro INPRES al resumen y persiste los ítems válidos', async () => {
    const xmlINPRES = '<lista>' +
        '<item><idSismo>20261021003000</idSismo><latitud>-35</latitud><longitud>-60</longitud></item>' +
        '<item><idSismo>id-invalido</idSismo><latitud>-34</latitud><longitud>-61</longitud></item>' +
        '<item><idSismo>20261021003200</idSismo><latitud>-33</latitud><longitud>-62</longitud></item>' +
        '</lista>';
    let persistidas;
    const resumen = await ejecutarIngesta({
        obtenerDocumentoSMN: async () => '<rss><channel/></rss>',
        extraerEnlacesCAP,
        obtenerObservacionesINA: async () => ({ type: 'FeatureCollection', features: [] }),
        normalizarINA: () => [],
        obtenerSismosINPRES: async () => xmlINPRES,
        normalizarINPRES,
        guardarOficiales: async alertas => {
            if (alertas.some(alerta => alerta.fuente === 'INPRES')) persistidas = alertas;
            return alertas.map(alerta => ({ guardado: alerta.claveIdempotencia }));
        }
    });
    assert.equal(resumen.INPRES.estado, 'parcial');
    assert.equal(resumen.INPRES.cantidadNormalizada, 2);
    assert.deepEqual(resumen.INPRES.erroresRegistros, [{
        indice: 1,
        identificador: 'id-invalido',
        mensaje: 'idSismo inválido: id-invalido'
    }]);
    assert.deepEqual(persistidas.map(alerta => alerta.claveIdempotencia), [
        'INPRES:20261021003000', 'INPRES:20261021003200'
    ]);
});
