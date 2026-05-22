import type { Request, Response, NextFunction } from "express";
import { PaymentType } from "@prisma/client";
import { AppError } from "../middlewares/errorHandler.js";
import * as calendarService from "../services/calendar.service.js";

export async function getCalendar(req: Request, res: Response, next: NextFunction) {
  try {
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    if (!startDate || !endDate) {
      throw new AppError(400, "startDate ve endDate gerekli");
    }

    const result = await calendarService.getCalendarEvents(startDate, endDate, {
      agencyId: req.query.agencyId ? Number(req.query.agencyId) : undefined,
      paymentType: req.query.paymentType as PaymentType | undefined,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}
