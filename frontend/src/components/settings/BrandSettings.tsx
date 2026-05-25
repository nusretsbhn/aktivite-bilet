import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";

type Brand = {
  companyName: string;
  companyPhone: string;
  companyPhone2: string;
  companyEmail: string;
  companyAddress: string;
  companyLogo: string;
  tursabLogo: string;
  ticketInfoNote: string;
  currency: string;
};

function readImageFile(
  file: File,
  onLoad: (dataUrl: string) => void
) {
  const reader = new FileReader();
  reader.onload = () => onLoad(reader.result as string);
  reader.readAsDataURL(file);
}

export function BrandSettings() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["settings-brand"],
    queryFn: () => apiFetch<{ settings: Brand }>("/settings").then((r) => r.settings),
  });

  const [form, setForm] = useState<Brand | null>(null);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => apiFetch("/settings", { method: "PUT", body: JSON.stringify(form) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings-brand"] }),
  });

  const logoMutation = useMutation({
    mutationFn: (logo: string) =>
      apiFetch("/settings/logo", { method: "POST", body: JSON.stringify({ logo }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings-brand"] }),
  });

  const tursabLogoMutation = useMutation({
    mutationFn: (logo: string) =>
      apiFetch("/settings/tursab-logo", { method: "POST", body: JSON.stringify({ logo }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings-brand"] }),
  });

  function handleCompanyLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    readImageFile(file, (result) => {
      logoMutation.mutate(result);
      setForm((f) => (f ? { ...f, companyLogo: result } : f));
    });
  }

  function handleTursabLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    readImageFile(file, (result) => {
      tursabLogoMutation.mutate(result);
      setForm((f) => (f ? { ...f, tursabLogo: result } : f));
    });
  }

  if (isLoading || !form) {
    return <p className="text-muted">Yükleniyor…</p>;
  }

  const inputClass = "min-h-11 w-full rounded-lg border border-border px-3";

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        saveMutation.mutate();
      }}
    >
      <p className="text-sm font-medium text-fg">Firma logosu</p>
      {form.companyLogo && (
        <img src={form.companyLogo} alt="Logo" className="mx-auto h-16 object-contain" />
      )}
      <label className="block">
        <span className="text-sm text-muted">Logo yükle</span>
        <input
          type="file"
          accept="image/*"
          onChange={handleCompanyLogo}
          className="mt-1 w-full text-sm"
        />
      </label>

      <input
        className={inputClass}
        value={form.companyName}
        onChange={(e) => setForm({ ...form, companyName: e.target.value })}
        placeholder="Firma adı"
      />
      <input
        className={inputClass}
        value={form.companyPhone}
        onChange={(e) => setForm({ ...form, companyPhone: e.target.value })}
        placeholder="Telefon"
      />
      <input
        className={inputClass}
        value={form.companyPhone2}
        onChange={(e) => setForm({ ...form, companyPhone2: e.target.value })}
        placeholder="İkinci telefon"
      />
      <input
        className={inputClass}
        value={form.companyEmail}
        onChange={(e) => setForm({ ...form, companyEmail: e.target.value })}
        placeholder="E-posta"
      />
      <textarea
        className={inputClass}
        value={form.companyAddress}
        onChange={(e) => setForm({ ...form, companyAddress: e.target.value })}
        placeholder="Adres"
        rows={2}
      />

      <div className="border-t border-border pt-3">
        <p className="text-sm font-medium text-fg">Bilet alt bilgisi</p>
        <p className="mt-1 text-xs text-muted">
          TURSAB logosu ve bilgilendirme metni biletin en altında görünür.
        </p>
      </div>

      {form.tursabLogo && (
        <img
          src={form.tursabLogo}
          alt="TURSAB"
          className="mx-auto h-14 object-contain"
        />
      )}
      <label className="block">
        <span className="text-sm text-muted">TURSAB logosu yükle</span>
        <input
          type="file"
          accept="image/*"
          onChange={handleTursabLogo}
          className="mt-1 w-full text-sm"
        />
      </label>

      <label className="block">
        <span className="text-sm text-muted">Bilgilendirme notu (bilet altı)</span>
        <textarea
          className={`${inputClass} mt-1`}
          value={form.ticketInfoNote}
          onChange={(e) => setForm({ ...form, ticketInfoNote: e.target.value })}
          placeholder="Örn. iptal koşulları, iletişim saatleri…"
          rows={4}
        />
      </label>

      <input
        className={inputClass}
        value={form.currency}
        onChange={(e) => setForm({ ...form, currency: e.target.value })}
        placeholder="Para birimi (TRY)"
      />
      <button type="submit" className="min-h-11 w-full rounded-lg bg-teal-700 text-white">
        Kaydet
      </button>
    </form>
  );
}
