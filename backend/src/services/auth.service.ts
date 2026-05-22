import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/prisma.js";
import { AppError } from "../middlewares/errorHandler.js";

const TOKEN_EXPIRY = "7d";

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new AppError(401, "E-posta veya şifre hatalı");
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw new AppError(401, "E-posta veya şifre hatalı");
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError(500, "JWT_SECRET tanımlı değil");
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    secret,
    { expiresIn: TOKEN_EXPIRY }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

export async function getMe(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user) {
    throw new AppError(404, "Kullanıcı bulunamadı");
  }

  return user;
}
