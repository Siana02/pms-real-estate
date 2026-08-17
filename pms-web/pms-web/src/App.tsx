import { useEffect } from "react";
import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/manager/DashboardPage";
import AddProperties from "./pages/manager/AddPropertyPage";
import ManagerTenantsPage from "./pages/manager/ManagerTenantsPage";
import ManagerPropertiesPage from "./pages/manager/ManagerPropertiesPage";
import ManagerUnitsPage from "./pages/manager/ManagerUnitsPage";
import ManagerLeasesPage from "./pages/manager/ManagerLeasesPage";
import ManagerPaymentsPage from "./pages/manager/ManagerPaymentsPage";
import ManagerExpensesPage from "./pages/manager/ManagerExpensesPage";
import ManagerMaintenancePage from "./pages/manager/ManagerMaintenancePage";
import ManagerSettingsPage from "./pages/manager/ManagerSettingsPage";
import TenantDashboardPage from "./pages/tenant/TenantDashboardPage";
import MyHomePage from "./pages/tenant/MyHomePage";
import TenantPaymentsPage from "./pages/tenant/TenantPaymentsPage";
import TenantMaintenancePage from "./pages/tenant/TenantMaintenancePage";
import { applyTheme, readThemeId } from "./styles/themes";

type Portal = "manager" | "tenant";

const TENANT_ROLES = ["tenant"];
const MANAGER_ROLES = ["admin", "property_manager", "owner", "staff"];

function getToken(): string | null {
  try {
    return localStorage.getItem("token") ?? sessionStorage.getItem("token");
  } catch {
    // Storage may be unavailable (e.g. privacy mode / blocked cookies)
    return null;
  }
}

function getRole(): string {
  try {
    const raw = localStorage.getItem("user") ?? sessionStorage.getItem("user");
    if (!raw) return "";

    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      const role = (parsed as Record<string, unknown>).role;
      if (typeof role === "string") return role.trim().toLowerCase();
    }
  } catch {
    /* stored value is not valid JSON or storage is unavailable */
  }

  return "";
}

/**
 * The backend owns the role; the UI only decides which portal that role maps
 * to, and defaults to the manager portal for any role it does not recognise.
 */
function portalForRole(role: string): Portal {
  if (TENANT_ROLES.includes(role)) return "tenant";
  if (MANAGER_ROLES.includes(role)) return "manager";
  return "manager";
}

function homePath(): string {
  return portalForRole(getRole()) === "tenant"
    ? "/tenant/dashboard"
    : "/manager/dashboard";
}

function RequireAuth({ children }: { children: ReactNode }) {
  return getToken() ? <>{children}</> : <Navigate to="/login" replace />;
}

function RequirePortal({
  portal,
  children,
}: {
  portal: Portal;
  children: ReactNode;
}) {
  if (!getToken()) return <Navigate to="/login" replace />;
  if (portalForRole(getRole()) !== portal) {
    return <Navigate to={homePath()} replace />;
  }

  return <>{children}</>;
}

function HomeRedirect() {
  return <Navigate to={homePath()} replace />;
}

function App() {
  useEffect(() => {
    applyTheme(readThemeId(), false);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public pages - always accessible from the browser */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Manager portal */}
        <Route
          path="/manager/dashboard"
          element={
            <RequirePortal portal="manager">
              <DashboardPage />
            </RequirePortal>
          }
        />
        <Route
          path="/manager/properties/add"
          element={
            <RequirePortal portal="manager">
              <AddProperties />
            </RequirePortal>
          }
        />
        <Route
          path="/manager/properties"
          element={
            <RequirePortal portal="manager">
              <ManagerPropertiesPage />
            </RequirePortal>
          }
        />
        <Route
          path="/manager/units"
          element={
            <RequirePortal portal="manager">
              <ManagerUnitsPage />
            </RequirePortal>
          }
        />
        <Route
          path="/manager/tenants"
          element={
            <RequirePortal portal="manager">
              <ManagerTenantsPage />
            </RequirePortal>
          }
        />
        <Route
          path="/manager/leases"
          element={
            <RequirePortal portal="manager">
              <ManagerLeasesPage />
            </RequirePortal>
          }
        />
        <Route
          path="/manager/payments"
          element={
            <RequirePortal portal="manager">
              <ManagerPaymentsPage />
            </RequirePortal>
          }
        />
        <Route
          path="/manager/expenses"
          element={
            <RequirePortal portal="manager">
              <ManagerExpensesPage />
            </RequirePortal>
          }
        />
        <Route
          path="/manager/maintenance"
          element={
            <RequirePortal portal="manager">
              <ManagerMaintenancePage />
            </RequirePortal>
          }
        />
        <Route
          path="/manager/settings"
          element={
            <RequirePortal portal="manager">
              <ManagerSettingsPage />
            </RequirePortal>
          }
        />

        {/* Tenant portal */}
        <Route
          path="/tenant/dashboard"
          element={
            <RequirePortal portal="tenant">
              <TenantDashboardPage />
            </RequirePortal>
          }
        />
        <Route
          path="/tenant/home"
          element={
            <RequirePortal portal="tenant">
              <MyHomePage />
            </RequirePortal>
          }
        />
        <Route
          path="/tenant/payments"
          element={
            <RequirePortal portal="tenant">
              <TenantPaymentsPage />
            </RequirePortal>
          }
        />
        <Route
          path="/tenant/maintenance"
          element={
            <RequirePortal portal="tenant">
              <TenantMaintenancePage />
            </RequirePortal>
          }
        />

        {/* legacy paths */}
        <Route
          path="/dashboard"
          element={<Navigate to="/manager/dashboard" replace />}
        />
        <Route
          path="/properties/add"
          element={<Navigate to="/manager/properties/add" replace />}
        />
        <Route
          path="/tenant"
          element={<Navigate to="/tenant/dashboard" replace />}
        />
        <Route
          path="/tenants"
          element={<Navigate to="/manager/tenants" replace />}
        />
        <Route
          path="/properties"
          element={<Navigate to="/manager/properties" replace />}
        />
        <Route path="/units" element={<Navigate to="/manager/units" replace />} />
        <Route path="/leases" element={<Navigate to="/manager/leases" replace />} />
        <Route
          path="/payments"
          element={<Navigate to="/manager/payments" replace />}
        />
        <Route
          path="/expenses"
          element={<Navigate to="/manager/expenses" replace />}
        />
        <Route
          path="/maintenance"
          element={<Navigate to="/manager/maintenance" replace />}
        />
        <Route
          path="/settings"
          element={<Navigate to="/manager/settings" replace />}
        />

        <Route
          path="/app"
          element={
            <RequireAuth>
              <HomeRedirect />
            </RequireAuth>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;