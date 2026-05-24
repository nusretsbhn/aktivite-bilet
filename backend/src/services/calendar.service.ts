import { PaymentType, TicketStatus } from "@prisma/client";
import { prisma } from "../utils/prisma.js";

export async function getCalendarEvents(
  startDate: string,
  endDate: string,
  filters?: {
    agencyId?: number;
    paymentType?: PaymentType;
  }
) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const where = {
    status: { in: [TicketStatus.ACTIVE, TicketStatus.EDITED] },
    tourDate: { gte: start, lte: end },
    ...(filters?.agencyId && { agencyId: filters.agencyId }),
    ...(filters?.paymentType && { paymentType: filters.paymentType }),
  };

  const tickets = await prisma.ticket.findMany({
    where,
    select: {
      id: true,
      ticketNo: true,
      tourDate: true,
      tourStartTime: true,
      customerName: true,
      paymentType: true,
      finalAmount: true,
      adultCount: true,
      childCount: true,
      infantCount: true,
      agency: { select: { name: true } },
      activities: {
        select: {
          tourDate: true,
          tourStartTime: true,
          paymentType: true,
        },
      },
    },
    orderBy: { tourDate: "asc" },
  });

  const dayMap = new Map<
    string,
    {
      date: string;
      ticketCount: number;
      personCount: number;
      totalAmount: number;
      byPayment: Record<string, number>;
      tickets: typeof tickets;
    }
  >();

  for (const t of tickets) {
    const key = t.tourDate.toISOString().slice(0, 10);
    const persons = t.adultCount + t.childCount + t.infantCount;
    const existing = dayMap.get(key) ?? {
      date: key,
      ticketCount: 0,
      personCount: 0,
      totalAmount: 0,
      byPayment: {},
      tickets: [],
    };
    existing.ticketCount += 1;
    existing.personCount += persons;
    existing.totalAmount += t.finalAmount;
    existing.byPayment[t.paymentType] = (existing.byPayment[t.paymentType] ?? 0) + 1;
    existing.tickets.push(t);
    dayMap.set(key, existing);
  }

  return {
    days: Array.from(dayMap.values()),
    tickets,
  };
}
