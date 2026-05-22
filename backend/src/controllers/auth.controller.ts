import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as authService from "../services/auth.service.js";
import { AppError } from "../middlewares/errorHandler.js";

const loginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta girin"),
  password: z.string().min(1, "Şifre gerekli"),
});

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors[0]?.message ?? "Geçersiz veri");
    }

    const result = await authService.login(parsed.data.email, parsed.data.password);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError(401, "Yetkilendirme gerekli");
    }
    const user = await authService.getMe(req.user.userId);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export function logout(_req: Request, res: Response) {
  res.json({ message: "Çıkış yapıldı" });
}
