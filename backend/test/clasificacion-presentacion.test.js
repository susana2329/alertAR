const test = require('node:test');
const assert = require('node:assert/strict');
const { presentarClasificacion } = require('../src/service/clasificacion-presentacion');

test('presenta los cuatro niveles con colores y etiquetas visuales diferenciados', () => {
    assert.deepEqual(presentarClasificacion('informativo', 'observacion'), { etiqueta: 'INFORMATIVO', color: 'azul' });
    assert.deepEqual(presentarClasificacion('precaucion', 'alerta'), { etiqueta: 'PRECAUCIÓN', color: 'amarillo' });
    assert.deepEqual(presentarClasificacion('advertencia', 'alerta'), { etiqueta: 'ALERTA', color: 'naranja' });
    assert.deepEqual(presentarClasificacion('emergencia', 'alerta'), { etiqueta: 'EMERGENCIA', color: 'rojo' });
});

test('mantiene desconocido neutro incluso si la naturaleza es contexto o la severidad no existe', () => {
    assert.deepEqual(presentarClasificacion('desconocido', 'contexto'), { etiqueta: 'DESCONOCIDO', color: 'neutro' });
    assert.deepEqual(presentarClasificacion('no-definido', 'alerta'), { etiqueta: 'DESCONOCIDO', color: 'neutro' });
});

test('presenta como informativo azul el contexto con nivel conocido sin cambiar el nivel almacenado', () => {
    assert.deepEqual(presentarClasificacion('advertencia', 'contexto'), { etiqueta: 'INFORMATIVO', color: 'azul' });
});
