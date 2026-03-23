import { Request, Response } from "express";
import { getPublicFileService } from "../services/getPublicFile.service.js";

export const getPublicFileController = async (req: Request, res: Response) => {
  try {
    const { cid } = req.params;

    if(!cid){
        return res.status(100).json({ error: "Falto el cid" });
    }
    const file = await getPublicFileService(cid);
    return res.json(file);
  } catch (error: any) {
    if (error.message === "Archivo no encontrado") {
      return res.status(404).json({ error: error.message });
    }
    console.error("Error obteniendo archivo público:", error);
    return res.status(500).json({ error: "Error interno" });
  }
};