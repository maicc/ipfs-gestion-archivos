import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
    userId?: string;
    userPlan?: string;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Token requerido" });
        return;
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        res.status(401).json({ error: "Token requerido" });
        return;
    }
    
    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            res.status(500).json({ error: "Error de configuración del servidor" });
            return;
        }
        const payload = jwt.verify(token, secret) as any;
        req.userId = payload.id;
        req.userPlan = payload.plan;
        next();
    } catch (error) {
        res.status(401).json({ error: "Token inválido o expirado" });
    }
};