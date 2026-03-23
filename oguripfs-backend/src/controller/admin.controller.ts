import { Request, Response } from "express";
import { getAdminStatsService } from "../services/admin.service.js";

export const getAdminStatsController = async (req: Request, res: Response) => {
  try {
    const stats = await getAdminStatsService();
    return res.json(stats);
  } catch (error) {
    console.error("Error obteniendo stats:", error);
    return res.status(500).json({ error: "Error interno" });
  }
};