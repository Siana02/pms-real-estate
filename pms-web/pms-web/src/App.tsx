import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LegalHelpPage from "./pages/LegalHelpPage";
import LoginPage from "./pages/LoginPage";
import PasswordResetPage from "./pages/PasswordResetPage";
import RegisterPage from "./pages/RegisterPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import DashboardPage from "./pages/manager/DashboardPage";
import AddProperties from "./pages/manager/AddPropertyPage";
import ManagerTenantsPage from "./pages/manager/ManagerTenantsPage";
import ManagerPropertiesPage from "./pages/manager/ManagerPropertiesPage";
import ManagerUnitsPage from "./pages/manager/ManagerUnitsPage";
import ManagerLeasesPage from "./pages/manager/ManagerLeasesPage";
import ManagerPaymentsPage from "./pages/manager/ManagerPaymentsPage";
import PaymentReconciliationPage from "./pages/manager/PaymentReconciliationPage";
import ManagerExpensesPage from "./pages/manager/ManagerExpensesPage";
import ManagerMaintenancePage from "./pages/manager/ManagerMaintenancePage";
import ManagerSettingsPage from "./pages/manager/ManagerSettingsPage";
import TeamPage from "./pages/manager/TeamPage";
import AcceptInvitePage from "./pages/AcceptInvitePage";
import RequestsPage from "./pages/manager/RequestsPage";
import AuditLogPage from "./pages/manager/AuditLogPage";
import ManagerGuestPaymentLinksPage from "./pages/manager/ManagerGuestPaymentLinksPage";
import GuestPaymentPage from "./pages/GuestPaymentPage";
import TenantDashboardPage from "./pages/tenant/TenantDashboardPage";
import MyHomePage from "./pages/tenant/MyHomePage";
import TenantPaymentsPage from "./pages/tenant/TenantPaymentsPage";
import TenantMaintenancePage from "./pages/tenant/TenantMaintenancePageV3";
import TenantLeasePage from "./pages/tenant/TenantLeasePage";
import TenantNotificationsPage from "./pages/tenant/TenantNotificationsPage";
import TenantProfilePage from "./pages/tenant/TenantProfilePage";
import TenantHelpPage from "./pages/tenant/TenantHelpPage";
import TenantSettingsPage from "./pages/tenant/TenantSettingsPage";
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
function FirstLoginGuide({ portal, children }: { portal: Portal; children: ReactNode }) {
 const [visible, setVisible] = useState(false);
 const [user, setUser] = useState<Record<string, unknown>>({});
 useEffect(() => {
  try {
   const raw = localStorage.getItem("user") ?? sessionStorage.getItem("user");
   const current = raw ? JSON.parse(raw) as Record<string, unknown> : {};
   setUser(current);
   const key = "pms:first-login-guide:" + String(current.id ?? current.email ?? portal);
   if (localStorage.getItem(key) !== "done") {
    setVisible(true);
   }
  } catch { setVisible(false); }
 }, [portal]);
 function dismiss() {
  try {
   const key = "pms:first-login-guide:" + String(user.id ?? user.email ?? portal);
   localStorage.setItem(key, "done");
   sessionStorage.setItem("pms:username-notice", "shown");
  } catch {}
  setVisible(false);
 }
 return <>{children}{visible && <div role="dialog" aria-modal="true" aria-labelledby="pms-first-guide-title" style={{position:"fixed",inset:0,zIndex:10000,background:"rgba(8,15,30,.68)",display:"grid",placeItems:"center",padding:"1rem"}}>
  <section style={{width:"min(100%,540px)",background:"var(--pms-card,#fff)",color:"var(--pms-text,#172033)",borderRadius:20,padding:"clamp(1.25rem,4vw,2rem)",boxShadow:"0 24px 80px #0005"}}>
   <p style={{margin:"0 0 .4rem",fontSize:".75rem",fontWeight:800,letterSpacing:".12em",textTransform:"uppercase",opacity:.65}}>{portal==="manager"?"Quick manager tour":"Account information"}</p>
   <h2 id="pms-first-guide-title" style={{margin:"0 0 .75rem",fontSize:"1.6rem"}}>{portal==="manager"?"Welcome to your property workspace":"Welcome to your tenant portal"}</h2>
   {typeof user.username==="string" && user.username && <p style={{padding:"1rem",borderRadius:12,background:"var(--pms-surface-sunken,#f1f4f9)",lineHeight:1.6}}>Your username is <strong>{user.username}</strong>. You can find it again in your profile at any time.</p>}
   {portal==="manager" ? <><p style={{lineHeight:1.7}}>Here is a quick guide to the main areas. You can reopen the full searchable manual from Help at any time.</p><ul style={{lineHeight:1.9,paddingLeft:"1.25rem"}}><li><strong>Properties & Units:</strong> maintain your portfolio and occupancy records.</li><li><strong>Tenants & Leases:</strong> manage tenant details, tenancy terms and dates.</li><li><strong>Payments & Reconciliation:</strong> record receipts and verify provider transactions.</li><li><strong>Expenses & Maintenance:</strong> track costs, repair requests and follow-ups.</li><li><strong>Settings & Team:</strong> configure your organisation and review staff permissions.</li></ul><p style={{lineHeight:1.6,fontSize:".9rem",opacity:.8}}>Always verify payment destinations and transaction status with the provider. The Platform does not hold rent or pay taxes on your behalf.</p></> : <p style={{lineHeight:1.7}}>Use your dashboard to review your tenancy information, Payments for your ledger, Maintenance to report repairs, Lease for agreement details, Notifications for updates and Profile for your account details.</p>}
   <button type="button" onClick={dismiss} style={{marginTop:".75rem",width:"100%",padding:".9rem 1rem",border:0,borderRadius:12,background:"#2458d3",color:"white",fontWeight:700,cursor:"pointer"}}>Got it, let me continue</button>
  </section>
 </div>}</>;
}
function App() { useEffect(() => { applyTheme(readThemeId(), false); }, []); return <BrowserRouter><Routes>
<Route path="/" element={<LandingPage/>}/><Route path="/help" element={<LegalHelpPage initialTab="help"/>}/><Route path="/terms" element={<LegalHelpPage initialTab="terms"/>}/><Route path="/privacy" element={<LegalHelpPage initialTab="privacy"/>}/><Route path="/manager/help" element={<RequirePortal portal="manager"><LegalHelpPage initialTab="help"/></RequirePortal>}/><Route path="/guest-payment/:token" element={<GuestPaymentPage/>}/><Route path="/login" element={<LoginPage/>}/><Route path="/forgot-password" element={<PasswordResetPage/>}/><Route path="/reset-password" element={<PasswordResetPage/>}/><Route path="/register" element={<RegisterPage/>}/><Route path="/password-setup" element={<RequireAuth><ChangePasswordPage/></RequireAuth>}/><Route path="/accept-invite" element={<AcceptInvitePage/>}/>
<Route path="/manager/dashboard" element={<RequirePortal portal="manager"><FirstLoginGuide portal="manager"><DashboardPage/></FirstLoginGuide></RequirePortal>}/><Route path="/manager/properties/add" element={<RequirePortal portal="manager"><AddProperties/></RequirePortal>}/><Route path="/manager/properties" element={<RequirePortal portal="manager"><ManagerPropertiesPage/></RequirePortal>}/><Route path="/manager/units" element={<RequirePortal portal="manager"><ManagerUnitsPage/></RequirePortal>}/><Route path="/manager/tenants" element={<RequirePortal portal="manager"><ManagerTenantsPage/></RequirePortal>}/><Route path="/manager/leases" element={<RequirePortal portal="manager"><ManagerLeasesPage/></RequirePortal>}/><Route path="/manager/payments" element={<RequirePortal portal="manager"><ManagerPaymentsPage/></RequirePortal>}/><Route path="/manager/reconciliation" element={<RequirePortal portal="manager"><PaymentReconciliationPage/></RequirePortal>}/><Route path="/manager/guest-payment-links" element={<RequirePortal portal="manager"><ManagerGuestPaymentLinksPage/></RequirePortal>}/><Route path="/manager/expenses" element={<RequirePortal portal="manager"><ManagerExpensesPage/></RequirePortal>}/><Route path="/manager/maintenance" element={<RequirePortal portal="manager"><ManagerMaintenancePage/></RequirePortal>}/><Route path="/manager/settings" element={<RequirePortal portal="manager"><ManagerSettingsPage/></RequirePortal>}/><Route path="/manager/settings/team" element={<RequirePortal portal="manager"><TeamPage/></RequirePortal>}/><Route path="/manager/requests" element={<RequirePortal portal="manager"><RequestsPage/></RequirePortal>}/><Route path="/manager/audit-log" element={<RequirePortal portal="manager"><AuditLogPage/></RequirePortal>}/>
<Route path="/tenant/dashboard" element={<RequirePortal portal="tenant"><FirstLoginGuide portal="tenant"><TenantDashboardPage/></FirstLoginGuide></RequirePortal>}/><Route path="/tenant/home" element={<RequirePortal portal="tenant"><MyHomePage/></RequirePortal>}/><Route path="/tenant/payments" element={<RequirePortal portal="tenant"><TenantPaymentsPage/></RequirePortal>}/><Route path="/tenant/maintenance" element={<RequirePortal portal="tenant"><TenantMaintenancePage/></RequirePortal>}/><Route path="/tenant/lease" element={<RequirePortal portal="tenant"><TenantLeasePage/></RequirePortal>}/><Route path="/tenant/notifications" element={<RequirePortal portal="tenant"><TenantNotificationsPage/></RequirePortal>}/><Route path="/tenant/profile" element={<RequirePortal portal="tenant"><TenantProfilePage/></RequirePortal>}/><Route path="/tenant/help" element={<RequirePortal portal="tenant"><TenantHelpPage/></RequirePortal>}/><Route path="/tenant/settings" element={<RequirePortal portal="tenant"><TenantSettingsPage/></RequirePortal>}/>
<Route path="/dashboard" element={<Navigate to="/manager/dashboard" replace/>}/><Route path="/properties/add" element={<Navigate to="/manager/properties/add" replace/>}/><Route path="/tenant" element={<Navigate to="/tenant/dashboard" replace/>}/><Route path="/tenants" element={<Navigate to="/manager/tenants" replace/>}/><Route path="/properties" element={<Navigate to="/manager/properties" replace/>}/><Route path="/units" element={<Navigate to="/manager/units" replace/>}/><Route path="/leases" element={<Navigate to="/manager/leases" replace/>}/><Route path="/payments" element={<Navigate to="/manager/payments" replace/>}/><Route path="/expenses" element={<Navigate to="/manager/expenses" replace/>}/><Route path="/maintenance" element={<Navigate to="/manager/maintenance" replace/>}/><Route path="/settings" element={<Navigate to="/manager/settings" replace/>}/><Route path="/app" element={<RequireAuth><HomeRedirect/></RequireAuth>}/><Route path="/landing" element={<LandingPage/>}/>
</Routes></BrowserRouter>; }
export default App;
