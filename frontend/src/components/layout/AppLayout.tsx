import { Outlet, useNavigate } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { useAuthStore } from "@/store/authStore";
import { useIsHotel } from "@/hooks/useRole";

export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const isHotel = useIsHotel();
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-3 shadow-sm">
        <div>
          <h1 className="text-lg font-semibold text-primary">
            {isHotel && user?.hotelName ? user.hotelName : "Tur Yönetim"}
          </h1>
          {user && (
            <p className="text-xs text-muted">
              {user.name}
              {!isHotel && ` · ${user.role}`}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="min-h-11 rounded-lg px-3 text-sm text-muted hover:bg-muted-surface"
        >
          Çıkış
        </button>
      </header>
      <main className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
