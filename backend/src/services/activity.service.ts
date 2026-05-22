import { prisma } from "../utils/prisma.js";
import { AppError } from "../middlewares/errorHandler.js";

const activitySelect = {
  id: true,
  name: true,
  displayName: true,
  description: true,
  duration: true,
  isActive: true,
};

export async function listActive() {
  return prisma.activity.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: activitySelect,
  });
}

export async function listAll() {
  return prisma.activity.findMany({
    orderBy: { name: "asc" },
    select: activitySelect,
  });
}

export async function getById(id: number) {
  const activity = await prisma.activity.findUnique({
    where: { id },
    select: activitySelect,
  });
  if (!activity) throw new AppError(404, "Aktivite bulunamadı");
  return activity;
}

export async function create(data: {
  name: string;
  displayName: string;
  description?: string;
  duration?: string;
}) {
  return prisma.activity.create({
    data: {
      name: data.name,
      displayName: data.displayName,
      description: data.description,
      duration: data.duration,
      isActive: true,
    },
    select: activitySelect,
  });
}

export async function update(
  id: number,
  data: Partial<{
    name: string;
    displayName: string;
    description: string | null;
    duration: string | null;
    isActive: boolean;
  }>
) {
  await getById(id);
  return prisma.activity.update({
    where: { id },
    data,
    select: activitySelect,
  });
}

export async function deleteActivity(id: number) {
  await getById(id);
  const ticketLines = await prisma.ticketActivity.count({
    where: { activityId: id },
  });
  if (ticketLines > 0) {
    throw new AppError(
      400,
      "Bu aktiviteye bağlı bilet kayıtları var, silinemez"
    );
  }
  return prisma.activity.delete({ where: { id } });
}
