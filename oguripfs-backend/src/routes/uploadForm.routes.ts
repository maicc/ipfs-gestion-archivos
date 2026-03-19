import  {Router} from "express";
import { confirmarSubidaController, getOrderStateController} from "../controller/crustPinning.controller.js";
import { iniciarSubidaController, firmarPartesController, completarSubidaController } from "../controller/uploadR2.controller.js";

const router = Router();

router.post("/confirmar-subida", confirmarSubidaController)
router.post("/getOrderStatus", getOrderStateController)
router.post("/completar-subida", completarSubidaController)
router.post("/firmar-partes", firmarPartesController)
router.post("/iniciar-subida", iniciarSubidaController)

export default router;