import { NavLink } from "react-router-dom";
import { useIsHotel } from "@/hooks/useRole";

const allNavItems = [
  { to: "/calendar", label: "Takvim", icon: "📅", hotel: false },
  { to: "/tickets", label: "Biletler", icon: "🎫", hotel: true },
  { to: "/tickets/new", label: "Bilet Kes", icon: "➕", center: true, hotel: true },
  { to: "/current-accounts", label: "Cari", icon: "💰", hotel: false },
  { to: "/settings", label: "Ayarlar", icon: "⚙️", hotel: false },
];

export function BottomNav() {
  const isHotel = useIsHotel();
  const navItems = isHotel ? allNavItems.filter((i) => i.hotel) : allNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-card px-2 pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-lg items-end justify-between py-2">
        {navItems.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                [
                  "flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-xs transition-colors",
                  item.center
                    ? "-mt-6 rounded-full bg-teal-700 px-4 py-3 text-white shadow-lg hover:bg-teal-800"
                    : isActive
                      ? "text-primary font-medium"
                      : "text-muted hover:text-fg",
                ].join(" ")
              }
            >
              <span className={item.center ? "text-xl" : "text-lg"} aria-hidden>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
