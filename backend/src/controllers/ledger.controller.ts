import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { LedgerType } from "@prisma/client";
import { AppError } from "../middlewares/errorHandler.js";
import * as ledgerService from "../services/ledger.service.js";

const entrySchema = z.object({
  type: z.nativeEnum(LedgerType),
  category: z.string().min(1),
  description: z.string().min(1),
  amount: z.number().positive(),
  date: z.string().optional(),
  referenceId: z.number().int().optional(),
  bankAccountId: z.number().int().positive().optional(),
});

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const entries = await ledgerService.listEntries({
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      type: req.query.type as LedgerType | undefined,
      category: req.query.category as string | undefined,
    });
    res.json({ entries });
  } catch (err) {
    next(err);
  }
}

export async function summary(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await ledgerService.getSummary({
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function categories(_req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await ledgerService.listCategories();
    res.json({ categories });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = entrySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors[0]?.message ?? "Geçersiz veri");
    }
    if (!req.user) throw new AppError(401, "Yetkilendirme gerekli");
    const entry = await ledgerService.createEntry(parsed.data, req.user.userId);
    res.status(201).json({ entry });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) throw new AppError(400, "Geçersiz id");
    const parsed = entrySchema.partial().safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors[0]?.message ?? "Geçersiz veri");
    }
    const entry = await ledgerService.updateEntry(id, parsed.data);
    res.json({ entry });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) throw new AppError(400, "Geçersiz id");
    await ledgerService.deleteEntry(id);
    res.json({ message: "Kayıt silindi" });
  } catch (err) {
    next(err);
  }
}
