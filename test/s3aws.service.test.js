const test = require('node:test');
const assert = require('node:assert/strict');
const { S3Client } = require('@aws-sdk/client-s3');
const { postimagenS3 } = require('../src/service/s3aws.service');

test('una falla de S3 termina la subida con error público y señal de cancelación', async () => {
    const originalSend = S3Client.prototype.send;
    const originalBucket = process.env.S3_BUCKET;
    const originalRegion = process.env.AWS_REGION;
    const originalError = console.error;
    process.env.S3_BUCKET = 'bucket-prueba';
    process.env.AWS_REGION = 'us-east-1';
    console.error = () => {};
    S3Client.prototype.send = async (_command, options) => {
        assert.equal(options.abortSignal.aborted, false);
        const error = new Error('Access denied');
        error.name = 'AccessDenied';
        error.$metadata = { httpStatusCode: 403 };
        throw error;
    };

    try {
        await assert.rejects(
            postimagenS3('usuario/foto.jpg', Buffer.from('foto'), 'image/jpeg'),
            { status: 503, code: 'PHOTO_STORAGE_UNAVAILABLE' }
        );
    } finally {
        S3Client.prototype.send = originalSend;
        console.error = originalError;
        if (originalBucket === undefined) delete process.env.S3_BUCKET;
        else process.env.S3_BUCKET = originalBucket;
        if (originalRegion === undefined) delete process.env.AWS_REGION;
        else process.env.AWS_REGION = originalRegion;
    }
});
