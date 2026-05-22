import { PAYMENT_COLORS, PAYMENT_LABELS, type PaymentType } from "@/types/ticket";

export function TicketStatusBadge({ paymentType }: { paymentType: PaymentType }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${PAYMENT_COLORS[paymentType]}`}
    >
      {PAYMENT_LABELS[paymentType]}
    </span>
  );
}
