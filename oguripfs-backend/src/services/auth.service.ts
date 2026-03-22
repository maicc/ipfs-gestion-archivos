import prisma from "../prisma.js"
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";


export const registerService = async (
  username: string,
  email: string,
  password: string
) => {
  // Verificar si el email ya existe
  const usuarioExistente = await prisma.user.findUnique({
    where: { email },
  });

  if (usuarioExistente) {
    throw new Error("El email ya está registrado");
  }

  // Hashear el password
  const passwordHash = await bcrypt.hash(password, 10);

  // Crear el usuario
  const usuario = await prisma.user.create({
    data: {
      username,
      email,
      password: passwordHash,
    },
  });

  return {
    id: usuario.id,
    username: usuario.username,
    email: usuario.email,
    plan: usuario.plan,
  };
};

export const loginService = async (email: string, password: string) => {
  // Buscar el usuario
  const usuario = await prisma.user.findUnique({
    where: { email },
  });

  if (!usuario) {
    throw new Error("Credenciales inválidas");
  }

  // Verificar password
  const passwordValido = await bcrypt.compare(password, usuario.password);

  if (!passwordValido) {
    throw new Error("Credenciales inválidas");
  }

  // Generar JWT
  const token = jwt.sign(
    { id: usuario.id, email: usuario.email, plan: usuario.plan },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );

  return {
    token,
    usuario: {
      id: usuario.id,
      username: usuario.username,
      email: usuario.email,
      plan: usuario.plan,
    },
  };
};