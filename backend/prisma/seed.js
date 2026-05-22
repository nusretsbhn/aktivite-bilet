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
    await prisma.activity.upsert({
        where: { id: 1 },
        update: {},
        create: {
            name: "Örnek Tur",
            description: "Demo aktivite",
            duration: "3 saat",
            isActive: true,
        },
    });
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
    console.log("Seed tamamlandı:", { adminEmail: admin.email });
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(() => prisma.$disconnect());
