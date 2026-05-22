import type { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma.js";
import { AppError } from "../middlewares/errorHandler.js";
import type { ActivityPrices } from "../utils/pricing.js";
import * as activityService from "./activity.service.js";

export type FullActivityPrices = ActivityPrices & {
  adultBuyPrice: number;
  childBuyPrice: number;
  infantBuyPrice: number;
};

export type PriceInput = {
  activityId: number;
  startDate: string;
  endDate: string;
  adultBuyPrice: number;
  childBuyPrice: number;
  infantBuyPrice: number;
  adultSellPrice: number;
  childSellPrice: number;
  infantSellPrice: number;
};

const priceSelect = {
  id: true,
  activityId: true,
  startDate: true,
  endDate: true,
  adultBuyPrice: true,
  childBuyPrice: true,
  infantBuyPrice: true,
  adultSellPrice: true,
  childSellPrice: true,
  infantSellPrice: true,
};

type PriceRecord = {
  id: number;
  activityId: number;
  startDate: Date;
  endDate: Date;
  adultBuyPrice: number;
  childBuyPrice: number;
  infantBuyPrice: number;
  adultSellPrice: number;
  childSellPrice: number;
  infantSellPrice: number;
};

/** YYYY-MM-DD → UTC gün (saat dilimi kayması olmadan) */
export function parseDateOnly(dateStr: string): Date {
  const part = dateStr.split("T")[0];
  const [y, m, d] = part.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
}

export function endOfDayUTC(dateStr: string): Date {
  const part = dateStr.split("T")[0];
  const [y, m, d] = part.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
}

function dateKeyUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dayBeforeUTC(d: Date): Date {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() - 1);
  return next;
}

function dayAfterUTC(d: Date): Date {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

function dayBounds(date: Date) {
  const key = dateKeyUTC(date);
  return {
    dayStart: parseDateOnly(key),
    dayEnd: endOfDayUTC(key),
  };
}

function parseRange(startDate: string, endDate: string) {
  const start = parseDateOnly(startDate);
  const end = endOfDayUTC(endDate);
  if (end < start) {
    throw new AppError(400, "Bitiş tarihi başlangıçtan önce olamaz");
  }
  return { start, end };
}

function priceDataFromInput(data: Omit<PriceInput, "activityId" | "startDate" | "endDate">) {
  return {
    adultBuyPrice: data.adultBuyPrice,
    childBuyPrice: data.childBuyPrice,
    infantBuyPrice: data.infantBuyPrice,
    adultSellPrice: data.adultSellPrice,
    childSellPrice: data.childSellPrice,
    infantSellPrice: data.infantSellPrice,
  };
}

function priceDataFromRecord(record: PriceRecord) {
  return {
    adultBuyPrice: record.adultBuyPrice,
    childBuyPrice: record.childBuyPrice,
    infantBuyPrice: record.infantBuyPrice,
    adultSellPrice: record.adultSellPrice,
    childSellPrice: record.childSellPrice,
    infantSellPrice: record.infantSellPrice,
  };
}

function periodSpanMs(record: { startDate: Date; endDate: Date }) {
  return record.endDate.getTime() - record.startDate.getTime();
}

export async function getFullPricesForDate(
  activityId: number,
  date: Date
): Promise<FullActivityPrices | null> {
  const { dayStart, dayEnd } = dayBounds(date);

  const matches = await prisma.activityPrice.findMany({
    where: {
      activityId,
      startDate: { lte: dayEnd },
      endDate: { gte: dayStart },
    },
  });

  if (matches.length === 0) return null;

  const price = matches.reduce((best, cur) =>
    periodSpanMs(cur) < periodSpanMs(best) ? cur : best
  );

  return {
    adultSellPrice: price.adultSellPrice,
    childSellPrice: price.childSellPrice,
    infantSellPrice: price.infantSellPrice,
    adultBuyPrice: price.adultBuyPrice,
    childBuyPrice: price.childBuyPrice,
    infantBuyPrice: price.infantBuyPrice,
  };
}

export async function listByActivity(
  activityId: number,
  startDate?: string,
  endDate?: string
) {
  await activityService.getById(activityId);

  const where: {
    activityId: number;
    startDate?: { lte: Date };
    endDate?: { gte: Date };
  } = { activityId };

  if (startDate && endDate) {
    where.startDate = { lte: endOfDayUTC(endDate) };
    where.endDate = { gte: parseDateOnly(startDate) };
  }

  return prisma.activityPrice.findMany({
    where,
    orderBy: { startDate: "asc" },
    select: priceSelect,
  });
}

async function findOverlapping(activityId: number, start: Date, end: Date) {
  return prisma.activityPrice.findMany({
    where: {
      activityId,
      startDate: { lte: end },
      endDate: { gte: start },
    },
    orderBy: { startDate: "asc" },
    select: priceSelect,
  });
}

type Tx = Prisma.TransactionClient;

async function splitOverlapsForNewPeriod(
  tx: Tx,
  activityId: number,
  overlaps: PriceRecord[],
  newStart: Date,
  newEnd: Date
) {
  for (const existing of overlaps) {
    const exStart = existing.startDate;
    const exEnd = existing.endDate;
    const oldPrices = priceDataFromRecord(existing);

    await tx.activityPrice.delete({ where: { id: existing.id } });

    if (exStart.getTime() < newStart.getTime()) {
      await tx.activityPrice.create({
        data: {
          activityId,
          startDate: exStart,
          endDate: endOfDayUTC(dateKeyUTC(dayBeforeUTC(newStart))),
          ...oldPrices,
        },
      });
    }

    if (exEnd.getTime() > newEnd.getTime()) {
      await tx.activityPrice.create({
        data: {
          activityId,
          startDate: parseDateOnly(dateKeyUTC(dayAfterUTC(newEnd))),
          endDate: exEnd,
          ...oldPrices,
        },
      });
    }
  }
}

export async function createPrice(data: PriceInput) {
  await activityService.getById(data.activityId);
  const { start, end } = parseRange(data.startDate, data.endDate);
  const prices = priceDataFromInput(data);

  const overlaps = await findOverlapping(data.activityId, start, end);

  const exact = overlaps.find(
    (o) =>
      dateKeyUTC(o.startDate) === dateKeyUTC(start) &&
      dateKeyUTC(o.endDate) === dateKeyUTC(end)
  );

  if (exact) {
    const price = await prisma.activityPrice.update({
      where: { id: exact.id },
      data: { startDate: start, endDate: end, ...prices },
      select: priceSelect,
    });
    return { price, updated: true };
  }

  const result = await prisma.$transaction(async (tx) => {
    if (overlaps.length > 0) {
      await splitOverlapsForNewPeriod(
        tx,
        data.activityId,
        overlaps,
        start,
        end
      );
    }

    const price = await tx.activityPrice.create({
      data: {
        activityId: data.activityId,
        startDate: start,
        endDate: end,
        ...prices,
      },
      select: priceSelect,
    });
    return price;
  });

  return { price: result, updated: overlaps.length > 0 };
}

async function assertNoOverlapExcept(
  activityId: number,
  start: Date,
  end: Date,
  excludeId: number
) {
  const conflict = await prisma.activityPrice.findFirst({
    where: {
      activityId,
      id: { not: excludeId },
      startDate: { lte: end },
      endDate: { gte: start },
    },
  });
  if (conflict) {
    throw new AppError(
      400,
      "Bu tarih aralığı başka bir fiyat dönemiyle çakışıyor"
    );
  }
}

export async function updatePrice(
  id: number,
  data: Partial<Omit<PriceInput, "activityId">>
) {
  const existing = await prisma.activityPrice.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "Fiyat kaydı bulunamadı");

  const start = data.startDate
    ? parseDateOnly(data.startDate)
    : existing.startDate;
  const end = data.endDate ? endOfDayUTC(data.endDate) : existing.endDate;
  if (end < start) {
    throw new AppError(400, "Bitiş tarihi başlangıçtan önce olamaz");
  }

  const overlaps = await findOverlapping(existing.activityId, start, end);
  const others = overlaps.filter((o) => o.id !== id);

  if (others.length > 0) {
    const prices = {
      ...priceDataFromRecord(existing),
      ...priceDataFromInput({
        adultBuyPrice: data.adultBuyPrice ?? existing.adultBuyPrice,
        childBuyPrice: data.childBuyPrice ?? existing.childBuyPrice,
        infantBuyPrice: data.infantBuyPrice ?? existing.infantBuyPrice,
        adultSellPrice: data.adultSellPrice ?? existing.adultSellPrice,
        childSellPrice: data.childSellPrice ?? existing.childSellPrice,
        infantSellPrice: data.infantSellPrice ?? existing.infantSellPrice,
      }),
    };

    const price = await prisma.$transaction(async (tx) => {
      await tx.activityPrice.delete({ where: { id } });
      await splitOverlapsForNewPeriod(
        tx,
        existing.activityId,
        others,
        start,
        end
      );
      return tx.activityPrice.create({
        data: {
          activityId: existing.activityId,
          startDate: start,
          endDate: end,
          ...prices,
        },
        select: priceSelect,
      });
    });
    return { price, updated: true };
  }

  const price = await prisma.activityPrice.update({
    where: { id },
    data: {
      startDate: start,
      endDate: end,
      ...(data.adultBuyPrice != null && { adultBuyPrice: data.adultBuyPrice }),
      ...(data.childBuyPrice != null && { childBuyPrice: data.childBuyPrice }),
      ...(data.infantBuyPrice != null && { infantBuyPrice: data.infantBuyPrice }),
      ...(data.adultSellPrice != null && { adultSellPrice: data.adultSellPrice }),
      ...(data.childSellPrice != null && { childSellPrice: data.childSellPrice }),
      ...(data.infantSellPrice != null && { infantSellPrice: data.infantSellPrice }),
    },
    select: priceSelect,
  });
  return { price, updated: true };
}

export async function deletePrice(id: number) {
  const existing = await prisma.activityPrice.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "Fiyat kaydı bulunamadı");
  return prisma.activityPrice.delete({ where: { id } });
}
