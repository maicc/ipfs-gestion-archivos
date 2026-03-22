import { UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "../../config/s3.js";

export const firmarPartesService = async (keyR2: string, uploadId: string, partNumbers: number[]) => {
  const presignedUrls = await Promise.all(
    partNumbers.map(async (partNumber) => {
      const command = new UploadPartCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: keyR2,
        UploadId: uploadId,
        PartNumber: partNumber,
      });

      const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      return { partNumber, url };
    })
  );

  return { partes: presignedUrls };
};