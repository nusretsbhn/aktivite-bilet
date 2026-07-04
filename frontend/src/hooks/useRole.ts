import { useAuthStore } from "@/store/authStore";

export function useCanManage() {
  const role = useAuthStore((s) => s.user?.role);
  return role === "ADMIN" || role === "MANAGER";
}

export function useIsHotel() {
  return useAuthStore((s) => s.user?.role) === "HOTEL";
}

export function useIsAdmin() {
  return useAuthStore((s) => s.user?.role) === "ADMIN";
}

export function useHomePath() {
  const role = useAuthStore((s) => s.user?.role);
  return role === "HOTEL" ? "/tickets" : "/calendar";
}
