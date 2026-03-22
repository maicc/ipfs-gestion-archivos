import { Request, Response } from "express";
import { registerService, loginService } from "../services/auth.service.js";

export const registerController = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ error: "Faltan campos requeridos" });
      return;
    }

    const usuario = await registerService(username, email, password);
    res.status(201).json({ usuario });
  } catch (error: any) {
    if (error.message === "El email ya está registrado") {
      res.status(409).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

export const loginController = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Faltan campos requeridos" });
      return;
    }

    const resultado = await loginService(email, password);
    res.status(200).json(resultado);
  } catch (error: any) {
    console.log("Error login:", error.message); //
    if (error.message === "Credenciales inválidas") {
      res.status(401).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Error interno del servidor" });
  }
};