import { CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";
import axios from "axios";
import { s3Client } from "../../config/s3.js";
import { MultipartPart } from "../../types/index.js";

export const completarSubidaService = async (keyR2: string, uploadId: string, parts: MultipartPart[]) => {
  const command = new CompleteMultipartUploadCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: keyR2,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts.sort((a, b) => a.PartNumber - b.PartNumber),
    },
  });

  await s3Client.send(command);
  console.log(`✅ Archivo ensamblado en R2: ${keyR2}`);

  const baseURL = process.env.GERMANY_HOST
    ? `http://${process.env.GERMANY_HOST}:8082`
    : "http://localhost:8082";

  try {
    await axios.post(`${baseURL}/uploadR2`, { keyR2 });
    console.log("🚀 Notificación enviada a Go para transferencia a IPFS");
  } catch (errorGo) {
    console.error("⚠️ Error contactando al servicio de Go:", errorGo);
  }

  return {
    mensaje: "Subida completada con éxito. Procesando en la red Web3...",
    keyR2,
  };
};