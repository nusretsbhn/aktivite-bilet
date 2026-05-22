import { useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer, type View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { tr } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";
import {
  PAYMENT_COLORS,
  PAYMENT_LABELS,
  PAYMENT_PREFIX,
  type PaymentType,
} from "@/types/ticket";
import {
  getDisplayStart,
  isTourCompleted,
  TOUR_COMPLETED_COLOR,
  TOUR_UPCOMING_COLOR,
} from "@/utils/tourSchedule";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = { tr };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

type CalendarActivity = {
  tourDate: string;
  tourStartTime?: string | null;
  paymentType?: PaymentType;
};

type CalendarTicket = {
  id: number;
  ticketNo: string;
  tourDate: string;
  tourStartTime?: string | null;
  customerName: string;
  paymentType: PaymentType;
  finalAmount: number;
  adultCount: number;
  childCount: number;
  infantCount: number;
  agency?: { name: string } | null;
  activities?: CalendarActivity[];
};

type CalEvent = {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource: CalendarTicket;
};

function ticketTitle(t: CalendarTicket): string {
  const prefix = PAYMENT_PREFIX[t.paymentType];
  const persons = t.adultCount + t.childCount + t.infantCount;
  const label = prefix ? `${prefix} ` : "";
  return `${label}${t.customerName} (${persons})`;
}

export function CalendarPage() {
  const [view, setView] = useState<View>(
    typeof window !== "undefined" && window.innerWidth < 768 ? "week" : "month"
  );
  const [date, setDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<CalendarTicket[] | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<PaymentType | "">("");

  const range = useMemo(() => {
    const start = new Date(date.getFullYear(), date.getMonth() - 1, 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 2, 0);
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  }, [date]);

  const { data } = useQuery({
    queryKey: ["calendar", range, paymentFilter],
    queryFn: () => {
      const params = new URLSearchParams(range);
      if (paymentFilter) params.set("paymentType", paymentFilter);
      return apiFetch<{ tickets: CalendarTicket[]; days: unknown[] }>(
        `/tickets/calendar?${params}`
      );
    },
  });

  const events: CalEvent[] = useMemo(
    () =>
      (data?.tickets ?? []).map((t) => {
        const start = getDisplayStart(t);
        const end = new Date(start);
        const hasTime =
          !!t.tourStartTime ||
          t.activities?.some((a) => a.tourStartTime?.trim());
        if (hasTime) {
          end.setHours(start.getHours() + 1, start.getMinutes(), 0, 0);
        } else {
          end.setHours(23, 59, 0, 0);
        }
        return {
          id: t.id,
          title: ticketTitle(t),
          start,
          end,
          resource: t,
        };
      }),
    [data?.tickets]
  );

  function handleSelectSlot({ start }: { start: Date }) {
    const key = start.toISOString().slice(0, 10);
    const dayTickets = (data?.tickets ?? []).filter(
      (t) => t.tourDate.slice(0, 10) === key
    );
    setSelectedDay(dayTickets);
  }

  function handleSelectEvent(event: CalEvent) {
    setSelectedDay([event.resource]);
  }

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col p-2">
      <div className="mb-2 flex flex-wrap gap-2 px-2">
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value as PaymentType | "")}
          className="min-h-11 flex-1 rounded-lg border border-border px-2 text-sm"
        >
          <option value="">Tüm ödemeler</option>
          {(Object.keys(PAYMENT_LABELS) as PaymentType[]).map((p) => (
            <option key={p} value={p}>
              {PAYMENT_LABELS[p]}
            </option>
          ))}
        </select>
      </div>

      <div className="min-h-0 flex-1 [&_.rbc-calendar]:text-sm">
        <Calendar
          localizer={localizer}
          culture="tr"
          events={events}
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          selectable
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          views={["month", "week", "day"]}
          messages={{
            today: "Bugün",
            previous: "‹",
            next: "›",
            month: "Ay",
            week: "Hafta",
            day: "Gün",
          }}
          eventPropGetter={(event: CalEvent) => {
            const completed = isTourCompleted(event.resource);
            return {
              style: {
                backgroundColor: completed
                  ? TOUR_COMPLETED_COLOR
                  : TOUR_UPCOMING_COLOR,
                border: "none",
                fontSize: "11px",
                color: "#fff",
              },
            };
          }}
        />
      </div>

      <div className="mt-2 flex flex-wrap gap-2 px-2 text-xs">
        <span className="rounded-full bg-green-600 px-2 py-0.5 text-white">
          Yeşil — tur bekliyor
        </span>
        <span className="rounded-full bg-red-600 px-2 py-0.5 text-white">
          Kırmızı — tur gerçekleşti
        </span>
        <span className="text-muted">|</span>
        {(Object.keys(PAYMENT_PREFIX) as PaymentType[]).map((p) => (
          <span key={p} className="rounded-full bg-muted-surface px-2 py-0.5 text-fg">
            {PAYMENT_PREFIX[p]} — {PAYMENT_LABELS[p]}
          </span>
        ))}
      </div>

      {selectedDay && (
        <div className="fixed inset-0 z-30 flex items-end bg-overlay">
          <div className="max-h-[70dvh] w-full overflow-y-auto rounded-t-2xl bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">{selectedDay.length} bilet</h3>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="text-muted"
              >
                Kapat
              </button>
            </div>
            <ul className="space-y-3">
              {selectedDay.map((t) => {
                const completed = isTourCompleted(t);
                const prefix = PAYMENT_PREFIX[t.paymentType];
                return (
                  <li
                    key={t.id}
                    className={`rounded-lg border p-3 ${
                      completed
                        ? "border-red-200 bg-red-50"
                        : "border-green-200 bg-green-50"
                    }`}
                  >
                    <p className="font-mono text-xs text-muted">{t.ticketNo}</p>
                    <p className="font-medium">
                      {prefix && (
                        <span className="mr-1.5 rounded bg-card/80 px-1.5 py-0.5 font-bold text-fg">
                          {prefix}
                        </span>
                      )}
                      {t.customerName}
                    </p>
                    <p className="text-sm text-muted">
                      {t.finalAmount.toLocaleString("tr-TR")} ₺ ·{" "}
                      <span className={PAYMENT_COLORS[t.paymentType]}>
                        {PAYMENT_LABELS[t.paymentType]}
                      </span>
                      {" · "}
                      <span className={completed ? "text-red-700" : "text-green-700"}>
                        {completed ? "Tur gerçekleşti" : "Tur bekliyor"}
                      </span>
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
