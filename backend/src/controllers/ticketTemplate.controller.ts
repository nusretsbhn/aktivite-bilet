import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AppError } from "../middlewares/errorHandler.js";
import * as templateService from "../services/ticketTemplate.service.js";

const layoutSchema = z.object({
  elements: z.array(z.string()),
  primaryColor: z.string().optional(),
  showLogo: z.boolean().optional(),
});

const templateSchema = z.object({
  name: z.string().min(1),
  layout: layoutSchema,
  isDefault: z.boolean().optional(),
});

export async function list(_req: Request, res: Response, next: NextFunction) {
  try {
    const templates = await templateService.listTemplates();
    res.json({ templates });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = templateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors[0]?.message ?? "Geçersiz veri");
    }
    const template = await templateService.createTemplate({
      name: parsed.data.name,
      layout: parsed.data.layout as templateService.TemplateLayout,
      isDefault: parsed.data.isDefault,
    });
    res.status(201).json({ template });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) throw new AppError(400, "Geçersiz id");
    const parsed = templateSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors[0]?.message ?? "Geçersiz veri");
    }
    const template = await templateService.updateTemplate(id, {
      ...(parsed.data.name && { name: parsed.data.name }),
      ...(parsed.data.layout && {
        layout: parsed.data.layout as templateService.TemplateLayout,
      }),
      ...(parsed.data.isDefault != null && { isDefault: parsed.data.isDefault }),
    });
    res.json({ template });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) throw new AppError(400, "Geçersiz id");
    await templateService.deleteTemplate(id);
    res.json({ message: "Şablon silindi" });
  } catch (err) {
    next(err);
  }
}
