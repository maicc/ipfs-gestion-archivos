import { Request, Response } from 'express';
import {
    S3Client,
    CreateMultipartUploadCommand,
    UploadPartCommand,
    CompleteMultipartUploadCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import { MultipartPart } from '../types/index.js';
import axios from "axios"

// Configuración de tu cliente R2
const s3Client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
});

// ============================================================================
// PASO 1: INICIAR LA SUBIDA MULTIPARTE
// ============================================================================
export const iniciarSubidaController = async (req: Request, res: Response) => {
    try {
        const { fileName, contentType } = req.body;

        // Generamos el UUID único y la ruta final en R2
        const uuid = crypto.randomUUID();
        const nombreLimpio = fileName.replace(/\s+/g, '_');
        const keyR2 = `uploads/${uuid}/${nombreLimpio}`;

        const command = new CreateMultipartUploadCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: keyR2,
            ContentType: contentType,
        });

        const r2Response = await s3Client.send(command);

        // Devolvemos el "Ticket Maestro" (UploadId) y la llave al frontend
        return res.json({
            uploadId: r2Response.UploadId,
            keyR2: keyR2
        });
    } catch (error) {
        console.error("Error iniciando multipart:", error);
        return res.status(500).json({ error: "No se pudo iniciar la subida en R2" });
    }
};

// ============================================================================
// PASO 2: OBTENER URLs FIRMADAS PARA LOS CHUNKS
// ============================================================================
export const firmarPartesController = async (req: Request, res: Response) => {
    try {
        // El frontend pide URLs para una lista específica de partes (ej: [1, 2, 3, 4, 5])
        const { keyR2, uploadId, partNumbers } = req.body;

        if (!keyR2 || !uploadId || !Array.isArray(partNumbers)) {
            return res.status(400).json({ error: "Faltan datos para firmar las partes" });
        }

        const presignedUrls = await Promise.all(
            partNumbers.map(async (partNumber) => {
                const command = new UploadPartCommand({
                    Bucket: process.env.R2_BUCKET_NAME,
                    Key: keyR2,
                    UploadId: uploadId,
                    PartNumber: partNumber, // R2 necesita saber qué número de chunk es
                });

                // Firmamos cada URL individualmente
                const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // Válido por 1 hora
                return { partNumber, url };
            })
        );

        return res.json({ partes: presignedUrls });
    } catch (error) {
        console.error("Error firmando partes:", error);
        return res.status(500).json({ error: "No se pudieron firmar los chunks" });
    }
};

// ============================================================================
// PASO 3: ENSAMBLAR Y FINALIZAR (¡Aquí llamamos a Go!)
// ============================================================================
export const completarSubidaController = async (req: Request, res: Response) => {
    try {
        // El frontend envía el ID, la llave y el arreglo de partes con sus ETags
        const { keyR2, uploadId } = req.body;
        const parts: MultipartPart[] = req.body.parts;
        // parts debe tener este formato: [{ PartNumber: 1, ETag: '"hash123"' }, { PartNumber: 2, ETag: '"hash456"' }]

        const command = new CompleteMultipartUploadCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: keyR2,
            UploadId: uploadId,
            MultipartUpload: {
                Parts: parts.sort((a, b) => a.PartNumber - b.PartNumber), // R2 exige que estén en orden
            },
        });

        // ¡Mágia! R2 ensambla el archivo
        await s3Client.send(command);
        console.log(`✅ Archivo ensamblado en R2: ${keyR2}`);



        // ---------------------------------------------------------------------
        // 🚀 ¡EL ARCHIVO YA EXISTE EN R2! 
        // Este es el momento exacto para hacer una petición HTTP a tu 
        // microservicio en Go para decirle: "Pásalo a IPFS"
        // ---------------------------------------------------------------------
        /* await axios.post('http://tu-servicio-go:puerto/iniciar-ipfs', {
            keyR2: keyR2
        });
        */



        try {

            const baseURL = process.env.GERMANY_HOST ?
                `http://${process.env.GERMANY_HOST}:8082`
                : "http://localhost:8082"


            // Cambia 'localhost:8080' por la IP/URL real de tu servidor Go
            await axios.post(`${baseURL}/uploadR2`, {
                keyR2: keyR2
            });



            console.log("🚀 Notificación enviada a Go para transferencia a IPFS");
        } catch (errorGo) {
            // Ojo: Solo imprimimos el error, pero NO detenemos la respuesta al frontend.
            // Si Go está apagado, el archivo ya está seguro en R2 y puedes reintentar luego.
            console.error("⚠️ Error contactando al servicio de Go:", errorGo);
        }
        // =========================================================

        // 3. Le respondemos al frontend (Usuario feliz)
        return res.json({
            mensaje: "Subida completada con éxito. Procesando en la red Web3...",
            keyR2: keyR2
        });
    } catch (error) {
        console.error("Error ensamblando archivo:", error);
        return res.status(500).json({ error: "Fallo al ensamblar el archivo en R2" });
    }
};