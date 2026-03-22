import { Request, Response } from "express";
import { iniciarSubidaService } from "../../services/R2_Services/iniciarSubida.service.js";
import { AuthRequest } from "../../middlewares/auth.middleware.js";

export const iniciarSubidaController = async (req: AuthRequest, res: Response) => {
  try {
    const { fileName, contentType, fileSize } = req.body;

    if (!fileName || !contentType || !fileSize) {
      return res.status(400).json({ error: "Faltan campos requeridos" });
    }

    
    const resultado = await iniciarSubidaService(fileName, contentType, fileSize, req.userId!);
    
    return res.json(resultado);
  } catch (error: any) {
    if (error.message === "Storage límite excedido") {
      return res.status(403).json({ error: error.message });
    }
    console.error("Error iniciando subida:", error);
    return res.status(500).json({ error: "No se pudo iniciar la subida en R2" });
  }
};