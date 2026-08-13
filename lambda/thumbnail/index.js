const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const Jimp = require("jimp");

const s3 = new S3Client({});

exports.handler = async (event) => {
    console.log("Reading event details:", JSON.stringify(event, null, 2));
    
    for (const record of event.Records) {
        const bucket = record.s3.bucket.name;
        const srcKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
        
        console.log(`Processing bucket: ${bucket}, key: ${srcKey}`);
        
        if (!srcKey.startsWith("uploads/")) {
            console.log(`Key ${srcKey} does not start with uploads/. Skipping.`);
            continue;
        }
        
        const dstKey = srcKey.replace("uploads/", "thumbnails/");
        
        const typeMatch = srcKey.match(/\.([^.]*)$/);
        if (!typeMatch) {
            console.log(`Could not determine image type for ${srcKey}`);
            continue;
        }
        
        const imageType = typeMatch[1].toLowerCase();
        if (!["jpg", "jpeg", "png", "gif", "bmp"].includes(imageType)) {
            console.log(`Unsupported image type: ${imageType}`);
            continue;
        }

        try {
            const getParams = {
                Bucket: bucket,
                Key: srcKey
            };
            const response = await s3.send(new GetObjectCommand(getParams));
            
            const streamToBuffer = (stream) =>
                new Promise((resolve, reject) => {
                    const chunks = [];
                    stream.on("data", (chunk) => chunks.push(chunk));
                    stream.on("error", reject);
                    stream.on("end", () => resolve(Buffer.concat(chunks)));
                });
            
            const buffer = await streamToBuffer(response.Body);
            
            console.log("Resizing image...");
            const image = await Jimp.read(buffer);
            image.resize(200, Jimp.AUTO);
            
            let mimeType;
            switch (imageType) {
                case "jpg":
                case "jpeg":
                    mimeType = Jimp.MIME_JPEG;
                    break;
                case "png":
                    mimeType = Jimp.MIME_PNG;
                    break;
                case "bmp":
                    mimeType = Jimp.MIME_BMP;
                    break;
                case "gif":
                    mimeType = Jimp.MIME_GIF;
                    break;
                default:
                    mimeType = Jimp.MIME_JPEG;
            }
            
            const resizedBuffer = await image.getBufferAsync(mimeType);
            
            console.log(`Saving resized image to: ${dstKey}`);
            const putParams = {
                Bucket: bucket,
                Key: dstKey,
                Body: resizedBuffer,
                ContentType: response.ContentType || mimeType
            };
            await s3.send(new PutObjectCommand(putParams));
            console.log(`Successfully resized ${srcKey} and uploaded to ${dstKey}`);
        } catch (error) {
            console.error(`Error processing image ${srcKey}:`, error);
            throw error;
        }
    }
};
