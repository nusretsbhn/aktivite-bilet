import type { Request, Response, NextFunction } from "express";
import { AppError } from "../middlewares/errorHandler.js";
import * as activityService from "../services/activity.service.js";
import * as bankAccountService from "../services/bankAccount.service.js";
import * as agencyService from "../services/agency.service.js";

export async function listActivities(_req: Request, res: Response, next: NextFunction) {
  try {
    const activities = await activityService.listActive();
    res.json({ activities });
  } catch (err) {
    next(err);
  }
}

export async function listBankAccounts(_req: Request, res: Response, next: NextFunction) {
  try {
    const bankAccounts = await bankAccountService.listActive();
    res.json({ bankAccounts });
  } catch (err) {
    next(err);
  }
}

export async function listAgencies(_req: Request, res: Response, next: NextFunction) {
  try {
    const agencies = await agencyService.listAgencies();
    res.json({
      agencies: agencies.map(({ id, name, region, phone }) => ({
        id,
        name,
        region,
        phone,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function getAgencyPrices(req: Request, res: Response, next: NextFunction) {
  try {
    const agencyId = Number(req.query.agencyId);
    const dateStr = req.query.date as string;
    const activityId = req.query.activityId
      ? Number(req.query.activityId)
      : undefined;

    if (!agencyId || !dateStr) {
      throw new AppError(400, "agencyId ve date gerekli");
    }

    const prices = await agencyService.getFullPricesForDate(
      agencyId,
      new Date(dateStr),
      activityId
    );

    res.json({ prices });
  } catch (err) {
    next(err);
  }
}
