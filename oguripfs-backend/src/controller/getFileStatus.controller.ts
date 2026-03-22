import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware.js";
import { getFileStatusService } from "../services/getFileStatus.service.js";

export const getFileStatusController = async (req: AuthRequest, res: Response) => {
  try {
    const { cid } = req.params;
    const status = await getFileStatusService(cid!, req.userId!);
    return res.json(status);
  } catch (error: any) {
    if (error.message === "Archivo no encontrado") {
      return res.status(404).json({ error: error.message });
    }
    console.error("Error obteniendo status:", error);
    return res.status(500).json({ error: "Error obteniendo status" });
  }
};