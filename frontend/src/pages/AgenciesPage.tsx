import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";
import { useCanManage } from "@/hooks/useRole";

type Agency = {
  id: number;
  name: string;
  contactName: string;
  phone: string;
  region: string;
  tourInfo?: string | null;
  serviceHours?: string | null;
  _count?: { tickets: number; prices: number };
};

const emptyForm = {
  name: "",
  contactName: "",
  phone: "",
  region: "",
  tourInfo: "",
  serviceHours: "",
};

export function AgenciesPage() {
  const canManage = useCanManage();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Agency | null>(null);
  const [form, setForm] = useState(emptyForm);
  const queryClient = useQueryClient();

  const { data: agencies = [], isLoading } = useQuery({
    queryKey: ["agencies-full"],
    queryFn: () => apiFetch<{ agencies: Agency[] }>("/agencies").then((r) => r.agencies),
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      editing
        ? apiFetch(`/agencies/${editing.id}`, {
            method: "PUT",
            body: JSON.stringify(form),
          })
        : apiFetch("/agencies", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agencies-full"] });
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/agencies/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agencies-full"] }),
  });

  const filtered = agencies.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.region.toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(agency: Agency) {
    setEditing(agency);
    setForm({
      name: agency.name,
      contactName: agency.contactName,
      phone: agency.phone,
      region: agency.region,
      tourInfo: agency.tourInfo ?? "",
      serviceHours: agency.serviceHours ?? "",
    });
    setModalOpen(true);
  }

  const inputClass =
    "min-h-11 w-full rounded-lg border border-border px-3 text-base";

  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Acentalar</h2>
        {canManage && (
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white"
          >
            + Yeni
          </button>
        )}
      </div>

      <input
        type="search"
        placeholder="Acenta ara…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mt-3 min-h-11 w-full rounded-lg border border-border px-3"
      />

      {isLoading && <p className="mt-4 text-muted">Yükleniyor…</p>}

      <ul className="mt-4 space-y-3">
        {filtered.map((agency) => (
          <li
            key={agency.id}
            className="rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <h3 className="font-semibold">{agency.name}</h3>
            <p className="text-sm text-muted">{agency.contactName}</p>
            <p className="text-sm text-muted">
              {agency.region} · {agency.phone}
            </p>
            <p className="mt-1 text-xs text-subtle">
              {agency._count?.tickets ?? 0} bilet · {agency._count?.prices ?? 0} fiyat
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                to={`/agencies/${agency.id}/prices`}
                className="min-h-11 rounded-lg bg-teal-700 px-4 text-sm font-medium text-white leading-[2.75rem]"
              >
                Fiyatlar
              </Link>
              {canManage && (
                <>
                  <button
                    type="button"
                    onClick={() => openEdit(agency)}
                    className="min-h-11 rounded-lg border border-border px-4 text-sm"
                  >
                    Düzenle
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Acenta silinsin mi?")) deleteMutation.mutate(agency.id);
                    }}
                    className="min-h-11 rounded-lg border border-red-200 px-4 text-sm text-red-700"
                  >
                    Sil
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      {modalOpen && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-overlay p-4 sm:items-center">
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-card p-4">
            <h3 className="text-lg font-semibold">
              {editing ? "Acenta Düzenle" : "Yeni Acenta"}
            </h3>
            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate();
              }}
            >
              {(["name", "contactName", "phone", "region"] as const).map((field) => (
                <input
                  key={field}
                  required
                  placeholder={
                    {
                      name: "Acenta adı",
                      contactName: "Yetkili adı",
                      phone: "Telefon",
                      region: "Bölge",
                    }[field]
                  }
                  value={form[field]}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  className={inputClass}
                />
              ))}
              <textarea
                placeholder="Tur bilgisi"
                value={form.tourInfo}
                onChange={(e) => setForm({ ...form, tourInfo: e.target.value })}
                className={inputClass}
                rows={2}
              />
              <textarea
                placeholder="Servis saatleri"
                value={form.serviceHours}
                onChange={(e) => setForm({ ...form, serviceHours: e.target.value })}
                className={inputClass}
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="min-h-11 flex-1 rounded-lg border"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="min-h-11 flex-1 rounded-lg bg-teal-700 text-white"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
