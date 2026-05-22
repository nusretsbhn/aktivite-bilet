import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";
import { useCanManage } from "@/hooks/useRole";

type Price = {
  id: number;
  startDate: string;
  endDate: string;
  adultBuyPrice: number;
  childBuyPrice: number;
  infantBuyPrice: number;
  adultSellPrice: number;
  childSellPrice: number;
  infantSellPrice: number;
  activity: { id: number; name: string } | null;
};

type Activity = { id: number; name: string };

const today = new Date().toISOString().slice(0, 10);

const emptyPrice = {
  activityId: "" as number | "",
  startDate: today,
  endDate: today,
  adultBuyPrice: 0,
  childBuyPrice: 0,
  infantBuyPrice: 0,
  adultSellPrice: 0,
  childSellPrice: 0,
  infantSellPrice: 0,
};

export function AgencyPricesPage() {
  const { id } = useParams<{ id: string }>();
  const agencyId = Number(id);
  const canManage = useCanManage();
  const [form, setForm] = useState(emptyPrice);
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: agency } = useQuery({
    queryKey: ["agency", agencyId],
    queryFn: () =>
      apiFetch<{ agency: { name: string; prices: Price[] } }>(`/agencies/${agencyId}`).then(
        (r) => r.agency
      ),
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["activities"],
    queryFn: () =>
      apiFetch<{ activities: Activity[] }>("/activities?active=true").then((r) => r.activities),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch("/agency-prices", {
        method: "POST",
        body: JSON.stringify({
          agencyId,
          activityId: form.activityId ? Number(form.activityId) : null,
          startDate: form.startDate,
          endDate: form.endDate,
          adultBuyPrice: form.adultBuyPrice,
          childBuyPrice: form.childBuyPrice,
          infantBuyPrice: form.infantBuyPrice,
          adultSellPrice: form.adultSellPrice,
          childSellPrice: form.childSellPrice,
          infantSellPrice: form.infantSellPrice,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency", agencyId] });
      setShowForm(false);
      setForm(emptyPrice);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (priceId: number) =>
      apiFetch(`/agency-prices/${priceId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agency", agencyId] }),
  });

  function isCurrent(p: Price) {
    const t = today;
    return p.startDate.slice(0, 10) <= t && p.endDate.slice(0, 10) >= t;
  }

  const inputClass = "min-h-11 w-full rounded-lg border border-border px-2 text-sm";

  return (
    <div className="p-4">
      <Link to="/agencies" className="text-sm text-primary">
        ← Acentalar
      </Link>
      <h2 className="mt-2 text-xl font-semibold">{agency?.name ?? "…"} — Fiyatlar</h2>

      {canManage && (
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="mt-3 min-h-11 w-full rounded-lg bg-teal-700 font-medium text-white"
        >
          {showForm ? "Formu Gizle" : "+ Fiyat Dönemi Ekle"}
        </button>
      )}

      {showForm && canManage && (
        <form
          className="mt-3 space-y-3 rounded-xl border bg-card p-4"
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
        >
          <select
            value={form.activityId}
            onChange={(e) =>
              setForm({ ...form, activityId: e.target.value ? Number(e.target.value) : "" })
            }
            className={inputClass}
          >
            <option value="">Tüm aktiviteler (genel)</option>
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              required
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className={inputClass}
            />
            <input
              type="date"
              required
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className={inputClass}
            />
          </div>
          <p className="text-xs font-medium text-muted">Alış (Pass) / Satış</p>
          {(
            [
              ["adultBuyPrice", "adultSellPrice", "Yetişkin"],
              ["childBuyPrice", "childSellPrice", "Çocuk"],
              ["infantBuyPrice", "infantSellPrice", "Bebek"],
            ] as const
          ).map(([buy, sell, label]) => (
            <div key={label} className="grid grid-cols-3 items-center gap-2">
              <span className="text-sm">{label}</span>
              <input
                type="number"
                min={0}
                placeholder="Alış"
                value={form[buy]}
                onChange={(e) => setForm({ ...form, [buy]: Number(e.target.value) })}
                className={inputClass}
              />
              <input
                type="number"
                min={0}
                placeholder="Satış"
                value={form[sell]}
                onChange={(e) => setForm({ ...form, [sell]: Number(e.target.value) })}
                className={inputClass}
              />
            </div>
          ))}
          <button type="submit" className="min-h-11 w-full rounded-lg bg-teal-700 text-white">
            Kaydet
          </button>
        </form>
      )}

      <ul className="mt-4 space-y-3">
        {agency?.prices.map((p) => (
          <li
            key={p.id}
            className={`rounded-xl border p-4 ${
              isCurrent(p) ? "border-teal-500 bg-primary-soft" : "border-border bg-card"
            }`}
          >
            {isCurrent(p) && (
              <span className="mb-2 inline-block rounded-full bg-teal-700 px-2 py-0.5 text-xs text-white">
                Geçerli dönem
              </span>
            )}
            <p className="font-medium">
              {p.activity?.name ?? "Genel fiyat"}
            </p>
            <p className="text-sm text-muted">
              {p.startDate.slice(0, 10)} — {p.endDate.slice(0, 10)}
            </p>
            <p className="mt-2 text-xs text-muted">
              Y: {p.adultSellPrice}₺ · Ç: {p.childSellPrice}₺ · B: {p.infantSellPrice}₺
            </p>
            {canManage && (
              <button
                type="button"
                onClick={() => {
                  if (confirm("Silinsin mi?")) deleteMutation.mutate(p.id);
                }}
                className="mt-2 text-sm text-red-600"
              >
                Sil
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
