import {
  PaymentType,
  TicketStatus,
  LedgerType,
  type Prisma,
} from "@prisma/client";
import { prisma } from "../utils/prisma.js";
import { AppError } from "../middlewares/errorHandler.js";
import { generateTicketNo } from "../utils/ticketNo.js";
import { calcActivityLineTotal } from "../utils/pricing.js";
import * as activityService from "./activity.service.js";
import * as activityPriceService from "./activityPrice.service.js";
import * as activityCurrentAccountService from "./activityCurrentAccount.service.js";

export type ActivityLineInput = {
  activityId: number;
  tourDate: string;
  tourStartTime?: string;
  adultCount: number;
  childCount: number;
  infantCount: number;
  adultSellPrice?: number;
  childSellPrice?: number;
  infantSellPrice?: number;
  adultBuyPrice?: number;
  childBuyPrice?: number;
  infantBuyPrice?: number;
  unitPrice?: number;
  prepaidAmount?: number;
  paymentType: PaymentType;
  remainderToOperator?: boolean;
  hasTransfer?: boolean;
  hotelName?: string;
  pickupTime?: string;
  notes?: string;
};

export type CreateTicketInput = {
  customerName: string;
  customerPhone: string;
  bankAccountId?: number;
  activities: ActivityLineInput[];
};

export type ListTicketsQuery = {
  startDate?: string;
  endDate?: string;
  paymentType?: PaymentType;
  status?: TicketStatus;
  search?: string;
  page?: number;
  limit?: number;
};

type ResolvedLine = {
  activityId: number;
  activityDisplayName: string;
  tourDate: Date;
  tourStartTime?: string;
  adultCount: number;
  childCount: number;
  infantCount: number;
  adultSellPrice: number;
  childSellPrice: number;
  infantSellPrice: number;
  adultBuyPrice: number;
  childBuyPrice: number;
  infantBuyPrice: number;
  unitPrice: number;
  buyTotal: number;
  prepaidAmount: number;
  paymentType: PaymentType;
  remainderToOperator: boolean;
  hasTransfer: boolean;
  hotelName?: string;
  pickupTime?: string;
  notes?: string;
};

async function resolveLine(line: ActivityLineInput): Promise<ResolvedLine> {
  const activity = await activityService.getById(line.activityId);
  const counts = {
    adult: line.adultCount,
    child: line.childCount,
    infant: line.infantCount,
  };

  if (counts.adult + counts.child + counts.infant === 0) {
    throw new AppError(400, `${activity.displayName} için en az bir kişi girin`);
  }

  const periodPrices = await activityPriceService.getFullPricesForDate(
    line.activityId,
    new Date(line.tourDate)
  );

  const adultSellPrice =
    line.adultSellPrice ?? periodPrices?.adultSellPrice ?? 0;
  const childSellPrice =
    line.childSellPrice ?? periodPrices?.childSellPrice ?? 0;
  const infantSellPrice =
    line.infantSellPrice ?? periodPrices?.infantSellPrice ?? 0;
  const adultBuyPrice = line.adultBuyPrice ?? periodPrices?.adultBuyPrice ?? 0;
  const childBuyPrice = line.childBuyPrice ?? periodPrices?.childBuyPrice ?? 0;
  const infantBuyPrice =
    line.infantBuyPrice ?? periodPrices?.infantBuyPrice ?? 0;

  const calculatedSell = calcActivityLineTotal(
    { adultSellPrice, childSellPrice, infantSellPrice },
    counts
  );
  const buyTotal = calcActivityLineTotal(
    {
      adultSellPrice: adultBuyPrice,
      childSellPrice: childBuyPrice,
      infantSellPrice: infantBuyPrice,
    },
    counts
  );

  let unitPrice =
    line.unitPrice != null ? Math.round(line.unitPrice) : calculatedSell;

  if (line.paymentType === PaymentType.FREE) {
    unitPrice = 0;
  }

  const prepaidAmount = Math.round(line.prepaidAmount ?? 0);
  let remainderToOperator = Boolean(line.remainderToOperator);

  if (remainderToOperator) {
    if (line.paymentType !== PaymentType.FULL_PAID) {
      throw new AppError(
        400,
        "Kalanın size ödenmesi yalnızca Full Paid ile kullanılabilir"
      );
    }
    if (prepaidAmount <= 0) {
      throw new AppError(400, "Ön ödeme girilmeden bu seçenek işaretlenemez");
    }
    if (prepaidAmount >= unitPrice) {
      throw new AppError(
        400,
        "Kalan tutar varken ön ödeme satış tutarından küçük olmalı"
      );
    }
  }

  return {
    activityId: line.activityId,
    activityDisplayName: activity.displayName,
    tourDate: new Date(line.tourDate),
    tourStartTime: line.tourStartTime,
    adultCount: line.adultCount,
    childCount: line.childCount,
    infantCount: line.infantCount,
    adultSellPrice,
    childSellPrice,
    infantSellPrice,
    adultBuyPrice,
    childBuyPrice,
    infantBuyPrice,
    unitPrice,
    buyTotal,
    prepaidAmount,
    paymentType: line.paymentType,
    remainderToOperator,
    hasTransfer: line.hasTransfer ?? false,
    hotelName: line.hotelName,
    pickupTime: line.pickupTime,
    notes: line.notes,
  };
}

function aggregatePaymentType(lines: ResolvedLine[]): PaymentType {
  if (lines.every((l) => l.paymentType === PaymentType.FULL_PAID)) {
    return PaymentType.FULL_PAID;
  }
  if (lines.every((l) => l.paymentType === PaymentType.FREE)) {
    return PaymentType.FREE;
  }
  if (lines.some((l) => l.paymentType === PaymentType.TO_PAY)) {
    return PaymentType.TO_PAY;
  }
  return PaymentType.TO_PAY;
}

export async function createTicket(input: CreateTicketInput, createdBy: number) {
  if (input.activities.length === 0) {
    throw new AppError(400, "En az bir aktivite ekleyin");
  }

  const resolved: ResolvedLine[] = [];
  for (const line of input.activities) {
    resolved.push(await resolveLine(line));
  }

  const totalPrepaid = resolved.reduce((s, l) => s + l.prepaidAmount, 0);
  if (totalPrepaid > 0 && !input.bankAccountId) {
    throw new AppError(400, "Ön ödeme için banka/kasa hesabı seçin");
  }

  for (const line of resolved) {
    if (line.prepaidAmount > line.unitPrice && line.paymentType !== PaymentType.FREE) {
      throw new AppError(400, "Ön ödeme, aktivite tutarından fazla olamaz");
    }
  }

  const totalAmount = resolved.reduce((s, l) => s + l.unitPrice, 0);
  const finalAmount = totalAmount;
  const prepaidAmount = totalPrepaid;
  const remainingAmount = Math.max(
    0,
    resolved.reduce((s, l) => {
      if (l.paymentType === PaymentType.FREE) return s;
      return s + Math.max(0, l.unitPrice - l.prepaidAmount);
    }, 0)
  );

  const adultCount = resolved.reduce((s, l) => s + l.adultCount, 0);
  const childCount = resolved.reduce((s, l) => s + l.childCount, 0);
  const infantCount = resolved.reduce((s, l) => s + l.infantCount, 0);
  const paymentType = aggregatePaymentType(resolved);
  const hasTransfer = resolved.some((l) => l.hasTransfer);
  const tourDate = resolved.reduce(
    (min, l) => (l.tourDate < min ? l.tourDate : min),
    resolved[0].tourDate
  );

  const ticketNo = await generateTicketNo();

  const ticket = await prisma.$transaction(async (tx) => {
    const created = await tx.ticket.create({
      data: {
        ticketNo,
        tourDate,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        hasTransfer,
        adultCount,
        childCount,
        infantCount,
        paymentType,
        totalAmount,
        finalAmount,
        prepaidAmount,
        remainingAmount,
        bankAccountId: input.bankAccountId,
        activities: {
          create: resolved.map((l) => ({
            activityId: l.activityId,
            tourDate: l.tourDate,
            tourStartTime: l.tourStartTime,
            unitPrice: l.unitPrice,
            buyTotal: l.buyTotal,
            adultCount: l.adultCount,
            childCount: l.childCount,
            infantCount: l.infantCount,
            adultSellPrice: l.adultSellPrice,
            childSellPrice: l.childSellPrice,
            infantSellPrice: l.infantSellPrice,
            adultBuyPrice: l.adultBuyPrice,
            childBuyPrice: l.childBuyPrice,
            infantBuyPrice: l.infantBuyPrice,
            prepaidAmount: l.prepaidAmount,
            paymentType: l.paymentType,
            remainderToOperator: l.remainderToOperator,
            hasTransfer: l.hasTransfer,
            hotelName: l.hotelName,
            pickupTime: l.pickupTime,
            notes: l.notes,
          })),
        },
        createdBy,
      },
      include: ticketInclude,
    });

    if (totalPrepaid > 0 && input.bankAccountId) {
      await tx.bankTransaction.create({
        data: {
          bankAccountId: input.bankAccountId,
          ticketId: created.id,
          description: `Bilet ön ödeme: ${ticketNo}`,
          amount: totalPrepaid,
        },
      });
    }

    if (finalAmount > 0) {
      await tx.generalLedger.create({
        data: {
          type: LedgerType.INCOME,
          category: "Bilet Geliri",
          description: `Bilet: ${ticketNo}`,
          amount: finalAmount,
          referenceId: created.id,
          createdBy,
        },
      });
    }

    await activityCurrentAccountService.recordActivityTicketLineEntries(tx, {
      ticketId: created.id,
      ticketNo,
      tourDate,
      lines: resolved.map((l) => ({
        activityId: l.activityId,
        activityName: l.activityDisplayName,
        buyTotal: l.buyTotal,
        unitPrice: l.unitPrice,
        prepaidAmount: l.prepaidAmount,
        paymentType: l.paymentType,
        remainderToOperator: l.remainderToOperator,
      })),
    });

    return created;
  });

  return ticket;
}

const ticketInclude = {
  activities: {
    include: {
      activity: {
        select: { id: true, name: true, displayName: true },
      },
    },
  },
  bankAccount: { select: { id: true, name: true } },
  user: { select: { id: true, name: true } },
} satisfies Prisma.TicketInclude;

export async function listTickets(query: ListTicketsQuery) {
  const page = query.page ?? 1;
  const limit = Math.min(query.limit ?? 20, 100);
  const skip = (page - 1) * limit;

  const where: Prisma.TicketWhereInput = {};

  if (query.status) {
    where.status = query.status;
  } else {
    where.status = { in: [TicketStatus.ACTIVE, TicketStatus.EDITED] };
  }
  if (query.paymentType) where.paymentType = query.paymentType;

  if (query.startDate || query.endDate) {
    where.tourDate = {};
    if (query.startDate) where.tourDate.gte = new Date(query.startDate);
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      where.tourDate.lte = end;
    }
  }

  if (query.search?.trim()) {
    const s = query.search.trim();
    where.OR = [
      { customerName: { contains: s, mode: "insensitive" } },
      { customerPhone: { contains: s } },
      { ticketNo: { contains: s, mode: "insensitive" } },
    ];
  }

  const [items, total, aggregates] = await Promise.all([
    prisma.ticket.findMany({
      where,
      orderBy: { tourDate: "desc" },
      skip,
      take: limit,
      include: {
        activities: {
          include: {
            activity: { select: { name: true, displayName: true } },
          },
        },
      },
    }),
    prisma.ticket.count({ where }),
    prisma.ticket.aggregate({
      where,
      _count: true,
      _sum: { finalAmount: true, prepaidAmount: true, remainingAmount: true },
    }),
  ]);

  return {
    items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    summary: {
      count: aggregates._count,
      totalAmount: aggregates._sum.finalAmount ?? 0,
      prepaid: aggregates._sum.prepaidAmount ?? 0,
      remaining: aggregates._sum.remainingAmount ?? 0,
    },
  };
}

export async function getTicketById(id: number) {
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: ticketInclude,
  });
  if (!ticket) throw new AppError(404, "Bilet bulunamadı");
  return ticket;
}

export async function updateTicket(id: number, input: CreateTicketInput) {
  const existing = await prisma.ticket.findUnique({
    where: { id },
    include: { activities: true },
  });
  if (!existing) throw new AppError(404, "Bilet bulunamadı");
  if (existing.status === TicketStatus.CANCELLED) {
    throw new AppError(400, "İptal edilmiş bilet düzenlenemez");
  }

  if (input.activities.length === 0) {
    throw new AppError(400, "En az bir aktivite ekleyin");
  }

  const resolved: ResolvedLine[] = [];
  for (const line of input.activities) {
    resolved.push(await resolveLine(line));
  }

  const totalPrepaid = resolved.reduce((s, l) => s + l.prepaidAmount, 0);
  if (totalPrepaid > 0 && !input.bankAccountId && !existing.bankAccountId) {
    throw new AppError(400, "Ön ödeme için banka/kasa hesabı seçin");
  }

  for (const line of resolved) {
    if (line.prepaidAmount > line.unitPrice && line.paymentType !== PaymentType.FREE) {
      throw new AppError(400, "Ön ödeme, aktivite tutarından fazla olamaz");
    }
  }

  const totalAmount = resolved.reduce((s, l) => s + l.unitPrice, 0);
  const finalAmount = totalAmount;
  const prepaidAmount = totalPrepaid;
  const remainingAmount = Math.max(
    0,
    resolved.reduce((s, l) => {
      if (l.paymentType === PaymentType.FREE) return s;
      return s + Math.max(0, l.unitPrice - l.prepaidAmount);
    }, 0)
  );

  const adultCount = resolved.reduce((s, l) => s + l.adultCount, 0);
  const childCount = resolved.reduce((s, l) => s + l.childCount, 0);
  const infantCount = resolved.reduce((s, l) => s + l.infantCount, 0);
  const paymentType = aggregatePaymentType(resolved);
  const hasTransfer = resolved.some((l) => l.hasTransfer);
  const tourDate = resolved.reduce(
    (min, l) => (l.tourDate < min ? l.tourDate : min),
    resolved[0].tourDate
  );

  const bankAccountId = input.bankAccountId ?? existing.bankAccountId;
  const revisionCount = existing.revisionCount + 1;

  return prisma.$transaction(async (tx) => {
    await tx.ticketActivity.deleteMany({ where: { ticketId: id } });

    const updated = await tx.ticket.update({
      where: { id },
      data: {
        tourDate,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        hasTransfer,
        adultCount,
        childCount,
        infantCount,
        paymentType,
        totalAmount,
        finalAmount,
        prepaidAmount,
        remainingAmount,
        bankAccountId,
        status: TicketStatus.EDITED,
        revisionCount,
        activities: {
          create: resolved.map((l) => ({
            activityId: l.activityId,
            tourDate: l.tourDate,
            tourStartTime: l.tourStartTime,
            unitPrice: l.unitPrice,
            buyTotal: l.buyTotal,
            adultCount: l.adultCount,
            childCount: l.childCount,
            infantCount: l.infantCount,
            adultSellPrice: l.adultSellPrice,
            childSellPrice: l.childSellPrice,
            infantSellPrice: l.infantSellPrice,
            adultBuyPrice: l.adultBuyPrice,
            childBuyPrice: l.childBuyPrice,
            infantBuyPrice: l.infantBuyPrice,
            prepaidAmount: l.prepaidAmount,
            paymentType: l.paymentType,
            remainderToOperator: l.remainderToOperator,
            hasTransfer: l.hasTransfer,
            hotelName: l.hotelName,
            pickupTime: l.pickupTime,
            notes: l.notes,
          })),
        },
      },
      include: ticketInclude,
    });

    await activityCurrentAccountService.replaceTicketCariEntries(tx, id, {
      ticketNo: existing.ticketNo,
      tourDate,
      lines: resolved.map((l) => ({
        activityId: l.activityId,
        activityName: l.activityDisplayName,
        buyTotal: l.buyTotal,
        unitPrice: l.unitPrice,
        prepaidAmount: l.prepaidAmount,
        paymentType: l.paymentType,
        remainderToOperator: l.remainderToOperator,
      })),
    });

    return updated;
  });
}

export async function cancelTicket(id: number) {
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) throw new AppError(404, "Bilet bulunamadı");
  if (ticket.status === TicketStatus.CANCELLED) {
    throw new AppError(400, "Bilet zaten iptal edilmiş");
  }

  return prisma.ticket.update({
    where: { id },
    data: { status: TicketStatus.CANCELLED },
    include: ticketInclude,
  });
}
