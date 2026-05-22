import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

const SEQ_REGEX = /^\d{5}$/;
const TICKET_NO_LOCK_KEY = 74238901;

type Tx = Prisma.TransactionClient;

async function readMaxSequence(db: Tx | typeof prisma): Promise<number> {
  const [tickets, lines] = await Promise.all([
    db.ticket.findMany({ select: { ticketNo: true } }),
    db.ticketActivity.findMany({ select: { ticketNo: true } }),
  ]);

  let maxSeq = 0;
  for (const row of [...tickets, ...lines]) {
    if (SEQ_REGEX.test(row.ticketNo)) {
      maxSeq = Math.max(maxSeq, parseInt(row.ticketNo, 10));
    }
  }
  return maxSeq;
}

/** Sıralı bilet no: 00001, 00002, … — aynı işlemde birden fazla aktivite için ardışık numaralar */
export async function allocateTicketNos(count: number, tx: Tx): Promise<string[]> {
  if (count < 1) return [];

  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${TICKET_NO_LOCK_KEY})`;

  const maxSeq = await readMaxSequence(tx);
  return Array.from({ length: count }, (_, i) =>
    String(maxSeq + i + 1).padStart(5, "0")
  );
}

/** Tek numara (geriye uyumluluk) */
export async function generateTicketNo(tx?: Tx): Promise<string> {
  if (tx) {
    const [one] = await allocateTicketNos(1, tx);
    return one;
  }
  return prisma.$transaction(async (client) => {
    const [one] = await allocateTicketNos(1, client);
    return one;
  });
}
