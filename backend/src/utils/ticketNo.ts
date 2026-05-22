import { prisma } from "./prisma.js";

/** Sıralı bilet no: 00001, 00002, … (ilk bilet 00001) */
export async function generateTicketNo(): Promise<string> {
  const tickets = await prisma.ticket.findMany({
    select: { ticketNo: true },
  });

  let maxSeq = 0;
  for (const t of tickets) {
    if (/^\d{5}$/.test(t.ticketNo)) {
      maxSeq = Math.max(maxSeq, parseInt(t.ticketNo, 10));
    }
  }

  return String(maxSeq + 1).padStart(5, "0");
}
