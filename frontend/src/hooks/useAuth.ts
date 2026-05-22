import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/utils/api";
import { useAuthStore } from "@/store/authStore";

type MeResponse = { user: { id: number; name: string; email: string; role: string } };

export function useAuthInit() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const logout = useAuthStore((s) => s.logout);

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
  const navigate = useNavigate();

  return async (email: string, password: string) => {
    const data = await apiFetch<{ token: string; user: MeResponse["user"] }>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }
    );
    setAuth(data.token, data.user);
    navigate("/calendar", { replace: true });
  };
}
