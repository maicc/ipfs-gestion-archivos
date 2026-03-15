import  {Router} from "express";
import { confirmarSubidaController, getOrderStateController} from "../controller/crustPinning.controller.js";

const router = Router();

router.post("/confirmar-subida", confirmarSubidaController)
router.post("/getOrderStatus", getOrderStateController)

export default router;