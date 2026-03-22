import { Request, Response, NextFunction } from 'express';

/**
 * Middleware centralizado de manejo de errores.
 * Captura cualquier error no manejado y envía una respuesta JSON uniforme.
 */
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
    console.error('❌ Error no manejado:', err.message);
    console.error(err.stack);

    res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'production' ? undefined : err.message
    });
}
