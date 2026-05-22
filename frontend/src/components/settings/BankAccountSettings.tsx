import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";

type BankAccount = {
  id: number;
  name: string;
  description?: string | null;
  isActive: boolean;
};

export function BankAccountSettings() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const queryClient = useQueryClient();

  const { data: accounts = [] } = useQuery({
    queryKey: ["bank-accounts-all"],
    queryFn: () =>
      apiFetch<{ bankAccounts: BankAccount[] }>("/bank-accounts").then((r) => r.bankAccounts),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch("/bank-accounts", {
        method: "POST",
        body: JSON.stringify({ name, description }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts-all"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      setName("");
      setDescription("");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiFetch(`/bank-accounts/${id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bank-accounts-all"] }),
  });

  const inputClass = "min-h-11 w-full rounded-lg border border-border px-3";

  return (
    <div className="space-y-4">
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
          placeholder="Hesap adı"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className={inputClass}
          placeholder="Açıklama"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button type="submit" className="min-h-11 w-full rounded-lg bg-teal-700 text-white">
          Hesap Ekle
        </button>
      </form>

      <ul className="space-y-2">
        {accounts.map((acc) => (
          <li
            key={acc.id}
            className={`flex items-center justify-between rounded-lg border p-3 ${
              !acc.isActive ? "opacity-50" : ""
            }`}
          >
            <div>
              <p className="font-medium">{acc.name}</p>
              {acc.description && (
                <p className="text-sm text-muted">{acc.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() =>
                toggleMutation.mutate({ id: acc.id, isActive: !acc.isActive })
              }
              className="text-sm text-primary"
            >
              {acc.isActive ? "Pasife Al" : "Aktifleştir"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
