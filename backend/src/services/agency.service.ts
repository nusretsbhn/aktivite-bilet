import { prisma } from "../utils/prisma.js";
import { AppError } from "../middlewares/errorHandler.js";
import type { ActivityPrices } from "../utils/pricing.js";

export type FullActivityPrices = ActivityPrices & {
  adultBuyPrice: number;
  childBuyPrice: number;
  infantBuyPrice: number;
};

export async function listAgencies() {
  return prisma.agency.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { tickets: true, prices: true } },
    },
  });
}

export async function getAgencyById(id: number) {
  const agency = await prisma.agency.findUnique({
    where: { id },
    include: {
      prices: {
        orderBy: { startDate: "desc" },
        include: { activity: { select: { id: true, name: true } } },
      },
    },
  });
  if (!agency) throw new AppError(404, "Acenta bulunamadı");
  return agency;
}

export async function createAgency(data: {
  name: string;
  contactName: string;
  phone: string;
  region: string;
  tourInfo?: string;
  serviceHours?: string;
}) {
  return prisma.agency.create({ data });
}

export async function updateAgency(
  id: number,
  data: Partial<{
    name: string;
    contactName: string;
    phone: string;
    region: string;
    tourInfo: string | null;
    serviceHours: string | null;
  }>
) {
  await getAgencyById(id);
  return prisma.agency.update({ where: { id }, data });
}

export async function deleteAgency(id: number) {
  const tickets = await prisma.ticket.count({ where: { agencyId: id } });
  if (tickets > 0) {
    throw new AppError(400, "Bu acentaya bağlı biletler var, silinemez");
  }
  return prisma.agency.delete({ where: { id } });
}

export async function getPricesForDate(
  agencyId: number,
  date: Date,
  activityId?: number
): Promise<ActivityPrices | null> {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const price = await prisma.agencyPrice.findFirst({
    where: {
      agencyId,
      startDate: { lte: dayEnd },
      endDate: { gte: dayStart },
      ...(activityId != null
        ? { OR: [{ activityId }, { activityId: null }] }
        : { activityId: null }),
    },
    orderBy: [{ activityId: "desc" }, { startDate: "desc" }],
  });

  if (!price) return null;

  return {
    adultSellPrice: price.adultSellPrice,
    childSellPrice: price.childSellPrice,
    infantSellPrice: price.infantSellPrice,
  };
}

export async function getFullPricesForDate(
  agencyId: number,
  date: Date,
  activityId?: number
): Promise<FullActivityPrices | null> {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const price = await prisma.agencyPrice.findFirst({
    where: {
      agencyId,
      startDate: { lte: dayEnd },
      endDate: { gte: dayStart },
      ...(activityId != null
        ? { OR: [{ activityId }, { activityId: null }] }
        : { activityId: null }),
    },
    orderBy: [{ activityId: "desc" }, { startDate: "desc" }],
  });

  if (!price) return null;

  return {
    adultSellPrice: price.adultSellPrice,
    childSellPrice: price.childSellPrice,
    infantSellPrice: price.infantSellPrice,
    adultBuyPrice: price.adultBuyPrice,
    childBuyPrice: price.childBuyPrice,
    infantBuyPrice: price.infantBuyPrice,
  };
}

export async function listPrices(agencyId: number) {
  return prisma.agencyPrice.findMany({
    where: { agencyId },
    orderBy: { startDate: "desc" },
    include: { activity: { select: { id: true, name: true } } },
  });
}

export async function createPrice(
  agencyId: number,
  data: {
    activityId?: number | null;
    startDate: string;
    endDate: string;
    adultBuyPrice: number;
    childBuyPrice: number;
    infantBuyPrice: number;
    adultSellPrice: number;
    childSellPrice: number;
    infantSellPrice: number;
  }
) {
  await getAgencyById(agencyId);

  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  if (end < start) {
    throw new AppError(400, "Bitiş tarihi başlangıçtan önce olamaz");
  }

  const overlap = await prisma.agencyPrice.findFirst({
    where: {
      agencyId,
      activityId: data.activityId ?? null,
      startDate: { lte: end },
      endDate: { gte: start },
    },
  });

  if (overlap) {
    throw new AppError(400, "Bu tarih aralığında çakışan fiyat kaydı var");
  }

  return prisma.agencyPrice.create({
    data: {
      agencyId,
      activityId: data.activityId ?? null,
      startDate: start,
      endDate: end,
      adultBuyPrice: data.adultBuyPrice,
      childBuyPrice: data.childBuyPrice,
      infantBuyPrice: data.infantBuyPrice,
      adultSellPrice: data.adultSellPrice,
      childSellPrice: data.childSellPrice,
      infantSellPrice: data.infantSellPrice,
    },
    include: { activity: { select: { id: true, name: true } } },
  });
}

export async function updatePrice(
  id: number,
  data: Partial<{
    startDate: string;
    endDate: string;
    adultBuyPrice: number;
    childBuyPrice: number;
    infantBuyPrice: number;
    adultSellPrice: number;
    childSellPrice: number;
    infantSellPrice: number;
  }>
) {
  const existing = await prisma.agencyPrice.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "Fiyat kaydı bulunamadı");

  return prisma.agencyPrice.update({
    where: { id },
    data: {
      ...(data.startDate && { startDate: new Date(data.startDate) }),
      ...(data.endDate && { endDate: new Date(data.endDate) }),
      ...(data.adultBuyPrice != null && { adultBuyPrice: data.adultBuyPrice }),
      ...(data.childBuyPrice != null && { childBuyPrice: data.childBuyPrice }),
      ...(data.infantBuyPrice != null && { infantBuyPrice: data.infantBuyPrice }),
      ...(data.adultSellPrice != null && { adultSellPrice: data.adultSellPrice }),
      ...(data.childSellPrice != null && { childSellPrice: data.childSellPrice }),
      ...(data.infantSellPrice != null && { infantSellPrice: data.infantSellPrice }),
    },
    include: { activity: { select: { id: true, name: true } } },
  });
}

export async function deletePrice(id: number) {
  const existing = await prisma.agencyPrice.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "Fiyat kaydı bulunamadı");
  return prisma.agencyPrice.delete({ where: { id } });
}
