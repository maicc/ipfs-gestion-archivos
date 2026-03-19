import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
dotenv.config();

const s3Client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
});

const configurarCors = async () => {
    const command = new PutBucketCorsCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        CORSConfiguration: {
            CORSRules: [
                {
                    AllowedOrigins: ["http://localhost:5500", "http://127.0.0.1:5500"],
                    AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
                    AllowedHeaders: ["*"],
                    ExposeHeaders: ["ETag"],
                    MaxAgeSeconds: 3000,
                }
            ]
        }
    });

    await s3Client.send(command);
    console.log("✅ CORS configurado en R2 con éxito");
};

configurarCors().catch(console.error);