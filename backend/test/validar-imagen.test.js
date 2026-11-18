const test = require('node:test');
const assert = require('node:assert/strict');
const { tipoImagen, validarImagenes } = require('../src/service/validar-imagen');
const { _crearReporteConDependencias } = require('../src/service/reporte.service');

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x02, 0xff, 0xda, 0x00, 0x02, 0xff, 0xd9]);
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13]),
  Buffer.from('IHDR'), Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]),
  Buffer.alloc(4), Buffer.alloc(4), Buffer.from('IEND'), Buffer.alloc(4)
]);
const gif = Buffer.from([71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 0, 0, 0, 0x3b]);
const webp = Buffer.from([82, 73, 70, 70, 12, 0, 0, 0, 87, 69, 66, 80, 86, 80, 56, 76, 0, 0, 0, 0]);
const archivo = (buffer, originalname = 'foto.jpg', mimetype = 'image/jpeg') => ({
  fieldname: 'fotos', originalname, mimetype, encoding: '7bit', size: buffer.length, buffer
});
const body = { tipo: 'incidente', descripcion: 'Prueba', ubicacion: 'Buenos Aires',
  fecha: new Date().toISOString(), latitud: '0', longitud: '0' };

test('detecta JPEG, PNG, GIF y WebP por contenido', () => {
  for (const [buffer, mimetype, extension] of [
    [jpeg, 'image/jpeg', 'jpg'], [png, 'image/png', 'png'],
    [gif, 'image/gif', 'gif'], [webp, 'image/webp', 'webp']
  ]) assert.deepEqual(tipoImagen(buffer), { mimetype, extension });
});

test('rechaza texto disfrazado y archivos vacíos o truncados', () => {
  for (const buffer of [Buffer.alloc(0), Buffer.from('texto ordinario'),
    jpeg.subarray(0, -2), png.subarray(0, -12), gif.subarray(0, -1), webp.subarray(0, -1)]) {
    assert.equal(tipoImagen(buffer), null);
    assert.throws(() => validarImagenes([archivo(buffer)]), { status: 400 });
  }
});

test('respeta cantidad y tamaño máximos existentes', () => {
  assert.throws(() => validarImagenes(Array.from({ length: 4 }, () => archivo(jpeg))), { status: 400 });
  assert.throws(() => validarImagenes([archivo(Buffer.alloc(5 * 1024 * 1024 + 1))]), { status: 413 });
});

test('usa MIME y extensión detectados aunque los metadatos sean falsos', async () => {
  const subidas = [];
  let guardado;
  await _crearReporteConDependencias(body, [archivo(png, 'falso.exe', 'text/plain')], 'usuario', {
    subirImagen: async (key, buffer, mimetype) => subidas.push({ key, buffer, mimetype }),
    guardarReporte: async reporte => { guardado = reporte; return reporte; }
  });
  assert.equal(subidas.length, 1);
  assert.equal(subidas[0].mimetype, 'image/png');
  assert.match(subidas[0].key, /^usuario\/[a-f\d-]+\.png$/);
  assert.equal(guardado.fotos[0].mimetype, 'image/png');
  assert.equal(guardado.fotos[0].originalname, 'falso.exe');
});

test('valida el lote completo antes de subir a S3 o guardar en MongoDB', async () => {
  let operaciones = 0;
  await assert.rejects(_crearReporteConDependencias(body,
    [archivo(jpeg), archivo(Buffer.from('texto'), 'falso.jpg', 'image/jpeg')], 'usuario', {
      subirImagen: async () => { operaciones++; },
      eliminarImagen: async () => { operaciones++; },
      guardarReporte: async () => { operaciones++; }
    }), { status: 400 });
  assert.equal(operaciones, 0);
});
