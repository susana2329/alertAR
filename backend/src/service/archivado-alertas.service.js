const alertaRepository = require('../repository/alerta.repository');
const alertaHistoricaRepository = require('../repository/alerta-historica.repository');

const FUENTES = ['SMN', 'INPRES'];
const MODOS = ['dry-run', 'copy', 'delete-verified', 'archive'];

async function procesarDocumento(documento, modo, resumen) {
    try {
        if (modo === 'delete-verified') {
            await alertaHistoricaRepository.verificarCopia(documento);
            resumen.verificados++;
        } else {
            const guardado = await alertaHistoricaRepository.guardarYVerificar(documento);
            resumen.verificados++;
            if (guardado.nuevo) resumen.migrados++;
            else resumen.yaExistian++;
        }

        if (modo === 'archive' || modo === 'delete-verified') {
            const resultado = await alertaRepository.eliminarSiNoCambio(documento);
            if (resultado.deletedCount === 1) resumen.eliminados++;
            else resumen.noEliminados++;
        }
    } catch (error) {
        resumen.fallidos++;
        resumen.errores.push({ id: String(documento._id), fuente: documento.fuente, mensaje: error.message });
    }
}

async function procesarLote(lote, modo, resumen, concurrencia) {
    for (let indice = 0; indice < lote.length; indice += concurrencia) {
        await Promise.all(lote.slice(indice, indice + concurrencia)
            .map(documento => procesarDocumento(documento, modo, resumen)));
    }
}

async function archivarAlertas({ ahora = new Date(), modo = 'dry-run', tamanoLote = 100, concurrencia = 8, fuentes = FUENTES } = {}) {
    if (!MODOS.includes(modo)) throw new Error(`Modo de archivado inválido: ${modo}`);
    if (!Number.isInteger(tamanoLote) || tamanoLote < 1 || !Number.isInteger(concurrencia) || concurrencia < 1) {
        throw new RangeError('El tamaño de lote y la concurrencia deben ser enteros positivos');
    }
    if (!Array.isArray(fuentes) || !fuentes.length || fuentes.some(fuente => !FUENTES.includes(fuente))) {
        throw new Error('Se debe indicar al menos una fuente archivable válida');
    }
    const resumen = {
        modo, fuentes: {}, candidatos: 0, migrados: 0, yaExistian: 0,
        verificados: 0, eliminados: 0, noEliminados: 0, fallidos: 0, errores: []
    };
    const conteoInicial = await alertaRepository.contarArchivables(ahora);
    for (const fuente of fuentes) {
        resumen.fuentes[fuente] = { candidatos: conteoInicial[fuente] ?? 0 };
        resumen.candidatos += resumen.fuentes[fuente].candidatos;
    }

    if (modo !== 'dry-run') {
        for (const fuente of fuentes) {
            let desdeId;
            while (true) {
                const lote = await alertaRepository.obtenerLoteArchivable(ahora, fuente, desdeId, tamanoLote);
                if (!lote.length) break;
                desdeId = lote[lote.length - 1]._id;
                await procesarLote(lote, modo, resumen, concurrencia);
            }
        }
    }

    const conteoFinal = modo === 'dry-run' ? conteoInicial : await alertaRepository.contarArchivables(ahora);
    const fuentesFinales = fuentes.map(fuente => conteoFinal[fuente] ?? 0);
    resumen.restantes = fuentesFinales.reduce((suma, cantidad) => suma + cantidad, 0);
    for (const fuente of fuentes) resumen.fuentes[fuente].restantes = conteoFinal[fuente] ?? 0;
    resumen.actualizadoEn = new Date().toISOString();
    return resumen;
}

module.exports = { archivarAlertas, MODOS };
