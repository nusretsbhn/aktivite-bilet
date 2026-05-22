import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";
import { TicketStatusBadge } from "@/components/tickets/TicketStatusBadge";
import { TicketImagePreview } from "@/components/tickets/TicketImagePreview";
import type { TicketListItem } from "@/types/ticket";

type ListResponse = {
  items: TicketListItem[];
  pagination: { page: number; total: number; pages: number };
  summary: { count: number; totalAmount: number; prepaid: number; remaining: number };
};

export function TicketsPage() {
  const [search, setSearch] = useState("");
  const [previewTicket, setPreviewTicket] = useState<{
    id: number;
    ticketNo: string;
  } | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["tickets", search],
    queryFn: () => {
      const params = new URLSearchParams({ status: "ACTIVE" });
      if (search.trim()) params.set("search", search.trim());
      return apiFetch<ListResponse>(`/tickets?${params}`);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/tickets/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tickets"] }),
  });

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  if (previewTicket) {
    return (
      <div className="p-4">
        <TicketImagePreview
          ticketId={previewTicket.id}
          ticketNo={previewTicket.ticketNo}
          onClose={() => setPreviewTicket(null)}
        />
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Biletler</h2>
        <Link
          to="/tickets/new"
          className="shrink-0 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white"
        >
          + Yeni
        </Link>
      </div>

      <input
        type="search"
        placeholder="Ad, telefon, bilet no…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mt-3 min-h-11 w-full rounded-lg border border-border px-3"
      />

      {data?.summary && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted">
          <div className="rounded-lg bg-app p-2">
            <span className="block font-medium text-fg">{data.summary.count} bilet</span>
          </div>
          <div className="rounded-lg bg-app p-2 text-right">
            <span className="block font-medium text-primary">
              {data.summary.totalAmount.toLocaleString("tr-TR")} ₺
            </span>
            <span>Bekleyen: {data.summary.remaining.toLocaleString("tr-TR")} ₺</span>
          </div>
        </div>
      )}

      {isLoading && <p className="mt-4 text-muted">Yükleniyor…</p>}

      <ul className="mt-4 space-y-3">
        {data?.items.map((ticket) => (
          <li
            key={ticket.id}
            className="rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-sm text-muted">{ticket.ticketNo}</p>
                <p className="font-semibold">{ticket.customerName}</p>
                <p className="text-sm text-muted">{ticket.customerPhone}</p>
              </div>
              <TicketStatusBadge paymentType={ticket.paymentType} />
            </div>
            <p className="mt-2 text-sm text-muted">
              {formatDate(ticket.tourDate)} · Y{ticket.adultCount} Ç{ticket.childCount} B
              {ticket.infantCount}
            </p>
            <p className="text-sm text-muted">
              {ticket.activities
                .map((a) => a.activity.displayName || a.activity.name)
                .join(", ")}
            </p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-lg font-bold text-primary">
                {ticket.finalAmount.toLocaleString("tr-TR")} ₺
              </span>
              {ticket.remainingAmount > 0 && (
                <span className="text-sm text-amber-700">
                  Kalan: {ticket.remainingAmount.toLocaleString("tr-TR")} ₺
                </span>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  setPreviewTicket({ id: ticket.id, ticketNo: ticket.ticketNo })
                }
                className="min-h-11 rounded-lg bg-teal-700 text-sm font-medium text-white"
              >
                Görsel Bilet
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm("Bu bilet iptal edilsin mi?")) {
                    cancelMutation.mutate(ticket.id);
                  }
                }}
                className="min-h-11 rounded-lg border border-red-200 text-sm text-red-700"
              >
                İptal Et
              </button>
            </div>
          </li>
        ))}
      </ul>

      {!isLoading && data?.items.length === 0 && (
        <p className="mt-8 text-center text-muted">Henüz bilet yok.</p>
      )}
    </div>
  );
}
