import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/utils/api";
import { ActivityLineCard } from "./ActivityLineCard";
import { TicketImagePreview } from "./TicketImagePreview";
import { formatTicketNumbers } from "@/utils/ticketNo";
import { distributePrepaidInteger } from "@/utils/distributePrepaid";
import { calcLineTotal } from "@/utils/linePricing";
import type { Activity, BankAccount } from "@/types/ticket";
import type { TicketLineItem } from "@/types/ticketLine";
import type { FullPrices } from "@/types/activityPrice";
import { inputClass } from "@/lib/ui";

function newLineId() {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const zeroPrices: FullPrices = {
  adultSellPrice: 0,
  childSellPrice: 0,
  infantSellPrice: 0,
  adultBuyPrice: 0,
  childBuyPrice: 0,
  infantBuyPrice: 0,
};

async function fetchPricesForDate(
  activityId: number,
  tourDate: string
): Promise<FullPrices> {
  const res = await apiFetch<{ prices: FullPrices | null }>(
    `/activity-prices/for-date?activityId=${activityId}&date=${tourDate}`
  );
  return res.prices ?? zeroPrices;
}

function applyPricesToLine(
  line: TicketLineItem,
  prices: FullPrices,
  resetManual = false
): TicketLineItem {
  const next: TicketLineItem = {
    ...line,
    adultSellPrice: prices.adultSellPrice,
    childSellPrice: prices.childSellPrice,
    infantSellPrice: prices.infantSellPrice,
    adultBuyPrice: prices.adultBuyPrice,
    childBuyPrice: prices.childBuyPrice,
    infantBuyPrice: prices.infantBuyPrice,
  };
  if (resetManual) next.sellTotalManual = false;
  if (!next.sellTotalManual) {
    next.sellTotal = calcLineTotal(
      {
        adultSellPrice: next.adultSellPrice,
        childSellPrice: next.childSellPrice,
        infantSellPrice: next.infantSellPrice,
      },
      { adult: next.adultCount, child: next.childCount, infant: next.infantCount }
    );
  }
  if (next.paymentType === "FREE") next.sellTotal = 0;
  return next;
}

export type TicketFormInitial = {
  ticketNo: string;
  customerName: string;
  customerPhone: string;
  bankAccountId: number | null;
  lines: TicketLineItem[];
};

type Props = {
  mode?: "create" | "edit";
  ticketId?: number;
  initial?: TicketFormInitial;
};

export function TicketForm({ mode = "create", ticketId, initial }: Props) {
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const isEdit = mode === "edit" && ticketId != null;

  const [customerName, setCustomerName] = useState(initial?.customerName ?? "");
  const [customerPhone, setCustomerPhone] = useState(initial?.customerPhone ?? "");
  const [lines, setLines] = useState<TicketLineItem[]>(initial?.lines ?? []);
  const [globalPrepaid, setGlobalPrepaid] = useState(
    () => initial?.lines.reduce((s, l) => s + l.prepaidAmount, 0) ?? 0
  );
  const [bankAccountId, setBankAccountId] = useState<number | "">(
    initial?.bankAccountId ?? ""
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successTicket, setSuccessTicket] = useState<{
    id: number;
    ticketNo: string;
    activities: { ticketNo: string }[];
  } | null>(null);

  const { data: activities = [] } = useQuery({
    queryKey: ["activities"],
    queryFn: () =>
      apiFetch<{ activities: Activity[] }>("/activities?active=true").then((r) => r.activities),
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: () =>
      apiFetch<{ bankAccounts: BankAccount[] }>("/bank-accounts/picklist").then(
        (r) => r.bankAccounts
      ),
  });

  const totalAmount = useMemo(
    () => lines.reduce((s, l) => s + (l.paymentType === "FREE" ? 0 : l.sellTotal), 0),
    [lines]
  );

  const totalPrepaid = useMemo(
    () => lines.reduce((s, l) => s + l.prepaidAmount, 0),
    [lines]
  );

  const remainingTotal = useMemo(
    () =>
      lines.reduce((s, l) => {
        if (l.paymentType === "FREE") return s;
        return s + Math.max(0, l.sellTotal - l.prepaidAmount);
      }, 0),
    [lines]
  );

  useEffect(() => {
    if (lines.length === 0) return;
    const amounts = distributePrepaidInteger(globalPrepaid, lines.length);
    setLines((prev) =>
      prev.map((line, i) =>
        line.prepaidManual ? line : { ...line, prepaidAmount: amounts[i] ?? 0 }
      )
    );
  }, [globalPrepaid, lines.length]);

  async function addActivity(activity: Activity) {
    const prices = await fetchPricesForDate(activity.id, today);
    const counts = { adult: 1, child: 0, infant: 0 };
    const sellTotal = calcLineTotal(prices, counts);

    const newLine: TicketLineItem = {
      id: newLineId(),
      activityId: activity.id,
      name: activity.name,
      displayName: activity.displayName,
      tourDate: today,
      tourStartTime: "",
      adultCount: 1,
      childCount: 0,
      infantCount: 0,
      adultSellPrice: prices.adultSellPrice,
      childSellPrice: prices.childSellPrice,
      infantSellPrice: prices.infantSellPrice,
      adultBuyPrice: prices.adultBuyPrice,
      childBuyPrice: prices.childBuyPrice,
      infantBuyPrice: prices.infantBuyPrice,
      sellTotal,
      sellTotalManual: false,
      prepaidAmount: 0,
      prepaidManual: false,
      paymentType: "FULL_PAID",
      remainderToOperator: false,
      hasTransfer: false,
      hotelName: "",
      pickupTime: "",
      notes: "",
    };

    setLines((prev) => [...prev, newLine]);
    setPickerOpen(false);
  }

  async function handleTourDateChange(activityId: number, tourDate: string) {
    return fetchPricesForDate(activityId, tourDate);
  }

  function updateLine(id: string, updated: TicketLineItem) {
    setLines((prev) => prev.map((l) => (l.id === id ? updated : l)));
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!customerName.trim() || !customerPhone.trim()) {
      setError("Müşteri adı ve telefon gerekli");
      return;
    }
    if (lines.length === 0) {
      setError("En az bir aktivite ekleyin");
      return;
    }
    for (const l of lines) {
      if (!l.tourDate) {
        setError(`${l.displayName} için tur tarihi girin`);
        return;
      }
      if (l.remainderToOperator) {
        if (l.paymentType !== "FULL_PAID") {
          setError(`${l.displayName}: kalan size ödenir seçeneği yalnızca Full Paid ile kullanılır`);
          return;
        }
        if (l.prepaidAmount <= 0 || l.prepaidAmount >= l.sellTotal) {
          setError(`${l.displayName}: ön ödeme ve kalan tutarı kontrol edin`);
          return;
        }
      }
    }

    setLoading(true);
    const payload = {
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      bankAccountId: totalPrepaid > 0 ? bankAccountId || undefined : undefined,
      activities: lines.map((l) => ({
            activityId: l.activityId,
            tourDate: l.tourDate,
            tourStartTime: l.tourStartTime || undefined,
            adultCount: l.adultCount,
            childCount: l.childCount,
            infantCount: l.infantCount,
            adultSellPrice: l.adultSellPrice,
            childSellPrice: l.childSellPrice,
            infantSellPrice: l.infantSellPrice,
            adultBuyPrice: l.adultBuyPrice,
            childBuyPrice: l.childBuyPrice,
            infantBuyPrice: l.infantBuyPrice,
            unitPrice: l.sellTotal,
            prepaidAmount: l.prepaidAmount,
            paymentType: l.paymentType,
            remainderToOperator: l.remainderToOperator,
            hasTransfer: l.hasTransfer,
            hotelName: l.hasTransfer ? l.hotelName : undefined,
            pickupTime: l.hasTransfer ? l.pickupTime : undefined,
            notes: l.notes || undefined,
          })),
    };

    try {
      const res = await apiFetch<{
        ticket: { id: number; ticketNo: string; activities: { ticketNo: string }[] };
      }>(isEdit ? `/tickets/${ticketId}` : "/tickets", {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      setSuccessTicket({
        id: res.ticket.id,
        ticketNo: res.ticket.ticketNo,
        activities: res.ticket.activities,
      });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : isEdit
            ? "Bilet güncellenemedi"
            : "Bilet oluşturulamadı"
      );
    } finally {
      setLoading(false);
    }
  }

  if (successTicket) {
    return (
      <div className="space-y-4 p-4">
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
          <p className="font-semibold text-green-800">
            {isEdit ? "Bilet güncellendi" : "Bilet oluşturuldu"}
          </p>
          <p className="mt-1 text-sm font-bold text-amber-800">
            {isEdit ? "REVİZE BİLET" : "YENİ BİLET"}
          </p>
          <p className="mt-1 font-mono text-2xl font-bold tracking-wider text-primary">
            {formatTicketNumbers(successTicket)}
          </p>
        </div>
        <TicketImagePreview ticketId={successTicket.id} />
        <button
          type="button"
          onClick={() => navigate("/tickets")}
          className="min-h-11 w-full rounded-lg border font-medium"
        >
          Bilet Listesine Git
        </button>
        <button
          type="button"
          onClick={() => {
            setSuccessTicket(null);
            setCustomerName("");
            setCustomerPhone("");
            setLines([]);
            setGlobalPrepaid(0);
          }}
          className="min-h-11 w-full rounded-lg bg-teal-700 font-medium text-white"
        >
          Yeni Bilet Kes
        </button>
      </div>
    );
  }

  const availableActivities = activities.filter(
    (a) => !lines.some((l) => l.activityId === a.id)
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 pb-32">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {isEdit && initial && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center">
          <p className="text-xs font-bold tracking-wide text-amber-900">REVİZE BİLET</p>
          <p className="mt-1 font-mono text-2xl font-bold text-primary">{initial.ticketNo}</p>
        </div>
      )}

      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase text-primary">
          Müşteri Bilgileri
        </h3>
        <div className="space-y-3">
          <input
            required
            placeholder="Ad Soyad"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className={inputClass}
          />
          <input
            required
            type="tel"
            placeholder="Telefon"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className={inputClass}
          />
        </div>
      </section>

      <section>
        <button
          type="button"
          onClick={() => setPickerOpen(!pickerOpen)}
          className="min-h-12 w-full rounded-xl border-2 border-dashed border-primary-border bg-primary-soft font-semibold text-primary"
        >
          + Aktivite Ekle
        </button>

        {pickerOpen && (
          <div className="mt-2 flex flex-wrap gap-2 rounded-xl border bg-card p-3">
            {availableActivities.length === 0 ? (
              <p className="text-sm text-muted">Eklenecek aktivite kalmadı</p>
            ) : (
              availableActivities.map((act) => (
                <button
                  key={act.id}
                  type="button"
                  onClick={() => addActivity(act)}
                  className="rounded-full bg-teal-700 px-4 py-2 text-sm font-medium text-white"
                >
                  {act.displayName}
                </button>
              ))
            )}
          </div>
        )}

        <ul className="mt-4 space-y-4">
          {lines.map((line, index) => (
            <li key={line.id}>
              <ActivityLineCard
                line={line}
                index={index}
                onChange={(updated) => updateLine(line.id, updated)}
                onRemove={() => removeLine(line.id)}
                onTourDateChange={handleTourDateChange}
                applyPrices={applyPricesToLine}
              />
            </li>
          ))}
        </ul>

        {lines.length === 0 && (
          <p className="mt-4 text-center text-sm text-subtle">
            Adisyon gibi listeye aktivite ekleyin
          </p>
        )}
      </section>

      {lines.length > 0 && (
        <section className="sticky bottom-20 rounded-xl border-2 border-primary-border bg-card p-4 shadow-lg">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-base font-semibold">
              <span>Toplam tutar</span>
              <span className="text-primary">
                {totalAmount.toLocaleString("tr-TR")} ₺
              </span>
            </div>
            <div>
              <label className="text-muted">Toplam ön ödeme</label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={globalPrepaid || ""}
                onChange={(e) => setGlobalPrepaid(Math.round(Number(e.target.value) || 0))}
                className={`mt-1 ${inputClass}`}
              />
              <p className="mt-1 text-xs text-subtle">
                Eşit dağıtılır (tam sayı). Satırda elle değiştirebilirsiniz.
              </p>
            </div>
            <div className="flex justify-between text-amber-800">
              <span>Dağıtılan ön ödeme</span>
              <span>{totalPrepaid.toLocaleString("tr-TR")} ₺</span>
            </div>
            <div className="flex justify-between">
              <span>Kalan tutar</span>
              <span>{remainingTotal.toLocaleString("tr-TR")} ₺</span>
            </div>
            {lines.some((l) => l.remainderToOperator) && (
              <p className="text-xs text-primary">
                İşaretli satırlarda kalan size ödenecek (aktivite carisine yazılmaz).
              </p>
            )}
          </div>

          {totalPrepaid > 0 && (
            <select
              required
              value={bankAccountId}
              onChange={(e) =>
                setBankAccountId(e.target.value ? Number(e.target.value) : "")
              }
              className={`mt-3 ${inputClass}`}
            >
              <option value="">Tahsilat hesabı seçin</option>
              {bankAccounts.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-4 min-h-12 w-full rounded-xl bg-teal-700 text-lg font-semibold text-white disabled:opacity-50"
          >
            {loading
              ? isEdit
                ? "Kaydediliyor…"
                : "Oluşturuluyor…"
              : isEdit
                ? "Değişiklikleri Kaydet"
                : "Bilet Oluştur"}
          </button>
        </section>
      )}
    </form>
  );
}
