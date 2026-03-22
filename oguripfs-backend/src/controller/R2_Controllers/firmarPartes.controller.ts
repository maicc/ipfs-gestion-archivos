import { Request, Response } from "express";
import { firmarPartesService } from "../../services/R2_Services/firmarPartes.service.js";

export const firmarPartesController = async (req: Request, res: Response) => {
  try {
    const { keyR2, uploadId, partNumbers } = req.body;

    if (!keyR2 || !uploadId || !Array.isArray(partNumbers)) {
      return res.status(400).json({ error: "Faltan datos para firmar las partes" });
    }

    const resultado = await firmarPartesService(keyR2, uploadId, partNumbers);
    return res.json(resultado);
  } catch (error) {
    console.error("Error firmando partes:", error);
    return res.status(500).json({ error: "No se pudieron firmar los chunks" });
  }
};