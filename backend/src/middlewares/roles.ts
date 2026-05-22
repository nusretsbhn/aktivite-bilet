import type { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler.js";

export function requireRoles(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, "Yetkilendirme gerekli"));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, "Bu işlem için yetkiniz yok"));
    }
    next();
  };
}
