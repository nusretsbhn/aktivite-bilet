import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useHomePath } from "@/hooks/useRole";

type Props = {
  denyRoles?: string[];
};

/** Admin/yönetici sayfaları — otel kullanıcısı erişemez */
export function StaffRoute({ denyRoles = ["HOTEL"] }: Props) {
  const role = useAuthStore((s) => s.user?.role);
  const home = useHomePath();

  if (role && denyRoles.includes(role)) {
    return <Navigate to={home} replace />;
  }

  return <Outlet />;
}
