const env = require('dotenv')
const { S3Client, GetObjectCommand,PutObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
env.config()
console.log(process.env.SESSIONTOKEN)
const client = new S3Client({
    
    region: process.env.AWS_REGION, 
    credentials: { 
        accessKeyId: process.env.ACCESSKEYID, 
        secretAccessKey: process.env.SECRETACCESSKEY, 
        sessionToken:process.env.SESSIONTOKEN
    }
});

exports.getimagenS3 = async (key) => {
    try {
        console.log(client.credentials)
        const command = new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key })
        return await getSignedUrl(client, command, { expiresIn: 3600 })

    } catch (caught) {
        console.log("che no funco : ", caught)
    }
}
exports.postimagenS3 = async (key,imagen,tipo) => {
    try {
        const command = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: key,
            Body:imagen,
            ContentType: tipo
        });
        const response = await client.send(command)
        console.log(command)
        return response
    }
    catch(error) {
        console.log("el error es este: ", error)
    }
}