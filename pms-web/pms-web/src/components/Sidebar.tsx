import { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Banknote,
  WalletCards,
  Link2,
  Building2,
  DoorOpen,
  ClipboardList,
  ShieldCheck,
  FileText,
  LayoutDashboard,
  LogOut,
  Receipt,
  Settings,
  Users,
  Wrench,
  LifeBuoy,
} from "lucide-react";
 
/* ------------------------------------------------------------------ */
/*  STYLES — vanilla CSS                                               */
/* ------------------------------------------------------------------ */
 
const styles = `
.sb {
  --sb-glass: rgba(255, 255, 255, 0.05);
  --sb-border: rgba(255, 255, 255, 0.1);
  --sb-border-soft: rgba(255, 255, 255, 0.06);
  --sb-muted: #94a3b8;
  --sb-faint: #64748b;
  --sb-blue: #3b82f6;
  --sb-indigo: #4f46e5;
  --sb-danger: #f87171;
  --sb-radius-sm: 0.75rem;
  --sb-radius-md: 1rem;
 
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 100%;
  padding: 1.25rem 1rem;
  color: #f8fafc;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Inter,
    Roboto, "Helvetica Neue", Arial, sans-serif;
  letter-spacing: -0.015em;
}
 
.sb,
.sb * {
  box-sizing: border-box;
}
 
.sb a {
  color: inherit;
  text-decoration: none;
}
 
.sb button {
  font-family: inherit;
  color: inherit;
  border: none;
  background: none;
  cursor: pointer;
}
 
.sb a:focus-visible,
.sb button:focus-visible {
  outline: 2px solid var(--sb-blue);
  outline-offset: 2px;
}
 
/* ---------- brand / large organization logo ---------- */
.sb-brand {
  display: block;
  width: 100%;
}
 
.sb-brand__mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 7rem;
  overflow: hidden;
  border: 1px solid var(--sb-border);
  border-radius: var(--sb-radius-md);
  background: #f6f7f7;
  color: #315f8a;
}
 
.sb-brand__mark svg {
  width: 2rem;
  height: 2rem;
}
 
.sb-brand__mark img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  background: #fff;
}
 
/* ---------- org card ---------- */
.sb-org {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1rem;
  padding: 0.8rem 0;
  border: 0;
  border-bottom: 1px solid #e6e9eb;
  border-radius: 0;
  background: transparent;
}
 
.sb-org__avatar {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 2.15rem;
  height: 2.15rem;
  overflow: hidden;
  border: 1px solid #dfe4e8;
  border-radius: 50%;
  background: #f1f4f6;
  color: #536779;
}
 
.sb-org__avatar img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  background: #fff;
}
 
.sb-org__body {
  min-width: 0;
}
 
.sb-org__label {
  margin: 0;
  font-size: 0.58rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: #98a1aa;
}
 
.sb-org__name,
.sb-org__email {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
 
.sb-org__name {
  margin: 0.1875rem 0 0;
  font-size: 0.78rem;
  font-weight: 600;
  color: #34404c;
}
 
.sb-org__email {
  margin: 0.125rem 0 0;
  font-size: 0.68rem;
  color: #929ca5;
}
 
/* ---------- nav ---------- */
.sb-nav {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1.05rem;
  margin-top: 1.2rem;
  overflow-y: auto;
}
 
.sb-nav__group { display:flex; flex-direction:column; gap:.08rem; }
.sb-nav__label {
  margin: 0 0 0.4rem 0.7rem;
  font-size: 0.57rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: #9aa2aa;
}
 
.sb-link {
  position: relative;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 2.5rem;
  padding: 0.55rem 0.7rem;
  border: 0;
  border-radius: 0;
  font-size: 0.82rem;
  font-weight: 550;
  color: #34404c !important;
  opacity: 1 !important;
  visibility: visible !important;
  transition: color 0.2s ease, background-color 0.2s ease,
    border-color 0.2s ease;
}
 
.sb-link svg {
  width: 1rem;
  height: 1rem;
  flex: none;
  color: #6f7b86 !important;
  opacity: 1 !important;
  visibility: visible !important;
}
 
.sb-link:hover {
  color: #172b3f !important;
  background: #f6f7f7;
}
 
.sb-link--active {
  position: relative;
  border: 0;
  background: #f5f7f8;
  color: #172b3f !important;
  opacity: 1 !important;
  visibility: visible !important;
  font-weight: 650;
}
 
.sb-link--active svg {
  color: #315f8a !important;
  opacity: 1 !important;
}
 
.sb-link--active::before {
  content: "";
  position: absolute;
  top: 50%;
  left: -1rem;
  width: 2px;
  height: 1.35rem;
  transform: translateY(-50%);
  border-radius: 0;
  background: #315f8a;
}
 
/* ---------- footer ---------- */
.sb-foot {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding-top: 1rem;
  margin-top: 1rem;
  border-top: 1px solid #e7eaec;
}
 
.sb-link--danger {
  color: #34404c !important;
  opacity: 1 !important;
  visibility: visible !important;
}

.sb-link--danger:hover {
  color: #82463f !important;
  background: #f8efed;
}
 
@media (prefers-reduced-motion: reduce) {
  .sb *,
  .sb *::before {
    transition-duration: 0.001ms !important;
  }
}
`;
 
/* ------------------------------------------------------------------ */
/*  DATA & HELPERS                                                     */
/* ------------------------------------------------------------------ */
 
const NAV_GROUPS = [
  { label: "Overview", items: [
    { label: "Dashboard", to: "/manager/dashboard", icon: LayoutDashboard },
  ]},
  { label: "Portfolio", items: [
    { label: "Properties", to: "/manager/properties", icon: Building2 },
    { label: "Units", to: "/manager/units", icon: DoorOpen },
    { label: "Tenants", to: "/manager/tenants", icon: Users },
    { label: "Leases", to: "/manager/leases", icon: FileText },
  ]},
  { label: "Money", items: [
    { label: "Payments", to: "/manager/payments", icon: Banknote },
    { label: "Reconciliation", to: "/manager/reconciliation", icon: WalletCards },
    { label: "Tenant payment links", to: "/manager/guest-payment-links", icon: Link2 },
  ]},
  { label: "Operations", items: [
    { label: "Expenses", to: "/manager/expenses", icon: Receipt },
    { label: "Maintenance", to: "/manager/maintenance", icon: Wrench },
    { label: "Requests", to: "/manager/requests", icon: ClipboardList },
  ]},
];
 
interface Organization {
  id?: number;
  name?: string;
  logo_url?: string | null;
}
 
interface User {
  name?: string;
  email?: string;
  role?: string;
}
 
function readStored<T>(key: string): T {
  try {
    const raw = localStorage.getItem(key) ?? sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : ({} as T);
  } catch {
    return {} as T;
  }
}
 
function initials(value: string): string {
  const parts = value.trim().split(/\\s+/).filter(Boolean);
  if (parts.length === 0) return "PM";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
 
function linkClass({ isActive }: { isActive: boolean }): string {
  return `sb-link${isActive ? " sb-link--active" : ""}`;
}
 
/* ------------------------------------------------------------------ */
/*  COMPONENT                                                          */
/* ------------------------------------------------------------------ */
 
function Sidebar() {
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<Organization>(() =>
    readStored<Organization>("organization")
  );
  const user = useMemo(() => readStored<User>("user"), []);
 
  const orgName = organization.name || "Your organization";
  const isOwner = user.role === "admin" || user.role === "owner";
 
  useEffect(() => {
    function refreshOrganization() {
      setOrganization(readStored<Organization>("organization"));
    }

    window.addEventListener("pms:organization", refreshOrganization);
    return () => window.removeEventListener("pms:organization", refreshOrganization);
  }, []);
 
  function handleSignOut() {
    localStorage.removeItem("token");
    localStorage.removeItem("organization");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("organization");
    sessionStorage.removeItem("user");
    navigate("/login");
  }
 
  return (
    <div className="sb">
      <style>{styles}</style>
 
      <div className="sb-brand" aria-label="Organization logo">
        <span className="sb-brand__mark">
          {organization.logo_url ? (
            <img src={organization.logo_url} alt={`${orgName} logo`} />
          ) : (
            <Building2 aria-hidden="true" />
          )}
        </span>
      </div>
 
      <div className="sb-org">
        <span className="sb-org__avatar" aria-hidden="true">
          {organization.logo_url ? (
            <img src={organization.logo_url} alt="" />
          ) : (
            initials(orgName)
          )}
        </span>
        <div className="sb-org__body">
          <p className="sb-org__label">Organization</p>
          <p className="sb-org__name" title={orgName}>
            {orgName}
          </p>
          {user.email && (
            <p className="sb-org__email" title={user.email}>
              {user.email}
            </p>
          )}
        </div>
      </div>
 
      <nav className="sb-nav" aria-label="Main">
        {NAV_GROUPS.map((group) => (
          <section className="sb-nav__group" key={group.label} aria-label={group.label}>
            <p className="sb-nav__label">{group.label}</p>
            {group.items.map(({ label, to, icon: Icon }) => (
              <NavLink key={label} to={to} className={linkClass} data-tour={to}>
                <Icon />
                <span>{label}</span>
              </NavLink>
            ))}
          </section>
        ))}
        {isOwner && (
          <section className="sb-nav__group" aria-label="Governance">
            <p className="sb-nav__label">Governance</p>
            <NavLink to="/manager/audit-log" className={linkClass} data-tour="/manager/audit-log">
              <ShieldCheck />
              <span>Audit log</span>
            </NavLink>
          </section>
        )}
      </nav>
 
      <div className="sb-foot">
        <NavLink to="/manager/help" className={linkClass}>
          <LifeBuoy />
          Help centre
        </NavLink>
        <NavLink to="/terms" className={linkClass}>
          <FileText />
          Terms of service
        </NavLink>
        <NavLink to="/privacy" className={linkClass}>
          <ShieldCheck />
          Privacy policy
        </NavLink>
        <NavLink to="/settings" className={linkClass}>
          <Settings />
          Settings
        </NavLink>
 
        <button
          type="button"
          className="sb-link sb-link--danger"
          onClick={handleSignOut}
        >
          <LogOut />
          Sign out
        </button>
      </div>
    </div>
  );
}
 
export default Sidebar;
