import type { Request, Response, NextFunction } from "express";
import { AppError } from "../middlewares/errorHandler.js";
import * as bankAccountService from "../services/bankAccount.service.js";

export async function listPicklist(_req: Request, res: Response, next: NextFunction) {
  try {
    const bankAccounts = await bankAccountService.listActive();
    res.json({ bankAccounts });
  } catch (err) {
    next(err);
  }
}

export async function list(_req: Request, res: Response, next: NextFunction) {
  try {
    const bankAccounts = await bankAccountService.listAll();
    res.json({ bankAccounts });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, description } = req.body as { name?: string; description?: string };
    if (!name?.trim()) throw new AppError(400, "Hesap adı gerekli");
    const bankAccount = await bankAccountService.create({ name, description });
    res.status(201).json({ bankAccount });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) throw new AppError(400, "Geçersiz id");
    const bankAccount = await bankAccountService.update(id, req.body);
    res.json({ bankAccount });
  } catch (err) {
    next(err);
  }
}

export async function getTransactions(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) throw new AppError(400, "Geçersiz id");

    const result = await bankAccountService.getTransactions(id, {
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}
