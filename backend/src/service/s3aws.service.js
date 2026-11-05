const env = require('dotenv')
const { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
env.config()
const client = new S3Client({
    
    region: process.env.AWS_REGION, 
    credentials: { 
        accessKeyId: process.env.ACCESSKEYID, 
        secretAccessKey: process.env.SECRETACCESSKEY, 
        sessionToken:process.env.SESSIONTOKEN
    }
});

exports.getimagenS3 = async (key) => {
    const command = new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key })
    return getSignedUrl(client, command, { expiresIn: 3600 })
}
exports.postimagenS3 = async (key,imagen,tipo) => {
    const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: imagen,
        ContentType: tipo
    });
    return client.send(command)
}

exports.deleteimagenS3 = async (key) => {
    const command = new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key })
    return client.send(command)
}
