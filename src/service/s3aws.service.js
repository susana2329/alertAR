require('dotenv').config()
const { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const logger = require('../logging/logger');
const client = new S3Client({
    region: process.env.AWS_REGION,
    maxAttempts: 2,
    requestHandler: { connectionTimeout: 3000, requestTimeout: 12000 }
});

async function enviarConLimite(command, operacion) {
    const inicio = Date.now();
    try {
        return await client.send(command, { abortSignal: AbortSignal.timeout(15000) });
    } catch (cause) {
        logger.error('s3_operacion_fallida', {
            operacion,
            tipo: cause?.name || 'Error',
            codigo: cause?.Code || cause?.code || null,
            estadoAws: cause?.$metadata?.httpStatusCode || null,
            duracionMs: Date.now() - inicio
        });
        const error = new Error('No se pudo completar la operación con el almacenamiento de imágenes');
        error.status = 503;
        error.code = 'PHOTO_STORAGE_UNAVAILABLE';
        error.publicMessage = 'No se pudo guardar la foto. Intentá de nuevo más tarde.';
        throw error;
    }
}

function estaS3Configurado() {
    return Boolean(process.env.S3_BUCKET && process.env.AWS_REGION);
}

exports.estaS3Configurado = estaS3Configurado;

exports.getimagenS3 = async (key) => {
    if (!estaS3Configurado()) {
        return '';
    }
    const command = new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key })
    return getSignedUrl(client, command, { expiresIn: 3600 })
}
exports.postimagenS3 = async (key,imagen,tipo) => {
    if (!estaS3Configurado()) {
        const error = new Error('El servicio de almacenamiento de imágenes (AWS S3) no está configurado en el servidor');
        error.status = 503;
        error.code = 'PHOTO_STORAGE_NOT_CONFIGURED';
        error.publicMessage = 'El servicio de fotos no está disponible por el momento.';
        throw error;
    }
    const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: imagen,
        ContentType: tipo
    });
    return enviarConLimite(command, 'subir')
}

exports.deleteimagenS3 = async (key) => {
    if (!estaS3Configurado()) {
        const error = new Error('El servicio de almacenamiento de imágenes no está configurado');
        error.status = 503;
        error.code = 'PHOTO_STORAGE_NOT_CONFIGURED';
        error.publicMessage = 'El servicio de fotos no está disponible por el momento.';
        throw error;
    }
    const command = new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key })
    return enviarConLimite(command, 'eliminar')
}
