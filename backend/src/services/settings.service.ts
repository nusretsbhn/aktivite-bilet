import { prisma } from "../utils/prisma.js";

const BRAND_KEYS = [
  "company_name",
  "company_phone",
  "company_email",
  "company_address",
  "company_logo",
  "currency",
] as const;

export async function getAll() {
  const rows = await prisma.settings.findMany();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function getBrand() {
  const all = await getAll();
  return {
    companyName: all.company_name ?? "Tur Yönetim",
    companyPhone: all.company_phone ?? "",
    companyEmail: all.company_email ?? "",
    companyAddress: all.company_address ?? "",
    companyLogo: all.company_logo ?? "",
    currency: all.currency ?? "TRY",
  };
}

export async function upsertMany(data: Record<string, string>) {
  for (const [key, value] of Object.entries(data)) {
    await prisma.settings.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
  return getBrand();
}

export async function setLogo(base64DataUrl: string) {
  await prisma.settings.upsert({
    where: { key: "company_logo" },
    update: { value: base64DataUrl },
    create: { key: "company_logo", value: base64DataUrl },
  });
  return { companyLogo: base64DataUrl };
}

export { BRAND_KEYS };
