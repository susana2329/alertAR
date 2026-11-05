const test = require('node:test');
const assert = require('node:assert/strict');
const { _crearReporteConDependencias } = require('../src/service/reporte.service');

const archivo = (originalname) => ({
    fieldname: 'fotos', originalname, encoding: '7bit', mimetype: 'image/jpeg', size: 12, buffer: Buffer.from('foto')
});

test('no guarda el reporte si falla una subida y limpia las imágenes que sí llegaron a S3', async () => {
    const eliminadas = [];
    let guardados = 0;
    const subirImagen = async (key) => {
        if (key.endsWith('falla.jpg')) throw new Error('S3 no disponible');
        return { ok: true };
    };

    await assert.rejects(
        _crearReporteConDependencias({}, [archivo('ok.jpg'), archivo('falla.jpg')], 'usuario', {
            subirImagen,
            eliminarImagen: async key => eliminadas.push(key),
            guardarReporte: async () => { guardados++; return { _id: 'reporte' }; }
        }),
        /S3 no disponible/
    );

    assert.equal(guardados, 0);
    assert.equal(eliminadas.length, 2);
    assert.match(eliminadas[0], /ok\.jpg$/);
    assert.match(eliminadas[1], /falla\.jpg$/);
});

test('si falla MongoDB borra las fotos subidas y propaga el error', async () => {
    const eliminadas = [];
    await assert.rejects(
        _crearReporteConDependencias({}, [archivo('foto.jpg')], 'usuario', {
            subirImagen: async () => ({ ok: true }),
            eliminarImagen: async key => eliminadas.push(key),
            guardarReporte: async () => { throw new Error('Mongo no disponible'); }
        }),
        /Mongo no disponible/
    );
    assert.equal(eliminadas.length, 1);
});

test('permite crear reportes sin fotos y persiste una lista vacía', async () => {
    let reporteGuardado;
    const resultado = await _crearReporteConDependencias({}, undefined, 'usuario', {
        subirImagen: async () => assert.fail('no debe subir imágenes'),
        guardarReporte: async reporte => { reporteGuardado = reporte; return { _id: 'reporte' }; }
    });
    assert.equal(resultado._id, 'reporte');
    assert.deepEqual(reporteGuardado.fotos, []);
});
