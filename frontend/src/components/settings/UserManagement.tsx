import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";

type User = {
  id: number;
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "STAFF";
};

const empty: {
  name: string;
  email: string;
  password: string;
  role: User["role"];
} = { name: "", email: "", password: "", role: "STAFF" };

export function UserManagement() {
  const [form, setForm] = useState(empty);
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch<{ users: User[] }>("/users").then((r) => r.users),
  });

  const createMutation = useMutation({
    mutationFn: () => apiFetch("/users", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setShowForm(false);
      setForm(empty);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/users/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const inputClass = "min-h-11 w-full rounded-lg border border-border px-3";

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setShowForm(!showForm)}
        className="min-h-11 w-full rounded-lg bg-teal-700 text-white"
      >
        + Kullanıcı Ekle
      </button>

      {showForm && (
        <form
          className="space-y-3 rounded-xl border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
        >
          <input
            required
            className={inputClass}
            placeholder="Ad Soyad"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            required
            type="email"
            className={inputClass}
            placeholder="E-posta"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            required
            type="password"
            className={inputClass}
            placeholder="Şifre (min 6)"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <select
            className={inputClass}
            value={form.role}
            onChange={(e) =>
              setForm({ ...form, role: e.target.value as User["role"] })
            }
          >
            <option value="STAFF">Personel</option>
            <option value="MANAGER">Yönetici</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button type="submit" className="min-h-11 w-full rounded-lg bg-teal-700 text-white">
            Kaydet
          </button>
        </form>
      )}

      <ul className="space-y-2">
        {users.map((u) => (
          <li key={u.id} className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium">{u.name}</p>
              <p className="text-sm text-muted">{u.email}</p>
              <p className="text-xs text-primary">{u.role}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (confirm("Silinsin mi?")) deleteMutation.mutate(u.id);
              }}
              className="text-sm text-red-600"
            >
              Sil
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
