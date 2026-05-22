import { prisma } from "./prisma.js";

export async function generateTicketNo(date: Date): Promise<string> {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const prefix = `TKT-${y}${m}${d}-`;

  const last = await prisma.ticket.findFirst({
    where: { ticketNo: { startsWith: prefix } },
    orderBy: { ticketNo: "desc" },
    select: { ticketNo: true },
  });

  let seq = 1;
  if (last) {
    const part = last.ticketNo.slice(prefix.length);
    seq = (parseInt(part, 10) || 0) + 1;
  }

  return `${prefix}${String(seq).padStart(3, "0")}`;
}
