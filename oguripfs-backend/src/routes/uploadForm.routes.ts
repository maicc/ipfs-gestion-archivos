import { Router } from "express";
import { confirmarSubidaController, getOrderStateController } from "../controller/crustPinning.controller.js";
import { iniciarSubidaController } from "../controller/R2_Controllers/iniciarSubida.controller.js";
import { firmarPartesController } from "../controller/R2_Controllers/firmarPartes.controller.js";
import { completarSubidaController } from "../controller/R2_Controllers/completarSubida.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { getFilesController } from "../controller/getFiles.controller.js";
import { getFileStatusController } from "../controller/getFileStatus.controller.js";
import { deleteFileController } from "../controller/deleteFile.controller.js";
import { getPublicFileController } from "../controller/getPublicFile.controller.js";
import { getAdminStatsController } from "../controller/admin.controller.js";


const router = Router();

router.post("/confirmar-subida", confirmarSubidaController)
router.post("/getOrderStatus", getOrderStateController)

router.post("/iniciar-subida", authMiddleware, iniciarSubidaController)
router.post("/firmar-partes", authMiddleware, firmarPartesController)
router.post("/completar-subida", authMiddleware, completarSubidaController)

router.get("/files", authMiddleware, getFilesController);
router.get("/file/:cid/status", authMiddleware, getFileStatusController);
router.delete("/file/:cid", authMiddleware, deleteFileController);
router.get("/public/:cid", getPublicFileController);

router.get("/admin/stats", authMiddleware, getAdminStatsController);

export default router;