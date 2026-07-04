import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { StaffRoute } from "@/components/auth/StaffRoute";
import { CalendarPage } from "@/pages/CalendarPage";
import { TicketsPage } from "@/pages/TicketsPage";
import { NewTicketPage } from "@/pages/NewTicketPage";
import { EditTicketPage } from "@/pages/EditTicketPage";
import { CurrentAccountsPage } from "@/pages/CurrentAccountsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { ActivityPricesPage } from "@/pages/ActivityPricesPage";
import { BankAccountsPage } from "@/pages/BankAccountsPage";
import { LedgerPage } from "@/pages/LedgerPage";
import { CurrentAccountDetailPage } from "@/pages/CurrentAccountDetailPage";
import { LoginPage } from "@/pages/LoginPage";
import { useAuthInit } from "@/hooks/useAuth";
import { useHomePath } from "@/hooks/useRole";

function HomeRedirect() {
  const home = useHomePath();
  return <Navigate to={home} replace />;
}

export default function App() {
  useAuthInit();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/tickets" element={<TicketsPage />} />
          <Route path="/tickets/new" element={<NewTicketPage />} />
          <Route path="/tickets/:id/edit" element={<EditTicketPage />} />
          <Route element={<StaffRoute />}>
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/current-accounts" element={<CurrentAccountsPage />} />
            <Route path="/current-accounts/:activityId" element={<CurrentAccountDetailPage />} />
            <Route path="/ledger" element={<LedgerPage />} />
            <Route path="/bank-accounts" element={<BankAccountsPage />} />
            <Route path="/activity-prices" element={<ActivityPricesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}
