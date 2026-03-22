import { Request, Response } from "express";
import { completarSubidaService } from "../../services/R2_Services/completarSubida.service.js";
import { MultipartPart } from "../../types/index.js";

export const completarSubidaController = async (req: Request, res: Response) => {
  try {
    const { keyR2, uploadId } = req.body;
    const parts: MultipartPart[] = req.body.parts;

    const resultado = await completarSubidaService(keyR2, uploadId, parts);
    return res.json(resultado);
  } catch (error) {
    console.error("Error ensamblando archivo:", error);
    return res.status(500).json({ error: "Fallo al ensamblar el archivo en R2" });
  }
};