import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware.js";
import { getFilesService } from "../services/getFiles.service.js";

export const getFilesController = async (req: AuthRequest, res: Response) => {
  try {
    const files = await getFilesService(req.userId!);
    return res.json({ files });
  } catch (error) {
    console.error("Error obteniendo archivos:", error);
    return res.status(500).json({ error: "Error obteniendo archivos" });
  }
};