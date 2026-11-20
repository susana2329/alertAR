const test = require('node:test');
const assert = require('node:assert/strict');
const {
    _crearReporteConDependencias,
    _normalizarTipoReporte,
    listarReportesUsuario,
    obtenerFotosReporteVecinal,
    moderarReporte,
    listarReportesPendientesModeracion
} = require('../src/service/reporte.service');

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x02, 0xff, 0xda, 0x00, 0x02, 0xff, 0xd9]);
const archivo = (originalname) => ({
    fieldname: 'fotos', originalname, encoding: '7bit', mimetype: 'image/jpeg', size: jpeg.length, buffer: jpeg
});
const bodyValido = {
    tipo: 'inundación',
    descripcion: 'Agua sobre la calle',
    ubicacion: 'Buenos Aires',
    fecha: new Date().toISOString(),
    latitud: '-34.6',
    longitud: '-58.4',
    estado: 'En revisión'
};

test('no guarda el reporte si falla una subida y limpia las imágenes que sí llegaron a S3', async () => {
    const eliminadas = [];
    let guardados = 0;
    let subidas = 0;
    const subirImagen = async (key) => {
        if (subidas++ === 1) throw new Error('S3 no disponible');
        return { ok: true };
    };

    await assert.rejects(
        _crearReporteConDependencias(bodyValido, [archivo('ok.jpg'), archivo('falla.jpg')], 'usuario', {
            subirImagen,
            eliminarImagen: async key => eliminadas.push(key),
            guardarReporte: async () => { guardados++; return { _id: 'reporte' }; }
        }),
        /S3 no disponible/
    );

    assert.equal(guardados, 0);
    assert.equal(eliminadas.length, 2);
    assert.match(eliminadas[0], /^usuario\/[a-f\d-]+\.jpg$/);
    assert.match(eliminadas[1], /^usuario\/[a-f\d-]+\.jpg$/);
});

test('si falla MongoDB borra las fotos subidas y propaga el error', async () => {
    const eliminadas = [];
    await assert.rejects(
        _crearReporteConDependencias(bodyValido, [archivo('foto.jpg')], 'usuario', {
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
    const resultado = await _crearReporteConDependencias(bodyValido, undefined, 'usuario', {
        subirImagen: async () => assert.fail('no debe subir imágenes'),
        guardarReporte: async reporte => { reporteGuardado = reporte; return { _id: 'reporte' }; }
    });
    assert.equal(resultado._id, 'reporte');
    assert.deepEqual(reporteGuardado.fotos, []);
    assert.deepEqual(reporteGuardado.geometria, { type: 'Point', coordinates: [-58.4, -34.6] });
    assert.equal(reporteGuardado.estadoVecinal, 'sin_confirmar');
    assert.equal(reporteGuardado.tipo, 'inundacion');
});

test('no guarda un reporte si el cliente adjuntó menos fotos de las que seleccionó', async () => {
    let operaciones = 0;
    await assert.rejects(
        _crearReporteConDependencias({ ...bodyValido, cantidadFotos: '1' }, [], 'usuario', {
            subirImagen: async () => { operaciones++; },
            guardarReporte: async () => { operaciones++; }
        }),
        { status: 400, message: /No se recibieron todas las fotos/ }
    );
    assert.equal(operaciones, 0);
});

test('rechaza ubicaciones fuera de rango antes de subir fotos o guardar', async () => {
    let operaciones = 0;
    await assert.rejects(
        _crearReporteConDependencias({ ...bodyValido, latitud: '91' }, [archivo('foto.jpg')], 'usuario', {
            subirImagen: async () => { operaciones++; },
            guardarReporte: async () => { operaciones++; }
        }),
        { status: 400 }
    );
    assert.equal(operaciones, 0);
});

test('rechaza coordenadas vacías en lugar de interpretarlas como cero', async () => {
    await assert.rejects(
        _crearReporteConDependencias({ ...bodyValido, latitud: '' }, [], 'usuario', {
            guardarReporte: assert.fail
        }),
        { status: 400 }
    );
});

test('adapta las categorías reales del formulario a los tipos que entiende el mapa', () => {
    assert.equal(_normalizarTipoReporte('Indundaciones'), 'inundacion');
    assert.equal(_normalizarTipoReporte('Calle bloqueada'), 'transito');
    assert.equal(_normalizarTipoReporte('Caida de arbol'), 'arbol');
    assert.equal(_normalizarTipoReporte('Incendios'), 'incidente');
});

test('firma todas las fotos de todos los reportes del usuario sin exponer claves S3', async () => {
    const reportes = await listarReportesUsuario('usuario-1', {
        listar: async () => [
            { _id: 'reporte-1', fotos: [{ key: 'privado/a.jpg', originalname: 'a.jpg' }] },
            { _id: 'reporte-2', fotos: [{ key: 'privado/b.jpg' }, { key: 'privado/c.jpg' }] }
        ],
        firmarImagen: async key => `https://s3.example/${key}?firma=temporal`
    });

    assert.equal(reportes.length, 2);
    assert.deepEqual(reportes.map(reporte => reporte.fotos.length), [1, 2]);
    assert.equal(reportes[1].fotos[0].url, 'https://s3.example/privado/b.jpg?firma=temporal');
    assert.equal(Object.hasOwn(reportes[1].fotos[0], 'key'), false);
});

test('mis reportes firma fotos aprobadas y pendientes, pero nunca las rechazadas', async () => {
    const clavesFirmadas = [];
    const reportes = await listarReportesUsuario('usuario-1', {
        listar: async () => ['aprobado', 'pendiente', 'rechazado'].map(estadoModeracion => ({
            estadoModeracion, fotos: [{ key: `privado/${estadoModeracion}.jpg` }]
        })),
        firmarImagen: async key => { clavesFirmadas.push(key); return 'https://ejemplo.test/foto'; }
    });
    assert.deepEqual(reportes.map(reporte => reporte.fotos.length), [1, 1, 0]);
    assert.deepEqual(clavesFirmadas, ['privado/aprobado.jpg', 'privado/pendiente.jpg']);
    assert.doesNotMatch(JSON.stringify(reportes), /privado\//);
});

test('devuelve fotos vecinales con URLs firmadas y propaga fallos de S3', async () => {
    const fotos = await obtenerFotosReporteVecinal('507f1f77bcf86cd799439011', {
        obtener: async () => ({ fotos: [{ key: 'privado/mapa.jpg', mimetype: 'image/jpeg' }] }),
        firmarImagen: async () => 'https://s3.example/mapa.jpg?firma=temporal'
    });
    assert.equal(fotos[0].url, 'https://s3.example/mapa.jpg?firma=temporal');
    assert.equal(Object.hasOwn(fotos[0], 'key'), false);

    await assert.rejects(obtenerFotosReporteVecinal('507f1f77bcf86cd799439011', {
        obtener: async () => ({ fotos: [{ key: 'privado/mapa.jpg' }] }),
        firmarImagen: async () => { throw new Error('S3 no disponible'); }
    }), /S3 no disponible/);
});

test('no entrega imágenes de reportes inexistentes o cerrados', async () => {
    await assert.rejects(obtenerFotosReporteVecinal('507f1f77bcf86cd799439011', {
        obtener: async () => null
    }), { status: 404 });
    await assert.rejects(obtenerFotosReporteVecinal('../id-invalido', {
        obtener: assert.fail
    }), { status: 400 });
});

test('crea reporte con fotos en estado de moderacion pendiente y sin fotos en aprobado', async () => {
    let conFotos;
    await _crearReporteConDependencias(bodyValido, [archivo('foto.jpg')], 'usuario', {
        subirImagen: async () => ({ ok: true }),
        guardarReporte: async r => { conFotos = r; return { _id: 'rep1' }; }
    });
    assert.equal(conFotos.estadoModeracion, 'pendiente');

    let sinFotos;
    await _crearReporteConDependencias(bodyValido, [], 'usuario', {
        subirImagen: async () => assert.fail(),
        guardarReporte: async r => { sinFotos = r; return { _id: 'rep2' }; }
    });
    assert.equal(sinFotos.estadoModeracion, 'aprobado');
});

test('no entrega fotos vecinales al mapa si estan pendientes de moderacion', async () => {
    const fotos = await obtenerFotosReporteVecinal('507f1f77bcf86cd799439011', {
        obtener: async () => ({ estadoModeracion: 'pendiente', fotos: [{ key: 'privado/mapa.jpg' }] }),
        firmarImagen: async () => 'https://s3.example/mapa.jpg'
    });
    assert.deepEqual(fotos, []);
});

test('no firma fotos vecinales rechazadas incluso si el repositorio las devuelve', async () => {
    const fotos = await obtenerFotosReporteVecinal('507f1f77bcf86cd799439011', {
        obtener: async () => ({ estadoModeracion: 'rechazado', fotos: [{ key: 'privado/foto.jpg' }] }),
        firmarImagen: assert.fail
    });
    assert.deepEqual(fotos, []);
});

test('moderarReporte aprueba fotos y mantiene estado vecinal', async () => {
    let actualizadoCon;
    const res = await moderarReporte('507f1f77bcf86cd799439011', 'moderador1', 'aprobar', '', {
        actualizar: async (id, datos) => {
            actualizadoCon = datos;
            return { _id: id, estadoVecinal: 'sin_confirmar', fotos: [{ key: 'foto.jpg' }] };
        }
    });

    assert.equal(res.reporte.estadoModeracion, 'aprobado');
    assert.equal(actualizadoCon.estadoModeracion, 'aprobado');
    assert.equal(actualizadoCon.moderadoPor, 'moderador1');
});

test('moderarReporte rechaza atómicamente, conserva referencias y purga las fotos de S3', async () => {
    const eliminadas = [];
    let actualizadoCon;
    const res = await moderarReporte('507f1f77bcf86cd799439011', 'moderador1', 'rechazar', 'Foto ofensiva', {
        actualizar: async (id, datos) => {
            actualizadoCon = datos;
            return { _id: id, fotos: [{ key: 'privado/inapropiada.jpg' }] };
        },
        eliminarImagen: async key => eliminadas.push(key)
    });

    assert.equal(res.reporte.estadoModeracion, 'rechazado');
    assert.equal(res.reporte.estadoVecinal, 'cerrado');
    assert.equal(res.limpiezaFotos, 'completa');
    assert.equal(eliminadas.length, 1);
    assert.equal(eliminadas[0], 'privado/inapropiada.jpg');
    assert.equal(actualizadoCon.estadoModeracion, 'rechazado');
    assert.equal(actualizadoCon.estadoVecinal, 'cerrado');
    assert.equal(Object.hasOwn(actualizadoCon, 'fotos'), false);
    assert.equal(actualizadoCon.motivoModeracion, 'Foto ofensiva');
});

test('rechazar conserva las referencias si falla S3 y devuelve los estados ya confirmados', async () => {
    const clavesIntentadas = [];
    const res = await moderarReporte('507f1f77bcf86cd799439011', 'moderador1', 'rechazar', '', {
        actualizar: async () => ({ _id: '507f1f77bcf86cd799439011', fotos: [{ key: 'privado/foto.jpg' }] }),
        eliminarImagen: async key => { clavesIntentadas.push(key); throw new Error('S3 caído'); }
    });

    assert.deepEqual(clavesIntentadas, ['privado/foto.jpg']);
    assert.equal(res.reporte.estadoModeracion, 'rechazado');
    assert.equal(res.reporte.estadoVecinal, 'cerrado');
    assert.equal(res.limpiezaFotos, 'pendiente');
    assert.match(res.mensaje, /no se pudieron eliminar/);
    assert.doesNotMatch(JSON.stringify(res), /privado/);
});

test('rechazo con eliminación parcial conserva referencias y no informa limpieza completa', async () => {
    let datosActualizacion;
    const resultado = await moderarReporte('507f1f77bcf86cd799439011', 'moderador1', 'rechazar', '', {
        actualizar: async (id, datos) => {
            datosActualizacion = datos;
            return { _id: id, fotos: [{ key: 'privado/a' }, { key: 'privado/b' }] };
        },
        eliminarImagen: async key => { if (key.endsWith('/b')) throw new Error('fallo'); }
    });
    assert.equal(resultado.limpiezaFotos, 'pendiente');
    assert.equal(Object.hasOwn(datosActualizacion, 'fotos'), false);
});

test('rechazar por segunda vez devuelve 409 sin intentar borrar fotos', async () => {
    let llamadasS3 = 0;
    await assert.rejects(moderarReporte('507f1f77bcf86cd799439011', 'moderador2', 'rechazar', '', {
        actualizar: async () => null,
        existe: async () => true,
        eliminarImagen: async () => { llamadasS3++; }
    }), { status: 409 });
    assert.equal(llamadasS3, 0);
});

test('dos moderadores concurrentes producen una sola transición y solo el ganador borra fotos', async () => {
    let pendiente = true;
    let llamadasS3 = 0;
    const dependencias = {
        actualizar: async () => {
            if (!pendiente) return null;
            pendiente = false;
            return { _id: '507f1f77bcf86cd799439011', fotos: [{ key: 'privado/foto.jpg' }] };
        },
        existe: async () => true,
        eliminarImagen: async () => { llamadasS3++; }
    };
    const resultados = await Promise.allSettled([
        moderarReporte('507f1f77bcf86cd799439011', 'moderador1', 'rechazar', '', dependencias),
        moderarReporte('507f1f77bcf86cd799439011', 'moderador2', 'rechazar', '', dependencias)
    ]);

    assert.equal(resultados.filter(resultado => resultado.status === 'fulfilled').length, 1);
    const rechazado = resultados.find(resultado => resultado.status === 'rejected');
    assert.equal(rechazado.reason.status, 409);
    assert.equal(llamadasS3, 1);
});
