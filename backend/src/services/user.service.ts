import bcrypt from "bcrypt";
import { Role } from "@prisma/client";
import { prisma } from "../utils/prisma.js";
import { AppError } from "../middlewares/errorHandler.js";

export async function listUsers() {
  return prisma.user.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role: Role;
}) {
  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) throw new AppError(400, "Bu e-posta zaten kayıtlı");

  const passwordHash = await bcrypt.hash(data.password, 10);
  return prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: passwordHash,
      role: data.role,
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
}

export async function updateUser(
  id: number,
  data: Partial<{ name: string; email: string; role: Role; password: string }>
) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError(404, "Kullanıcı bulunamadı");

  if (data.email && data.email !== user.email) {
    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) throw new AppError(400, "Bu e-posta zaten kayıtlı");
  }

  const updateData: {
    name?: string;
    email?: string;
    role?: Role;
    password?: string;
  } = {};

  if (data.name) updateData.name = data.name;
  if (data.email) updateData.email = data.email;
  if (data.role) updateData.role = data.role;
  if (data.password) updateData.password = await bcrypt.hash(data.password, 10);

  return prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
}

export async function deleteUser(id: number, currentUserId: number) {
  if (id === currentUserId) {
    throw new AppError(400, "Kendi hesabınızı silemezsiniz");
  }
  const tickets = await prisma.ticket.count({ where: { createdBy: id } });
  if (tickets > 0) {
    throw new AppError(400, "Bu kullanıcının biletleri var, silinemez");
  }
  return prisma.user.delete({ where: { id } });
}
