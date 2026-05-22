import { useThemeStore, type ThemeMode } from "@/store/themeStore";
import { cardClass } from "@/lib/ui";

const OPTIONS: { value: ThemeMode; label: string; desc: string; icon: string }[] = [
  { value: "light", label: "Açık tema", desc: "Açık arka plan, koyu metin", icon: "☀️" },
  { value: "dark", label: "Koyu tema", desc: "Koyu arka plan, açık metin", icon: "🌙" },
];

export function ThemeSettings() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <section className={`${cardClass} p-4`}>
      <h3 className="font-semibold text-fg">Görünüm</h3>
      <p className="mt-1 text-sm text-muted">
        Tüm uygulama bu temaya göre renklendirilir. Tercih cihazınızda saklanır.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border-2 px-3 py-3 text-center transition-colors ${
              theme === opt.value
                ? "border-primary bg-primary-soft text-primary"
                : "border-border bg-card text-muted hover:border-primary/50"
            }`}
          >
            <span className="text-2xl" aria-hidden>
              {opt.icon}
            </span>
            <span className="text-sm font-semibold">{opt.label}</span>
            <span className="text-xs opacity-80">{opt.desc}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
