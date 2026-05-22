import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AppError } from "../middlewares/errorHandler.js";
import * as activityPriceService from "../services/activityPrice.service.js";

const priceSchema = z.object({
  activityId: z.number().int().positive(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  adultBuyPrice: z.number().min(0),
  childBuyPrice: z.number().min(0),
  infantBuyPrice: z.number().min(0),
  adultSellPrice: z.number().min(0),
  childSellPrice: z.number().min(0),
  infantSellPrice: z.number().min(0),
});

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const activityId = Number(req.query.activityId);
    if (Number.isNaN(activityId)) {
      throw new AppError(400, "activityId gerekli");
    }
    const prices = await activityPriceService.listByActivity(
      activityId,
      req.query.startDate as string | undefined,
      req.query.endDate as string | undefined
    );
    res.json({ prices });
  } catch (err) {
    next(err);
  }
}

export async function getForDate(req: Request, res: Response, next: NextFunction) {
  try {
    const activityId = Number(req.query.activityId);
    const dateStr = req.query.date as string;
    if (Number.isNaN(activityId) || !dateStr) {
      throw new AppError(400, "activityId ve date gerekli");
    }
    const prices = await activityPriceService.getFullPricesForDate(
      activityId,
      new Date(dateStr)
    );
    res.json({ prices });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = priceSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors[0]?.message ?? "Geçersiz veri");
    }
    const result = await activityPriceService.createPrice(parsed.data);
    res.status(result.updated ? 200 : 201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) throw new AppError(400, "Geçersiz id");
    const parsed = priceSchema.partial().omit({ activityId: true }).safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors[0]?.message ?? "Geçersiz veri");
    }
    const result = await activityPriceService.updatePrice(id, parsed.data);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) throw new AppError(400, "Geçersiz id");
    await activityPriceService.deletePrice(id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
