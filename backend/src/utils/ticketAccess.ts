import { Role } from "@prisma/client";
import type { JwtPayload } from "../middlewares/auth.js";
import { AppError } from "../middlewares/errorHandler.js";
import { prisma } from "../utils/prisma.js";

export const ticketInclude = {
  activities: {
    include: {
      activity: {
        select: { id: true, name: true, displayName: true },
      },
    },
  },
  bankAccount: { select: { id: true, name: true } },
  user: { select: { id: true, name: true, hotelName: true, role: true } },
} as const;

export function isHotelRole(role: string) {
  return role === Role.HOTEL;
}

export async function getTicketForUser(id: number, user: JwtPayload) {
  const where =
    user.role === Role.HOTEL
      ? { id, createdBy: user.userId }
      : { id };

  const ticket = await prisma.ticket.findFirst({
    where,
    include: ticketInclude,
  });

  if (!ticket) throw new AppError(404, "Bilet bulunamadı");
  return ticket;
}

export async function isHotelCreator(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role === Role.HOTEL;
}
