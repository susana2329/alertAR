const MAX_ARCHIVOS = 3;
const MAX_BYTES = 5 * 1024 * 1024;

function tipoImagen(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) return null;

    if (buffer.length >= 8 && buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) &&
        buffer.subarray(-2).equals(Buffer.from([0xff, 0xd9])) && buffer.includes(Buffer.from([0xff, 0xda]))) {
        return { mimetype: 'image/jpeg', extension: 'jpg' };
    }

    if (buffer.length >= 45 &&
        buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
        buffer.readUInt32BE(8) === 13 && buffer.toString('ascii', 12, 16) === 'IHDR' &&
        buffer.readUInt32BE(16) > 0 && buffer.readUInt32BE(20) > 0 &&
        buffer.subarray(-12, -8).equals(Buffer.alloc(4)) &&
        buffer.toString('ascii', buffer.length - 8, buffer.length - 4) === 'IEND') {
        return { mimetype: 'image/png', extension: 'png' };
    }

    if (buffer.length >= 14 && ['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6)) &&
        buffer.readUInt16LE(6) > 0 && buffer.readUInt16LE(8) > 0 && buffer.at(-1) === 0x3b) {
        return { mimetype: 'image/gif', extension: 'gif' };
    }

    if (buffer.length >= 20 && buffer.toString('ascii', 0, 4) === 'RIFF' &&
        buffer.readUInt32LE(4) === buffer.length - 8 && buffer.toString('ascii', 8, 12) === 'WEBP' &&
        ['VP8 ', 'VP8L', 'VP8X'].includes(buffer.toString('ascii', 12, 16))) {
        return { mimetype: 'image/webp', extension: 'webp' };
    }
    return null;
}

function validarImagenes(archivos) {
    if (archivos.length > MAX_ARCHIVOS) {
        const error = new Error('Se permiten hasta 3 fotos por reporte');
        error.status = 400;
        throw error;
    }
    return archivos.map(archivo => {
        if (!Buffer.isBuffer(archivo?.buffer)) {
            const error = new Error('La foto no contiene datos válidos');
            error.status = 400;
            throw error;
        }
        if (archivo.buffer.length > MAX_BYTES) {
            const error = new Error('Cada foto debe pesar como máximo 5 MB');
            error.status = 413;
            throw error;
        }
        const tipo = tipoImagen(archivo.buffer);
        if (!tipo) {
            const error = new Error('La foto está vacía, incompleta o no es JPEG, PNG, GIF o WebP');
            error.status = 400;
            throw error;
        }
        return { archivo, ...tipo };
    });
}

module.exports = { tipoImagen, validarImagenes };
