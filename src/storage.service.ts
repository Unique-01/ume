import {
    GetObjectCommand,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs";
import path from "path";

const R2_ENDPOINT = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

const s3 = new S3Client({
    region: "auto",
    endpoint: R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
});

const BUCKET = process.env.R2_BUCKET_NAME;
const EXPIRES_IN = Number(process.env.R2_PRESIGNED_URL_EXPIRES_IN) || 86400;
const CONTENT_TYPES: Record<string, string> = {
    mp4: "video/mp4",
    jpg: "image/jpeg",
    gif: "image/gif",
};

export const uploadToR2 = async (localPath: string): Promise<string> => {
    const key = `processed/${path.basename(localPath)}`;
    const ext = path.extname(localPath).slice(1).toLowerCase();
    const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";
    const fileStream = fs.createReadStream(localPath);

    await s3.send(
        new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: fileStream,
            ContentType: contentType,
        }),
    );
    return key;
};

export const getPresignedUrl = async (key: string): Promise<string> => {
    const command = new GetObjectCommand({
        Bucket: BUCKET,
        Key: key,
    });

    return getSignedUrl(s3, command, { expiresIn: EXPIRES_IN });
};
