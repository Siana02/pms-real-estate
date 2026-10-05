import { useEffect } from "react";
import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
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
import TenantMaintenancePage from "./pages/tenant/TenantMaintenancePageV3";
import TenantLeasePage from "./pages/tenant/TenantLeasePage";
import { applyTheme, readThemeId } from "./styles/themes";

type Portal = "manager" | "tenant";
const TENANT_ROLES = ["tenant"];
const MANAGER_ROLES = ["admin", "property_manager", "owner", "staff"];
function getToken(): string | null { try { return localStorage.getItem("token") ?? sessionStorage.getItem("token"); } catch { return null; } }
function getRole(): string { try { const raw = localStorage.getItem("user") ?? sessionStorage.getItem("user"); if (!raw) return ""; const parsed: unknown = JSON.parse(raw); if (parsed && typeof parsed === "object") { const role = (parsed as Record<string, unknown>).role; if (typeof role === "string") return role.trim().toLowerCase(); } } catch {} return ""; }
function mustChangePassword(): boolean { try { const raw = localStorage.getItem("user") ?? sessionStorage.getItem("user"); if (!raw) return false; const parsed: unknown = JSON.parse(raw); return !!(parsed && typeof parsed === "object" && (parsed as Record<string, unknown>).must_change_password === true); } catch { return false; } }
function portalForRole(role: string): Portal { if (TENANT_ROLES.includes(role)) return "tenant"; if (MANAGER_ROLES.includes(role)) return "manager"; return "manager"; }
function homePath(): string { return portalForRole(getRole()) === "tenant" ? "/tenant/dashboard" : "/manager/dashboard"; }
function RequireAuth({ children }: { children: ReactNode }) { return getToken() ? <>{children}</> : <Navigate to="/login" replace />; }
function RequirePortal({ portal, children }: { portal: Portal; children: ReactNode }) { if (!getToken()) return <Navigate to="/login" replace />; if (portalForRole(getRole()) !== portal) return <Navigate to={homePath()} replace />; if (mustChangePassword()) return <Navigate to="/password-setup" replace />; return <>{children}</>; }
function HomeRedirect() { return <Navigate to={homePath()} replace />; }
function App() { useEffect(() => { applyTheme(readThemeId(), false); }, []); return <BrowserRouter><Routes>
<Route path="/" element={<LandingPage/>}/><Route path="/login" element={<LoginPage/>}/><Route path="/register" element={<RegisterPage/>}/><Route path="/password-setup" element={<RequireAuth><ChangePasswordPage/></RequireAuth>}/>
<Route path="/manager/dashboard" element={<RequirePortal portal="manager"><DashboardPage/></RequirePortal>}/><Route path="/manager/properties/add" element={<RequirePortal portal="manager"><AddProperties/></RequirePortal>}/><Route path="/manager/properties" element={<RequirePortal portal="manager"><ManagerPropertiesPage/></RequirePortal>}/><Route path="/manager/units" element={<RequirePortal portal="manager"><ManagerUnitsPage/></RequirePortal>}/><Route path="/manager/tenants" element={<RequirePortal portal="manager"><ManagerTenantsPage/></RequirePortal>}/><Route path="/manager/leases" element={<RequirePortal portal="manager"><ManagerLeasesPage/></RequirePortal>}/><Route path="/manager/payments" element={<RequirePortal portal="manager"><ManagerPaymentsPage/></RequirePortal>}/><Route path="/manager/expenses" element={<RequirePortal portal="manager"><ManagerExpensesPage/></RequirePortal>}/><Route path="/manager/maintenance" element={<RequirePortal portal="manager"><ManagerMaintenancePage/></RequirePortal>}/><Route path="/manager/settings" element={<RequirePortal portal="manager"><ManagerSettingsPage/></RequirePortal>}/>
<Route path="/tenant/dashboard" element={<RequirePortal portal="tenant"><TenantDashboardPage/></RequirePortal>}/><Route path="/tenant/home" element={<RequirePortal portal="tenant"><MyHomePage/></RequirePortal>}/><Route path="/tenant/payments" element={<RequirePortal portal="tenant"><TenantPaymentsPage/></RequirePortal>}/><Route path="/tenant/maintenance" element={<RequirePortal portal="tenant"><TenantMaintenancePage/></RequirePortal>}/><Route path="/tenant/lease" element={<RequirePortal portal="tenant"><TenantLeasePage/></RequirePortal>}/>
<Route path="/dashboard" element={<Navigate to="/manager/dashboard" replace/>}/><Route path="/properties/add" element={<Navigate to="/manager/properties/add" replace/>}/><Route path="/tenant" element={<Navigate to="/tenant/dashboard" replace/>}/><Route path="/tenants" element={<Navigate to="/manager/tenants" replace/>}/><Route path="/properties" element={<Navigate to="/manager/properties" replace/>}/><Route path="/units" element={<Navigate to="/manager/units" replace/>}/><Route path="/leases" element={<Navigate to="/manager/leases" replace/>}/><Route path="/payments" element={<Navigate to="/manager/payments" replace/>}/><Route path="/expenses" element={<Navigate to="/manager/expenses" replace/>}/><Route path="/maintenance" element={<Navigate to="/manager/maintenance" replace/>}/><Route path="/settings" element={<Navigate to="/manager/settings" replace/>}/><Route path="/app" element={<RequireAuth><HomeRedirect/></RequireAuth>}/><Route path="/landing" element={<LandingPage/>}/>
</Routes></BrowserRouter>; }
export default App;
