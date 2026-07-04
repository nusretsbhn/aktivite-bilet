import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/utils/api";
import { useAuthStore } from "@/store/authStore";

type MeResponse = {
  user: { id: number; name: string; email: string; role: string; hotelName?: string | null };
};

export function useAuthInit() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    const onLogout = () => logout();
    window.addEventListener("auth:logout", onLogout);
    return () => window.removeEventListener("auth:logout", onLogout);
  }, [logout]);

  useEffect(() => {
    if (!token || user) return;

    apiFetch<MeResponse>("/auth/me")
      .then((data) => {
        setAuth(token, data.user);
      })
      .catch(() => {
        logout();
      });
  }, [token, user, setAuth, logout]);
}

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  return async (email: string, password: string) => {
    logout();
    const data = await apiFetch<{ token: string; user: MeResponse["user"] }>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }
    );
    setAuth(data.token, data.user);
    navigate(data.user.role === "HOTEL" ? "/tickets" : "/calendar", { replace: true });
  };
}
