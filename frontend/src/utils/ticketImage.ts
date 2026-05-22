import { apiFetch } from "@/utils/api";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

export type ActivityTicketImage = {
  lineId: number;
  ticketNo: string;
  index: number;
  displayName: string;
  tourDate: string;
  paymentType: string;
  remainingAmount: number;
};

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchActivityImages(
  ticketId: number
): Promise<ActivityTicketImage[]> {
  const res = await apiFetch<{ images: ActivityTicketImage[] }>(
    `/tickets/${ticketId}/images`
  );
  return res.images;
}

export async function fetchTicketImageBlob(
  ticketId: number,
  activityLineId: number,
  format: "png" | "pdf" = "png"
): Promise<Blob> {
  const res = await fetch(
    `${API_BASE}/tickets/${ticketId}/image?format=${format}&activityLineId=${activityLineId}`,
    { headers: authHeaders() }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = (err as { message?: string }).message ?? "Görsel yüklenemedi";
    throw new Error(msg);
  }

  return res.blob();
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function safeFilename(ticketNo: string, displayName: string, ext: string) {
  const slug = displayName
    .replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${ticketNo.replace(/[^a-zA-Z0-9-]/g, "_")}-${slug}.${ext}`;
}

export async function shareActivityTicketImage(
  ticketId: number,
  line: ActivityTicketImage
) {
  const blob = await fetchTicketImageBlob(ticketId, line.lineId, "png");
  const filename = safeFilename(line.ticketNo, line.displayName, "png");
  const file = new File([blob], filename, { type: "image/png" });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: `${line.displayName} — ${line.ticketNo}`,
    });
    return;
  }

  downloadBlob(blob, filename);
}
