const test = require('node:test');
const assert = require('node:assert/strict');
const alertaRepository = require('../src/repository/alerta.repository');
const historicoRepository = require('../src/repository/alerta-historica.repository');
const { archivarAlertas } = require('../src/service/archivado-alertas.service');

const originales = {
    contar: alertaRepository.contarArchivables,
    lote: alertaRepository.obtenerLoteArchivable,
    eliminar: alertaRepository.eliminarSiNoCambio,
    guardar: historicoRepository.guardarYVerificar,
    verificar: historicoRepository.verificarCopia
};
test.afterEach(() => {
    alertaRepository.contarArchivables = originales.contar;
    alertaRepository.obtenerLoteArchivable = originales.lote;
    alertaRepository.eliminarSiNoCambio = originales.eliminar;
    historicoRepository.guardarYVerificar = originales.guardar;
    historicoRepository.verificarCopia = originales.verificar;
});

const ahora = new Date('2026-11-05T12:00:00Z');
const doc = { _id: 'smn-vieja', fuente: 'SMN', origen: 'oficial', claveIdempotencia: 'SMN:1:2026-11-01', updatedAt: new Date('2026-11-01T00:00:00Z') };

function configurarUnCandidato({ contar = [1, 0], lote = [doc] } = {}) {
    let llamadaConteo = 0;
    alertaRepository.contarArchivables = async () => {
        const cantidad = contar[Math.min(llamadaConteo++, contar.length - 1)];
        return { SMN: cantidad, INPRES: 0 };
    };
    alertaRepository.obtenerLoteArchivable = async (_ahora, fuente, cursor) => fuente === 'SMN' && !cursor ? lote : [];
}

test('archiva una candidata solo después de guardar y verificar la copia histórica', async () => {
    configurarUnCandidato();
    let verificada = false;
    historicoRepository.guardarYVerificar = async documento => {
        assert.equal(documento, doc);
        verificada = true;
        return { nuevo: true };
    };
    alertaRepository.eliminarSiNoCambio = async documento => {
        assert.equal(verificada, true);
        assert.equal(documento, doc);
        return { deletedCount: 1 };
    };
    const resumen = await archivarAlertas({ ahora, modo: 'archive', fuentes: ['SMN'] });
    assert.equal(resumen.candidatos, 1);
    assert.equal(resumen.migrados, 1);
    assert.equal(resumen.verificados, 1);
    assert.equal(resumen.eliminados, 1);
    assert.equal(resumen.restantes, 0);
    assert.equal(resumen.fallidos, 0);
});

test('una falla al guardar o verificar nunca elimina el documento operativo', async () => {
    configurarUnCandidato({ contar: [1, 1] });
    let eliminaciones = 0;
    historicoRepository.guardarYVerificar = async () => { throw new Error('falló la escritura histórica'); };
    alertaRepository.eliminarSiNoCambio = async () => { eliminaciones++; return { deletedCount: 1 }; };
    const resumen = await archivarAlertas({ ahora, modo: 'archive', fuentes: ['SMN'] });
    assert.equal(eliminaciones, 0);
    assert.equal(resumen.fallidos, 1);
    assert.equal(resumen.restantes, 1);
    assert.equal(resumen.errores[0].id, doc._id);
});

test('la fase copy es repetible y mantiene los originales para revisión previa al borrado', async () => {
    configurarUnCandidato({ contar: [1, 1] });
    let copiasNuevas = 0;
    let eliminaciones = 0;
    historicoRepository.guardarYVerificar = async () => ({ nuevo: ++copiasNuevas === 1 });
    alertaRepository.eliminarSiNoCambio = async () => { eliminaciones++; return { deletedCount: 1 }; };
    const primera = await archivarAlertas({ ahora, modo: 'copy', fuentes: ['SMN'] });
    const segunda = await archivarAlertas({ ahora, modo: 'copy', fuentes: ['SMN'] });
    assert.equal(primera.migrados, 1);
    assert.equal(segunda.yaExistian, 1);
    assert.equal(primera.restantes, 1);
    assert.equal(segunda.restantes, 1);
    assert.equal(eliminaciones, 0);
});

test('delete-verified no borra si la copia no se puede volver a verificar', async () => {
    configurarUnCandidato({ contar: [1, 1] });
    let eliminaciones = 0;
    historicoRepository.verificarCopia = async () => { throw new Error('copia ausente'); };
    alertaRepository.eliminarSiNoCambio = async () => { eliminaciones++; return { deletedCount: 1 }; };
    const resumen = await archivarAlertas({ ahora, modo: 'delete-verified', fuentes: ['SMN'] });
    assert.equal(eliminaciones, 0);
    assert.equal(resumen.fallidos, 1);
    assert.equal(resumen.restantes, 1);
});

test('deja el original cuando cambió después de leerlo y reporta el conflicto para reintento', async () => {
    configurarUnCandidato({ contar: [1, 1] });
    historicoRepository.guardarYVerificar = async () => ({ nuevo: true });
    alertaRepository.eliminarSiNoCambio = async () => ({ deletedCount: 0 });
    const resumen = await archivarAlertas({ ahora, modo: 'archive', fuentes: ['SMN'] });
    assert.equal(resumen.eliminados, 0);
    assert.equal(resumen.noEliminados, 1);
    assert.equal(resumen.restantes, 1);
    assert.equal(resumen.fallidos, 0);
});

test('dry-run informa cantidad por fuente sin leer lotes ni escribir documentos', async () => {
    alertaRepository.contarArchivables = async () => ({ SMN: 2, INPRES: 4 });
    alertaRepository.obtenerLoteArchivable = async () => assert.fail('dry-run no debe recuperar lotes');
    historicoRepository.guardarYVerificar = async () => assert.fail('dry-run no debe escribir');
    const resumen = await archivarAlertas({ ahora, modo: 'dry-run' });
    assert.equal(resumen.candidatos, 6);
    assert.equal(resumen.restantes, 6);
    assert.deepEqual(resumen.fuentes, {
        SMN: { candidatos: 2, restantes: 2 },
        INPRES: { candidatos: 4, restantes: 4 }
    });
});
