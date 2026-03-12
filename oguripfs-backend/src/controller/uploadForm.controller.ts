import { Request, Response, NextFunction, request } from 'express';
import { uploadFormService } from '../services/uploadForm.service.js';
import type { ChunkInfo, FileUploadPayload } from '../types/index.js';
import { placeStorageOrder } from '../services/crustPinning.service.js';
export async function uploadController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const archivos = req.files as Express.Multer.File[] | undefined;
        const { chunkIndex, totalChunks, originalFileName } = req.body as {
            chunkIndex?: string;
            totalChunks?: string;
            originalFileName?: string;
        };

        // Validación de entrada
        if (!archivos || archivos.length === 0) {
            res.status(400).json({
                success: false,
                message: 'No se envió ningún archivo'
            });
            return;
        }

        if (chunkIndex === undefined || totalChunks === undefined || !originalFileName) {
            res.status(400).json({
                success: false,
                message: 'Faltan campos requeridos: chunkIndex, totalChunks, originalFileName'
            });
            return;
        }

        const fileInfo: FileUploadPayload = {
            files: archivos.map(f => ({
                filename: f.filename,
                originalName: f.originalname,
                mimeType: f.mimetype,
                size: f.size,
                path: f.path,
                field: f.fieldname,
                chunkIndex: parseInt(chunkIndex, 10),
                totalChunks: parseInt(totalChunks, 10),
                originalFileName: originalFileName
            }))
        };

        const resultado = await uploadFormService(fileInfo);

        const statusCode = resultado.success ? 200 : 500;
        res.status(statusCode).json(resultado);
    } catch (error) {
        next(error);
    }
}

export const confirmarSubida = async (req: Request, res: Response) => {
    const { uuid, cid, size } = req.body;

    if (!uuid || !cid) {
        return res.status(400).json({ error: "Faltaron datos de Go" });
    }

    console.log(`Recibido desde go -> Video UUID: ${uuid} | CID: ${cid} | SIZE: ${size}`)

    console.log('⛓️  Enviando orden a Crust Network...');
    placeStorageOrder(cid, parseInt(size, 10))
        .then(() => console.log(`Orden de almacenamiento en Crust exitosa para ${cid}`))
        .catch(crustError => console.error(`Error en Crust para ${cid}:`, crustError))

    return res.status(200).json({ message: "CID registrado correctamente. Procesando blockchain..." })

}