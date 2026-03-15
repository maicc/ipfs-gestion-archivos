import { Request, Response } from 'express';
import { getOrderState, confirmarSubida } from '../services/crustPinning.service.js';
import { FileDataPayload } from '../types/index.js';

export const confirmarSubidaController = async (req: Request, res: Response) => {
    const {
        uuid,
        fileInfo: {
            name,
            mimeType,
            sizeBytes,
            cid
        },
        storageContract: {
            crustStatus,
            pinnedUntil
        }
    } = req.body;

    if (!uuid || !cid || !name || !mimeType || !crustStatus || !pinnedUntil) {
        return res.status(400).json({ error: "Faltaron datos de Go" });
    }

    const fileInfoSanitizado:FileDataPayload = {
        uuid,
        fileInfo: {
            name,
            mimeType,
            sizeBytes,
            cid
        },
        storageContract: {
            crustStatus,
            pinnedUntil
        }
    }
    console.log(`Recibido desde go -> Video UUID: ${name} | CID: ${cid} | SIZE: ${sizeBytes}`)

    const respuesta = await confirmarSubida(fileInfoSanitizado)

    return res.status(200).json(respuesta);

}

//Función para hacer una consulta en la blockchain acerca de el estado de nuestro archivo
export const getOrderStateController = async (req: Request, res: Response) => {
    const { cid } = req.body

    if (!cid) {
        return res.status(400).json({ message: "Falto agregar el cid en la consulta" });
    }

    const resultado = await getOrderState(cid);

    return res.status(200).json(resultado)

}