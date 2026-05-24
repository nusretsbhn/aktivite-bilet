import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { apiFetch } from "@/utils/api";
import { useCanManage } from "@/hooks/useRole";
import { inputClass, cardClass } from "@/lib/ui";

type LedgerEntry = {
  id: number;
  type: "INCOME" | "EXPENSE";
  category: string;
  description: string;
  amount: number;
  date: string;
};

type Summary = {
  income: number;
  expense: number;
  net: number;
  byCategory: { category: string; total: number }[];
};

type BankAccount = { id: number; name: string };

const emptyForm = {
  type: "EXPENSE" as "INCOME" | "EXPENSE",
  category: "",
  description: "",
  amount: 0,
  date: new Date().toISOString().slice(0, 10),
  bankAccountId: "" as number | "",
};

export function LedgerPage() {
  const canManage = useCanManage();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const queryClient = useQueryClient();

  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  const qs = params.toString() ? `?${params}` : "";

  const { data: entries = [] } = useQuery({
    queryKey: ["ledger", startDate, endDate],
    queryFn: () =>
      apiFetch<{ entries: LedgerEntry[] }>(`/ledger${qs}`).then((r) => r.entries),
    enabled: canManage,
  });

  const { data: summary } = useQuery({
    queryKey: ["ledger-summary", startDate, endDate],
    queryFn: () => apiFetch<Summary>(`/ledger/summary${qs}`),
    enabled: canManage,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["ledger-categories"],
    queryFn: () =>
      apiFetch<{ categories: string[] }>("/ledger/categories").then((r) => r.categories),
    enabled: canManage,
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bank-accounts-picklist"],
    queryFn: () =>
      apiFetch<{ bankAccounts: BankAccount[] }>("/bank-accounts/picklist").then(
        (r) => r.bankAccounts
      ),
    enabled: canManage,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch("/ledger", {
        method: "POST",
        body: JSON.stringify({
          type: form.type,
          category: form.category,
          description: form.description,
          amount: form.amount,
          date: form.date,
          ...(form.bankAccountId
            ? { bankAccountId: Number(form.bankAccountId) }
            : {}),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ledger"] });
      queryClient.invalidateQueries({ queryKey: ["ledger-summary"] });
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      setShowForm(false);
      setForm(emptyForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/ledger/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ledger"] });
      queryClient.invalidateQueries({ queryKey: ["ledger-summary"] });
    },
  });

  if (!canManage) {
    return (
      <div className="p-4">
        <p className="text-muted">Bu modüle erişim yetkiniz yok.</p>
        <Link to="/settings" className="mt-2 text-primary">
          ← Ayarlar
        </Link>
      </div>
    );
  }

  const chartData =
    summary?.byCategory.map((c) => ({
      name: c.category,
      total: Math.abs(c.total),
      fill: c.total >= 0 ? "#0f766e" : "#dc2626",
    })) ?? [];

  return (
    <div className="p-4 pb-8">
      <Link to="/settings" className="text-sm text-primary">
        ← Ayarlar
      </Link>
      <h2 className="mt-2 text-xl font-semibold">Gelir / Gider</h2>

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

      {summary && (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-lg bg-green-50 p-2">
            <p className="text-muted">Gelir</p>
            <p className="font-bold text-green-800">
              {summary.income.toLocaleString("tr-TR")} ₺
            </p>
          </div>
          <div className="rounded-lg bg-red-50 p-2">
            <p className="text-muted">Gider</p>
            <p className="font-bold text-red-800">
              {summary.expense.toLocaleString("tr-TR")} ₺
            </p>
          </div>
          <div className="rounded-lg bg-app p-2">
            <p className="text-muted">Kar</p>
            <p className={`font-bold ${summary.net >= 0 ? "text-primary" : "text-red-800"}`}>
              {summary.net.toLocaleString("tr-TR")} ₺
            </p>
          </div>
        </div>
      )}

      {chartData.length > 0 && (
        <div className="mt-4 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 8 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v) =>
                  `${Number(v ?? 0).toLocaleString("tr-TR")} ₺`
                }
              />
              <Bar dataKey="total" radius={4}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowForm(!showForm)}
        className="mt-4 min-h-11 w-full rounded-lg bg-teal-700 font-medium text-white"
      >
        {showForm ? "Formu Gizle" : "+ Yeni Kayıt"}
      </button>

      {showForm && (
        <form
          className={`mt-3 space-y-3 ${cardClass} p-4`}
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setForm({ ...form, type: "INCOME" })}
              className={`min-h-11 rounded-lg border ${form.type === "INCOME" ? "bg-green-700 text-white" : ""}`}
            >
              Gelir
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, type: "EXPENSE" })}
              className={`min-h-11 rounded-lg border ${form.type === "EXPENSE" ? "bg-red-700 text-white" : ""}`}
            >
              Gider
            </button>
          </div>
          <input
            list="categories"
            required
            placeholder="Kategori"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className={inputClass}
          />
          <datalist id="categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <input
            required
            placeholder="Açıklama"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={inputClass}
          />
          <input
            type="number"
            required
            min={0}
            placeholder="Tutar"
            value={form.amount || ""}
            onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
            className={inputClass}
          />
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className={inputClass}
          />
          <select
            value={form.bankAccountId}
            onChange={(e) =>
              setForm({
                ...form,
                bankAccountId: e.target.value ? Number(e.target.value) : "",
              })
            }
            className={inputClass}
          >
            <option value="">Banka / Kasa (opsiyonel)</option>
            {bankAccounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>
          {form.bankAccountId && (
            <p className="text-xs text-muted">
              Seçilen hesaba banka hareketi olarak da işlenecek (
              {form.type === "INCOME" ? "giriş" : "çıkış"}).
            </p>
          )}
          <button type="submit" className="min-h-11 w-full rounded-lg bg-teal-700 text-white">
            Kaydet
          </button>
        </form>
      )}

      <ul className="mt-4 space-y-2">
        {entries.map((e) => (
          <li key={e.id} className="rounded-lg border border-border bg-card p-3">
            <div className="flex justify-between">
              <span className="text-xs text-muted">{e.category}</span>
              <span
                className={`font-semibold ${e.amount >= 0 ? "text-green-700" : "text-red-700"}`}
              >
                {e.amount >= 0 ? "+" : ""}
                {e.amount.toLocaleString("tr-TR")} ₺
              </span>
            </div>
            <p className="text-sm">{e.description}</p>
            <p className="text-xs text-subtle">
              {new Date(e.date).toLocaleDateString("tr-TR")}
            </p>
            <button
              type="button"
              onClick={() => {
                if (confirm("Silinsin mi?")) deleteMutation.mutate(e.id);
              }}
              className="mt-1 text-xs text-red-600"
            >
              Sil
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
