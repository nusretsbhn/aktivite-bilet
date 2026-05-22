import { LedgerType, type Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma.js";
import { AppError } from "../middlewares/errorHandler.js";

export async function listEntries(query: {
  startDate?: string;
  endDate?: string;
  type?: LedgerType;
  category?: string;
}) {
  const where: Prisma.GeneralLedgerWhereInput = {};

  if (query.type) where.type = query.type;
  if (query.category) {
    where.category = { contains: query.category, mode: "insensitive" };
  }
  if (query.startDate || query.endDate) {
    where.date = {};
    if (query.startDate) where.date.gte = new Date(query.startDate);
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      where.date.lte = end;
    }
  }

  return prisma.generalLedger.findMany({
    where,
    orderBy: { date: "desc" },
  });
}

export async function createEntry(
  data: {
    type: LedgerType;
    category: string;
    description: string;
    amount: number;
    date?: string;
    referenceId?: number;
    bankAccountId?: number;
  },
  createdBy: number
) {
  const absAmount = Math.abs(data.amount);
  const amount =
    data.type === LedgerType.EXPENSE ? -absAmount : absAmount;
  const entryDate = data.date ? new Date(data.date) : new Date();

  return prisma.$transaction(async (tx) => {
    const entry = await tx.generalLedger.create({
      data: {
        type: data.type,
        category: data.category,
        description: data.description,
        amount,
        date: entryDate,
        referenceId: data.referenceId,
        createdBy,
      },
    });

    if (data.bankAccountId) {
      const account = await tx.bankAccount.findFirst({
        where: { id: data.bankAccountId, isActive: true },
      });
      if (!account) {
        throw new AppError(400, "Geçerli bir banka/kasa hesabı seçin");
      }

      const bankAmount =
        data.type === LedgerType.INCOME ? absAmount : -absAmount;

      await tx.bankTransaction.create({
        data: {
          bankAccountId: data.bankAccountId,
          ledgerId: entry.id,
          description: `${data.category}: ${data.description}`,
          amount: bankAmount,
          transactionDate: entryDate,
        },
      });
    }

    return entry;
  });
}

export async function updateEntry(
  id: number,
  data: Partial<{
    type: LedgerType;
    category: string;
    description: string;
    amount: number;
    date: string;
  }>
) {
  const existing = await prisma.generalLedger.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "Kayıt bulunamadı");

  const type = data.type ?? existing.type;
  let amount = existing.amount;
  if (data.amount != null) {
    amount =
      type === LedgerType.EXPENSE
        ? -Math.abs(data.amount)
        : Math.abs(data.amount);
  }

  return prisma.generalLedger.update({
    where: { id },
    data: {
      ...(data.type && { type: data.type }),
      ...(data.category && { category: data.category }),
      ...(data.description && { description: data.description }),
      amount,
      ...(data.date && { date: new Date(data.date) }),
    },
  });
}

export async function deleteEntry(id: number) {
  const existing = await prisma.generalLedger.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "Kayıt bulunamadı");

  return prisma.$transaction(async (tx) => {
    await tx.bankTransaction.deleteMany({ where: { ledgerId: id } });
    return tx.generalLedger.delete({ where: { id } });
  });
}

export async function getSummary(query: { startDate?: string; endDate?: string }) {
  const where: Prisma.GeneralLedgerWhereInput = {};

  if (query.startDate || query.endDate) {
    where.date = {};
    if (query.startDate) where.date.gte = new Date(query.startDate);
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      where.date.lte = end;
    }
  }

  const entries = await prisma.generalLedger.findMany({ where });

  let income = 0;
  let expense = 0;
  const byCategory: Record<string, number> = {};

  for (const e of entries) {
    if (e.amount >= 0) {
      income += e.amount;
    } else {
      expense += Math.abs(e.amount);
    }
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
  }

  return {
    income,
    expense,
    net: income - expense,
    byCategory: Object.entries(byCategory).map(([category, total]) => ({
      category,
      total,
    })),
  };
}

export async function listCategories() {
  const rows = await prisma.generalLedger.findMany({
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });
  return rows.map((r) => r.category);
}
