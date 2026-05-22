import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "./errorHandler.js";

export type JwtPayload = {
  userId: number;
  email: string;
  role: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new AppError(401, "Yetkilendirme gerekli"));
  }

  const token = header.slice(7);
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return next(new AppError(500, "JWT_SECRET tanımlı değil"));
  }

  try {
    req.user = jwt.verify(token, secret) as JwtPayload;
    next();
  } catch {
    next(new AppError(401, "Geçersiz veya süresi dolmuş token"));
  }
}
