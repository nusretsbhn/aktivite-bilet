import { prisma } from "../utils/prisma.js";
import { AppError } from "../middlewares/errorHandler.js";

export async function listActive() {
  return prisma.bankAccount.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, description: true },
  });
}

export async function listAll() {
  return prisma.bankAccount.findMany({
    orderBy: { name: "asc" },
  });
}

export async function create(data: { name: string; description?: string }) {
  return prisma.bankAccount.create({
    data: { name: data.name, description: data.description, isActive: true },
  });
}

export async function update(
  id: number,
  data: Partial<{ name: string; description: string | null; isActive: boolean }>
) {
  const existing = await prisma.bankAccount.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "Banka hesabı bulunamadı");
  return prisma.bankAccount.update({ where: { id }, data });
}

export async function getTransactions(
  bankAccountId: number,
  query?: { startDate?: string; endDate?: string }
) {
  const account = await prisma.bankAccount.findUnique({
    where: { id: bankAccountId },
  });
  if (!account) throw new AppError(404, "Banka hesabı bulunamadı");

  const where: { bankAccountId: number; transactionDate?: { gte?: Date; lte?: Date } } = {
    bankAccountId,
  };

  if (query?.startDate || query?.endDate) {
    where.transactionDate = {};
    if (query.startDate) where.transactionDate.gte = new Date(query.startDate);
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      where.transactionDate.lte = end;
    }
  }

  const transactions = await prisma.bankTransaction.findMany({
    where,
    orderBy: { transactionDate: "desc" },
  });

  let runningBalance = 0;
  const withBalance = [...transactions].reverse().map((tx) => {
    runningBalance += tx.amount;
    return { ...tx, balance: runningBalance };
  }).reverse();

  const summary = transactions.reduce(
    (acc, tx) => {
      if (tx.amount >= 0) acc.income += tx.amount;
      else acc.expense += Math.abs(tx.amount);
      return acc;
    },
    { income: 0, expense: 0 }
  );

  return {
    account,
    transactions: withBalance,
    summary: {
      income: summary.income,
      expense: summary.expense,
      net: summary.income - summary.expense,
      endBalance: withBalance[0]?.balance ?? 0,
    },
  };
}
