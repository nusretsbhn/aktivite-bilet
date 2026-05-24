import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { PaymentType, TicketStatus } from "@prisma/client";
import { AppError } from "../middlewares/errorHandler.js";
import * as ticketService from "../services/ticket.service.js";
import * as ticketImageService from "../services/ticketImage.service.js";
import { contentDisposition } from "../utils/contentDisposition.js";

const activityLineSchema = z.object({
  activityId: z.number().int().positive(),
  tourDate: z.string().min(1),
  tourStartTime: z.string().optional(),
  adultCount: z.number().int().min(0),
  childCount: z.number().int().min(0),
  infantCount: z.number().int().min(0),
  adultSellPrice: z.number().min(0).optional(),
  childSellPrice: z.number().min(0).optional(),
  infantSellPrice: z.number().min(0).optional(),
  adultBuyPrice: z.number().min(0).optional(),
  childBuyPrice: z.number().min(0).optional(),
  infantBuyPrice: z.number().min(0).optional(),
  unitPrice: z.number().min(0).optional(),
  prepaidAmount: z.number().min(0).optional(),
  paymentType: z.nativeEnum(PaymentType),
  remainderToOperator: z.boolean().optional(),
  hasTransfer: z.boolean().optional(),
  hotelName: z.string().optional(),
  pickupTime: z.string().optional(),
  notes: z.string().optional(),
});

const createTicketSchema = z.object({
  customerName: z.string().min(1, "Müşteri adı gerekli"),
  customerPhone: z.string().min(1, "Telefon gerekli"),
  bankAccountId: z.number().int().positive().optional(),
  activities: z.array(activityLineSchema).min(1),
});

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createTicketSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors[0]?.message ?? "Geçersiz veri");
    }
    if (!req.user) throw new AppError(401, "Yetkilendirme gerekli");

    const ticket = await ticketService.createTicket(parsed.data, req.user.userId);
    res.status(201).json({ ticket });
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const q = req.query;
    const result = await ticketService.listTickets({
      startDate: q.startDate as string | undefined,
      endDate: q.endDate as string | undefined,
      paymentType: q.paymentType as PaymentType | undefined,
      status: q.status ? (q.status as TicketStatus) : undefined,
      search: q.search as string | undefined,
      page: q.page ? Number(q.page) : 1,
      limit: q.limit ? Number(q.limit) : 20,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function listImages(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) throw new AppError(400, "Geçersiz bilet id");
    const images = await ticketImageService.listActivityImages(id);
    res.json({ images });
  } catch (err) {
    next(err);
  }
}

export async function getImage(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) throw new AppError(400, "Geçersiz bilet id");

    const lineId = Number(req.query.activityLineId);
    if (Number.isNaN(lineId)) {
      throw new AppError(400, "activityLineId gerekli");
    }

    const format = req.query.format === "pdf" ? "pdf" : "png";
    const { buffer, contentType, filename } =
      await ticketImageService.generateTicketImage(id, format, lineId);

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", contentDisposition(filename, "inline"));
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) throw new AppError(400, "Geçersiz bilet id");
    const ticket = await ticketService.getTicketById(id);
    res.json({ ticket });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) throw new AppError(400, "Geçersiz bilet id");
    const parsed = createTicketSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors[0]?.message ?? "Geçersiz veri");
    }
    const ticket = await ticketService.updateTicket(id, parsed.data);
    res.json({ ticket });
  } catch (err) {
    next(err);
  }
}

export async function cancel(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) throw new AppError(400, "Geçersiz bilet id");
    const ticket = await ticketService.cancelTicket(id);
    res.json({ ticket });
  } catch (err) {
    next(err);
  }
}
