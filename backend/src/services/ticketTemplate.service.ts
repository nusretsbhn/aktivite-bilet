import type { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma.js";
import { AppError } from "../middlewares/errorHandler.js";

export type TemplateElementType =
  | "logo"
  | "companyName"
  | "ticketNo"
  | "ticketBadge"
  | "customerName"
  | "customerPhone"
  | "tourDate"
  | "activities"
  | "activityNotes"
  | "personCount"
  | "transfer"
  | "amount"
  | "paymentStatus"
  | "qr"
  | "footer";

export type TemplateLayout = {
  elements: TemplateElementType[];
  primaryColor?: string;
  showLogo?: boolean;
};

export const DEFAULT_LAYOUT: TemplateLayout = {
  elements: [
    "companyName",
    "ticketNo",
    "ticketBadge",
    "customerName",
    "customerPhone",
    "tourDate",
    "activities",
    "activityNotes",
    "personCount",
    "amount",
    "paymentStatus",
    "qr",
    "footer",
  ],
  primaryColor: "#0f766e",
  showLogo: true,
};

export async function listTemplates() {
  return prisma.ticketTemplate.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getDefaultTemplate() {
  let template = await prisma.ticketTemplate.findFirst({
    where: { isDefault: true },
  });
  if (!template) {
    template = await prisma.ticketTemplate.findFirst({
      orderBy: { id: "asc" },
    });
  }
  return template;
}

export async function createTemplate(data: {
  name: string;
  layout: TemplateLayout;
  isDefault?: boolean;
}) {
  if (data.isDefault) {
    await prisma.ticketTemplate.updateMany({ data: { isDefault: false } });
  }
  return prisma.ticketTemplate.create({
    data: {
      name: data.name,
      layout: data.layout as Prisma.InputJsonValue,
      isDefault: data.isDefault ?? false,
    },
  });
}

export async function updateTemplate(
  id: number,
  data: Partial<{ name: string; layout: TemplateLayout; isDefault: boolean }>
) {
  const existing = await prisma.ticketTemplate.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "Şablon bulunamadı");

  if (data.isDefault) {
    await prisma.ticketTemplate.updateMany({ data: { isDefault: false } });
  }

  return prisma.ticketTemplate.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.layout && { layout: data.layout as Prisma.InputJsonValue }),
      ...(data.isDefault != null && { isDefault: data.isDefault }),
    },
  });
}

export async function deleteTemplate(id: number) {
  const existing = await prisma.ticketTemplate.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "Şablon bulunamadı");
  if (existing.isDefault) {
    throw new AppError(400, "Varsayılan şablon silinemez");
  }
  return prisma.ticketTemplate.delete({ where: { id } });
}

export function parseLayout(layout: unknown): TemplateLayout {
  if (!layout || typeof layout !== "object") return DEFAULT_LAYOUT;
  const l = layout as TemplateLayout;
  return {
    elements: l.elements?.length ? l.elements : DEFAULT_LAYOUT.elements,
    primaryColor: l.primaryColor ?? DEFAULT_LAYOUT.primaryColor,
    showLogo: l.showLogo ?? true,
  };
}
