require('dotenv').config()
const { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const client = new S3Client({ region: process.env.AWS_REGION });

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
        throw error;
    }
    const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: imagen,
        ContentType: tipo
    });
    return client.send(command)
}

exports.deleteimagenS3 = async (key) => {
    if (!estaS3Configurado()) {
        const error = new Error('El servicio de almacenamiento de imágenes no está configurado');
        error.status = 503;
        throw error;
    }
    const command = new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key })
    return client.send(command)
}
