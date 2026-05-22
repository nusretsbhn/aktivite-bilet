import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AppError } from "../middlewares/errorHandler.js";
import * as activityCurrentAccountService from "../services/activityCurrentAccount.service.js";

const manualSchema = z.object({
  activityId: z.number().int().positive(),
  description: z.string().min(1),
  debit: z.number().min(0).optional(),
  credit: z.number().min(0).optional(),
  date: z.string().optional(),
});

export async function summary(_req: Request, res: Response, next: NextFunction) {
  try {
    const summaries = await activityCurrentAccountService.getSummary();
    res.json({ summaries });
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const activityId = Number(req.query.activityId);
    if (Number.isNaN(activityId)) {
      throw new AppError(400, "activityId gerekli");
    }

    const result = await activityCurrentAccountService.listByActivity(activityId, {
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = manualSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors[0]?.message ?? "Geçersiz veri");
    }
    if (!parsed.data.debit && !parsed.data.credit) {
      throw new AppError(400, "Borç veya alacak girilmeli");
    }
    const entry = await activityCurrentAccountService.createManualEntry(parsed.data);
    res.status(201).json({ entry });
  } catch (err) {
    next(err);
  }
}
