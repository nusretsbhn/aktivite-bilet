import { PaymentType, type Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma.js";
import { AppError } from "../middlewares/errorHandler.js";
import * as activityService from "./activity.service.js";

type TxClient = Prisma.TransactionClient;

async function getLastBalance(tx: TxClient, activityId: number): Promise<number> {
  const last = await tx.activityCurrentAccount.findFirst({
    where: { activityId },
    orderBy: [{ date: "desc" }, { id: "desc" }],
    select: { balance: true },
  });
  return last?.balance ?? 0;
}

export async function addEntry(
  tx: TxClient,
  data: {
    activityId: number;
    ticketId?: number;
    description: string;
    debit?: number;
    credit?: number;
    date?: Date;
  }
) {
  const debit = data.debit ?? 0;
  const credit = data.credit ?? 0;
  const prev = await getLastBalance(tx, data.activityId);
  // Bakiye = maliyet − To Pay (borç − alacak); alacaklıyken negatif
  const balance = prev + debit - credit;

  return tx.activityCurrentAccount.create({
    data: {
      activityId: data.activityId,
      ticketId: data.ticketId,
      description: data.description,
      debit,
      credit,
      balance,
      date: data.date ?? new Date(),
    },
  });
}

/**
 * Bilet satırı cari kuralları:
 * - Maliyet (buyTotal) her zaman borç (debit) — aktiviteciye borç
 * - TO_PAY: kalan satış tutarı alacak (credit) — cariden düşer
 * - FULL_PAID / FREE: yalnızca maliyet borcu
 */
export async function recordActivityTicketLineEntries(
  tx: TxClient,
  params: {
    ticketId: number;
    ticketNo: string;
    tourDate: Date;
    lines: {
      activityId: number;
      activityName: string;
      buyTotal: number;
      unitPrice: number;
      prepaidAmount: number;
      paymentType: PaymentType;
      remainderToOperator?: boolean;
    }[];
  }
) {
  for (const line of params.lines) {
    const sellAmount =
      line.paymentType === PaymentType.FREE ? 0 : line.unitPrice;
    const toPayRemainder =
      line.paymentType === PaymentType.TO_PAY
        ? Math.max(0, sellAmount - line.prepaidAmount)
        : 0;

    let debit = line.buyTotal;
    let credit = 0;

    // TO_PAY veya Full Paid + kalan aktiviteciye değil operatöre → caride kalan düşülmez
    if (
      line.paymentType === PaymentType.TO_PAY &&
      !line.remainderToOperator
    ) {
      credit = toPayRemainder;
    }

    if (debit <= 0 && credit <= 0) continue;

    const parts: string[] = [];
    if (debit > 0) parts.push(`Maliyet ${debit.toLocaleString("tr-TR")} ₺`);
    if (credit > 0 && toPayRemainder > 0) {
      parts.push(`To Pay ${toPayRemainder.toLocaleString("tr-TR")} ₺`);
    }

    await addEntry(tx, {
      activityId: line.activityId,
      ticketId: params.ticketId,
      description: `${params.ticketNo} — ${line.activityName}${parts.length ? ` (${parts.join(", ")})` : ""}`,
      debit,
      credit,
      date: params.tourDate,
    });
  }
}

async function recalculateBalances(tx: TxClient, activityId: number) {
  const entries = await tx.activityCurrentAccount.findMany({
    where: { activityId },
    orderBy: [{ date: "asc" }, { id: "asc" }],
  });

  let running = 0;
  for (const entry of entries) {
    running = running + entry.debit - entry.credit;
    if (entry.balance !== running) {
      await tx.activityCurrentAccount.update({
        where: { id: entry.id },
        data: { balance: running },
      });
    }
  }
}

/** Bilet düzenlendiğinde eski cari satırlarını kaldırıp yenilerini yazar */
export async function replaceTicketCariEntries(
  tx: TxClient,
  ticketId: number,
  params: {
    ticketNo: string;
    tourDate: Date;
    lines: {
      activityId: number;
      activityName: string;
      buyTotal: number;
      unitPrice: number;
      prepaidAmount: number;
      paymentType: PaymentType;
      remainderToOperator?: boolean;
    }[];
  }
) {
  const old = await tx.activityCurrentAccount.findMany({
    where: { ticketId },
    select: { activityId: true },
  });
  const activityIds = new Set(old.map((e) => e.activityId));

  await tx.activityCurrentAccount.deleteMany({ where: { ticketId } });

  for (const activityId of activityIds) {
    await recalculateBalances(tx, activityId);
  }

  for (const line of params.lines) {
    activityIds.add(line.activityId);
  }
  for (const activityId of activityIds) {
    await recalculateBalances(tx, activityId);
  }

  await recordActivityTicketLineEntries(tx, { ticketId, ...params });
}

export async function getSummary() {
  const activities = await activityService.listAll();

  const summaries = await Promise.all(
    activities.map(async (activity) => {
      const [last, agg] = await Promise.all([
        prisma.activityCurrentAccount.findFirst({
          where: { activityId: activity.id },
          orderBy: [{ date: "desc" }, { id: "desc" }],
        }),
        prisma.activityCurrentAccount.aggregate({
          where: { activityId: activity.id },
          _sum: { debit: true, credit: true },
        }),
      ]);

      return {
        activityId: activity.id,
        activityName: activity.displayName,
        isActive: activity.isActive,
        totalDebit: agg._sum.debit ?? 0,
        totalCredit: agg._sum.credit ?? 0,
        balance: last?.balance ?? 0,
      };
    })
  );

  return summaries.filter((s) => s.totalDebit > 0 || s.totalCredit > 0 || s.balance !== 0 || s.isActive);
}

export async function listByActivity(
  activityId: number,
  query?: { startDate?: string; endDate?: string }
) {
  const activity = await activityService.getById(activityId);

  const where: Prisma.ActivityCurrentAccountWhereInput = { activityId };

  if (query?.startDate || query?.endDate) {
    where.date = {};
    if (query.startDate) where.date.gte = new Date(query.startDate);
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      where.date.lte = end;
    }
  }

  const entries = await prisma.activityCurrentAccount.findMany({
    where,
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });

  const totals = entries.reduce(
    (acc, e) => {
      acc.debit += e.debit;
      acc.credit += e.credit;
      return acc;
    },
    { debit: 0, credit: 0 }
  );

  return {
    activity,
    entries,
    totals: {
      ...totals,
      balance: entries[0]?.balance ?? 0,
    },
  };
}

/** Mevcut hareketlerin bakiyesini maliyet − alacak formülüyle yeniden hesaplar */
export async function recalculateAllBalances() {
  const activityIds = await prisma.activityCurrentAccount.findMany({
    select: { activityId: true },
    distinct: ["activityId"],
  });

  for (const { activityId } of activityIds) {
    const entries = await prisma.activityCurrentAccount.findMany({
      where: { activityId },
      orderBy: [{ date: "asc" }, { id: "asc" }],
    });

    let running = 0;
    for (const entry of entries) {
      running = running + entry.debit - entry.credit;
      if (entry.balance !== running) {
        await prisma.activityCurrentAccount.update({
          where: { id: entry.id },
          data: { balance: running },
        });
      }
    }
  }
}

export async function createManualEntry(data: {
  activityId: number;
  description: string;
  debit?: number;
  credit?: number;
  date?: string;
}) {
  await activityService.getById(data.activityId);

  return prisma.$transaction((tx) =>
    addEntry(tx, {
      activityId: data.activityId,
      description: data.description,
      debit: data.debit ?? 0,
      credit: data.credit ?? 0,
      date: data.date ? new Date(data.date) : undefined,
    })
  );
}
