import { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Banknote,
  Building2,
  DoorOpen,
  FileText,
  LayoutDashboard,
  LogOut,
  Receipt,
  Settings,
  Users,
  Wrench,
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
 
/* ---------- brand ---------- */
.sb-brand {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}
 
.sb-brand__mark {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: var(--sb-radius-sm);
  border: 1px solid var(--sb-border);
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.3),
    rgba(79, 70, 229, 0.3)
  );
  color: #bfdbfe;
}
 
.sb-brand__mark svg {
  width: 1.125rem;
  height: 1.125rem;
}

.sb-brand__mark img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 50%;
  background: #fff;
}
 
.sb-brand__name {
  font-size: 1.0625rem;
  font-weight: 600;
  color: #fff;
}
 
.sb-brand__name span {
  color: var(--sb-blue);
}
 
/* ---------- org card ---------- */
.sb-org {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1.25rem;
  padding: 0.875rem;
  border-radius: var(--sb-radius-md);
  border: 1px solid var(--sb-border-soft);
  background: var(--sb-glass);
}
 
.sb-org__avatar {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--sb-radius-sm);
  border: 1px solid var(--sb-border);
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.28),
    rgba(79, 70, 229, 0.28)
  );
  font-size: 0.8125rem;
  font-weight: 600;
  color: #dbeafe;
}
 
.sb-org__body {
  min-width: 0;
}
 
.sb-org__label {
  margin: 0;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--sb-faint);
}
 
.sb-org__name,
.sb-org__email {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
 
.sb-org__name {
  margin: 0.1875rem 0 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #fff;
}
 
.sb-org__email {
  margin: 0.125rem 0 0;
  font-size: 0.75rem;
  color: var(--sb-muted);
}
 
/* ---------- nav ---------- */
.sb-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 1.25rem;
  overflow-y: auto;
}
 
.sb-nav__label {
  margin: 0 0 0.375rem 0.75rem;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--sb-faint);
}
 
.sb-link {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 2.75rem;
  padding: 0.625rem 0.75rem;
  border-radius: var(--sb-radius-sm);
  border: 1px solid transparent;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--sb-muted);
  transition: color 0.2s ease, background-color 0.2s ease,
    border-color 0.2s ease;
}
 
.sb-link svg {
  width: 1.125rem;
  height: 1.125rem;
  flex: none;
}
 
.sb-link:hover {
  color: #e2e8f0;
  background: var(--sb-glass);
}
 
.sb-link--active {
  color: #fff;
  border-color: rgba(59, 130, 246, 0.35);
  background: linear-gradient(
    90deg,
    rgba(59, 130, 246, 0.22),
    rgba(79, 70, 229, 0.12)
  );
}
 
.sb-link--active svg {
  color: #93c5fd;
}
 
.sb-link--active::before {
  content: "";
  position: absolute;
  top: 50%;
  left: -1rem;
  width: 3px;
  height: 1.5rem;
  transform: translateY(-50%);
  border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, var(--sb-blue), var(--sb-indigo));
}
 
/* ---------- footer ---------- */
.sb-foot {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding-top: 1rem;
  margin-top: 1rem;
  border-top: 1px solid var(--sb-border-soft);
}
 
.sb-link--danger:hover {
  color: #fecaca;
  background: rgba(127, 29, 29, 0.28);
}
 
.sb-link--danger:hover svg {
  color: var(--sb-danger);
}
 
@media (prefers-reduced-motion: reduce) {
  .sb *,
  .sb *::before {
    transition-duration: 0.001ms !important;
  }
}

/* LUXURY SIDEBAR OVERRIDE — appended after legacy sidebar rules. */
.sb{padding:1.65rem 1rem!important;color:#26313c!important;background:#fff!important;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif!important;letter-spacing:0!important}
.sb-brand__mark{width:2.25rem!important;height:2.25rem!important;border:1px solid #dfe4e8!important;border-radius:50%!important;background:#f1f4f6!important;color:#315f8a!important;overflow:hidden!important}
.sb-brand__name{font-size:.82rem!important;color:#18202a!important;letter-spacing:.02em!important}
.sb-brand__name span{color:#315f8a!important}
.sb-org{margin-top:2rem!important;padding:.8rem 0!important;border:0!important;border-bottom:1px solid #e6e9eb!important;border-radius:0!important;background:transparent!important}
.sb-org__avatar{width:2.15rem!important;height:2.15rem!important;border:1px solid #dfe4e8!important;border-radius:50%!important;background:#f1f4f6!important;color:#536779!important}
.sb-org__label{color:#98a1aa!important;font-size:.58rem!important}.sb-org__name{color:#34404c!important;font-size:.78rem!important}.sb-org__email{color:#929ca5!important;font-size:.68rem!important}
.sb-nav{gap:.08rem!important;margin-top:1.7rem!important}
.sb-nav__label{margin:0 0 .55rem .7rem!important;color:#9aa2aa!important;font-size:.57rem!important;letter-spacing:.14em!important}
.sb-link{min-height:2.5rem!important;padding:.55rem .7rem!important;border:0!important;border-radius:0!important;color:#77828d!important;font-size:.78rem!important;font-weight:500!important}
.sb-link svg{width:1rem!important;height:1rem!important;color:#99a3ad!important}
.sb-link:hover{color:#26313c!important;background:#f6f7f7!important}
.sb-link--active{position:relative!important;border:0!important;background:transparent!important;color:#172b3f!important;font-weight:650!important}
.sb-link--active:before{left:-1rem!important;width:2px!important;height:1.35rem!important;border-radius:0!important;background:#315f8a!important}
.sb-link--active svg{color:#315f8a!important}
.sb-foot{padding-top:1rem!important;margin-top:1rem!important;border-top:1px solid #e7eaec!important}
.sb-link--danger:hover{background:#f8efed!important;color:#82463f!important}

`;
 
/* ------------------------------------------------------------------ */
/*  DATA & HELPERS                                                     */
/* ------------------------------------------------------------------ */
 
const NAV_ITEMS = [
  { label: "Dashboard", to: "/manager/dashboard", icon: LayoutDashboard },
  { label: "Properties", to: "/manager/properties", icon: Building2 },
  { label: "Units", to: "/manager/units", icon: DoorOpen },
  { label: "Tenants", to: "/manager/tenants", icon: Users },
  { label: "Leases", to: "/manager/leases", icon: FileText },
  { label: "Payments", to: "/manager/payments", icon: Banknote },
  { label: "Expenses", to: "/manager/expenses", icon: Receipt },
  { label: "Maintenance", to: "/manager/maintenance", icon: Wrench },
];
 
interface Organization {
  id?: number;
  name?: string;
  logo_url?: string | null;
}
 
interface User {
  name?: string;
  email?: string;
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
  const parts = value.trim().split(/\s+/).filter(Boolean);
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
 
      <div className="sb-brand">
        <span className="sb-brand__mark" aria-hidden="true">
          {organization.logo_url ? (
            <img src={organization.logo_url} alt="" />
          ) : (
            <Building2 />
          )}
        </span>
        <span className="sb-brand__name">
          {organization.id ? `ID ${organization.id}` : "Organization"}
        </span>
      </div>
 
      <div className="sb-org">
        <span className="sb-org__avatar" aria-hidden="true">
          {initials(orgName)}
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
        <p className="sb-nav__label">Manage</p>
 
        {NAV_ITEMS.map(({ label, to, icon: Icon }) => (
          <NavLink key={label} to={to} className={linkClass}>
            <Icon />
            {label}
          </NavLink>
        ))}
      </nav>
 
      <div className="sb-foot">
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
 