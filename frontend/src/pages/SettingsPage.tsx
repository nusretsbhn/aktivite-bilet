import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useCanManage } from "@/hooks/useRole";
import { SettingsTabs } from "@/components/settings/SettingsTabs";
import { BrandSettings } from "@/components/settings/BrandSettings";
import { UserManagement } from "@/components/settings/UserManagement";
import { BankAccountSettings } from "@/components/settings/BankAccountSettings";
import { ActivitySettings } from "@/components/settings/ActivitySettings";
import { TicketTemplateEditor } from "@/components/settings/TicketTemplateEditor";
import { ThemeSettings } from "@/components/settings/ThemeSettings";

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const canManage = useCanManage();
  const isAdmin = user?.role === "ADMIN";
  const [tab, setTab] = useState(isAdmin ? "brand" : "brand");

  const managerLinks = canManage
    ? [
        { to: "/activity-prices", label: "Aktivite Fiyatları", icon: "💰" },
        { to: "/bank-accounts", label: "Banka Dökümü", icon: "🏦" },
        { to: "/ledger", label: "Gelir / Gider", icon: "📊" },
      ]
    : [];

  return (
    <div className="p-4 pb-8">
      <h2 className="text-xl font-semibold">Ayarlar</h2>

      {user && (
        <div className="mt-3 rounded-xl border border-border bg-card p-4">
          <p className="font-medium text-fg">{user.name}</p>
          <p className="text-sm text-muted">{user.email}</p>
          <p className="text-xs text-primary">{user.role}</p>
        </div>
      )}

      <div className="mt-4">
        <ThemeSettings />
      </div>

      {managerLinks.length > 0 && (
        <ul className="mt-4 space-y-2">
          {managerLinks.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                className="flex min-h-11 items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 font-medium text-fg"
              >
                <span>{link.icon}</span>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {isAdmin && (
        <div className="mt-6">
          <h3 className="mb-2 font-semibold text-fg">Sistem Ayarları</h3>
          <SettingsTabs active={tab} onChange={setTab} isAdmin={isAdmin} />
          <div className="mt-4">
            {tab === "brand" && <BrandSettings />}
            {tab === "users" && <UserManagement />}
            {tab === "bank" && <BankAccountSettings />}
            {tab === "template" && <TicketTemplateEditor />}
            {tab === "activities" && <ActivitySettings />}
          </div>
        </div>
      )}

      {!isAdmin && canManage && (
        <p className="mt-6 text-center text-sm text-subtle">
          Firma ve kullanıcı ayarları için Admin hesabı gerekir.
        </p>
      )}
    </div>
  );
}
