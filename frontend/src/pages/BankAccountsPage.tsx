import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";

type BankAccount = { id: number; name: string; description?: string | null; isActive: boolean };

type Transaction = {
  id: number;
  description: string;
  amount: number;
  transactionDate: string;
  ticketId?: number | null;
  balance: number;
};

export function BankAccountsPage() {
  const [accountId, setAccountId] = useState<number | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: accounts = [] } = useQuery({
    queryKey: ["bank-accounts-all"],
    queryFn: () =>
      apiFetch<{ bankAccounts: BankAccount[] }>("/bank-accounts").then((r) => r.bankAccounts),
  });

  const { data: ledger, isLoading } = useQuery({
    queryKey: ["bank-transactions", accountId, startDate, endDate],
    enabled: !!accountId,
    queryFn: () => {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      return apiFetch<{
        account: BankAccount;
        transactions: Transaction[];
        summary: { income: number; expense: number; net: number; endBalance: number };
      }>(`/bank-accounts/${accountId}/transactions?${params}`);
    },
  });

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold">Banka / Kasa Dökümü</h2>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {accounts.map((acc) => (
          <button
            key={acc.id}
            type="button"
            onClick={() => setAccountId(acc.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
              accountId === acc.id
                ? "bg-teal-700 text-white"
                : "border border-border bg-card"
            }`}
          >
            {acc.name}
          </button>
        ))}
      </div>

      {accountId && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="min-h-11 rounded-lg border px-2 text-sm"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="min-h-11 rounded-lg border px-2 text-sm"
            />
          </div>

          {ledger?.summary && (
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-green-50 p-2">
                <p className="text-muted">Giriş</p>
                <p className="font-semibold text-green-800">
                  +{ledger.summary.income.toLocaleString("tr-TR")} ₺
                </p>
              </div>
              <div className="rounded-lg bg-red-50 p-2">
                <p className="text-muted">Çıkış</p>
                <p className="font-semibold text-red-800">
                  -{ledger.summary.expense.toLocaleString("tr-TR")} ₺
                </p>
              </div>
              <div className="rounded-lg bg-app p-2">
                <p className="text-muted">Bakiye</p>
                <p className="font-semibold">
                  {ledger.summary.endBalance.toLocaleString("tr-TR")} ₺
                </p>
              </div>
            </div>
          )}

          {isLoading && <p className="mt-4 text-muted">Yükleniyor…</p>}

          <ul className="mt-4 space-y-2">
            {ledger?.transactions.map((tx) => (
              <li
                key={tx.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{tx.description}</p>
                  <p className="text-xs text-muted">
                    {new Date(tx.transactionDate).toLocaleDateString("tr-TR")}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-semibold ${
                      tx.amount >= 0 ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {tx.amount >= 0 ? "+" : ""}
                    {tx.amount.toLocaleString("tr-TR")} ₺
                  </p>
                  <p className="text-xs text-subtle">
                    {tx.balance.toLocaleString("tr-TR")} ₺
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {!isLoading && ledger?.transactions.length === 0 && (
            <p className="mt-6 text-center text-muted">Hareket yok.</p>
          )}
        </>
      )}

      {!accountId && (
        <p className="mt-8 text-center text-muted">Hesap seçin.</p>
      )}
    </div>
  );
}
