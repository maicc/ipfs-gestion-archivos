import { CreateMultipartUploadCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import { s3Client } from "../../config/s3.js";
import prisma from "../../prisma.js";

export const iniciarSubidaService = async (
  fileName: string,
  contentType: string,
  fileSize: number,
  userId: string
) => {
  // Chequeo de storage
  const usuario = await prisma.user.findUnique({
    where: { id: userId },
    select: { usedStorageBytes: true, storageLimitsBytes: true },
  });

  if (!usuario) throw new Error("Usuario no encontrado");

  
  const usedBytes = Number(usuario.usedStorageBytes);
  const limitBytes = Number(usuario.storageLimitsBytes);

  if (usedBytes + fileSize > limitBytes) {
    throw new Error("Storage límite excedido");
  }

  console.log(`https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`);
  // Crear upload en R2
  const uuid = crypto.randomUUID();
  const nombreLimpio = fileName.replace(/\s+/g, "_");
  const keyR2 = `uploads/${uuid}/${nombreLimpio}`;

  const command = new CreateMultipartUploadCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: keyR2,
    ContentType: contentType,
  });

  const r2Response = await s3Client.send(command);
  console.log("Creando IpfsObject para:", keyR2);
  const ipfsObject = await prisma.ipfsObject.create({
    data: {
      cid: `pending_${uuid}`, // CID temporal hasta que Go lo genere
      sizeBytes: BigInt(fileSize),
      mimeType: contentType,
      r2Key: keyR2,
      r2StoredAt: new Date(),
      nodePins: [],
    },
  });

console.log("IpfsObject creado:", ipfsObject.id);

  await prisma.fileMetadata.create({
    data: {
      name: nombreLimpio,
      userId,
      ipfsObjectId: ipfsObject.id,
    },
  });

  return {
    uploadId: r2Response.UploadId,
    keyR2,
    ipfsObjectId: ipfsObject.id
  };
};