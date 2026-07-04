import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { AppError } from "../middlewares/errorHandler.js";
import * as userService from "../services/user.service.js";

const userFieldsSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  role: z.nativeEnum(Role),
  hotelName: z.string().optional(),
});

function withHotelNameValidation<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((data, ctx) => {
    const d = data as z.infer<typeof userFieldsSchema>;
    if (d.role === Role.HOTEL && !d.hotelName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Otel kullanıcısı için otel adı gerekli",
        path: ["hotelName"],
      });
    }
  });
}

const createUserSchema = withHotelNameValidation(
  userFieldsSchema.extend({ password: z.string().min(6) })
);

const updateUserSchema = withHotelNameValidation(userFieldsSchema.partial());

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
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors[0]?.message ?? "Geçersiz veri");
    }
    const user = await userService.createUser({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      role: parsed.data.role,
      hotelName: parsed.data.hotelName,
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
    const parsed = updateUserSchema.safeParse(req.body);
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
