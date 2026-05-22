import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";
import { TicketForm } from "@/components/tickets/TicketForm";
import {
  mapTicketToLines,
  type TicketDetailResponse,
} from "@/utils/ticketFormMapper";

export function EditTicketPage() {
  const { id } = useParams<{ id: string }>();
  const ticketId = Number(id);

  const { data, isLoading, error } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () =>
      apiFetch<{ ticket: TicketDetailResponse }>(`/tickets/${ticketId}`).then(
        (r) => r.ticket
      ),
    enabled: !Number.isNaN(ticketId),
  });

  if (Number.isNaN(ticketId)) {
    return <p className="p-4 text-red-700">Geçersiz bilet</p>;
  }

  if (isLoading) {
    return <p className="p-4 text-muted">Yükleniyor…</p>;
  }

  if (error || !data) {
    return <p className="p-4 text-red-700">Bilet yüklenemedi</p>;
  }

  if (data.status === "CANCELLED") {
    return (
      <div className="p-4">
        <p className="text-red-700">İptal edilmiş bilet düzenlenemez.</p>
        <Link to="/tickets" className="mt-2 inline-block text-primary">
          ← Biletler
        </Link>
      </div>
    );
  }

  const initial = {
    ticketNo: data.ticketNo,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    bankAccountId: data.bankAccountId,
    lines: mapTicketToLines(data),
  };

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-3">
        <Link to="/tickets" className="text-sm text-primary">
          ←
        </Link>
        <h2 className="text-xl font-semibold">Bilet Düzenle</h2>
      </div>
      <TicketForm mode="edit" ticketId={ticketId} initial={initial} />
    </div>
  );
}
