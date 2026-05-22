import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";
import type { Activity } from "@/types/ticket";

type ActivityForm = {
  name: string;
  displayName: string;
  duration: string;
};

const emptyForm = (): ActivityForm => ({
  name: "",
  displayName: "",
  duration: "",
});

export function ActivitySettings() {
  const [form, setForm] = useState<ActivityForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: activities = [] } = useQuery({
    queryKey: ["activities-all"],
    queryFn: () =>
      apiFetch<{ activities: Activity[] }>("/activities").then((r) => r.activities),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name.trim(),
        displayName: form.displayName.trim(),
        duration: form.duration.trim() || undefined,
      };
      if (editingId) {
        return apiFetch(`/activities/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
      }
      return apiFetch("/activities", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities-all"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      setForm(emptyForm());
      setEditingId(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiFetch(`/activities/${id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities-all"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/activities/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities-all"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      setEditingId(null);
      setForm(emptyForm());
    },
  });

  function startEdit(act: Activity) {
    setEditingId(act.id);
    setForm({
      name: act.name,
      displayName: act.displayName,
      duration: act.duration ?? "",
    });
  }

  const inputClass = "min-h-11 w-full rounded-lg border border-border px-3";

  return (
    <div className="space-y-4">
      <Link
        to="/activity-prices"
        className="flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-primary-border bg-primary-soft font-medium text-primary"
      >
        💰 Aktivite Fiyat Takvimi
      </Link>

      <form
        className="space-y-3 rounded-xl border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.name.trim() || !form.displayName.trim()) return;
          saveMutation.mutate();
        }}
      >
        <h4 className="font-medium text-fg">
          {editingId ? "Aktivite Düzenle" : "Yeni Aktivite"}
        </h4>
        <input
          required
          className={inputClass}
          placeholder="Sistem adı (iç kullanım)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          required
          className={inputClass}
          placeholder="Görünen isim (bilette yazılır)"
          value={form.displayName}
          onChange={(e) => setForm({ ...form, displayName: e.target.value })}
        />
        <input
          className={inputClass}
          placeholder="Süre (örn. 3 saat)"
          value={form.duration}
          onChange={(e) => setForm({ ...form, duration: e.target.value })}
        />
        <p className="text-xs text-muted">
          Fiyatlar tarih aralığına göre Aktivite Fiyat Takvimi sayfasından girilir.
        </p>
        <div className="flex gap-2">
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm());
              }}
              className="min-h-11 flex-1 rounded-lg border font-medium"
            >
              İptal
            </button>
          )}
          <button
            type="submit"
            className="min-h-11 flex-1 rounded-lg bg-teal-700 font-medium text-white"
          >
            {editingId ? "Kaydet" : "Aktivite Ekle"}
          </button>
        </div>
      </form>

      <ul className="space-y-2">
        {activities.map((act) => (
          <li
            key={act.id}
            className={`rounded-lg border p-3 ${!act.isActive ? "opacity-50" : ""}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{act.displayName}</p>
                <p className="text-xs text-muted">{act.name}</p>
                {act.duration && (
                  <p className="text-sm text-muted">{act.duration}</p>
                )}
              </div>
              <div className="flex flex-col gap-1 text-sm">
                <Link
                  to={`/activity-prices?activityId=${act.id}`}
                  className="text-primary"
                >
                  Fiyatlar
                </Link>
                <button
                  type="button"
                  onClick={() => startEdit(act)}
                  className="text-left text-primary"
                >
                  Düzenle
                </button>
                <button
                  type="button"
                  onClick={() =>
                    toggleMutation.mutate({ id: act.id, isActive: !act.isActive })
                  }
                  className="text-left text-muted"
                >
                  {act.isActive ? "Pasif" : "Aktif"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (
                      confirm(
                        `"${act.displayName}" silinsin mi? Bağlı bilet yoksa kalıcı silinir.`
                      )
                    ) {
                      deleteMutation.mutate(act.id);
                    }
                  }}
                  className="text-left text-red-600"
                >
                  Sil
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
