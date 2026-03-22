import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware.js";
import { deleteFileService } from "../services/deleteFile.service.js";

export const deleteFileController = async (req: AuthRequest, res: Response) => {
  try {
    const { cid } = req.params;
    const resultado = await deleteFileService(cid!, req.userId!);
    return res.json(resultado);
  } catch (error: any) {
    if (error.message === "Archivo no encontrado") {
      return res.status(404).json({ error: error.message });
    }
    console.error("Error eliminando archivo:", error);
    return res.status(500).json({ error: "Error eliminando archivo" });
  }
};