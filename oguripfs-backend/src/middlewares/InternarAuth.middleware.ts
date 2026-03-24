import { Request, Response, NextFunction } from "express";

export const internalAuthMiddleware = (req: Request, res: Response, next: NextFunction)=>{
    const clientSecret = req.headers['x-internal-secret'];
    const serverSecret = process.env.INTERNAL_SECRET;

    if (!clientSecret || clientSecret !== serverSecret){
        return res.status(401).json({error: 'Acceso denegado. Solo el servidor de go puede entrar aquí'})
    }

    next();
}
