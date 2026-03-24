import { Response, Request } from "express";
import { shareFileService, unShareFileService } from "../services/sharedFiles.service.js";
import { CustomRequest } from "../types/index.js";
import { resolverTokenService } from "../services/sharedFiles.service.js";

export const sharedFileController = async (req: CustomRequest, res: Response) => {

    try {
        const { cid } = req.params;

        if (!cid) {
            return res.status(400).json({ success: false, message: "Falta el CID en la URL" });
        }

        const userId = (req as any).userId


        const token = await shareFileService(cid, userId)

        return res.status(200).json({
            success: true,
            message: "Accesso público cread con exito",
            token: token,
            url: `/f/${token}`
        })

    }
    catch (error: any) {
        if (error.message === "NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Archivo no encontrado"
            })
        }
        if (error.message === "UNAUTHORIZED") {
            return res.status(403).json({
                success: false,
                message: "No tienes permiso para realizar esta acción"
            })
        }

        console.error('[unshareFile Controller Error]:', error);
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }

}

export const unSharedFileController = async (req: CustomRequest, res: Response) => {

    try {
        const { cid } = req.params;

        if (!cid) {
            return res.status(400).json({ success: false, message: "Falta el CID en la URL" });
        }

        const userId = (req as any).userId


        await unShareFileService(cid, userId)

        return res.status(200).json({
            success: true,
            message: "Accesso público eliminado con exito"
        })

    }
    catch (error: any) {
        if (error.message === "NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Archivo no encontrado"
            })
        }
        if (error.message === "UNAUTHORIZED") {
            return res.status(403).json({
                success: false,
                message: "No tienes permiso para realizar esta acción"
            })
        }

        console.error('[unshareFile Controller Error]:', error);
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }

}

export const resolveIntervalTokenController = async (req: Request, res: Response) => {
    try {
        const { token } = req.params;

        if (!token) {
            return res.status(400).json({ error: "Falta el token" });
        }

        const fileData = await resolverTokenService(token);

        return res.status(200).json(fileData);
    }
    catch (error: any) {
        if (error.message === 'NOT_FOUND') {
            return res.status(404).json({ error: 'Token inválido o expirado' });
        }

        console.error('[resolveInternalToken Controller Error]:', error);
        return res.status(500).json({ error: 'Error interno del servidor TS' });
    }
}