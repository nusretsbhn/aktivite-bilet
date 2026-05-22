/** Bilet listesinde / önizlemede aktivite satır numaralarını göster */
export function formatTicketNumbers(ticket: {
  ticketNo: string;
  activities?: { ticketNo?: string }[];
}): string {
  const lineNos = ticket.activities
    ?.map((a) => a.ticketNo)
    .filter((n): n is string => Boolean(n));
  if (lineNos && lineNos.length > 0) return lineNos.join(", ");
  return ticket.ticketNo;
}
