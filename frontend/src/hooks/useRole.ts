import { useAuthStore } from "@/store/authStore";

export function useCanManage() {
  const role = useAuthStore((s) => s.user?.role);
  return role === "ADMIN" || role === "MANAGER";
}
