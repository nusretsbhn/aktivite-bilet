import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  downloadBlob,
  fetchActivityImages,
  fetchTicketImageBlob,
  shareActivityTicketImage,
  type ActivityTicketImage,
} from "@/utils/ticketImage";

type Props = {
  ticketId: number;
  onClose?: () => void;
};

type LoadedImage = {
  line: ActivityTicketImage;
  url: string;
};

function safeFilename(ticketNo: string, displayName: string, ext: string) {
  const slug = displayName
    .replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${ticketNo.replace(/[^a-zA-Z0-9-]/g, "_")}-${slug}.${ext}`;
}

export function TicketImagePreview({ ticketId, onClose }: Props) {
  const [loaded, setLoaded] = useState<LoadedImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [error, setError] = useState("");

  const { data: lines = [], isLoading: linesLoading } = useQuery({
    queryKey: ["ticket-images", ticketId],
    queryFn: () => fetchActivityImages(ticketId),
  });

  useEffect(() => {
    if (lines.length === 0) return;

    let cancelled = false;
    const urls: string[] = [];

    async function loadAll() {
      setLoadingImages(true);
      setError("");
      setLoaded([]);

      try {
        const results: LoadedImage[] = [];
        for (const line of lines) {
          const blob = await fetchTicketImageBlob(ticketId, line.lineId, "png");
          if (cancelled) return;
          const url = URL.createObjectURL(blob);
          urls.push(url);
          results.push({ line, url });
        }
        if (!cancelled) setLoaded(results);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Görseller yüklenemedi");
        }
      } finally {
        if (!cancelled) setLoadingImages(false);
      }
    }

    loadAll();

    return () => {
      cancelled = true;
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [ticketId, lines]);

  const busy = linesLoading || loadingImages;

  async function handleDownloadPng(line: ActivityTicketImage) {
    const blob = await fetchTicketImageBlob(ticketId, line.lineId, "png");
    downloadBlob(blob, safeFilename(line.ticketNo, line.displayName, "png"));
  }

  async function handleDownloadPdf(line: ActivityTicketImage) {
    const blob = await fetchTicketImageBlob(ticketId, line.lineId, "pdf");
    downloadBlob(blob, safeFilename(line.ticketNo, line.displayName, "pdf"));
  }

  async function handleShare(line: ActivityTicketImage) {
    try {
      await shareActivityTicketImage(ticketId, line);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Paylaşılamadı");
    }
  }

  return (
    <div className="space-y-4">
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-muted hover:text-fg"
        >
          ← Geri
        </button>
      )}

      <p className="text-center text-sm text-muted">
        Her aktivite için ayrı bilet — aktivitecilere ayrı gönderin
      </p>

      {busy && (
        <p className="text-center text-muted">Bilet görselleri hazırlanıyor…</p>
      )}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="space-y-6">
        {loaded.map(({ line, url }) => (
          <section
            key={line.lineId}
            className="rounded-xl border border-border bg-card p-3 shadow-sm"
          >
            <h3 className="mb-2 font-semibold text-primary">
              <span className="font-mono text-lg tracking-wider">{line.ticketNo}</span>
              <span className="mx-2 text-muted">·</span>
              {line.displayName}
            </h3>
            <img
              src={url}
              alt={`${line.ticketNo} — ${line.displayName}`}
              className="mx-auto w-full max-w-sm rounded-lg border"
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleShare(line)}
                className="min-h-11 rounded-lg bg-teal-700 text-sm font-medium text-white"
              >
                Paylaş
              </button>
              <button
                type="button"
                onClick={() => handleDownloadPng(line)}
                className="min-h-11 rounded-lg border border-border text-sm font-medium"
              >
                PNG
              </button>
              <button
                type="button"
                onClick={() => handleDownloadPdf(line)}
                className="col-span-2 min-h-11 rounded-lg border border-border text-sm font-medium"
              >
                PDF İndir
              </button>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
