import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  Building2,
  CreditCard,
  FileText,
  Home,
  LayoutGrid,
  LifeBuoy,
  LogOut,
  Menu,
  Search,
  Settings,
  User,
  Wrench,
  X,
} from "lucide-react";
 
/* ------------------------------------------------------------------ */
/*  DESIGN SYSTEM + LAYOUT STYLES — vanilla CSS                        */
/* ------------------------------------------------------------------ */
 
const styles = `
.tp-root {
  /* surfaces */
  --tp-bg: #f6f7f9;
  --tp-surface: #ffffff;
  --tp-surface-sunken: #f1f3f7;
  --tp-surface-tint: #eef3ff;
 
  /* ink */
  --tp-ink: #0f172a;
  --tp-ink-soft: #334155;
  --tp-muted: #64748b;
  --tp-faint: #94a3b8;
 
  /* lines */
  --tp-line: #e2e8f0;
  --tp-line-soft: #eef1f5;
 
  /* meaning */
  --tp-blue: #2563eb;
  --tp-blue-dark: #1d4ed8;
  --tp-blue-pale: #dbeafe;
  --tp-green: #15803d;
  --tp-green-pale: #dcfce7;
  --tp-amber: #b45309;
  --tp-amber-pale: #fef3c7;
  --tp-red: #b91c1c;
  --tp-red-pale: #fee2e2;
 
  /* shape */
  --tp-r-xs: 0.375rem;
  --tp-r-sm: 0.5rem;
  --tp-r-md: 0.75rem;
  --tp-r-lg: 1rem;
 
  /* elevation — deliberately restrained */
  --tp-shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.06);
  --tp-shadow-md: 0 4px 16px -6px rgba(15, 23, 42, 0.14);
  --tp-shadow-pop: 0 18px 44px -20px rgba(15, 23, 42, 0.35);
 
  --tp-font: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Inter, Roboto,
    "Helvetica Neue", Arial, sans-serif;
 
  --tp-sidebar: 16.5rem;
}
 
.tp-root,
.tp-root * {
  box-sizing: border-box;
  min-width: 0;
}
 
.tp-root {
  min-height: 100vh;
  background: var(--tp-bg);
  color: var(--tp-ink);
  font-family: var(--tp-font);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
 
.tp-root button {
  font-family: inherit;
  font-size: inherit;
  color: inherit;
  border: none;
  background: none;
  cursor: pointer;
}
 
.tp-root input,
.tp-root select,
.tp-root textarea {
  font-family: inherit;
  font-size: 0.9375rem;
  color: inherit;
}
 
.tp-root a {
  color: inherit;
  text-decoration: none;
}
 
.tp-root :focus-visible {
  outline: 2px solid var(--tp-blue);
  outline-offset: 2px;
  border-radius: var(--tp-r-xs);
}
 
.tp-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
 
/* ---------- shared vocabulary used by every tenant page ---------- */
.tp-card {
  padding: 1.25rem;
  border-radius: var(--tp-r-lg);
  border: 1px solid var(--tp-line);
  background: var(--tp-surface);
  box-shadow: var(--tp-shadow-sm);
}
 
.tp-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
 
.tp-section__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem 1rem;
}
 
.tp-section__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--tp-ink);
}
 
.tp-section__sub {
  margin: 0.1875rem 0 0;
  font-size: 0.8125rem;
  color: var(--tp-muted);
}
 
.tp-label {
  margin: 0;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--tp-faint);
}
 
.tp-value {
  margin: 0.25rem 0 0;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--tp-ink);
}
 
.tp-money {
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}
 
.tp-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}
 
.tp-pill::before {
  content: "";
  width: 0.4375rem;
  height: 0.4375rem;
  border-radius: 50%;
  background: currentColor;
}
 
.tp-pill--good {
  border-color: #bbf7d0;
  background: var(--tp-green-pale);
  color: var(--tp-green);
}
 
.tp-pill--wait {
  border-color: #fde68a;
  background: var(--tp-amber-pale);
  color: var(--tp-amber);
}
 
.tp-pill--bad {
  border-color: #fecaca;
  background: var(--tp-red-pale);
  color: var(--tp-red);
}
 
.tp-pill--info {
  border-color: #bfdbfe;
  background: var(--tp-blue-pale);
  color: var(--tp-blue-dark);
}
 
.tp-pill--mute {
  border-color: var(--tp-line);
  background: var(--tp-surface-sunken);
  color: var(--tp-muted);
}
 
.tp-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 2.5rem;
  padding: 0 1rem;
  border-radius: var(--tp-r-sm);
  border: 1px solid transparent;
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
  transition: background-color 0.18s ease, border-color 0.18s ease,
    color 0.18s ease, box-shadow 0.18s ease;
}
 
.tp-btn svg {
  width: 1rem;
  height: 1rem;
}
 
.tp-btn--primary {
  background: var(--tp-blue);
  color: #fff;
  box-shadow: var(--tp-shadow-sm);
}
 
.tp-btn--primary:hover { background: var(--tp-blue-dark); }
 
.tp-btn--quiet {
  border-color: var(--tp-line);
  background: var(--tp-surface);
  color: var(--tp-ink-soft);
}
 
.tp-btn--quiet:hover {
  border-color: #cbd5e1;
  background: var(--tp-surface-sunken);
}
 
.tp-btn--link {
  min-height: auto;
  padding: 0;
  color: var(--tp-blue);
}
 
.tp-btn--link:hover { color: var(--tp-blue-dark); text-decoration: underline; }
 
.tp-btn[disabled] {
  opacity: 0.55;
  cursor: not-allowed;
}
 
.tp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2.5rem 1.25rem;
  text-align: center;
}
 
.tp-empty__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  margin-bottom: 0.25rem;
  border-radius: 50%;
  background: var(--tp-surface-tint);
  color: var(--tp-blue);
}
 
.tp-empty__icon svg { width: 1.25rem; height: 1.25rem; }
 
.tp-empty__title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
}
 
.tp-empty__text {
  margin: 0;
  max-width: 26rem;
  font-size: 0.875rem;
  line-height: 1.55;
  color: var(--tp-muted);
}
 
.tp-skeleton {
  display: block;
  border-radius: var(--tp-r-sm);
  background: linear-gradient(
    90deg,
    var(--tp-surface-sunken) 25%,
    #e7ebf2 37%,
    var(--tp-surface-sunken) 63%
  );
  background-size: 400% 100%;
  animation: tp-shimmer 1.4s ease infinite;
}
 
@keyframes tp-shimmer {
  from { background-position: 100% 50%; }
  to { background-position: 0 50%; }
}
 
/* ---------- frame ---------- */
.tp-frame {
  display: flex;
  min-height: 100vh;
}
 
/* ---------- sidebar ---------- */
.tp-side {
  position: fixed;
  z-index: 40;
  top: 0;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  width: var(--tp-sidebar);
  padding: 1.25rem 0.875rem 1rem;
  border-right: 1px solid var(--tp-line);
  background: var(--tp-surface);
  transform: translateX(-100%);
  transition: transform 0.24s ease;
}
 
.tp-side[data-open="true"] {
  transform: translateX(0);
  box-shadow: var(--tp-shadow-pop);
}
 
.tp-side__brand {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0 0.5rem 1.25rem;
}
 
.tp-side__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: var(--tp-r-sm);
  background: var(--tp-blue);
  color: #fff;
}
 
.tp-side__mark svg { width: 1.0625rem; height: 1.0625rem; }
 
.tp-side__word {
  font-size: 1.0625rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}
 
.tp-side__close {
  margin-left: auto;
  display: inline-flex;
  padding: 0.375rem;
  border-radius: var(--tp-r-sm);
  color: var(--tp-muted);
}
 
.tp-side__close:hover { background: var(--tp-surface-sunken); }
.tp-side__close svg { width: 1.125rem; height: 1.125rem; }
 
.tp-side__nav {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1.25rem;
  overflow-y: auto;
  padding-bottom: 0.5rem;
}
 
.tp-group {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}
 
.tp-group__label {
  margin: 0 0 0.375rem;
  padding: 0 0.75rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--tp-faint);
}
 
.tp-link {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.6875rem;
  min-height: 2.375rem;
  padding: 0 0.75rem;
  border-radius: var(--tp-r-sm);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--tp-ink-soft);
  transition: background-color 0.18s ease, color 0.18s ease;
}
 
.tp-link svg {
  width: 1.0625rem;
  height: 1.0625rem;
  color: var(--tp-faint);
  transition: color 0.18s ease;
}
 
.tp-link:hover {
  background: var(--tp-surface-sunken);
  color: var(--tp-ink);
}
 
.tp-link:hover svg { color: var(--tp-ink-soft); }
 
.tp-link[aria-current="page"] {
  background: var(--tp-surface-tint);
  color: var(--tp-blue-dark);
  font-weight: 600;
}
 
.tp-link[aria-current="page"] svg { color: var(--tp-blue); }
 
.tp-link__count {
  margin-left: auto;
  padding: 0.0625rem 0.4375rem;
  border-radius: 999px;
  background: var(--tp-blue);
  font-size: 0.6875rem;
  font-weight: 700;
  color: #fff;
}
 
.tp-side__foot {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding-top: 0.875rem;
  border-top: 1px solid var(--tp-line-soft);
}
 
.tp-side__me {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-bottom: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: var(--tp-r-sm);
  background: var(--tp-surface-sunken);
}
 
.tp-avatar {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: var(--tp-blue-pale);
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--tp-blue-dark);
}
 
.tp-side__name {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
 
.tp-side__unit {
  margin: 0;
  font-size: 0.75rem;
  color: var(--tp-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
 
.tp-scrim {
  position: fixed;
  inset: 0;
  z-index: 35;
  background: rgba(15, 23, 42, 0.35);
  backdrop-filter: blur(2px);
}
 
/* ---------- top bar ---------- */
.tp-top {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 3.5rem;
  padding: 0 1rem;
  border-bottom: 1px solid var(--tp-line);
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(8px);
}
 
.tp-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: var(--tp-r-sm);
  color: var(--tp-ink-soft);
}
 
.tp-icon-btn:hover { background: var(--tp-surface-sunken); }
.tp-icon-btn svg { width: 1.125rem; height: 1.125rem; }
 
.tp-top__brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}
 
.tp-top__brand .tp-side__mark { width: 1.75rem; height: 1.75rem; }
 
.tp-top__spacer { flex: 1; }
 
.tp-bell { position: relative; }
 
.tp-bell__dot {
  position: absolute;
  top: 0.4375rem;
  right: 0.4375rem;
  width: 0.5rem;
  height: 0.5rem;
  border: 2px solid var(--tp-surface);
  border-radius: 50%;
  background: var(--tp-red);
}
 
.tp-search {
  position: relative;
  display: none;
  flex: 1;
  max-width: 22rem;
}
 
.tp-search svg {
  position: absolute;
  top: 50%;
  left: 0.75rem;
  width: 1rem;
  height: 1rem;
  transform: translateY(-50%);
  color: var(--tp-faint);
  pointer-events: none;
}
 
.tp-search input {
  width: 100%;
  min-height: 2.25rem;
  padding: 0 0.75rem 0 2.25rem;
  border-radius: var(--tp-r-sm);
  border: 1px solid var(--tp-line);
  background: var(--tp-surface-sunken);
  font-size: 0.8125rem;
  outline: none;
}
 
.tp-search input:focus {
  border-color: var(--tp-blue);
  background: var(--tp-surface);
}
 
/* ---------- content ---------- */
.tp-main {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
}
 
.tp-content {
  width: 100%;
  max-width: 78rem;
  margin: 0 auto;
  padding: 1.5rem 1rem 6rem;
}
 
.tp-page-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.75rem;
}
 
.tp-page-title {
  margin: 0;
  font-size: 1.625rem;
  font-weight: 700;
  letter-spacing: -0.03em;
}
 
.tp-page-sub {
  margin: 0.375rem 0 0;
  font-size: 0.9375rem;
  color: var(--tp-muted);
}
 
/* ---------- bottom nav (mobile) ---------- */
.tp-tabs {
  position: fixed;
  z-index: 30;
  right: 0;
  bottom: 0;
  left: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding: 0.375rem 0.5rem calc(0.375rem + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--tp-line);
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(10px);
}
 
.tp-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1875rem;
  padding: 0.375rem 0.25rem;
  border-radius: var(--tp-r-sm);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--tp-muted);
}
 
.tp-tab svg { width: 1.1875rem; height: 1.1875rem; }
 
.tp-tab[aria-current="page"] { color: var(--tp-blue-dark); }
 
/* ---------- tablet ---------- */
@media (min-width: 640px) {
  .tp-content { padding: 2rem 1.75rem 6rem; }
  .tp-page-title { font-size: 1.875rem; }
  .tp-search { display: block; }
}
 
/* ---------- desktop ---------- */
@media (min-width: 1024px) {
  .tp-side {
    position: sticky;
    top: 0;
    height: 100vh;
    transform: none;
    box-shadow: none;
  }
 
  .tp-side__close,
  .tp-burger,
  .tp-top__brand,
  .tp-tabs,
  .tp-scrim {
    display: none;
  }
 
  .tp-top {
    padding: 0 2rem;
    min-height: 4rem;
  }
 
  .tp-content { padding: 2.25rem 2rem 3rem; }
}
 
@media (prefers-reduced-motion: reduce) {
  .tp-root *,
  .tp-root *::before,
  .tp-root *::after {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}
`;
 
/* ------------------------------------------------------------------ */
/*  NAVIGATION MODEL                                                   */
/* ------------------------------------------------------------------ */
 
interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}
 
interface NavGroup {
  label: string;
  items: NavItem[];
}
 
const NAV: NavGroup[] = [
  {
    label: "Home",
    items: [
      { to: "/tenant", label: "Overview", icon: <LayoutGrid /> },
      { to: "/tenant/home", label: "My home", icon: <Home /> },
    ],
  },
  {
    label: "Money",
    items: [
      { to: "/tenant/payments", label: "Payments", icon: <CreditCard /> },
    ],
  },
  {
    label: "Property",
    items: [
      { to: "/tenant/maintenance", label: "Maintenance", icon: <Wrench /> },
      { to: "/tenant/lease", label: "Lease", icon: <FileText /> },
      { to: "/tenant/vacancies", label: "Vacancies", icon: <Building2 /> },
    ],
  },
];
 
const TABS: NavItem[] = [
  { to: "/tenant", label: "Home", icon: <Home /> },
  { to: "/tenant/payments", label: "Payments", icon: <CreditCard /> },
  { to: "/tenant/maintenance", label: "Repairs", icon: <Wrench /> },
  { to: "/tenant/profile", label: "Profile", icon: <User /> },
];
 
/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */
 
export interface TenantIdentity {
  name: string;
  residence: string;
}
 
function readStored(key: string): string | null {
  return localStorage.getItem(key) ?? sessionStorage.getItem(key);
}
 
function readTenantIdentity(): TenantIdentity {
  const fallback: TenantIdentity = { name: "Tenant", residence: "" };
  const raw = readStored("user");
 
  if (!raw) return fallback;
 
  try {
    const parsed: unknown = JSON.parse(raw);
 
    if (!parsed || typeof parsed !== "object") return fallback;
 
    const record = parsed as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name : fallback.name;
    const residence =
      typeof record.residence === "string" ? record.residence : "";
 
    return { name, residence };
  } catch {
    return fallback;
  }
}
 
function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "T";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
 
function isActive(pathname: string, to: string): boolean {
  return to === "/tenant" ? pathname === "/tenant" : pathname.startsWith(to);
}
 
/* ------------------------------------------------------------------ */
/*  LAYOUT                                                             */
/* ------------------------------------------------------------------ */
 
interface TenantDashboardLayoutProps {
  children: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  unreadNotifications?: number;
  openRequests?: number;
}
 
function TenantDashboardLayout({
  children,
  title,
  subtitle,
  actions,
  unreadNotifications = 0,
  openRequests = 0,
}: TenantDashboardLayoutProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [identity, setIdentity] = useState<TenantIdentity>({
    name: "Tenant",
    residence: "",
  });
 
  useEffect(() => {
    setIdentity(readTenantIdentity());
  }, []);
 
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);
 
  useEffect(() => {
    if (!menuOpen) return undefined;
 
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
 
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);
 
  function signOut() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    navigate("/login");
  }
 
  return (
    <div className="tp-root">
      <style>{styles}</style>
 
      <div className="tp-frame">
        {menuOpen && (
          <div
            className="tp-scrim"
            role="presentation"
            onClick={() => setMenuOpen(false)}
          />
        )}
 
        <aside
          className="tp-side"
          data-open={menuOpen ? "true" : "false"}
          aria-label="Tenant navigation"
        >
          <div className="tp-side__brand">
            <span className="tp-side__mark" aria-hidden="true">
              <Home />
            </span>
            <span className="tp-side__word">PMS.</span>
            <button
              type="button"
              className="tp-side__close"
              onClick={() => setMenuOpen(false)}
              aria-label="Close navigation"
            >
              <X />
            </button>
          </div>
 
          <nav className="tp-side__nav" aria-label="Tenant sections">
            {NAV.map((group) => (
              <div className="tp-group" key={group.label}>
                <p className="tp-group__label">{group.label}</p>
 
                {group.items.map((item) => {
                  const current = isActive(pathname, item.to);
                  const badge =
                    item.to === "/tenant/maintenance" && openRequests > 0
                      ? openRequests
                      : 0;
 
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="tp-link"
                      aria-current={current ? "page" : undefined}
                    >
                      {item.icon}
                      {item.label}
                      {badge > 0 && (
                        <span className="tp-link__count">{badge}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
 
          <div className="tp-side__foot">
            <div className="tp-side__me">
              <span className="tp-avatar" aria-hidden="true">
                {initials(identity.name)}
              </span>
              <div>
                <p className="tp-side__name">{identity.name}</p>
                <p className="tp-side__unit">
                  {identity.residence || "Tenant portal"}
                </p>
              </div>
            </div>
 
            <Link
              to="/tenant/notifications"
              className="tp-link"
              aria-current={
                isActive(pathname, "/tenant/notifications") ? "page" : undefined
              }
            >
              <Bell />
              Notifications
              {unreadNotifications > 0 && (
                <span className="tp-link__count">{unreadNotifications}</span>
              )}
            </Link>
 
            <Link
              to="/tenant/profile"
              className="tp-link"
              aria-current={
                isActive(pathname, "/tenant/profile") ? "page" : undefined
              }
            >
              <User />
              Profile
            </Link>
 
            <Link to="/tenant/settings" className="tp-link">
              <Settings />
              Settings
            </Link>
 
            <Link to="/tenant/help" className="tp-link">
              <LifeBuoy />
              Help
            </Link>
 
            <button type="button" className="tp-link" onClick={signOut}>
              <LogOut />
              Sign out
            </button>
          </div>
        </aside>
 
        <div className="tp-main">
          <header className="tp-top">
            <button
              type="button"
              className="tp-icon-btn tp-burger"
              onClick={() => setMenuOpen(true)}
              aria-label="Open navigation"
              aria-expanded={menuOpen}
            >
              <Menu />
            </button>
 
            <span className="tp-top__brand">
              <span className="tp-side__mark" aria-hidden="true">
                <Home />
              </span>
              PMS.
            </span>
 
            <div className="tp-search">
              <Search />
              <label className="tp-sr" htmlFor="tenant-search">
                Search your portal
              </label>
              <input
                id="tenant-search"
                type="search"
                placeholder="Search payments, requests, documents…"
              />
            </div>
 
            <span className="tp-top__spacer" />
 
            <Link
              to="/tenant/notifications"
              className="tp-icon-btn tp-bell"
              aria-label={
                unreadNotifications > 0
                  ? `Notifications, ${unreadNotifications} unread`
                  : "Notifications"
              }
            >
              <Bell />
              {unreadNotifications > 0 && <span className="tp-bell__dot" />}
            </Link>
 
            <Link
              to="/tenant/profile"
              className="tp-avatar"
              aria-label="Your profile"
            >
              {initials(identity.name)}
            </Link>
          </header>
 
          <main className="tp-content">
            <div className="tp-page-head">
              <div>
                <h1 className="tp-page-title">{title}</h1>
                {subtitle && <p className="tp-page-sub">{subtitle}</p>}
              </div>
              {actions}
            </div>
 
            {children}
          </main>
        </div>
      </div>
 
      <nav className="tp-tabs" aria-label="Quick navigation">
        {TABS.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            className="tp-tab"
            aria-current={isActive(pathname, tab.to) ? "page" : undefined}
          >
            {tab.icon}
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
 
export default TenantDashboardLayout;
 