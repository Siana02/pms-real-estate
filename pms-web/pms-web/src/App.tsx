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
import PlatformSubscriptionPage from "./pages/manager/PlatformSubscriptionPage";
import PlatformAdminSubscriptionsPage from "./pages/manager/PlatformAdminSubscriptionsPage";
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
import { API_BASE } from "./services/api";

type Portal = "manager" | "tenant";
const TENANT_ROLES = ["tenant"];
const MANAGER_ROLES = ["admin", "property_manager", "owner", "staff"];
function getToken(): string | null { try { return localStorage.getItem("token") ?? sessionStorage.getItem("token"); } catch { return null; } }
function getRole(): string { try { const raw = localStorage.getItem("user") ?? sessionStorage.getItem("user"); if (!raw) return ""; const parsed: unknown = JSON.parse(raw); if (parsed && typeof parsed === "object") { const role = (parsed as Record<string, unknown>).role; if (typeof role === "string") return role.trim().toLowerCase(); } } catch {} return ""; }
function mustChangePassword(): boolean { try { const raw = localStorage.getItem("user") ?? sessionStorage.getItem("user"); if (!raw) return false; const parsed: unknown = JSON.parse(raw); return !!(parsed && typeof parsed === "object" && (parsed as Record<string, unknown>).must_change_password === true); } catch { return false; } }
function portalForRole(role: string): Portal { if (TENANT_ROLES.includes(role)) return "tenant"; if (MANAGER_ROLES.includes(role)) return "manager"; return "manager"; }
function homePath(): string { return getRole() === "platform_admin" ? "/platform-admin/subscriptions" : portalForRole(getRole()) === "tenant" ? "/tenant/dashboard" : "/manager/dashboard"; }
function RequireAuth({ children }: { children: ReactNode }) { return getToken() ? <>{children}</> : <Navigate to="/login" replace />; }
function RequirePortal({ portal, children, allowUnsubscribed = false }: { portal: Portal; children: ReactNode; allowUnsubscribed?: boolean }) {
 const [subscriptionAccess, setSubscriptionAccess] = useState<"checking" | "active" | "required" | "feature_blocked" | "error">(allowUnsubscribed ? "active" : "checking");
 const currentPath = window.location.pathname;
 useEffect(() => {
  if (allowUnsubscribed || !getToken()) return;
  let cancelled = false;
  const token = getToken();
  fetch(API_BASE + "/platform-subscription/status", { headers: { Accept: "application/json", Authorization: "Bearer " + token } })
   .then(async response => {
    if (!response.ok) throw new Error("Unable to verify the organization subscription.");
    return response.json() as Promise<{ subscription?: { status?: string; current_period_ends_at?: string | null } | null; features?: string[] }>;
   })
   .then(payload => {
    const subscription = payload.subscription;
    const active = subscription?.status === "active" && !!subscription.current_period_ends_at && new Date(subscription.current_period_ends_at).getTime() > Date.now();
    const requiredFeature = portal === "tenant" ? "tenant_portal" :
      currentPath === "/manager/guest-payment-links" ? "tenant_payment_links" :
      currentPath === "/manager/payments" ? "payment_ledger" :
      ["/manager/maintenance", "/manager/requests", "/manager/settings/team", "/manager/audit-log"].includes(currentPath) ? "premium_operations" : null;
    const hasFeature = !requiredFeature || (payload.features ?? []).includes(requiredFeature);
    if (!cancelled) setSubscriptionAccess(!active ? "required" : hasFeature ? "active" : "feature_blocked");
   })
   .catch(() => { if (!cancelled) setSubscriptionAccess("error"); });
  return () => { cancelled = true; };
 }, [portal, allowUnsubscribed, currentPath]);
 if (!getToken()) return <Navigate to="/login" replace />;
 if (portalForRole(getRole()) !== portal) return <Navigate to={homePath()} replace />;
 if (mustChangePassword()) return <Navigate to="/password-setup" replace />;
 if (portal === "manager" && allowUnsubscribed) return <>{children}</>;
 if (subscriptionAccess === "checking") return <div style={{minHeight:"50vh",display:"grid",placeItems:"center",padding:24,color:"var(--pms-text,#fff)"}}>Checking organization subscription…</div>;
 if (subscriptionAccess === "feature_blocked") return <div style={{maxWidth:640,margin:"12vh auto",padding:24,color:"var(--pms-text,#fff)"}}><h1>This feature is not included</h1><p>{portal === "tenant" ? "Your property manager’s current plan does not include tenant portal access. You do not need to pay anything. Please contact your property manager." : "Your organization can keep using the features included in its active subscription. Contact platform support to discuss a tier change or a negotiated rate."}</p>{portal === "manager" && <a href="/manager/subscription" style={{display:"inline-block",marginTop:10,padding:"10px 14px",borderRadius:10,background:"var(--pms-accent,#3b82f6)",color:"#fff",textDecoration:"none",fontWeight:800}}>View subscription</a>}</div>;
 if (subscriptionAccess === "error") return <div style={{maxWidth:620,margin:"12vh auto",padding:24,color:"var(--pms-text,#fff)"}}><h2>Subscription status unavailable</h2><p>We could not verify the organization’s subscription, so this page is temporarily locked. Check your connection and try again.</p><button type="button" onClick={()=>window.location.reload()}>Try again</button></div>;
 if (subscriptionAccess === "required") {
  if (portal === "manager") return <Navigate to="/manager/subscription" replace />;
  return <div style={{maxWidth:640,margin:"12vh auto",padding:24,color:"var(--pms-text,#fff)"}}><h1>Tenant access temporarily unavailable</h1><p>Your property manager’s platform subscription is not active at the moment. You do not need to pay a platform subscription. Please contact your property manager for an update.</p></div>;
 }
 return <>{children}</>;
}
function HomeRedirect() { return <Navigate to={homePath()} replace />; }
type TourStep = { title: string; body: string; targets: string[] };

function FirstLoginGuide({ portal, children }: { portal: Portal; children: ReactNode }) {
 const [visible, setVisible] = useState(false);
 const [usernameNotice, setUsernameNotice] = useState(false);
 const [user, setUser] = useState<Record<string, unknown>>({});
 const [stepIndex, setStepIndex] = useState(0);
 const [spotlight, setSpotlight] = useState<{top:number;left:number;width:number;height:number}|null>(null);

 useEffect(() => {
  let hideTimer: number | undefined;
  try {
   const raw = localStorage.getItem("user") ?? sessionStorage.getItem("user");
   const current = raw ? JSON.parse(raw) as Record<string, unknown> : {};
   setUser(current);
   const identity = String(current.id ?? current.email ?? portal);
   const usernameKey = "pms:username-notice:" + identity;
   if (typeof current.username === "string" && current.username && localStorage.getItem(usernameKey) !== "done") {
    setUsernameNotice(true);
    localStorage.setItem(usernameKey, "done");
    hideTimer = window.setTimeout(() => setUsernameNotice(false), 7500);
   }
   const key = "pms:first-login-guide:v2:" + identity;
   if (localStorage.getItem(key) !== "done") setVisible(true);
  } catch { setVisible(false); }
  return () => { if (hideTimer) window.clearTimeout(hideTimer); };
 }, [portal]);

 const role = String(user.role ?? "").toLowerCase();
 const managerSteps: TourStep[] = [
  { title: "Dashboard", body: "Start here for a high-level view of your portfolio, occupancy, tasks and recent activity.", targets: ["/manager/dashboard"] },
  { title: "Properties", body: "Add and maintain the properties your organisation manages. Keep addresses and property details accurate.", targets: ["/manager/properties"] },
  { title: "Units", body: "Create and update individual units, their rent details, availability and occupancy status.", targets: ["/manager/units"] },
  { title: "Tenants", body: "Review tenant records, contact details and registration or tenancy status.", targets: ["/manager/tenants"] },
  { title: "Leases", body: "Create and review tenancy agreements, dates, rent terms and deposits. Check the correct unit and tenant before saving.", targets: ["/manager/leases"] },
  { title: "Payments", body: "Review rent receipts and payment records. Confirm provider references and payment status before treating a payment as received.", targets: ["/manager/payments"] },
  { title: "Reconciliation", body: "Match incoming provider transactions to the right tenant or lease, investigate unmatched payments and resolve exceptions carefully.", targets: ["/manager/reconciliation"] },
  { title: "Tenant payment links", body: "Create and manage shareable payment links. Verify the organisation's configured PayBill or Till and amount before sharing a link.", targets: ["/manager/guest-payment-links"] },
  { title: "Billing & subscriptions", body: "Manage your organization’s platform plan, monthly unit-based fee, payment references and subscription status. Property maintenance costs are handled by landlords or tenants, not recorded as manager expenses.", targets: ["/manager/expenses"] },
  { title: "Maintenance and requests", body: "Use Maintenance to follow repairs and service issues. Requests is where staff or operational requests can be reviewed and actioned.", targets: ["/manager/maintenance", "/manager/requests"] },
  ...(role === "owner" || role === "admin" ? [{ title: "Audit log", body: "Review the recorded activity trail for accountability. Use it to investigate changes and understand who performed an action.", targets: ["/manager/audit-log"] }] : []),
  { title: "Settings and team", body: "Configure organisation preferences, payment destinations and theme. Owners/admins can manage staff access and permissions here.", targets: ["/manager/settings"] },
 ];
 const tenantSteps: TourStep[] = [
  { title: "Your dashboard", body: "Start here for your tenancy overview, reminders and recent updates.", targets: [] },
  { title: "Your home", body: "Review the property and unit details associated with your tenancy.", targets: [] },
  { title: "Payments", body: "Review your rent ledger and payment history. If you pay through a provider, keep the confirmation reference.", targets: [] },
  { title: "Lease", body: "Find your lease details and available agreement documents.", targets: [] },
  { title: "Maintenance", body: "Report a repair or maintenance issue and follow its status.", targets: [] },
  { title: "Notifications", body: "Check updates about your tenancy, payments, lease and maintenance requests.", targets: [] },
  { title: "Profile and settings", body: "Keep your contact details current and manage account preferences and appearance.", targets: [] },
  { title: "Help centre", body: "Use Help when you need guidance on payments, lease information, maintenance or how to use the portal.", targets: [] },
 ];
 const steps = portal === "manager" ? managerSteps : tenantSteps;
 const safeStepIndex = Math.min(stepIndex, steps.length - 1);
 const currentStep = steps[safeStepIndex] ?? steps[0];

 useEffect(() => {
  if (!visible || portal !== "manager" || !currentStep?.targets.length) {
   setSpotlight(null);
   return;
  }
  let timer: number | undefined;
  const locate = () => {
   const nodes = currentStep.targets.flatMap(target =>
    Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`))
   );
   const visibleNodes = nodes.filter(node => {
    const rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.left < window.innerWidth;
   });
   if (!visibleNodes.length) { setSpotlight(null); return; }
   const rects = visibleNodes.map(node => node.getBoundingClientRect());
   const left = Math.min(...rects.map(rect => rect.left));
   const top = Math.min(...rects.map(rect => rect.top));
   const right = Math.max(...rects.map(rect => rect.right));
   const bottom = Math.max(...rects.map(rect => rect.bottom));
   setSpotlight({left,top,width:right-left,height:bottom-top});
  };
  // Reveal the current sidebar destination before measuring it. This scrolls
  // the nearest navigation scroller, keeping later items such as Audit log visible.
  const revealTarget = () => {
   const firstTarget = currentStep.targets
    .map(target => document.querySelector<HTMLElement>('[data-tour="' + target + '"]'))
    .find((node): node is HTMLElement => Boolean(node));
   firstTarget?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  };
  if (window.innerWidth < 1024) {
   window.dispatchEvent(new CustomEvent("pms:open-manager-nav"));
   timer = window.setTimeout(() => {
    revealTarget();
    timer = window.setTimeout(locate, 300);
   }, 180);
  } else {
   revealTarget();
   timer = window.setTimeout(locate, 300);
  }
  window.addEventListener("resize", locate);
  window.addEventListener("scroll", locate, true);
  return () => {
   if (timer) window.clearTimeout(timer);
   window.removeEventListener("resize", locate);
   window.removeEventListener("scroll", locate, true);
  };
 }, [visible, portal, safeStepIndex, role]);

 function markComplete() {
  try {
   localStorage.setItem("pms:first-login-guide:v2:" + String(user.id ?? user.email ?? portal), "done");
  } catch {}
  setVisible(false);
  setSpotlight(null);
  window.dispatchEvent(new CustomEvent("pms:close-manager-nav"));
 }
 function connectGoogle() {
  const backendOrigin = API_BASE.replace(/\/api\/?$/, "");
  window.location.href = `${backendOrigin}/auth/google/redirect?mode=login`;
 }
 const cardHeight = Math.min(620, window.innerHeight * 0.78);
 const cardTop = spotlight ? Math.max(12, Math.min(spotlight.top, window.innerHeight - cardHeight - 24)) : undefined;
 const cardLeft = spotlight && spotlight.left + spotlight.width + 18 < window.innerWidth - 330
  ? spotlight.left + spotlight.width + 18 : undefined;

 return <>{children}
  {usernameNotice && typeof user.username === "string" && <div role="status" aria-live="polite" style={{position:"fixed",top:"1rem",right:"1rem",zIndex:10002,width:"min(92vw,360px)",padding:"1rem 1.1rem",borderRadius:14,background:"var(--pms-surface,#102a43)",color:"var(--pms-text,#fff)",border:"1px solid var(--pms-border,transparent)",boxShadow:"0 12px 36px #0004",lineHeight:1.55}}><strong style={{display:"block",marginBottom:".2rem"}}>Your username: @{user.username}</strong><span style={{fontSize:".88rem"}}>You can find it again in your profile or account settings.</span><button type="button" onClick={()=>setUsernameNotice(false)} aria-label="Dismiss username notice" style={{float:"right",marginTop:".45rem",padding:".2rem .5rem",border:"1px solid currentColor",borderRadius:8,color:"inherit",background:"transparent",cursor:"pointer"}}>Dismiss</button></div>}
  {visible && currentStep && <div role="dialog" aria-modal="true" aria-labelledby="pms-first-guide-title" style={{position:"fixed",inset:0,zIndex:10000,background:"rgba(4,10,20,.58)",padding:"1rem"}}>
   {spotlight && <div aria-hidden="true" style={{position:"fixed",top:spotlight.top-5,left:spotlight.left-5,width:spotlight.width+10,height:spotlight.height+10,zIndex:10001,border:"2px solid #8ab4ff",borderRadius:12,boxShadow:"0 0 0 9999px rgba(4,10,20,.66),0 0 0 5px rgba(138,180,255,.2)",pointerEvents:"none",transition:"all .18s ease"}}/>}
   <section style={{position:"fixed",top:window.innerWidth<1024?"auto":cardTop ?? "50%",bottom:window.innerWidth<1024?"calc(1rem + env(safe-area-inset-bottom))":undefined,left:cardLeft ?? "50%",transform:window.innerWidth<1024?"translateX(-50%)":cardTop===undefined?"translate(-50%,-50%)":cardLeft===undefined?"translateX(-50%)":"none",width:"min(360px,calc(100vw - 32px))",maxHeight:window.innerWidth<1024?"min(42vh,340px)":"min(78vh,620px)",overflowY:"auto",background:"var(--pms-surface,#111f31)",color:"var(--pms-text,#f8fafc)",border:"1px solid var(--pms-border,rgba(255,255,255,.18))",borderRadius:20,padding:"1.2rem",boxShadow:"0 24px 80px rgba(0,0,0,.48)",zIndex:10002}}>
    <p style={{margin:"0 0 .35rem",fontSize:".72rem",fontWeight:800,letterSpacing:".12em",textTransform:"uppercase",color:"var(--pms-accent,#8ab4ff)"}}>{portal==="manager"?"Manager workspace tour":"Tenant portal tour"} · {safeStepIndex+1} of {steps.length}</p>
    <h2 id="pms-first-guide-title" style={{margin:"0 0 .6rem",fontSize:"1.35rem",lineHeight:1.25,color:"var(--pms-heading,#fff)"}}>{safeStepIndex===0 ? (portal==="manager"?"Welcome to your property workspace":"Welcome to your tenant portal") : currentStep.title}</h2>
    <p style={{margin:"0 0 .85rem",lineHeight:1.65,fontSize:".92rem",color:"var(--pms-text,#f8fafc)"}}>{currentStep.body}</p>
    {portal==="manager" && safeStepIndex===0 && user.google_connected !== true && <div style={{padding:".85rem",marginBottom:".9rem",borderRadius:12,border:"1px solid var(--pms-border,rgba(255,255,255,.18))",background:"var(--pms-glass,rgba(255,255,255,.05))"}}>
     <strong style={{display:"block",fontSize:".86rem",marginBottom:".3rem"}}>Make sign-in easier with Google</strong>
     <p style={{margin:"0 0 .65rem",fontSize:".8rem",lineHeight:1.5,color:"var(--pms-muted,#bdc8d7)"}}>Connect using the Google account that has the same email as this profile. If you already signed in with Google, you can skip this.</p>
     <button type="button" onClick={connectGoogle} style={{width:"100%",padding:".7rem .8rem",border:"1px solid var(--pms-border,rgba(255,255,255,.2))",borderRadius:10,background:"var(--pms-glass-strong,rgba(255,255,255,.08))",color:"var(--pms-text,#fff)",fontWeight:750,cursor:"pointer"}}>Connect Google sign-in</button>
    </div>}
    {portal==="tenant" && safeStepIndex===0 && user.google_connected !== true && <div style={{padding:".85rem",marginBottom:".9rem",borderRadius:12,border:"1px solid var(--pms-border,rgba(255,255,255,.18))",background:"var(--pms-glass,rgba(255,255,255,.05))"}}>
     <strong style={{display:"block",fontSize:".86rem",marginBottom:".3rem"}}>Make sign-in easier with Google</strong>
     <p style={{margin:"0 0 .65rem",fontSize:".8rem",lineHeight:1.5,color:"var(--pms-muted,#bdc8d7)"}}>Use the Google account with the same email as this profile. If you already use Google to sign in, continue the tour.</p>
     <button type="button" onClick={connectGoogle} style={{width:"100%",padding:".7rem .8rem",border:"1px solid var(--pms-border,rgba(255,255,255,.2))",borderRadius:10,background:"var(--pms-glass-strong,rgba(255,255,255,.08))",color:"var(--pms-text,#fff)",fontWeight:750,cursor:"pointer"}}>Connect Google sign-in</button>
    </div>}
    {portal==="manager" && spotlight && <p style={{margin:"0 0 .8rem",fontSize:".75rem",fontWeight:700,color:"var(--pms-accent,#8ab4ff)"}}>↖ Look at the highlighted sidebar item</p>}
    <div style={{display:"flex",gap:".55rem",justifyContent:"space-between",alignItems:"center",marginTop:".75rem"}}>
     <button type="button" onClick={markComplete} style={{padding:".65rem .75rem",border:"1px solid var(--pms-border,rgba(255,255,255,.2))",borderRadius:10,background:"transparent",color:"var(--pms-muted,#bdc8d7)",fontSize:".8rem",cursor:"pointer"}}>Skip tour</button>
     <div style={{display:"flex",gap:".5rem"}}>
      {safeStepIndex>0 && <button type="button" onClick={()=>setStepIndex(value=>Math.max(0,value-1))} style={{padding:".65rem .8rem",border:"1px solid var(--pms-border,rgba(255,255,255,.2))",borderRadius:10,background:"transparent",color:"var(--pms-text,#fff)",fontWeight:700,cursor:"pointer"}}>Back</button>}
      <button type="button" onClick={()=>safeStepIndex===steps.length-1?markComplete():setStepIndex(value=>Math.min(steps.length-1,value+1))} style={{padding:".65rem .9rem",border:0,borderRadius:10,background:"var(--pms-accent,#3b82f6)",color:"#fff",fontWeight:800,cursor:"pointer"}}>{safeStepIndex===steps.length-1?"Finish tour":"Next"}</button>
     </div>
    </div>
   </section>
  </div>}
 </>;
}
function App() { useEffect(() => { applyTheme(readThemeId(), false); }, []); return <BrowserRouter><Routes>
<Route path="/" element={<LandingPage/>}/><Route path="/help" element={<LegalHelpPage initialTab="help"/>}/><Route path="/terms" element={<LegalHelpPage initialTab="terms"/>}/><Route path="/privacy" element={<LegalHelpPage initialTab="privacy"/>}/><Route path="/manager/help" element={<RequirePortal portal="manager"><LegalHelpPage initialTab="help"/></RequirePortal>}/><Route path="/guest-payment/:token" element={<GuestPaymentPage/>}/><Route path="/login" element={<LoginPage/>}/><Route path="/forgot-password" element={<PasswordResetPage/>}/><Route path="/reset-password" element={<PasswordResetPage/>}/><Route path="/register" element={<RegisterPage/>}/><Route path="/password-setup" element={<RequireAuth><ChangePasswordPage/></RequireAuth>}/><Route path="/accept-invite" element={<AcceptInvitePage/>}/>
<Route path="/platform-admin/subscriptions" element={<RequireAuth><PlatformAdminSubscriptionsPage/></RequireAuth}/><Route path="/manager/subscription" element={<RequirePortal portal="manager" allowUnsubscribed><PlatformSubscriptionPage/></RequirePortal>}/><Route path="/manager/dashboard" element={<RequirePortal portal="manager"><FirstLoginGuide portal="manager"><DashboardPage/></FirstLoginGuide></RequirePortal>}/><Route path="/manager/properties/add" element={<RequirePortal portal="manager"><AddProperties/></RequirePortal>}/><Route path="/manager/properties" element={<RequirePortal portal="manager"><ManagerPropertiesPage/></RequirePortal>}/><Route path="/manager/units" element={<RequirePortal portal="manager"><ManagerUnitsPage/></RequirePortal>}/><Route path="/manager/tenants" element={<RequirePortal portal="manager"><ManagerTenantsPage/></RequirePortal>}/><Route path="/manager/leases" element={<RequirePortal portal="manager"><ManagerLeasesPage/></RequirePortal>}/><Route path="/manager/payments" element={<RequirePortal portal="manager"><ManagerPaymentsPage/></RequirePortal>}/><Route path="/manager/reconciliation" element={<RequirePortal portal="manager"><PaymentReconciliationPage/></RequirePortal>}/><Route path="/manager/guest-payment-links" element={<RequirePortal portal="manager"><ManagerGuestPaymentLinksPage/></RequirePortal>}/><Route path="/manager/expenses" element={<RequirePortal portal="manager" allowUnsubscribed><PlatformSubscriptionPage/></RequirePortal>}/><Route path="/manager/maintenance" element={<RequirePortal portal="manager"><ManagerMaintenancePage/></RequirePortal>}/><Route path="/manager/settings" element={<RequirePortal portal="manager"><ManagerSettingsPage/></RequirePortal>}/><Route path="/manager/settings/team" element={<RequirePortal portal="manager"><TeamPage/></RequirePortal>}/><Route path="/manager/requests" element={<RequirePortal portal="manager"><RequestsPage/></RequirePortal>}/><Route path="/manager/audit-log" element={<RequirePortal portal="manager"><AuditLogPage/></RequirePortal>}/>
<Route path="/tenant/dashboard" element={<RequirePortal portal="tenant"><FirstLoginGuide portal="tenant"><TenantDashboardPage/></FirstLoginGuide></RequirePortal>}/><Route path="/tenant/home" element={<RequirePortal portal="tenant"><MyHomePage/></RequirePortal>}/><Route path="/tenant/payments" element={<RequirePortal portal="tenant"><TenantPaymentsPage/></RequirePortal>}/><Route path="/tenant/maintenance" element={<RequirePortal portal="tenant"><TenantMaintenancePage/></RequirePortal>}/><Route path="/tenant/lease" element={<RequirePortal portal="tenant"><TenantLeasePage/></RequirePortal>}/><Route path="/tenant/notifications" element={<RequirePortal portal="tenant"><TenantNotificationsPage/></RequirePortal>}/><Route path="/tenant/profile" element={<RequirePortal portal="tenant"><TenantProfilePage/></RequirePortal>}/><Route path="/tenant/help" element={<RequirePortal portal="tenant"><TenantHelpPage/></RequirePortal>}/><Route path="/tenant/settings" element={<RequirePortal portal="tenant"><TenantSettingsPage/></RequirePortal>}/>
<Route path="/dashboard" element={<Navigate to="/manager/dashboard" replace/>}/><Route path="/properties/add" element={<Navigate to="/manager/properties/add" replace/>}/><Route path="/tenant" element={<Navigate to="/tenant/dashboard" replace/>}/><Route path="/tenants" element={<Navigate to="/manager/tenants" replace/>}/><Route path="/properties" element={<Navigate to="/manager/properties" replace/>}/><Route path="/units" element={<Navigate to="/manager/units" replace/>}/><Route path="/leases" element={<Navigate to="/manager/leases" replace/>}/><Route path="/payments" element={<Navigate to="/manager/payments" replace/>}/><Route path="/expenses" element={<Navigate to="/manager/expenses" replace/>}/><Route path="/maintenance" element={<Navigate to="/manager/maintenance" replace/>}/><Route path="/settings" element={<Navigate to="/manager/settings" replace/>}/><Route path="/app" element={<RequireAuth><HomeRedirect/></RequireAuth>}/><Route path="/landing" element={<LandingPage/>}/>
</Routes></BrowserRouter>; }
export default App;
