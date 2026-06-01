import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";
import { useCanManage } from "@/hooks/useRole";
import { inputClass } from "@/lib/ui";

type Entry = {
  id: number;
  description: string;
  personCounts: string | null;
  debit: number;
  credit: number;
  balance: number;
  date: string;
  ticketId?: number | null;
};

export function CurrentAccountDetailPage() {
  const { activityId } = useParams<{ activityId: string }>();
  const id = Number(activityId);
  const canManage = useCanManage();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState("");
  const [debit, setDebit] = useState(0);
  const [credit, setCredit] = useState(0);
  const queryClient = useQueryClient();

  const params = new URLSearchParams({ activityId: String(id) });
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);

  const { data, isLoading } = useQuery({
    queryKey: ["current-account", id, startDate, endDate],
    queryFn: () =>
      apiFetch<{
        activity: { displayName: string };
        entries: Entry[];
        totals: { debit: number; credit: number; balance: number };
      }>(`/current-accounts?${params}`),
    enabled: canManage && !Number.isNaN(id),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch("/current-accounts", {
        method: "POST",
        body: JSON.stringify({
          activityId: id,
          description,
          debit: debit || undefined,
          credit: credit || undefined,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-account", id] });
      queryClient.invalidateQueries({ queryKey: ["current-accounts-summary"] });
      setShowForm(false);
      setDescription("");
      setDebit(0);
      setCredit(0);
    },
  });

  const entries = [...(data?.entries ?? [])].reverse();

  return (
    <div className="p-4 pb-8">
      <Link to="/current-accounts" className="text-sm text-primary">
        ← Cari Özet
      </Link>
      <h2 className="mt-2 text-xl font-semibold">{data?.activity.displayName ?? "…"}</h2>

      {data?.totals && (
        <div className="mt-3 rounded-xl bg-app p-3 text-sm">
          <p>
            Güncel bakiye:{" "}
            <strong
              className={
                data.totals.balance < 0 ? "text-green-800" : "text-red-800"
              }
            >
              {data.totals.balance.toLocaleString("tr-TR")} ₺
            </strong>
          </p>
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className={inputClass}
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className={inputClass}
        />
      </div>

      <button
        type="button"
        onClick={() => setShowForm(!showForm)}
        className="mt-3 min-h-11 w-full rounded-lg border border-teal-700 text-primary"
      >
        {showForm ? "İptal" : "+ Manuel Hareket"}
      </button>

      {showForm && (
        <form
          className="mt-3 space-y-3 rounded-xl border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
        >
          <input
            required
            placeholder="Açıklama"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          />
          <input
            type="number"
            min={0}
            placeholder="Borç (maliyet / aktiviteciye borç)"
            value={debit || ""}
            onChange={(e) => setDebit(Number(e.target.value))}
            className={inputClass}
          />
          <input
            type="number"
            min={0}
            placeholder="Alacak (To Pay / tahsilat)"
            value={credit || ""}
            onChange={(e) => setCredit(Number(e.target.value))}
            className={inputClass}
          />
          <button type="submit" className="min-h-11 w-full rounded-lg bg-teal-700 text-white">
            Ekle
          </button>
        </form>
      )}

      {isLoading && <p className="mt-4 text-muted">Yükleniyor…</p>}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted">
              <th className="py-2">Tarih</th>
              <th>Açıklama</th>
              <th className="whitespace-nowrap">Kişi</th>
              <th className="text-right">Borç</th>
              <th className="text-right">Alacak</th>
              <th className="text-right">Bakiye</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-border">
                <td className="py-2 whitespace-nowrap">
                  {new Date(e.date).toLocaleDateString("tr-TR")}
                </td>
                <td>{e.description}</td>
                <td className="whitespace-nowrap text-muted">
                  {e.personCounts ?? "—"}
                </td>
                <td className="text-right text-red-700">
                  {e.debit > 0 ? e.debit.toLocaleString("tr-TR") : "-"}
                </td>
                <td className="text-right text-green-700">
                  {e.credit > 0 ? e.credit.toLocaleString("tr-TR") : "-"}
                </td>
                <td className="text-right font-medium">
                  {e.balance.toLocaleString("tr-TR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
