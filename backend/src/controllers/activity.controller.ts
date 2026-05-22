import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AppError } from "../middlewares/errorHandler.js";
import * as activityService from "../services/activity.service.js";

const schema = z.object({
  name: z.string().min(1),
  displayName: z.string().min(1),
  description: z.string().optional(),
  duration: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function listAll(req: Request, res: Response, next: NextFunction) {
  try {
    const activities =
      req.query.active === "true"
        ? await activityService.listActive()
        : await activityService.listAll();
    res.json({ activities });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) throw new AppError(400, "Geçersiz id");
    const activity = await activityService.getById(id);
    res.json({ activity });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors[0]?.message ?? "Geçersiz veri");
    }
    const activity = await activityService.create(parsed.data);
    res.status(201).json({ activity });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) throw new AppError(400, "Geçersiz id");
    const parsed = schema.partial().safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors[0]?.message ?? "Geçersiz veri");
    }
    const activity = await activityService.update(id, parsed.data);
    res.json({ activity });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) throw new AppError(400, "Geçersiz id");
    await activityService.deleteActivity(id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
