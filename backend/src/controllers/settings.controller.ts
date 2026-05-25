import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AppError } from "../middlewares/errorHandler.js";
import * as settingsService from "../services/settings.service.js";

const brandSchema = z.object({
  companyName: z.string().optional(),
  companyPhone: z.string().optional(),
  companyPhone2: z.string().optional(),
  companyEmail: z.string().optional(),
  companyAddress: z.string().optional(),
  ticketInfoNote: z.string().optional(),
  currency: z.string().optional(),
});

export async function get(_req: Request, res: Response, next: NextFunction) {
  try {
    const brand = await settingsService.getBrand();
    res.json({ settings: brand });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = brandSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors[0]?.message ?? "Geçersiz veri");
    }
    const map: Record<string, string> = {};
    if (parsed.data.companyName != null) map.company_name = parsed.data.companyName;
    if (parsed.data.companyPhone != null) map.company_phone = parsed.data.companyPhone;
    if (parsed.data.companyPhone2 != null) map.company_phone_2 = parsed.data.companyPhone2;
    if (parsed.data.companyEmail != null) map.company_email = parsed.data.companyEmail;
    if (parsed.data.companyAddress != null) map.company_address = parsed.data.companyAddress;
    if (parsed.data.ticketInfoNote != null) map.ticket_info_note = parsed.data.ticketInfoNote;
    if (parsed.data.currency != null) map.currency = parsed.data.currency;

    const settings = await settingsService.upsertMany(map);
    res.json({ settings });
  } catch (err) {
    next(err);
  }
}

export async function uploadLogo(req: Request, res: Response, next: NextFunction) {
  try {
    const { logo } = req.body as { logo?: string };
    if (!logo?.startsWith("data:image/")) {
      throw new AppError(400, "Geçerli bir görsel (base64) gerekli");
    }
    const result = await settingsService.setLogo(logo);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function uploadTursabLogo(req: Request, res: Response, next: NextFunction) {
  try {
    const { logo } = req.body as { logo?: string };
    if (!logo?.startsWith("data:image/")) {
      throw new AppError(400, "Geçerli bir görsel (base64) gerekli");
    }
    const result = await settingsService.setTursabLogo(logo);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
