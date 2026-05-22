import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { AppError } from "../middlewares/errorHandler.js";
import * as userService from "../services/user.service.js";

const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  role: z.nativeEnum(Role),
});

export async function list(_req: Request, res: Response, next: NextFunction) {
  try {
    const users = await userService.listUsers();
    res.json({ users });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = userSchema.extend({ password: z.string().min(6) }).safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors[0]?.message ?? "Geçersiz veri");
    }
    const user = await userService.createUser({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      role: parsed.data.role,
    });
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) throw new AppError(400, "Geçersiz id");
    const parsed = userSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors[0]?.message ?? "Geçersiz veri");
    }
    const user = await userService.updateUser(id, parsed.data);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) throw new AppError(400, "Geçersiz id");
    if (!req.user) throw new AppError(401, "Yetkilendirme gerekli");
    await userService.deleteUser(id, req.user.userId);
    res.json({ message: "Kullanıcı silindi" });
  } catch (err) {
    next(err);
  }
}
