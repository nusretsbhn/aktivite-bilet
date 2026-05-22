import { TicketForm } from "@/components/tickets/TicketForm";

export function NewTicketPage() {
  return (
    <div>
      <h2 className="border-b border-border bg-card px-4 py-3 text-xl font-semibold">
        Bilet Kes
      </h2>
      <TicketForm />
    </div>
  );
}
