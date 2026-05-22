/** Tur tarihi + saatine göre tur gerçekleşti mi (en geç aktivite anı) */
export function parseTourDateTime(
  dateStr: string,
  timeStr?: string | null
): Date {
  const d = new Date(dateStr);
  if (timeStr?.trim()) {
    const [h, m] = timeStr.trim().split(":").map(Number);
    if (!Number.isNaN(h) && !Number.isNaN(m)) {
      d.setHours(h, m, 0, 0);
      return d;
    }
  }
  d.setHours(23, 59, 59, 999);
  return d;
}

export type TourScheduleInput = {
  tourDate: string;
  tourStartTime?: string | null;
  activities?: { tourDate: string; tourStartTime?: string | null }[];
};

function collectTourMoments(ticket: TourScheduleInput): Date[] {
  if (ticket.activities?.length) {
    return ticket.activities.map((a) =>
      parseTourDateTime(a.tourDate, a.tourStartTime)
    );
  }
  return [parseTourDateTime(ticket.tourDate, ticket.tourStartTime)];
}

/** Tur gerçekleşti mi: en geç aktivite tarih+saati geçtiyse */
export function getLatestTourMoment(ticket: TourScheduleInput): Date {
  const moments = collectTourMoments(ticket);
  return new Date(Math.max(...moments.map((m) => m.getTime())));
}

/** Takvimde gösterim: bilet tur günü + o güne ait en erken saat */
export function getDisplayStart(ticket: TourScheduleInput): Date {
  const base = new Date(ticket.tourDate);
  const dayKey = ticket.tourDate.slice(0, 10);
  const times: string[] = [];

  if (ticket.tourStartTime?.trim()) times.push(ticket.tourStartTime.trim());

  for (const a of ticket.activities ?? []) {
    if (a.tourDate.slice(0, 10) === dayKey && a.tourStartTime?.trim()) {
      times.push(a.tourStartTime.trim());
    }
  }

  if (times.length === 0) {
    base.setHours(0, 0, 0, 0);
    return base;
  }

  const earliest = [...times].sort()[0]!;
  const [h, m] = earliest.split(":").map(Number);
  base.setHours(h, m, 0, 0);
  return base;
}

export function isTourCompleted(
  ticket: TourScheduleInput,
  now: Date = new Date()
): boolean {
  return now.getTime() > getLatestTourMoment(ticket).getTime();
}

export const TOUR_COMPLETED_COLOR = "#dc2626";
export const TOUR_UPCOMING_COLOR = "#16a34a";
