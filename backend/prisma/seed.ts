import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@example.com",
      password: passwordHash,
      role: Role.ADMIN,
    },
  });

  const activity1 = await prisma.activity.upsert({
    where: { id: 1 },
    update: { displayName: "Örnek Tur" },
    create: {
      name: "Ornek Tur",
      displayName: "Örnek Tur",
      description: "Demo aktivite",
      duration: "3 saat",
      isActive: true,
    },
  });

  const activity2 = await prisma.activity.upsert({
    where: { id: 2 },
    update: { displayName: "Tekne Turu" },
    create: {
      name: "Tekne Turu",
      displayName: "Tekne Turu",
      description: "Deniz turu",
      duration: "4 saat",
      isActive: true,
    },
  });

  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const yearEnd = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59);

  for (const [activity, prices] of [
    [
      activity1,
      {
        adultBuyPrice: 200,
        childBuyPrice: 100,
        infantBuyPrice: 0,
        adultSellPrice: 350,
        childSellPrice: 200,
        infantSellPrice: 0,
      },
    ],
    [
      activity2,
      {
        adultBuyPrice: 250,
        childBuyPrice: 150,
        infantBuyPrice: 0,
        adultSellPrice: 400,
        childSellPrice: 250,
        infantSellPrice: 0,
      },
    ],
  ] as const) {
    const existing = await prisma.activityPrice.findFirst({
      where: { activityId: activity.id },
    });
    if (!existing) {
      await prisma.activityPrice.create({
        data: {
          activityId: activity.id,
          startDate: yearStart,
          endDate: yearEnd,
          ...prices,
        },
      });
    }
  }

  await prisma.bankAccount.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Nakit Kasa",
      description: "Varsayılan kasa hesabı",
      isActive: true,
    },
  });

  await prisma.settings.upsert({
    where: { key: "company_name" },
    update: {},
    create: { key: "company_name", value: "Tur Yönetim" },
  });

  const defaultTpl = await prisma.ticketTemplate.findFirst({
    where: { isDefault: true },
  });
  if (defaultTpl) {
    const layout = defaultTpl.layout as {
      elements: string[];
      primaryColor?: string;
      showLogo?: boolean;
    };
    let changed = false;
    if (layout.elements && !layout.elements.includes("activityNotes")) {
      const idx = layout.elements.indexOf("activities");
      const insertAt = idx >= 0 ? idx + 1 : layout.elements.length;
      layout.elements.splice(insertAt, 0, "activityNotes");
      changed = true;
    }
    if (layout.elements && !layout.elements.includes("ticketBadge")) {
      const idx = layout.elements.indexOf("ticketNo");
      const insertAt = idx >= 0 ? idx + 1 : layout.elements.length;
      layout.elements.splice(insertAt, 0, "ticketBadge");
      changed = true;
    }
    if (changed) {
      await prisma.ticketTemplate.update({
        where: { id: defaultTpl.id },
        data: { layout },
      });
    }
  }

  const templateCount = await prisma.ticketTemplate.count();
  if (templateCount === 0) {
    await prisma.ticketTemplate.create({
      data: {
        name: "Varsayılan Şablon",
        isDefault: true,
        layout: {
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
            "paymentStatus",
            "qr",
            "footer",
          ],
          primaryColor: "#0f766e",
          showLogo: true,
        },
      },
    });
  }

  console.log("Seed tamamlandı:", { adminEmail: admin.email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
