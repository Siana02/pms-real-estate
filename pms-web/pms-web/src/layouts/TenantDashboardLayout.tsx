import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api";
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

/* Keep native select popups readable across browsers/OS themes. */
.tp-root select {
  color-scheme: light;
}
.tp-root select option,
.tp-root select optgroup {
  background: #fff;
  color: #0f172a;
}
.tp-root select option:checked {
  background: #e8eef8;
  color: #0f172a;
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
.tp-side__logo { width: 100%; height: 100%; object-fit: contain; border-radius: 50%; background: #fff; }
 
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
 
.tp-search input {
  transition: width 220ms cubic-bezier(.22,1,.36,1), box-shadow 220ms ease,
    border-color 180ms ease, background-color 180ms ease;
}
 
.tp-search input:focus {
  width: calc(100% + 40px);
  border-color: #9dbed8;
  background: var(--tp-surface);
  box-shadow: 0 12px 28px -20px rgba(37, 99, 235, 0.38);
}
.tp-search-results { position:absolute; top:calc(100% + .5rem); left:0; right:0; z-index:120; max-height:min(60vh,24rem); overflow:auto; padding:.35rem; border:1px solid var(--tp-line); border-radius:.85rem; background:var(--tp-surface); box-shadow:var(--tp-shadow-pop); }
.tp-search-results__meta { padding:.45rem .6rem; color:var(--tp-muted); font-size:.72rem; }
.tp-search-result { display:block; width:100%; padding:.65rem .7rem; border-radius:.55rem; text-align:left; color:var(--tp-ink); }
.tp-search-result:hover,.tp-search-result:focus-visible { background:var(--tp-surface-tint); outline:none; }
.tp-search-result strong { display:block; font-size:.82rem; }
.tp-search-result small { display:block; margin-top:.2rem; color:var(--tp-muted); font-size:.72rem; line-height:1.4; }

 
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

/* Centered lease page header */
.tp-content.tl-page .tp-page-head{justify-content:center!important;text-align:center!important;align-items:center!important}
.tp-content.tl-page .tp-page-head__content{width:100%!important;justify-content:center!important}
.tp-content.tl-page .tp-page-head__copy{width:100%!important;display:flex!important;flex-direction:column!important;align-items:center!important}
.tp-content.tl-page .tp-page-title{color:#0F172A!important;font-size:clamp(1.75rem,3vw,2.15rem)!important;font-weight:750!important;letter-spacing:-.035em!important}
.tp-content.tl-page .tp-page-sub{max-width:34rem!important;margin:.5rem auto 0!important;color:#64748B!important;font-size:.9rem!important}
/* Responsive guardrails for narrow phones and landscape tablets. */
@media (max-width: 639px) {
  .tp-content { padding: .9rem .75rem 5.5rem; }
  .tp-page-head { gap: .75rem; margin-bottom: 1.1rem; }
  .tp-page-title { font-size: clamp(1.35rem, 6vw, 1.65rem); overflow-wrap: anywhere; }
  .tp-page-sub { font-size: .84rem; }
  .tp-card { padding: .9rem; }
  .tp-top { gap: .35rem; padding: 0 .55rem; }
  .tp-top__brand { font-size: .82rem; }
  .tp-top__brand .tp-side__mark { display: none; }
  .tp-search { display: block; flex: 1; max-width: 9rem; min-width: 0; }
  .tp-search input { padding-left: 1.85rem; font-size: .75rem; }
  .tp-search svg { left: .55rem; }
  .tp-top .tp-avatar { display: none; }
  .tp-content table { display: block; max-width: 100%; overflow-x: auto; }
  .tp-content img, .tp-content video, .tp-content canvas { max-width: 100%; height: auto; }
  .tp-content input, .tp-content select, .tp-content textarea { max-width: 100%; }
  .tp-search-results { position: fixed; left: .5rem; right: .5rem; top: 3.65rem; width: auto; }
}
@media (min-width: 640px) and (max-width: 1023px) {
  .tp-content { padding: 1.25rem 1rem 6rem; }
  .tp-search { display: block; max-width: 15rem; }
  .tp-content table { display: block; max-width: 100%; overflow-x: auto; }
}
.tp-content > * { min-width: 0; max-width: 100%; }
.tp-content :where(input, select, textarea, button) { max-width: 100%; }
.tp-content :where(pre, code) { overflow-wrap: anywhere; }

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
 
function readOrganizationLogo(): string | null {
  const raw = readStored("organization");
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      const logo = (parsed as Record<string, unknown>).logo_url;
      return typeof logo === "string" && logo.trim() ? logo : null;
    }
  } catch {
    /* fall through */
  }

  return null;
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
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  unreadNotifications?: number;
  openRequests?: number;
  pageClassName?: string;
  headerVisual?: ReactNode;
  headerExtras?: ReactNode;
}
 
function TenantDashboardLayout({
  children,
  title,
  subtitle,
  actions,
  unreadNotifications = 0,
  openRequests = 0,
  pageClassName = "",
  headerVisual,
  headerExtras,
}: TenantDashboardLayoutProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState("");
  const [globalResults, setGlobalResults] = useState<Array<{title:string;detail:string;to:string;key:string}>>([]);
  const [globalSearchLoading, setGlobalSearchLoading] = useState(false);
  const [globalSearchError, setGlobalSearchError] = useState("");
  const [identity, setIdentity] = useState<TenantIdentity>({
    name: "Tenant",
    residence: "",
  });
  const [organizationLogo, setOrganizationLogo] = useState<string | null>(() =>
    readOrganizationLogo()
  );
 
  useEffect(() => {
    setIdentity(readTenantIdentity());
  }, []);

  useEffect(() => {
    function refreshOrganizationLogo() {
      setOrganizationLogo(readOrganizationLogo());
    }

    window.addEventListener("pms:organization", refreshOrganizationLogo);
    return () =>
      window.removeEventListener("pms:organization", refreshOrganizationLogo);
  }, []);
 
  useEffect(() => {
    const query = globalQuery.trim().toLowerCase();
    if (query.length < 2) {
      setGlobalResults([]);
      setGlobalSearchLoading(false);
      setGlobalSearchError("");
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setGlobalSearchLoading(true);
      setGlobalSearchError("");
      const sources = [
        { endpoint: "/tenant/payments", to: "/tenant/payments", label: "Payment" },
        { endpoint: "/tenant/maintenance-requests", to: "/tenant/maintenance", label: "Maintenance request" },
        { endpoint: "/tenant/notifications", to: "/tenant/notifications", label: "Notification" },
        { endpoint: "/tenant/lease-agreement", to: "/tenant/lease", label: "Lease / document" },
      ];
      try {
        const responses = await Promise.allSettled(sources.map(source => apiRequest(source.endpoint)));
        const results: Array<{title:string;detail:string;to:string;key:string}> = [];
        const visited = new Set<object>();
        const visit = (value: unknown, source: typeof sources[number], depth = 0) => {
          if (!value || typeof value !== "object" || depth > 5) return;
          if (visited.has(value as object)) return;
          visited.add(value as object);
          if (Array.isArray(value)) {
            value.forEach(item => visit(item, source, depth + 1));
            return;
          }
          const record = value as Record<string, unknown>;
          const textValue = Object.values(record).filter(v => typeof v === "string" || typeof v === "number" || typeof v === "boolean").join(" ").toLowerCase();
          const title = [record.title, record.name, record.subject, record.payment_reference, record.reference, record.unit_number, record.document_name, record.type]
            .find(v => typeof v === "string" && v.trim()) as string | undefined;
          const detail = [record.status, record.amount, record.currency, record.created_at, record.transaction_at, record.reported_date, record.description, record.message]
            .filter(v => typeof v === "string" || typeof v === "number").join(" · ");
          if (textValue.includes(query) && title) {
            const key = source.to + ":" + String(record.id ?? title) + ":" + detail;
            if (!results.some(result => result.key === key)) results.push({ title: title.slice(0, 100), detail: (detail || source.label).slice(0, 180), to: source.to, key });
          }
          Object.values(record).forEach(child => {
            if (child && typeof child === "object") visit(child, source, depth + 1);
          });
        };
        responses.forEach((response, index) => {
          if (response.status === "fulfilled") visit(response.value, sources[index]);
        });
        if (!cancelled) {
          setGlobalResults(results.slice(0, 8));
          if (responses.every(response => response.status === "rejected")) setGlobalSearchError("Search is temporarily unavailable. Please try again.");
        }
      } catch {
        if (!cancelled) setGlobalSearchError("Search is temporarily unavailable. Please try again.");
      } finally {
        if (!cancelled) setGlobalSearchLoading(false);
      }
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [globalQuery]);

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
              {organizationLogo ? (
                <img src={organizationLogo} alt="" className="tp-side__logo" />
              ) : (
                <Home />
              )}
            </span>
            <span className="tp-side__word">Property portal</span>
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
                {organizationLogo ? (
                  <img src={organizationLogo} alt="" className="tp-side__logo" />
                ) : (
                  <Home />
                )}
              </span>
              Property portal
            </span>
 
            <div className="tp-search">
              <Search />
              <label className="tp-sr" htmlFor="tenant-search">
                Search your portal
              </label>
              <input
                id="tenant-search"
                type="search"
                value={globalQuery}
                onChange={event => setGlobalQuery(event.target.value)}
                onKeyDown={event => {
                  if (event.key === "Escape") setGlobalQuery("");
                  if (event.key === "Enter" && globalResults[0]) {
                    navigate(globalResults[0].to);
                    setGlobalQuery("");
                  }
                }}
                aria-label="Search your payments, maintenance requests, notifications and lease documents"
                aria-expanded={globalQuery.trim().length >= 2}
                aria-controls="tenant-global-search-results"
                autoComplete="off"
                placeholder="Search payments, requests, documents…"
              />
              {globalQuery.trim().length >= 2 && <div id="tenant-global-search-results" className="tp-search-results" role="status">
                <div className="tp-search-results__meta">{globalSearchLoading ? "Searching your records…" : globalSearchError || (globalResults.length ? `${globalResults.length} matching records` : "No matching records found")}</div>
                {!globalSearchLoading && !globalSearchError && globalResults.map(result => <button type="button" key={result.key} className="tp-search-result" onClick={() => { navigate(result.to); setGlobalQuery(""); }}><strong>{result.title}</strong><small>{result.detail || result.to.replace("/tenant/","").replace(/-/g," ")}</small></button>)}
              </div>}
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
 
          <main className={`tp-content ${pageClassName}`.trim()}>
            <div className="tp-page-head">
              <div className="tp-page-head__content">
                {headerVisual && (
                  <div className="tp-page-head__visual" aria-hidden="true">
                    {headerVisual}
                  </div>
                )}
                <div className="tp-page-head__copy">
                  <h1 className="tp-page-title">{title}</h1>
                  {subtitle && <p className="tp-page-sub">{subtitle}</p>}
                  {headerExtras}
                </div>
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
 