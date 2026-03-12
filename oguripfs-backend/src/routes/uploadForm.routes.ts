import  {Router} from "express";
import { uploadSingle, uploadMultiple } from "../middleware/upload.middleware.js";
import { confirmarSubida, uploadController } from "../controller/uploadForm.controller.js";

const router = Router();

//router.post("/upload", uploadSingle, uploadController);
router.post("/uploadMultiple", uploadMultiple, uploadController);
router.post("/videos/confirmar-subida", confirmarSubida)

export default router;