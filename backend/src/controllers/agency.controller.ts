import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AppError } from "../middlewares/errorHandler.js";
import * as agencyService from "../services/agency.service.js";

const agencySchema = z.object({
  name: z.string().min(1),
  contactName: z.string().min(1),
  phone: z.string().min(1),
  region: z.string().min(1),
  tourInfo: z.string().optional(),
  serviceHours: z.string().optional(),
});

const priceSchema = z.object({
  agencyId: z.number().int().positive(),
  activityId: z.number().int().positive().optional().nullable(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  adultBuyPrice: z.number().min(0),
  childBuyPrice: z.number().min(0),
  infantBuyPrice: z.number().min(0),
  adultSellPrice: z.number().min(0),
  childSellPrice: z.number().min(0),
  infantSellPrice: z.number().min(0),
});

export async function list(_req: Request, res: Response, next: NextFunction) {
  try {
    const agencies = await agencyService.listAgencies();
    res.json({ agencies });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) throw new AppError(400, "Geçersiz id");
    const agency = await agencyService.getAgencyById(id);
    res.json({ agency });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = agencySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors[0]?.message ?? "Geçersiz veri");
    }
    const agency = await agencyService.createAgency(parsed.data);
    res.status(201).json({ agency });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) throw new AppError(400, "Geçersiz id");
    const parsed = agencySchema.partial().safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors[0]?.message ?? "Geçersiz veri");
    }
    const agency = await agencyService.updateAgency(id, parsed.data);
    res.json({ agency });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) throw new AppError(400, "Geçersiz id");
    await agencyService.deleteAgency(id);
    res.json({ message: "Acenta silindi" });
  } catch (err) {
    next(err);
  }
}

export async function listPrices(req: Request, res: Response, next: NextFunction) {
  try {
    const agencyId = Number(req.query.agencyId);
    if (!agencyId) throw new AppError(400, "agencyId gerekli");
    const prices = await agencyService.listPrices(agencyId);
    res.json({ prices });
  } catch (err) {
    next(err);
  }
}

export async function createPrice(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = priceSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors[0]?.message ?? "Geçersiz veri");
    }
    const { agencyId, ...data } = parsed.data;
    const price = await agencyService.createPrice(agencyId, data);
    res.status(201).json({ price });
  } catch (err) {
    next(err);
  }
}

export async function updatePrice(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) throw new AppError(400, "Geçersiz id");
    const parsed = priceSchema.partial().omit({ agencyId: true }).safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors[0]?.message ?? "Geçersiz veri");
    }
    const price = await agencyService.updatePrice(id, parsed.data);
    res.json({ price });
  } catch (err) {
    next(err);
  }
}

export async function removePrice(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) throw new AppError(400, "Geçersiz id");
    await agencyService.deletePrice(id);
    res.json({ message: "Fiyat silindi" });
  } catch (err) {
    next(err);
  }
}
