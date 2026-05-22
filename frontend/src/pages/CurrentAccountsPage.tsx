import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";
import { useCanManage } from "@/hooks/useRole";

type ActivitySummary = {
  activityId: number;
  activityName: string;
  isActive: boolean;
  totalDebit: number;
  totalCredit: number;
  balance: number;
};

export function CurrentAccountsPage() {
  const canManage = useCanManage();

  const { data: summaries = [], isLoading } = useQuery({
    queryKey: ["current-accounts-summary"],
    queryFn: () =>
      apiFetch<{ summaries: ActivitySummary[] }>("/current-accounts/summary").then(
        (r) => r.summaries
      ),
    enabled: canManage,
  });

  if (!canManage) {
    return (
      <div className="p-4">
        <p className="text-muted">Bu modüle erişim yetkiniz yok.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold">Aktivite Cari Hesapları</h2>
      <p className="mt-1 text-sm text-muted">
        Borç: maliyet · Alacak: To Pay · Bakiye = maliyet − To Pay (alacaklıyken eksi)
      </p>

      {isLoading && <p className="mt-4 text-muted">Yükleniyor…</p>}

      <ul className="mt-4 space-y-3">
        {summaries.map((s) => (
          <li key={s.activityId}>
            <Link
              to={`/current-accounts/${s.activityId}`}
              className="block rounded-xl border border-border bg-card p-4 shadow-sm hover:border-primary-border"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{s.activityName}</h3>
                  {!s.isActive && (
                    <p className="text-xs text-amber-600">Pasif aktivite</p>
                  )}
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-bold ${
                    s.balance < 0
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {s.balance.toLocaleString("tr-TR")} ₺
                </span>
              </div>
              <div className="mt-2 flex gap-4 text-xs text-muted">
                <span>Alacak: {s.totalCredit.toLocaleString("tr-TR")} ₺</span>
                <span>Borç: {s.totalDebit.toLocaleString("tr-TR")} ₺</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {summaries.length === 0 && !isLoading && (
        <p className="mt-8 text-center text-muted">
          Henüz cari hareket yok. Bilet kesildiğinde aktivite maliyeti ve To Pay tutarları
          otomatik işlenir.
        </p>
      )}
    </div>
  );
}
