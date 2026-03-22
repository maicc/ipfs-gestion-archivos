import { Router } from "express";
import { registerController, loginController } from "../controller/auth.controller.js";
import { authMiddleware, AuthRequest } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", registerController);
router.post("/login", loginController);

router.get("/me", authMiddleware, (req: AuthRequest, res)=>{
    res.json({userId: req.userId, plan: req.userPlan});
});

export default router;