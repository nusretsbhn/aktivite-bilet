import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError } from "@/utils/api";
import { Calendar, dateFnsLocalizer, type View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { tr } from "date-fns/locale";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";
import { useCanManage } from "@/hooks/useRole";
import type { Activity } from "@/types/ticket";
import type { ActivityPricePeriod } from "@/types/activityPrice";
import { emptyPriceForm } from "@/types/activityPrice";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = { tr };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

const today = new Date().toISOString().slice(0, 10);

type CalEvent = {
  id: number;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: ActivityPricePeriod;
};

function parseLocalDate(iso: string) {
  const part = iso.slice(0, 10);
  const [y, m, d] = part.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function priceSummary(p: ActivityPricePeriod) {
  const start = p.startDate.slice(0, 10);
  const end = p.endDate.slice(0, 10);
  const range = start === end ? start : `${start}–${end}`;
  return `${range} · Y:${p.adultSellPrice}`;
}

function toCalendarEvent(p: ActivityPricePeriod): CalEvent {
  const start = parseLocalDate(p.startDate);
  const endInclusive = parseLocalDate(p.endDate);
  const end = new Date(endInclusive);
  end.setDate(end.getDate() + 1);
  return {
    id: p.id,
    title: priceSummary(p),
    start,
    end,
    allDay: true,
    resource: p,
  };
}

function PriceFields({
  form,
  onChange,
}: {
  form: ReturnType<typeof emptyPriceForm>;
  onChange: (f: ReturnType<typeof emptyPriceForm>) => void;
}) {
  const fields: { key: keyof typeof form; label: string }[] = [
    { key: "adultBuyPrice", label: "Yetişkin alış" },
    { key: "childBuyPrice", label: "Çocuk alış" },
    { key: "infantBuyPrice", label: "Bebek alış" },
    { key: "adultSellPrice", label: "Yetişkin satış" },
    { key: "childSellPrice", label: "Çocuk satış" },
    { key: "infantSellPrice", label: "Bebek satış" },
  ];
  const inputClass = "min-h-10 w-full rounded-lg border border-border px-2 text-sm";

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {fields.map(({ key, label }) => (
        <label key={key} className="text-xs">
          <span className="text-muted">{label}</span>
          <input
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            className={`mt-0.5 ${inputClass}`}
            value={form[key] as number}
            onChange={(e) => {
              const v = e.target.value === "" ? 0 : Number(e.target.value);
              onChange({
                ...form,
                [key]: Number.isNaN(v) ? 0 : Math.max(0, v),
              });
            }}
          />
        </label>
      ))}
    </div>
  );
}

export function ActivityPricesPage() {
  const canManage = useCanManage();
  const [searchParams, setSearchParams] = useSearchParams();
  const activityIdParam = searchParams.get("activityId");
  const [selectedActivityId, setSelectedActivityId] = useState<number | "">(
    activityIdParam ? Number(activityIdParam) : ""
  );
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [editingPrice, setEditingPrice] = useState<ActivityPricePeriod | null>(null);
  const [selectedPrice, setSelectedPrice] = useState<ActivityPricePeriod | null>(null);
  const [saveError, setSaveError] = useState("");
  const queryClient = useQueryClient();

  const range = useMemo(() => {
    const start = new Date(date.getFullYear(), date.getMonth() - 1, 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 2, 0);
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  }, [date]);

  const [form, setForm] = useState(() =>
    emptyPriceForm(
      selectedActivityId ? Number(selectedActivityId) : 0,
      today,
      today
    )
  );

  const { data: activities = [] } = useQuery({
    queryKey: ["activities-all"],
    queryFn: () =>
      apiFetch<{ activities: Activity[] }>("/activities").then((r) => r.activities),
    enabled: canManage,
  });

  const activityId = selectedActivityId ? Number(selectedActivityId) : 0;

  const { data: prices = [] } = useQuery({
    queryKey: ["activity-prices", activityId, range],
    queryFn: () =>
      apiFetch<{ prices: ActivityPricePeriod[] }>(
        `/activity-prices?activityId=${activityId}&startDate=${range.startDate}&endDate=${range.endDate}`
      ).then((r) => r.prices),
    enabled: canManage && activityId > 0,
  });

  const selectedActivity = activities.find((a) => a.id === activityId);

  const events: CalEvent[] = useMemo(() => prices.map(toCalendarEvent), [prices]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      setSaveError("");
      const body = {
        activityId,
        startDate: form.startDate,
        endDate: form.endDate,
        adultBuyPrice: form.adultBuyPrice,
        childBuyPrice: form.childBuyPrice,
        infantBuyPrice: form.infantBuyPrice,
        adultSellPrice: form.adultSellPrice,
        childSellPrice: form.childSellPrice,
        infantSellPrice: form.infantSellPrice,
      };
      if (editingPrice) {
        return apiFetch(`/activity-prices/${editingPrice.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
      }
      return apiFetch("/activity-prices", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity-prices"] });
      setShowForm(false);
      setEditingPrice(null);
      setSelectedPrice(null);
      setSaveError("");
    },
    onError: (err) => {
      setSaveError(
        err instanceof ApiError ? err.message : "Kayıt sırasında hata oluştu"
      );
    },
  });

  function handleSave() {
    if (!activityId) {
      setSaveError("Önce bir aktivite seçin");
      return;
    }
    if (!form.startDate || !form.endDate) {
      setSaveError("Başlangıç ve bitiş tarihi gerekli");
      return;
    }
    saveMutation.mutate();
  }

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/activity-prices/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity-prices"] });
      setSelectedPrice(null);
      setEditingPrice(null);
      setShowForm(false);
    },
  });

  function selectActivity(id: number) {
    setSelectedActivityId(id);
    setSearchParams({ activityId: String(id) });
    setForm(emptyPriceForm(id, today, today));
    setSelectedPrice(null);
    setEditingPrice(null);
    setShowForm(false);
  }

  function formatLocalDate(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function openCreate(slotDate?: Date) {
    if (!activityId) return;
    const d = slotDate ? formatLocalDate(slotDate) : today;
    setEditingPrice(null);
    setSaveError("");
    setForm(emptyPriceForm(activityId, d, d));
    setShowForm(true);
  }

  function openEdit(p: ActivityPricePeriod) {
    setEditingPrice(p);
    setSaveError("");
    setForm({
      activityId: p.activityId,
      startDate: p.startDate.slice(0, 10),
      endDate: p.endDate.slice(0, 10),
      adultBuyPrice: p.adultBuyPrice,
      childBuyPrice: p.childBuyPrice,
      infantBuyPrice: p.infantBuyPrice,
      adultSellPrice: p.adultSellPrice,
      childSellPrice: p.childSellPrice,
      infantSellPrice: p.infantSellPrice,
    });
    setShowForm(true);
  }

  const inputClass = "min-h-11 w-full rounded-lg border border-border px-3 text-sm";

  if (!canManage) {
    return (
      <div className="p-4">
        <p className="text-muted">Bu sayfa için yönetici yetkisi gerekir.</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col p-2">
      <div className="px-2">
        <Link to="/settings" className="text-sm text-primary">
          ← Ayarlar
        </Link>
        <h2 className="mt-1 text-xl font-semibold">Aktivite Fiyat Takvimi</h2>
        <p className="text-sm text-muted">
          Tarih aralığına göre fiyat girin; takvimde dönemler görünür.
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 px-2">
        <select
          value={selectedActivityId}
          onChange={(e) => {
            const v = e.target.value ? Number(e.target.value) : "";
            if (v) selectActivity(v);
            else setSelectedActivityId("");
          }}
          className={`min-h-11 flex-1 ${inputClass}`}
        >
          <option value="">Aktivite seçin</option>
          {activities.map((a) => (
            <option key={a.id} value={a.id}>
              {a.displayName}
            </option>
          ))}
        </select>
        {activityId > 0 && (
          <button
            type="button"
            onClick={() => openCreate()}
            className="min-h-11 rounded-lg bg-teal-700 px-4 text-sm font-medium text-white"
          >
            + Fiyat Dönemi
          </button>
        )}
      </div>

      {!activityId ? (
        <p className="mt-8 text-center text-subtle">
          Takvimi görmek için bir aktivite seçin
        </p>
      ) : (
        <>
          <p className="mt-2 px-2 text-sm font-medium text-primary">
            {selectedActivity?.displayName}
          </p>
          <div className="mt-2 min-h-0 flex-1 [&_.rbc-calendar]:text-sm [&_.rbc-event]:overflow-visible [&_.rbc-event]:whitespace-nowrap [&_.rbc-event]:px-1 [&_.rbc-event]:text-[10px] [&_.rbc-event]:leading-tight [&_.rbc-event]:text-white [&_.rbc-row-segment]:min-h-[22px]">
            <Calendar
              localizer={localizer}
              culture="tr"
              events={events}
              view={view}
              onView={setView}
              date={date}
              onNavigate={setDate}
              selectable
              popup
              onSelectSlot={({ start }) => openCreate(start)}
              onSelectEvent={(ev: CalEvent) => setSelectedPrice(ev.resource)}
              views={["month", "week"]}
              messages={{
                today: "Bugün",
                previous: "‹",
                next: "›",
                month: "Ay",
                week: "Hafta",
              }}
              eventPropGetter={() => ({
                style: {
                  backgroundColor: "#0f766e",
                  border: "none",
                  color: "#fff",
                  fontSize: "10px",
                  padding: "1px 4px",
                },
              })}
              components={{
                event: ({ event }: { event: CalEvent }) => (
                  <span className="block truncate font-medium">{event.title}</span>
                ),
              }}
            />
          </div>
        </>
      )}

      {showForm &&
        activityId > 0 &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-end bg-overlay">
            <div
              className="max-h-[85dvh] w-full overflow-y-auto rounded-t-2xl bg-card p-4 pb-28"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-semibold">
                {editingPrice ? "Fiyat Dönemi Düzenle" : "Yeni Fiyat Dönemi"}
              </h3>
              {saveError && (
                <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {saveError}
                </p>
              )}
              <form
                className="mt-3 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSave();
                }}
              >
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-sm">
                    Başlangıç
                    <input
                      type="date"
                      required
                      value={form.startDate}
                      onChange={(e) =>
                        setForm({ ...form, startDate: e.target.value })
                      }
                      className={`mt-1 ${inputClass}`}
                    />
                  </label>
                  <label className="text-sm">
                    Bitiş
                    <input
                      type="date"
                      required
                      value={form.endDate}
                      onChange={(e) =>
                        setForm({ ...form, endDate: e.target.value })
                      }
                      className={`mt-1 ${inputClass}`}
                    />
                  </label>
                </div>
                <p className="text-xs font-medium text-muted">
                  Fiyatlar (₺, 0 girilebilir)
                </p>
                <PriceFields form={form} onChange={setForm} />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingPrice(null);
                      setSaveError("");
                    }}
                    className="min-h-11 flex-1 rounded-lg border"
                  >
                    İptal
                  </button>
                  <button
                    type="button"
                    disabled={saveMutation.isPending}
                    onClick={handleSave}
                    className="min-h-11 flex-1 rounded-lg bg-teal-700 font-medium text-white disabled:opacity-50"
                  >
                    {saveMutation.isPending ? "Kaydediliyor…" : "Kaydet"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {selectedPrice &&
        !showForm &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-end bg-overlay">
          <div
            className="w-full rounded-t-2xl bg-card p-4 pb-28"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold">Fiyat Dönemi</h3>
            <p className="mt-1 text-sm text-muted">
              {selectedPrice.startDate.slice(0, 10)} — {selectedPrice.endDate.slice(0, 10)}
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-muted">Alış Y/Ç/B</dt>
                <dd className="font-medium">
                  {selectedPrice.adultBuyPrice} / {selectedPrice.childBuyPrice} /{" "}
                  {selectedPrice.infantBuyPrice} ₺
                </dd>
              </div>
              <div>
                <dt className="text-muted">Satış Y/Ç/B</dt>
                <dd className="font-medium">
                  {selectedPrice.adultSellPrice} / {selectedPrice.childSellPrice} /{" "}
                  {selectedPrice.infantSellPrice} ₺
                </dd>
              </div>
            </dl>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => openEdit(selectedPrice)}
                className="min-h-11 flex-1 rounded-lg border border-teal-600 text-primary"
              >
                Düzenle
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm("Bu fiyat dönemi silinsin mi?")) {
                    deleteMutation.mutate(selectedPrice.id);
                  }
                }}
                className="min-h-11 rounded-lg border border-red-300 px-4 text-red-600"
              >
                Sil
              </button>
              <button
                type="button"
                onClick={() => setSelectedPrice(null)}
                className="min-h-11 flex-1 rounded-lg border"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>,
          document.body
        )}
    </div>
  );
}
