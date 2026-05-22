type Tab = { id: string; label: string; adminOnly?: boolean };

const TABS: Tab[] = [
  { id: "brand", label: "Firma" },
  { id: "users", label: "Kullanıcılar", adminOnly: true },
  { id: "bank", label: "Banka", adminOnly: true },
  { id: "template", label: "Bilet Şablonu", adminOnly: true },
  { id: "activities", label: "Aktiviteler", adminOnly: true },
];

type Props = {
  active: string;
  onChange: (id: string) => void;
  isAdmin: boolean;
};

export function SettingsTabs({ active, onChange, isAdmin }: Props) {
  const visible = TABS.filter((t) => !t.adminOnly || isAdmin);

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-border pb-px text-fg">
      {visible.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`shrink-0 px-4 py-2 text-sm font-medium ${
            active === tab.id
              ? "border-b-2 border-primary text-primary"
              : "text-muted"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
