import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import TenantDashboardLayout from "../../layouts/TenantDashboardLayout";
import { apiRequest } from "../../services/api";
import {
  ArrowRight,
  Bell,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  FileText,
  Home,
  MapPin,
  Megaphone,
  Phone,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Wrench,
  CalendarDays,
  KeyRound,
  Moon,
  Sun,
} from "lucide-react";
 
/* ------------------------------------------------------------------ */
/*  STYLES — vanilla CSS                                               */
/* ------------------------------------------------------------------ */
 
const styles = `
.td-stack {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}
 
.td-alert {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  padding: 0.75rem 0.875rem;
  border-radius: var(--tp-r-md);
  border: 1px solid #fde68a;
  background: var(--tp-amber-pale);
  font-size: 0.8125rem;
  line-height: 1.5;
  color: #78350f;
}
 
.td-alert svg { width: 1rem; height: 1rem; flex: none; margin-top: 0.125rem; }
 
/* ---------- rent, the headline ---------- */
.td-lead {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}
 
.td-rent {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem;
  border-radius: var(--tp-r-lg);
  border: 1px solid #c7dbff;
  background: linear-gradient(180deg, #f5f9ff, var(--tp-surface) 62%);
  box-shadow: var(--tp-shadow-sm);
}
 
.td-rent__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}
 
.td-rent__amount {
  margin: 0.5rem 0 0;
  font-size: 2.25rem;
  font-weight: 700;
  letter-spacing: -0.035em;
  line-height: 1.1;
}
 
.td-rent__due {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin: 0.4375rem 0 0;
  font-size: 0.875rem;
  color: var(--tp-muted);
}
 
.td-rent__due svg { width: 0.9375rem; height: 0.9375rem; }
 
.td-rent__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.625rem;
}
 
.td-rent__actions .tp-btn { flex: 1 1 12rem; }
 
.td-rent__last {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding-top: 1rem;
  border-top: 1px solid var(--tp-line-soft);
  font-size: 0.8125rem;
  color: var(--tp-muted);
}
 
.td-rent__last svg { width: 1rem; height: 1rem; color: var(--tp-green); }
.td-rent__last strong { color: var(--tp-ink); font-weight: 600; }
.td-rent__last a { margin-left: auto; }
 
/* ---------- my home ---------- */
.td-home {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
 
.td-home__head {
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
}
 
.td-home__mark {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: var(--tp-r-md);
  background: var(--tp-surface-tint);
  color: var(--tp-blue);
}
 
.td-home__mark svg { width: 1.25rem; height: 1.25rem; }
 
.td-home__name {
  margin: 0;
  font-size: 1.0625rem;
  font-weight: 600;
  letter-spacing: -0.015em;
}
 
.td-home__where {
  display: flex;
  align-items: flex-start;
  gap: 0.375rem;
  margin: 0.25rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--tp-muted);
}
 
.td-home__where svg { width: 0.875rem; height: 0.875rem; flex: none; margin-top: 0.125rem; }
 
.td-facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.875rem 1rem;
  margin: 0;
  padding-top: 1rem;
  border-top: 1px solid var(--tp-line-soft);
}
 
.td-facts div { min-width: 0; }
.td-facts dt { margin: 0; }
.td-facts dd { margin: 0.25rem 0 0; font-size: 0.9375rem; font-weight: 600; }
 
.td-manager {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
  padding: 0.75rem 0.875rem;
  border-radius: var(--tp-r-md);
  background: var(--tp-surface-sunken);
  font-size: 0.8125rem;
  color: var(--tp-ink-soft);
}
 
.td-manager svg { width: 0.9375rem; height: 0.9375rem; color: var(--tp-muted); }
.td-manager__logo { width: 1.5rem; height: 1.5rem; flex: none; object-fit: contain; border-radius: 50%; background: #fff; }
.td-manager a { color: var(--tp-blue); font-weight: 600; }
.td-manager span:first-of-type { font-weight: 600; }
 
/* ---------- two-up grid ---------- */
.td-duo {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}
 
.td-tile {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  height: 100%;
}
 
.td-tile__head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
 
.td-tile__head svg { width: 1rem; height: 1rem; color: var(--tp-muted); }
 
.td-tile__head h2 {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
}
 
.td-tile__foot { margin-top: auto; }
 
.td-counts {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}
 
.td-count dt { margin: 0; }
.td-count dd {
  margin: 0.1875rem 0 0;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.03em;
}
 
.td-count--open dd { color: var(--tp-amber); }
.td-count--done dd { color: var(--tp-green); }
 
.td-mini {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
 
.td-mini li {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 0;
  border-top: 1px solid var(--tp-line-soft);
  font-size: 0.875rem;
}
 
.td-mini li:first-child { border-top: none; padding-top: 0; }
.td-mini__title { font-weight: 500; overflow-wrap: anywhere; }
.td-mini__meta { margin-left: auto; display: flex; align-items: center; gap: 0.625rem; }
.td-mini__when { font-size: 0.75rem; color: var(--tp-faint); white-space: nowrap; }
 
/* ---------- lease ---------- */
.td-lease__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.875rem 1rem;
  margin: 0;
}
 
.td-lease__grid dt { margin: 0; }
.td-lease__grid dd { margin: 0.25rem 0 0; font-size: 0.9375rem; font-weight: 600; }
 
.td-progress {
  height: 0.375rem;
  border-radius: 999px;
  background: var(--tp-surface-sunken);
  overflow: hidden;
}
 
.td-progress span {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--tp-blue);
}
 
.td-progress__note {
  margin: 0.5rem 0 0;
  font-size: 0.75rem;
  color: var(--tp-muted);
}
 
/* ---------- notifications ---------- */

.td-activity-head {
  justify-content:center;
  text-align:center;
}

.td-activity-head__copy {
  display:flex;
  flex-direction:column;
  align-items:center;
  width:100%;
}

.td-activity-head .tp-section__title {
  margin:0;
  color:#263746;
  font-family:Georgia, "Times New Roman", serif;
  font-size:clamp(1.35rem, 2vw, 1.65rem);
  font-weight:700;
  letter-spacing:-.025em;
  line-height:1.15;
}

.td-activity-head .tp-section__sub {
  max-width:34rem;
  margin:.45rem auto 0;
  color:#7b888b;
  font-size:.8rem;
  line-height:1.55;
}

.td-activity-head .td-activity-see-all {
  position:relative;
  margin-top:.7rem;
  padding-bottom:.18rem;
}

.td-activity-head .td-activity-see-all::after {
  content:"";
  position:absolute;
  right:0;
  bottom:0;
  left:0;
  height:1px;
  background:currentColor;
  transform:scaleX(.35);
  transform-origin:center;
  opacity:.45;
  transition:transform 220ms ease, opacity 220ms ease;
}

.td-activity-head .td-activity-see-all:hover::after,
.td-activity-head .td-activity-see-all:focus-visible::after {
  transform:scaleX(1);
  opacity:.8;
}

@media (prefers-reduced-motion:reduce) {
  .td-activity-head .td-activity-see-all::after { transition:none; }
}

.td-activity-see-all {
  display:inline-flex;
  align-items:center;
  gap:.25rem;
  color:#7890a7;
  font-size:.72rem;
  font-weight:650;
  text-decoration:none;
  opacity:.82;
  transition:color 180ms ease, opacity 180ms ease, transform 180ms ease;
}
.td-activity-see-all svg { width:.8rem; height:.8rem; transition:transform 180ms ease; }
.td-activity-see-all:hover { color:#28689c; opacity:1; transform:translateX(1px); }
.td-activity-see-all:hover svg { transform:translateX(2px); }
.td-activity-see-all:focus-visible { outline:2px solid #60a5fa; outline-offset:3px; border-radius:4px; }

/* ---------- recent activity empty state ---------- */
.td-activity-empty {
  position:relative;
  overflow:hidden;
  min-height:15rem;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:2rem;
  border-radius:1.35rem;
  background:
    radial-gradient(circle at 50% 42%, rgba(244,213,145,.13), transparent 30%),
    radial-gradient(circle at 50% 50%, rgba(126,168,211,.09), transparent 58%),
    #fff;
  box-shadow:0 4px 20px rgba(0,0,0,.02);
  transition:transform 420ms cubic-bezier(.22,1,.36,1), box-shadow 420ms ease, border-color 320ms ease;
}

.td-activity-empty::before {
  content:"";
  position:absolute;
  inset:14%;
  border-radius:50%;
  background:radial-gradient(circle, rgba(245,215,157,.08), transparent 68%);
  filter:blur(18px);
  pointer-events:none;
}

.td-activity-empty:hover {
  transform:perspective(900px) rotateX(.7deg) rotateY(-.7deg) translateY(-4px);
  box-shadow:0 20px 40px rgba(0,0,0,.055), 0 0 28px rgba(56,189,248,.055);
}

.td-activity-empty__inner {
  position:relative;
  z-index:1;
  display:flex;
  flex-direction:column;
  align-items:center;
  max-width:38rem;
  text-align:center;
}

.td-activity-empty__icon {
  display:inline-flex;
  align-items:center;
  justify-content:center;
  width:3.75rem;
  height:3.75rem;
  margin-bottom:1rem;
  border:1px solid rgba(255,255,255,.78);
  border-radius:1.15rem;
  background:linear-gradient(145deg, rgba(255,255,255,.82), rgba(245,239,221,.54));
  color:#a98245;
  box-shadow:0 10px 24px rgba(93,72,38,.07), inset 0 1px 0 rgba(255,255,255,.9);
  backdrop-filter:blur(12px);
  -webkit-backdrop-filter:blur(12px);
  animation:td-bell-float 4s ease-in-out infinite;
  transition:transform 320ms cubic-bezier(.22,1,.36,1), box-shadow 320ms ease;
}

.td-activity-empty:hover .td-activity-empty__icon {
  transform:translate(3px,-2px) scale(1.035);
  box-shadow:0 14px 28px rgba(93,72,38,.09), 0 0 18px rgba(214,176,101,.13);
}

.td-activity-empty__icon svg { width:1.35rem; height:1.35rem; }

.td-activity-empty__title {
  margin:0;
  color:#20384d;
  font-size:1.22rem;
  font-weight:720;
  letter-spacing:-.025em;
}

.td-activity-empty__text {
  max-width:31rem;
  margin:.55rem 0 0;
  color:#78878a;
  font-size:.84rem;
  line-height:1.65;
}

.td-activity-empty__actions {
  display:flex;
  flex-wrap:wrap;
  justify-content:center;
  gap:.5rem;
  margin-top:1.2rem;
}

.td-activity-pill {
  display:inline-flex;
  align-items:center;
  gap:.3rem;
  min-height:2rem;
  padding:.45rem .7rem;
  border:1px solid #e1e9ef;
  border-radius:999px;
  background:rgba(255,255,255,.72);
  color:#4c6d89;
  font-size:.7rem;
  font-weight:650;
  text-decoration:none;
  box-shadow:0 4px 12px rgba(16,42,67,.025);
  transition:transform 180ms ease, border-color 180ms ease, color 180ms ease, box-shadow 180ms ease, background 180ms ease;
}

.td-activity-pill svg { width:.75rem; height:.75rem; transition:transform 180ms ease; }

.td-activity-pill:hover {
  transform:translateY(-1px);
  border-color:#b9d3e9;
  background:#fff;
  color:#245d8d;
  box-shadow:0 7px 16px rgba(37,99,235,.07), 0 0 12px rgba(56,189,248,.06);
}

.td-activity-pill:hover svg { transform:translateX(2px); }

.td-activity-pill:focus-visible {
  outline:2px solid #60a5fa;
  outline-offset:3px;
}

@keyframes td-bell-float {
  0%,100% { transform:translateY(0); }
  50% { transform:translateY(-2px); }
}

.td-activity-empty + .td-feed { animation:td-activity-in .62s cubic-bezier(.22,1,.36,1) .2s both; }

@keyframes td-activity-in {
  from { opacity:0; transform:translateY(14px); }
  to { opacity:1; transform:translateY(0); }
}

.td-dashboard-page .tp-section:nth-of-type(3) .td-activity-empty {
  animation:td-activity-in .7s cubic-bezier(.22,1,.36,1) .2s both;
}

@media (prefers-reduced-motion:reduce) {
  .td-activity-empty,
  .td-activity-empty__icon,
  .td-activity-pill { transition:none; animation:none; }
  .td-activity-empty:hover { transform:none; }
}

.td-feed {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}
 
.td-feed li {
  display: flex;
  gap: 0.875rem;
  padding: 0.875rem 0;
  border-top: 1px solid var(--tp-line-soft);
}
 
.td-feed li:first-child { border-top: none; padding-top: 0; }
 
.td-feed__icon {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: var(--tp-surface-sunken);
  color: var(--tp-muted);
}
 
.td-feed__icon svg { width: 0.9375rem; height: 0.9375rem; }
.td-feed__icon[data-tone="good"] { background: var(--tp-green-pale); color: var(--tp-green); }
.td-feed__icon[data-tone="wait"] { background: var(--tp-amber-pale); color: var(--tp-amber); }
.td-feed__icon[data-tone="info"] { background: var(--tp-blue-pale); color: var(--tp-blue-dark); }
 
.td-feed__body { min-width: 0; flex: 1; }
 
.td-feed__title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  overflow-wrap: anywhere;
}
 
.td-feed__text {
  margin: 0.1875rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--tp-muted);
  overflow-wrap: anywhere;
}
 
.td-feed__when {
  flex: none;
  font-size: 0.75rem;
  color: var(--tp-faint);
  white-space: nowrap;
}
 
.td-unread { position: relative; }
 
.td-unread .td-feed__title::after {
  content: "";
  display: inline-block;
  width: 0.375rem;
  height: 0.375rem;
  margin-left: 0.4375rem;
  border-radius: 50%;
  background: var(--tp-blue);
  vertical-align: middle;
}
 
/* ---------- property discovery ---------- */
.td-discovery-head {
  display:grid;
  grid-template-columns:minmax(0,1fr) auto;
  align-items:end;
  gap:1.5rem;
  margin-bottom:1rem;
}

.td-discovery-head__copy { min-width:0; }

.td-discovery-head .tp-section__title {
  margin:0;
  color:#20384d;
  font-family:Georgia, "Times New Roman", serif;
  font-size:clamp(1.45rem,2.2vw,1.85rem);
  font-weight:700;
  letter-spacing:-.035em;
  line-height:1.12;
}

.td-discovery-head .tp-section__sub {
  max-width:38rem;
  margin:.45rem 0 0;
  color:#7a8994;
  font-size:.8rem;
  line-height:1.55;
}

.td-discovery-browse {
  display:inline-flex;
  align-items:center;
  gap:.35rem;
  flex:none;
  padding:.45rem 0 .38rem;
  border:0;
  border-bottom:1px solid #b9cddd;
  background:transparent;
  color:#486b88;
  font-size:.72rem;
  font-weight:700;
  letter-spacing:.035em;
  text-decoration:none;
  transition:color 180ms ease,border-color 180ms ease,transform 180ms ease;
}

.td-discovery-browse svg { width:.8rem; height:.8rem; transition:transform 180ms ease; }

.td-discovery-browse:hover,
.td-discovery-browse:focus-visible {
  color:#1f6090;
  border-bottom-color:#6e9fc4;
  transform:translateY(-1px);
}

.td-discovery-browse:hover svg { transform:translateX(3px); }

.td-discovery-browse:focus-visible {
  outline:2px solid #60a5fa;
  outline-offset:4px;
  border-radius:2px;
}

.td-vacancies {
  display:flex;
  flex-direction:column;
  gap:.7rem;
}

.td-vacancy {
  position:relative;
  display:grid;
  grid-template-columns:4.25rem minmax(0,1fr) minmax(9rem,auto) auto;
  align-items:center;
  gap:1.15rem;
  min-height:6.8rem;
  padding:1rem 1.15rem 1rem 1rem;
  overflow:hidden;
  border:1px solid #dfe8ef;
  border-radius:1.15rem;
  background:
    radial-gradient(circle at 7% 50%, rgba(111,157,198,.075), transparent 22%),
    linear-gradient(100deg,#fff,#fbfcfa);
  box-shadow:0 7px 24px -20px rgba(16,42,67,.38);
  transition:transform 300ms cubic-bezier(.22,1,.36,1),box-shadow 300ms ease,border-color 220ms ease;
}

.td-vacancy::after {
  content:"";
  position:absolute;
  inset:0;
  pointer-events:none;
  background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.55),rgba(255,255,255,0));
  transform:translateX(-120%);
  transition:transform 600ms cubic-bezier(.22,1,.36,1);
}

.td-vacancy:hover {
  border-color:#c5d8e7;
  box-shadow:0 18px 36px -25px rgba(16,42,67,.42),0 0 22px rgba(96,165,250,.055);
  transform:translateY(-2px);
}

.td-vacancy:hover::after { transform:translateX(120%); }

.td-vacancy__anchor {
  position:relative;
  z-index:1;
  display:flex;
  align-items:center;
  justify-content:center;
  width:4.25rem;
  height:4.25rem;
  border:1px solid #d8e5ee;
  border-radius:1rem;
  background:linear-gradient(145deg,#f1f7fb,#fff);
  color:#6588a5;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.9);
}

.td-vacancy__anchor::before,
.td-vacancy__anchor::after {
  content:"";
  position:absolute;
  border:1px solid currentColor;
  opacity:.42;
}

.td-vacancy__anchor::before {
  width:1.85rem;
  height:1.85rem;
  border-radius:.18rem;
}

.td-vacancy__anchor::after {
  width:.62rem;
  height:.62rem;
  left:calc(50% - .31rem);
  bottom:1.05rem;
  background:#f1f7fb;
}

.td-vacancy__anchor svg {
  position:relative;
  z-index:1;
  width:1rem;
  height:1rem;
  opacity:.82;
}

.td-vacancy__body,
.td-vacancy__price,
.td-vacancy__link { position:relative; z-index:1; }

.td-vacancy__name {
  margin:0;
  color:#233b50;
  font-family:Georgia,"Times New Roman",serif;
  font-size:1.05rem;
  font-weight:700;
  letter-spacing:-.02em;
  line-height:1.2;
}

.td-vacancy__meta {
  margin:.32rem 0 0;
  color:#748594;
  font-size:.74rem;
  line-height:1.45;
}

.td-vacancy__context {
  display:flex;
  flex-wrap:wrap;
  align-items:center;
  gap:.35rem .55rem;
  margin-top:.5rem;
  color:#8a98a3;
  font-size:.66rem;
  letter-spacing:.02em;
}

.td-vacancy__context span + span::before {
  content:"•";
  margin-right:.55rem;
  color:#b5c1c9;
}

.td-vacancy__badge {
  display:inline-flex;
  align-items:center;
  gap:.35rem;
  margin-top:.48rem;
  padding:.27rem .55rem;
  border:1px solid #d8e7dc;
  border-radius:999px;
  background:#f4faf5;
  color:#477054;
  font-size:.62rem;
  font-weight:700;
  letter-spacing:.04em;
  text-transform:uppercase;
}

.td-vacancy__badge-dot {
  width:.34rem;
  height:.34rem;
  border-radius:50%;
  background:#69a879;
  box-shadow:0 0 0 3px rgba(105,168,121,.1);
}

.td-vacancy__price {
  display:flex;
  align-items:baseline;
  justify-content:flex-end;
  gap:.35rem;
  white-space:nowrap;
}

.td-vacancy__rent {
  margin:0;
  color:#1d2f3f;
  font-size:1.22rem;
  font-weight:750;
  letter-spacing:-.035em;
}

.td-vacancy__per {
  color:#8a969e;
  font-family:Georgia,"Times New Roman",serif;
  font-size:.72rem;
  font-style:italic;
  font-weight:400;
}

.td-vacancy__link {
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:.35rem;
  min-height:2.15rem;
  padding:.45rem .7rem;
  border:1px solid #dce7ef;
  border-radius:.65rem;
  color:#426b8b;
  background:rgba(255,255,255,.72);
  font-size:.68rem;
  font-weight:700;
  text-decoration:none;
  white-space:nowrap;
  transition:background 180ms ease,border-color 180ms ease,color 180ms ease,transform 180ms ease;
}

.td-vacancy__link svg { width:.78rem; height:.78rem; transition:transform 180ms ease; }

.td-vacancy__link:hover {
  border-color:#b9d2e5;
  background:#fff;
  color:#1f5f8f;
  transform:translateY(-1px);
}

.td-vacancy__link:hover svg { transform:translateX(2px); }

@media (max-width: 760px) {
  .td-discovery-head { align-items:start; }
  .td-vacancy {
    grid-template-columns:3.5rem minmax(0,1fr) auto;
    gap:.85rem;
    padding:.9rem;
  }
  .td-vacancy__anchor { width:3.5rem; height:3.5rem; }
  .td-vacancy__price { grid-column:2; justify-content:flex-start; margin-top:-.1rem; }
  .td-vacancy__link { grid-column:3; grid-row:2; }
}

@media (max-width: 520px) {
  .td-discovery-head {
    grid-template-columns:1fr;
    gap:.65rem;
  }
  .td-discovery-browse { justify-self:start; }
  .td-vacancy {
    grid-template-columns:3.1rem minmax(0,1fr);
    gap:.75rem;
  }
  .td-vacancy__anchor { width:3.1rem; height:3.1rem; border-radius:.85rem; }
  .td-vacancy__price,
  .td-vacancy__link { grid-column:2; }
  .td-vacancy__link { justify-self:start; }
}
 
/* ---------- loading ---------- */
.td-skeleton-lead { height: 13rem; }
.td-skeleton-tile { height: 9rem; }
 
/* ---------- tablet / desktop ---------- */
@media (min-width: 640px) {
  .td-duo { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .td-rent__amount { font-size: 2.5rem; }
  .td-rent__actions .tp-btn { flex: 0 0 auto; }
}
 
@media (min-width: 1024px) {
  .td-lead { grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); }
  .td-facts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
/* ------------------------------------------------------------------ */
/*  PREMIUM DASHBOARD VISUAL LAYER — UI ONLY                          */
/* ------------------------------------------------------------------ */

.td-stack {
  --td-navy: #102a43;
  --td-blue: #2563eb;
  gap: 1.5rem;
}
.td-dashboard-page {
  --td-canvas: #f9f9f6;
}

.td-dashboard-page .tp-content {
  background: var(--td-canvas);
}

.td-dashboard-page .tp-page-head { align-items:center; gap:1.25rem; margin-bottom:1.5rem; padding:.25rem 0 .5rem; animation:td-head-in .65s cubic-bezier(.22,1,.36,1) both; }
.td-dashboard-page .tp-page-head__content { display:flex; align-items:center; min-width:0; flex:1; gap:.875rem; }
.td-dashboard-page .tp-page-head__copy { min-width:0; }
.td-dashboard-page .tp-page-head__visual { display:inline-flex; flex:none; align-items:center; justify-content:center; width:3.75rem; height:3.75rem; border:1px solid #d7e6fb; border-radius:1.2rem; background:linear-gradient(145deg,#edf5ff,#fff); color:#2563eb; box-shadow:0 12px 28px -20px rgba(37,99,235,.55); animation:td-anchor-in .8s .08s cubic-bezier(.22,1,.36,1) both; }
.td-dashboard-page .tp-page-head__visual svg { width:1.7rem; height:1.7rem; }
.td-dashboard-page .tp-page-title { margin:0; color:#102a43 !important; font-size:clamp(2rem,4vw,2.8rem); font-weight:800; letter-spacing:-.055em; line-height:1.05; }
.td-dashboard-page .tp-page-sub { margin-top:.45rem; color:#647991 !important; font-size:.9rem; line-height:1.45; }
.td-welcome-script { display:block; width:fit-content; max-width:100%; margin:.55rem 0 0; overflow:hidden; color:#45627f; font-family:"Segoe Print","Bradley Hand","Comic Sans MS",cursive; font-size:clamp(.95rem,1.6vw,1.08rem); font-weight:500; line-height:1.4; white-space:nowrap; animation:td-type-in 1.25s steps(46,end) .28s both,td-caret .8s steps(1,end) .28s 2; border-right:1px solid #8aa7c4; }
.td-welcome-stats { display:flex; flex-wrap:wrap; gap:.5rem .7rem; margin-top:.8rem; }
.td-welcome-stat { display:inline-flex; align-items:center; gap:.42rem; min-height:1.8rem; padding:.28rem .65rem; border:1px solid #e0eaf5; border-radius:999px; background:rgba(255,255,255,.72); color:#526b85; font-size:.72rem; font-weight:600; box-shadow:0 5px 16px -14px rgba(16,42,67,.45); animation:td-stat-in .55s cubic-bezier(.22,1,.36,1) both; }
.td-welcome-stat:nth-child(2) { animation-delay:.1s; }
.td-welcome-stat__dot { width:.45rem; height:.45rem; border-radius:50%; background:currentColor; box-shadow:0 0 0 3px rgba(100,116,139,.1); }
.td-welcome-stat--good { color:#15803d; } .td-welcome-stat--wait { color:#a16207; } .td-welcome-stat--info { color:#2563eb; } .td-welcome-stat--mute { color:#64748b; }
.td-welcome-stat svg { width:.82rem; height:.82rem; flex:none; }
@keyframes td-head-in { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
@keyframes td-anchor-in { from { opacity:0; transform:scale(.82) rotate(-5deg); } to { opacity:1; transform:scale(1) rotate(0); } }
@keyframes td-type-in { from { max-width:0; } to { max-width:48rem; } }
@keyframes td-caret { 0%,100% { border-right-color:#8aa7c4; } 50% { border-right-color:transparent; } }
@keyframes td-stat-in { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:translateY(0); } }

.td-stack > * {
  animation: td-section-in 0.58s cubic-bezier(.22,1,.36,1) both;
}
.td-stack > *:nth-child(2) { animation-delay: .06s; }
.td-stack > *:nth-child(3) { animation-delay: .12s; }
.td-stack > *:nth-child(4) { animation-delay: .18s; }
.td-stack > *:nth-child(5) { animation-delay: .24s; }
@keyframes td-section-in {
  from { opacity:0; transform:translateY(12px); }
  to { opacity:1; transform:translateY(0); }
}


.td-stack .td-home__groups { align-items:stretch; }
.td-stack .td-home__group { min-width:0; }
.td-stack .td-home__data-row { display:grid; grid-template-columns:1.25rem minmax(0,1fr); align-items:start; column-gap:.65rem; }
.td-stack .td-home__data-row > svg { width:1rem; height:1rem; margin:.12rem 0 0; justify-self:center; }
.td-stack .td-home__data-row > div { min-width:0; }
.td-stack .td-home__data-row dt { line-height:1.2; }
.td-stack .td-home__data-row dd { line-height:1.35; }
.td-stack .td-home__group { padding-top:.9rem; padding-bottom:.9rem; }
.td-stack .td-home__group--lease { padding-left:1.25rem; }
.td-stack .td-home__actions { margin-top:0; }
@media (max-width:639px) {
  .td-stack .td-home__group, .td-stack .td-home__group--lease { padding:.9rem 0; }
  .td-stack .td-home__group--lease { padding-left:0; }
}

.td-stack .td-home__groups { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); margin:0; border-top:1px solid #e7eef7; }
.td-stack .td-home__group { padding:1rem 1rem .25rem 0; }
.td-stack .td-home__group--lease { padding-right:0; padding-left:1rem; border-left:1px solid #e7eef7; }
.td-stack .td-home__group-title { margin:0 0 .8rem; color:#8a9aae; font-size:.66rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; }
.td-stack .td-home__data { display:grid; gap:.75rem; }
.td-stack .td-home__data-row { display:grid; grid-template-columns:1.25rem minmax(0,1fr); align-items:start; column-gap:.65rem; }
.td-stack .td-home__data-row > svg { width:1rem; height:1rem; margin:.12rem 0 0; justify-self:center; color:#6f95c3; }
.td-stack .td-home__data-row > div { min-width:0; }
.td-stack .td-home__data-row dt { margin:0; color:#8292a5; font-size:.66rem; font-weight:700; letter-spacing:.05em; text-transform:uppercase; line-height:1.2; }
.td-stack .td-home__data-row dd { margin:.18rem 0 0; color:#102a43; font-size:.9rem; font-weight:650; line-height:1.35; }
.td-stack .td-home__actions { display:flex; justify-content:center; margin-top:.35rem; padding-top:.9rem; border-top:1px solid #edf2f7; }
.td-stack .td-home__actions .tp-btn { min-height:2.2rem; min-width:11rem; justify-content:center; padding-inline:1rem; font-size:.78rem; }
.td-stack .td-manager { margin-top:.75rem; }

/* ------------------------------------------------------------------ */
/*  DASHBOARD BUTTON MICRO-INTERACTIONS — UI ONLY                    */
/* ------------------------------------------------------------------ */

.td-dashboard-page .tp-btn {
  --td-btn-glow: rgba(37, 99, 235, 0.24);
  position: relative;
  isolation: isolate;
  overflow: hidden;
  border-radius: 2px;
  transition:
    transform 180ms cubic-bezier(.22,1,.36,1),
    box-shadow 220ms ease,
    border-color 180ms ease,
    background-position 420ms ease,
    letter-spacing 180ms ease;
}

.td-dashboard-page .tp-btn::before {
  content: "";
  position: absolute;
  inset: -45%;
  z-index: -2;
  background: linear-gradient(115deg, transparent 28%, rgba(255,255,255,.32) 46%, rgba(125,211,252,.34) 52%, transparent 70%);
  transform: translateX(-55%) rotate(8deg);
  transition: transform 520ms cubic-bezier(.22,1,.36,1);
  pointer-events: none;
}

.td-dashboard-page .tp-btn::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  box-shadow: 0 0 0 0 var(--td-btn-glow), 0 0 0 0 rgba(56,189,248,.08);
  transition: box-shadow 220ms ease;
  pointer-events: none;
}

.td-dashboard-page .tp-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  letter-spacing: .005em;
  box-shadow: 0 8px 22px -14px rgba(16,42,67,.42), 0 0 14px -5px var(--td-btn-glow);
}

.td-dashboard-page .tp-btn:hover:not(:disabled)::before {
  transform: translateX(55%) rotate(8deg);
}

.td-dashboard-page .tp-btn:hover:not(:disabled)::after {
  box-shadow: 0 0 0 1px var(--td-btn-glow), 0 0 18px 1px rgba(56,189,248,.12);
}

.td-dashboard-page .tp-btn:active:not(:disabled) {
  transform: translateY(1px) scale(.985);
  letter-spacing: 0;
  box-shadow: 0 2px 8px -6px rgba(16,42,67,.45), 0 0 10px -5px var(--td-btn-glow);
}

.td-dashboard-page .tp-btn:active:not(:disabled)::after {
  box-shadow: 0 0 0 2px rgba(56,189,248,.22), 0 0 24px 4px rgba(56,189,248,.16);
  transition-duration: 80ms;
}

.td-dashboard-page .tp-btn:focus-visible {
  outline: 2px solid #60a5fa;
  outline-offset: 3px;
}

.td-dashboard-page .tp-btn:disabled {
  cursor:wait;
  transform:none;
}

/* A cleaner neon-blue treatment for the main actions. */
.td-dashboard-page .tp-btn--primary {
  --td-btn-glow: rgba(37,99,235,.32);
  border-color: #3b82f6;
}

.td-dashboard-page .tp-btn--quiet {
  --td-btn-glow: rgba(56,189,248,.28);
}

.td-dashboard-page .tp-btn--link {
  --td-btn-glow: rgba(37,99,235,.2);
}

@media (prefers-reduced-motion: reduce) {
  .td-dashboard-page .tp-btn,
  .td-dashboard-page .tp-btn::before,
  .td-dashboard-page .tp-btn::after {
    transition:none;
  }
}


@media (max-width:639px) {
  .td-dashboard-page .tp-page-head__content { align-items:flex-start; }
  .td-dashboard-page .tp-page-head__visual { width:3.1rem; height:3.1rem; border-radius:1rem; }
  .td-dashboard-page .tp-page-title { font-size:1.8rem; }
  .td-welcome-script { white-space:normal; border-right:0; animation:td-head-in .7s .25s both; }
  .td-welcome-stats { gap:.4rem; }
  .td-home__groups { grid-template-columns:1fr !important; }
  .td-stack .td-home__group, .td-stack .td-home__group--lease { padding:1rem 0 .25rem; border-left:0; }
  .td-stack .td-home__group--lease { border-top:1px solid #e7eef7; }
}


/* Make the welcome area immediately readable and inviting. */
.tp-page-head {
  margin-bottom: 1.75rem;
  padding: 0.25rem 0;
}

.tp-page-title {
  color: #102a43 !important;
  font-size: clamp(1.75rem, 2.6vw, 2.25rem);
  font-weight: 750;
  letter-spacing: -0.04em;
  line-height: 1.1;
}

.tp-page-sub {
  max-width: 48rem;
  margin-top: 0.5rem;
  color: #5d7087 !important;
  font-size: 0.9375rem;
  line-height: 1.55;
}

.td-stack .tp-section__title,
.td-stack .td-tile__head h2,
.td-stack .td-home__name,
.td-stack .td-feed__title,
.td-stack .td-vacancy__name {
  color: #102a43;
}

.td-stack .tp-label {
  color: #6f8197;
}

/* Primary rent action: rich blue hero with high-contrast type. */
.td-stack .td-rent {
  position: relative;
  overflow: hidden;
  min-height: 18rem;
  padding: 1.6rem;
  border: 1px solid #1e4f9f;
  border-radius: 1.25rem;
  background:
    radial-gradient(circle at 100% 0%, rgba(112, 166, 255, 0.28), transparent 38%),
    linear-gradient(145deg, #0d2d52 0%, #164e8e 58%, #2563b8 100%);
  box-shadow: 0 18px 42px -24px rgba(16, 42, 67, 0.5);
  color: #fff;
}

.td-stack .td-rent::after {
  content: "";
  position: absolute;
  width: 10rem;
  height: 10rem;
  right: -4rem;
  bottom: -5rem;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.12);
  pointer-events: none;
}

.td-stack .td-rent .tp-label {
  color: rgba(255, 255, 255, 0.72);
}

.td-stack .td-rent__amount {
  color: #fff;
  font-size: clamp(2.35rem, 4vw, 3rem);
  font-weight: 760;
}

.td-stack .td-rent__due {
  color: rgba(255, 255, 255, 0.78);
}

.td-stack .td-rent__due svg {
  color: #a9ceff;
}

.td-stack .td-rent__last {
  border-top-color: rgba(255, 255, 255, 0.16);
  color: rgba(255, 255, 255, 0.78);
}

.td-stack .td-rent__last strong {
  color: #fff;
}

.td-stack .td-rent__last svg {
  color: #8ee2b0;
}

.td-stack .td-rent__last .tp-btn--link {
  color: #dcecff;
}

.td-stack .td-rent__last .tp-btn--link:hover {
  color: #fff;
}

.td-stack .td-rent .tp-pill--wait {
  border-color: rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.td-stack .td-rent .tp-pill--good {
  border-color: rgba(167, 243, 208, 0.35);
  background: rgba(167, 243, 208, 0.16);
  color: #d9ffe9;
}

.td-stack .td-rent .tp-pill--bad {
  border-color: rgba(254, 202, 202, 0.35);
  background: rgba(254, 202, 202, 0.16);
  color: #ffe1e1;
}

.td-stack .td-rent .tp-btn--primary {
  background: #fff;
  color: #174ea6;
  box-shadow: 0 6px 18px -10px rgba(0, 0, 0, 0.45);
}

.td-stack .td-rent .tp-btn--primary:hover {
  background: #eef5ff;
}

.td-stack .td-rent .tp-btn--quiet {
  border-color: rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.td-stack .td-rent .tp-btn--quiet:hover {
  border-color: rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.15);
}

/* White cards: clearer hierarchy, softer borders, more breathing room. */
.td-stack .tp-card,
.td-stack .tp-section > .tp-card {
  border-color: #e4e7e1;
  border-radius: 1.35rem;
  background: #fff;
  box-shadow: 0 10px 30px rgba(16, 42, 67, 0.04);
  transition: transform 240ms cubic-bezier(.22,1,.36,1), box-shadow 260ms ease, border-color 220ms ease;
}

/* Every dashboard card gently lifts and glows on hover. */
.td-dashboard-page .tp-card:hover {
  transform: translateY(-4px) scale(1.012);
  border-color: #cfe0f3;
  box-shadow: 0 18px 38px rgba(16, 42, 67, 0.075), 0 0 24px rgba(56, 189, 248, 0.09);
}

.td-dashboard-page .tp-card:focus-within {
  border-color: #c7dcf5;
  box-shadow: 0 16px 34px rgba(16, 42, 67, 0.065), 0 0 20px rgba(56, 189, 248, 0.08);
}

@media (prefers-reduced-motion: reduce) {
  .td-dashboard-page .tp-card { transition:none; }
  .td-dashboard-page .tp-card:hover { transform:none; }
}

.td-stack .td-home,
.td-stack .td-tile {
  padding: 1.4rem;
}

.td-stack .td-home__mark {
  width: 3rem;
  height: 3rem;
  border: 1px solid #d7e6fb;
  border-radius: 0.9rem;
  background: #edf4ff;
  color: #2563eb;
}

.td-stack .td-home__name {
  font-size: 1.125rem;
  font-weight: 700;
}

.td-stack .td-home__where,
.td-stack .td-feed__text,
.td-stack .tp-section__sub {
  color: #5d7087;
}

.td-stack .td-facts,
.td-stack .td-lease__grid {
  border-top-color: #e7eef7;
}

.td-stack .td-facts dd,
.td-stack .td-lease__grid dd {
  color: #102a43;
}

.td-stack .td-manager {
  border: 1px solid #e7eef7;
  background: #f7faff;
  color: #435a73;
}

.td-stack .td-manager svg {
  color: #2563eb;
}

.td-stack .td-manager a {
  color: #174ea6;
}

.td-stack .td-tile {
  border-top: 3px solid #e8f1ff;
  overflow:hidden;
}

/* ---------- maintenance + lease: premium homely treatment ---------- */
.td-stack .td-tile {
  gap:1.25rem;
  padding:1.5rem;
}

.td-stack .td-tile__head {
  gap:.7rem;
  padding-bottom:.15rem;
}

.td-stack .td-tile__head svg {
  width:1.2rem;
  height:1.2rem;
  padding:.45rem;
  box-sizing:content-box;
  border-radius:.8rem;
  background:#edf5ff;
  color:#3b6fae;
}

.td-stack .td-tile__head h2 {
  font-size:1.05rem;
  font-weight:700;
  letter-spacing:-.025em;
}

.td-stack .td-counts {
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:.75rem;
}

.td-stack .td-count {
  min-width:0;
  padding:1rem 1rem .9rem;
  border:1px solid #edf0eb;
  border-radius:1rem;
  background:#fbfcfa;
}

.td-stack .td-count dd {
  margin:0;
  font-size:2rem;
  font-weight:750;
  letter-spacing:-.045em;
  line-height:1;
}

.td-stack .td-count dt {
  margin-top:.45rem;
  color:#899487;
  font-size:.7rem;
  font-weight:650;
  letter-spacing:.04em;
  text-transform:uppercase;
}

.td-stack .td-count--open { background:#fffbf1; border-color:#f3e7c9; }
.td-stack .td-count--open dd { color:#9a6a1a; }
.td-stack .td-count--done { background:#f6faf5; border-color:#dfeadf; }
.td-stack .td-count--done dd { color:#52755b; }

.td-stack .td-mini {
  gap:.25rem;
  padding:.2rem .25rem 0;
}

.td-stack .td-mini li {
  padding:.7rem .15rem;
  border-top-color:#eef1ed;
  color:#405448;
}

.td-stack .td-tile__foot {
  margin-top:auto;
  padding-top:.25rem;
}

.td-stack .td-tile__foot .tp-btn {
  width:100%;
  min-height:2.8rem;
  justify-content:center;
  padding-inline:1.1rem;
  border-radius:10px;
}

.td-stack .td-tile__foot .tp-btn--primary {
  border-color:#5d88b8;
  background:linear-gradient(135deg,#3e6f9f,#5689b8);
  color:#fff;
  box-shadow:0 8px 20px -14px rgba(62,111,159,.6);
}

.td-stack .td-tile__foot .tp-btn--quiet {
  border-color:#d3e0eb;
  background:#f8fbfe;
  color:#315d86;
}

/* Empty maintenance state: reassuring rather than merely numerical. */
.td-stack .td-counts + .td-tile__foot::before {
  content:"All clear — no current issues.";
  display:block;
  margin-bottom:.75rem;
  padding:.65rem .75rem;
  border-radius:.8rem;
  background:#f6faf5;
  color:#5b7460;
  font-size:.75rem;
  line-height:1.4;
}

.td-stack .td-counts + .td-mini + .td-tile__foot::before {
  display:none;
}

/* Lease: calm editorial 2×2 financial/contract grid. */
.td-stack .td-lease__grid {
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:.75rem;
  padding-top:0;
  border-top:0;
}

.td-stack .td-lease__grid > div {
  min-width:0;
  padding:1rem;
  border:1px solid #edf0eb;
  border-radius:1rem;
  background:#fcfcfa;
}

.td-stack .td-lease__grid dt {
  color:#929a91;
  font-size:.68rem;
  font-weight:650;
  letter-spacing:.045em;
  text-transform:uppercase;
}

.td-stack .td-lease__grid dd {
  margin-top:.42rem;
  color:#243b53;
  font-size:.94rem;
  font-weight:650;
  line-height:1.35;
}

.td-stack .td-lease__grid dd.tp-money {
  color:#173b60;
  font-size:1rem;
  font-weight:750;
  letter-spacing:-.02em;
}

.td-stack .td-progress {
  height:.35rem;
  margin-top:.15rem;
  border-radius:999px;
  background:#edf1ee;
}

.td-stack .td-progress span {
  background:linear-gradient(90deg,#6f94b9,#8db2d3);
}

.td-stack .td-progress__note {
  margin-top:.45rem;
  color:#7d897f;
}

@media (max-width:639px) {
  .td-stack .td-counts,
  .td-stack .td-lease__grid { grid-template-columns:1fr 1fr; }
  .td-stack .td-count { padding:.85rem; }
  .td-stack .td-lease__grid > div { padding:.85rem; }
}


.td-stack .td-tile__head svg {
  width: 1.125rem;
  height: 1.125rem;
  color: #2563eb;
}

.td-stack .td-count dd {
  font-size: 1.7rem;
}

.td-stack .td-count--open dd {
  color: #a16207;
}

.td-stack .td-count--done dd {
  color: #15803d;
}

.td-stack .td-mini li,
.td-stack .td-feed li {
  border-top-color: #edf2f7;
}

.td-stack .td-mini__title {
  color: #243b53;
}

.td-stack .td-progress {
  height: 0.5rem;
  background: #eaf0f7;
}

.td-stack .td-progress span {
  background: linear-gradient(90deg, #2563eb, #4f8df7);
}

.td-stack .td-progress__note {
  color: #6a7d92;
}

.td-stack .td-feed__icon {
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid #e5edf7;
  background: #f6f9fd;
}

.td-stack .td-feed__when,
.td-stack .td-vacancy__meta {
  color: #74869a;
}

.td-stack .td-vacancy {
  border-color: #dce7f5;
  border-radius: 1rem;
  box-shadow: 0 5px 20px -18px rgba(16, 42, 67, 0.45);
}

.td-stack .td-vacancy:hover {
  border-color: #b9d2f4;
  box-shadow: 0 14px 28px -20px rgba(37, 99, 235, 0.35);
  transform: translateY(-2px);
}

.td-stack .tp-empty {
  border-color: #dce7f5;
}

.td-stack .tp-empty__icon {
  border: 1px solid #d7e6fb;
  background: #edf4ff;
}

.td-stack .tp-btn {
  border-radius: 0.7rem;
}

.td-stack .tp-btn--primary {
  box-shadow: 0 6px 16px -10px rgba(37, 99, 235, 0.55);
}

.td-stack .td-alert {
  border-color: #f3d78a;
  background: #fff9e8;
  color: #754c05;
}

@media (max-width: 639px) {
  .tp-page-head {
    align-items: flex-start;
    gap: 0.75rem;
  }

  .tp-page-head > div {
    width: 100%;
  }

  .td-stack {
    gap: 1rem;
  }

  .td-stack .td-rent,
  .td-stack .td-home,
  .td-stack .td-tile {
    padding: 1.15rem;
    border-radius: 1rem;
  }

  .td-stack .td-rent {
    min-height: auto;
  }

  .td-stack .td-rent__top {
    gap: 0.75rem;
  }

  .td-stack .td-rent__amount {
    font-size: 2.2rem;
  }
}



/* Section entrance motion */
.td-reveal{opacity:0;transform:translateY(28px);animation:td-slide-up .72s cubic-bezier(.22,1,.36,1) both}
.td-reveal:nth-of-type(1){animation-delay:.06s}
.td-reveal:nth-of-type(2){animation-delay:.14s}
.td-reveal:nth-of-type(3){animation-delay:.22s}
.td-reveal:nth-of-type(4){animation-delay:.30s}
.td-reveal:nth-of-type(5){animation-delay:.38s}
@keyframes td-slide-up{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
@media(prefers-reduced-motion:reduce){.td-reveal{opacity:1;transform:none;animation:none}}
`;
 

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */
 
type PaymentStatus = "paid" | "pending" | "overdue" | "partial";
type RequestStatus = "open" | "in_progress" | "completed" | "cancelled";
type LeaseStatus = "pending" | "upcoming" | "active" | "notice" | "ended" | "terminated";
 
interface TenantHome {
  property_name: string | null;
  unit_number: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  bedrooms: number | string | null;
  manager_name: string | null;
  manager_logo_url: string | null;
  manager_phone: string | null;
  manager_email: string | null;
}
 
interface TenantLease {
  status: LeaseStatus | null;
  start_date: string | null;
  end_date: string | null;
  monthly_rent: number | string | null;
  deposit_amount: number | string | null;
}
 
interface RentSummary {
  amount_due: number | string | null;
  due_date: string | null;
  status: PaymentStatus | null;
  balance: number | string | null;
}
 
interface TenantPayment {
  id: number | string;
  amount: number | string | null;
  payment_date: string | null;
  payment_method: string | null;
  reference: string | null;
  status: PaymentStatus | null;
  period: string | null;
}
 
interface TenantRequest {
  id: number | string;
  title: string;
  status: RequestStatus | null;
  reported_date: string | null;
  completed_date: string | null;
}
 
interface TenantNotification {
  id: number | string;
  type: string | null;
  title: string;
  body: string | null;
  created_at: string | null;
  read_at: string | null;
}
 
interface Vacancy {
  id: number | string;
  property_name: string | null;
  unit_number: string | null;
  unit_type: string | null;
  city: string | null;
  monthly_rent: number | string | null;
}
 
interface TenantOverview {
  home: TenantHome | null;
  lease: TenantLease | null;
  rent: RentSummary | null;
}
 
/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */
 
function readStored(key: string): string | null {
  return localStorage.getItem(key) ?? sessionStorage.getItem(key);
}
 
function readCurrency(): string {
  const raw = readStored("organization");
  if (!raw) return "KSh";
 
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      const value = (parsed as Record<string, unknown>).currency;
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  } catch {
    /* fall through to the default */
  }
 
  return "KSh";
}
 
function toNumber(value: number | string | null | undefined): number {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : 0;
}
 
function money(value: number | string | null | undefined, currency: string) {
  return `${currency} ${new Intl.NumberFormat("en-KE", {
    maximumFractionDigits: 0,
  }).format(Math.round(toNumber(value)))}`;
}
 
function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
 
function shortDate(value: string | null | undefined): string {
  const date = parseDate(value);
  if (!date) return "—";
  return date.toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}
 
function longDate(value: string | null | undefined): string {
  const date = parseDate(value);
  if (!date) return "—";
  return date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
 
function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}
 
function relativeDay(value: string | null | undefined): string {
  const date = parseDate(value);
  if (!date) return "";
 
  const days = daysBetween(date, new Date());
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return shortDate(value);
}
 
function unwrap<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && "data" in payload) {
    const data = (payload as { data?: unknown }).data;
    if (Array.isArray(data)) return data as T[];
  }
  return [];
}
 
function asOverview(payload: unknown): TenantOverview {
  const empty: TenantOverview = { home: null, lease: null, rent: null };
  if (!payload || typeof payload !== "object") return empty;
 
  const record = payload as Record<string, unknown>;
  const source =
    record.data && typeof record.data === "object"
      ? (record.data as Record<string, unknown>)
      : record;
 
  return {
    home: (source.home as TenantHome | undefined) ?? null,
    lease: (source.lease as TenantLease | undefined) ?? null,
    rent: (source.rent as RentSummary | undefined) ?? null,
  };
}
 
function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
 
function leaseStatusMeta(status: LeaseStatus | null) {
  if (status === "active") return { className: "tp-pill--good", label: "Active" };
  if (status === "upcoming") return { className: "tp-pill--info", label: "Upcoming" };
  if (status === "pending") return { className: "tp-pill--wait", label: "Pending" };
  if (status === "notice") return { className: "tp-pill--wait", label: "Notice" };
  return { className: "tp-pill--mute", label: "Inactive" };
}

function rentTone(status: PaymentStatus | null, due: string | null) {
  if (status === "paid") return { className: "tp-pill--good", label: "Paid" };
  if (status === "overdue") return { className: "tp-pill--bad", label: "Overdue" };
  if (status === "partial")
    return { className: "tp-pill--wait", label: "Part paid" };
 
  const dueDate = parseDate(due);
  if (dueDate && daysBetween(new Date(), dueDate) < 0) {
    return { className: "tp-pill--bad", label: "Overdue" };
  }
 
  return { className: "tp-pill--wait", label: "Due" };
}
 
const REQUEST_LABEL: Record<RequestStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  completed: "Resolved",
  cancelled: "Closed",
};
 
function requestTone(status: RequestStatus | null): string {
  if (status === "completed") return "tp-pill--good";
  if (status === "in_progress") return "tp-pill--info";
  if (status === "cancelled") return "tp-pill--mute";
  return "tp-pill--wait";
}
 
function notificationTone(type: string | null): "good" | "wait" | "info" | "" {
  if (!type) return "";
  if (type.includes("payment")) return "good";
  if (type.includes("maintenance")) return "info";
  if (type.includes("lease")) return "wait";
  return "";
}
 
function notificationIcon(type: string | null) {
  if (!type) return <Bell />;
  if (type.includes("payment")) return <CheckCircle2 />;
  if (type.includes("maintenance")) return <Wrench />;
  if (type.includes("lease")) return <FileText />;
  if (type.includes("announcement")) return <Megaphone />;
  return <Bell />;
}
 
/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */
 
function TenantDashboardPage() {
  const navigate = useNavigate();
  const currency = useMemo(readCurrency, []);
 
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
 
  const [overview, setOverview] = useState<TenantOverview>({
    home: null,
    lease: null,
    rent: null,
  });
  const [payments, setPayments] = useState<TenantPayment[]>([]);
  const [requests, setRequests] = useState<TenantRequest[]>([]);
  const [notifications, setNotifications] = useState<TenantNotification[]>([]);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
 
  const load = useCallback(async () => {
    setError("");
    setNotice("");
 
    const [
      overviewResult,
      paymentsResult,
      requestsResult,
      notificationsResult,
      vacanciesResult,
    ] = await Promise.allSettled([
      apiRequest("/tenant/overview"),
      apiRequest("/tenant/payments"),
      apiRequest("/tenant/maintenance-requests"),
      apiRequest("/tenant/notifications"),
      apiRequest("/tenant/vacancies"),
    ]);
 
    if (overviewResult.status === "fulfilled") {
      const nextOverview = asOverview(overviewResult.value);
      setOverview(nextOverview);

      if (nextOverview.home?.manager_logo_url !== undefined) {
        try {
          const raw =
            localStorage.getItem("organization") ??
            sessionStorage.getItem("organization");
          const existing = raw ? JSON.parse(raw) : {};
          const next = {
            ...existing,
            name: nextOverview.home?.manager_name ?? existing.name,
            logo_url: nextOverview.home?.manager_logo_url ?? null,
          };
          localStorage.setItem("organization", JSON.stringify(next));
          sessionStorage.setItem("organization", JSON.stringify(next));
          window.dispatchEvent(new CustomEvent("pms:organization"));
        } catch {
          // The overview data remains authoritative for this page.
        }
      }
    } else {
      setError(
        overviewResult.reason instanceof Error
          ? overviewResult.reason.message
          : "We couldn't load your home details."
      );
    }
 
    if (paymentsResult.status === "fulfilled") {
      setPayments(unwrap<TenantPayment>(paymentsResult.value));
    }
 
    if (requestsResult.status === "fulfilled") {
      setRequests(unwrap<TenantRequest>(requestsResult.value));
    } else {
      setNotice(
        "Maintenance history is unavailable right now — you can still submit a request."
      );
    }
 
    if (notificationsResult.status === "fulfilled") {
      setNotifications(unwrap<TenantNotification>(notificationsResult.value));
    }
 
    if (vacanciesResult.status === "fulfilled") {
      setVacancies(unwrap<Vacancy>(vacanciesResult.value));
    }
 
    setLoading(false);
    setRefreshing(false);
  }, []);
 
  useEffect(() => {
    void load();
  }, [load]);
 
  const openRequests = useMemo(
    () =>
      requests.filter(
        (item) => item.status === "open" || item.status === "in_progress"
      ),
    [requests]
  );
 
  const resolvedRequests = useMemo(
    () => requests.filter((item) => item.status === "completed"),
    [requests]
  );
 
  const lastPayment = useMemo(() => {
    const paid = payments
      .filter((payment) => payment.status !== "pending")
      .slice()
      .sort((a, b) => {
        const left = parseDate(a.payment_date)?.getTime() ?? 0;
        const right = parseDate(b.payment_date)?.getTime() ?? 0;
        return right - left;
      });
 
    return paid[0] ?? null;
  }, [payments]);
 
  const unread = useMemo(
    () => notifications.filter((item) => !item.read_at).length,
    [notifications]
  );
 
  const home = overview.home;
  const lease = overview.lease;
  const rent = overview.rent;
 
  const residence = [home?.property_name, home?.unit_number]
    .filter(Boolean)
    .join(" · ");
 
  const rentStatus = rentTone(rent?.status ?? null, rent?.due_date ?? null);
  const dueDate = parseDate(rent?.due_date ?? null);
  const daysToDue = dueDate ? daysBetween(new Date(), dueDate) : null;
 
  const leaseProgress = useMemo(() => {
    const start = parseDate(lease?.start_date ?? null);
    const end = parseDate(lease?.end_date ?? null);
    if (!start || !end || end <= start) return null;
 
    const total = daysBetween(start, end);
    const done = daysBetween(start, new Date());
    const percent = Math.min(100, Math.max(0, Math.round((done / total) * 100)));
 
    return { percent, daysLeft: Math.max(0, daysBetween(new Date(), end)) };
  }, [lease]);
 
  function refresh() {
    setRefreshing(true);
    void load();
  }
 
  return (
    <TenantDashboardLayout
      pageClassName="td-dashboard-page"
      title={`${greeting()}, ${readTenantFirstName()}`}
      subtitle={residence || "Your home"}
      headerVisual={new Date().getHours() >= 18 ? <Moon /> : <Sun />}
      headerExtras={
        <>
          <p className="td-welcome-script">Everything about your home in one place.</p>
          <div className="td-welcome-stats" aria-label="Quick home status">
            {(() => {
              const meta = leaseStatusMeta(lease?.status ?? null);
              const tone = meta.className === "tp-pill--good" ? "good" : meta.className === "tp-pill--wait" ? "wait" : meta.className === "tp-pill--info" ? "info" : "mute";
              return <span className={`td-welcome-stat td-welcome-stat--${tone}`}><span className="td-welcome-stat__dot" aria-hidden="true" />Lease status: {meta.label}</span>;
            })()}
            <span className="td-welcome-stat td-welcome-stat--info"><CalendarDays />Next inspection: —</span>
          </div>
        </>
      }
      unreadNotifications={unread}
      openRequests={openRequests.length}
      actions={
        <button
          type="button"
          className="tp-btn tp-btn--quiet"
          onClick={refresh}
          disabled={refreshing}
        >
          <RefreshCw />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      }
    >
      <style>{styles}</style>
 
      <div className="td-stack">
        {error && (
          <p className="td-alert" role="status">
            <Bell />
            {error}
          </p>
        )}
 
        {notice && !error && (
          <p className="td-alert" role="status">
            <Wrench />
            {notice}
          </p>
        )}
 
        {/* ---------- rent + my home ---------- */}
        <section className="td-lead" aria-label="Rent and home">
          {loading ? (
            <span className="tp-skeleton td-skeleton-lead" />
          ) : (
            <article className="td-rent">
              <div className="td-rent__top">
                <div>
                  <p className="tp-label">Rent due</p>
                  <p className="td-rent__amount tp-money">
                    {money(rent?.amount_due ?? lease?.monthly_rent, currency)}
                  </p>
                  <p className="td-rent__due">
                    <CalendarClock />
                    {rent?.due_date
                      ? `Due ${longDate(rent.due_date)}`
                      : "No due date set"}
                    {daysToDue !== null && daysToDue >= 0 && daysToDue <= 7
                      ? ` · in ${daysToDue} day${daysToDue === 1 ? "" : "s"}`
                      : ""}
                  </p>
                </div>
 
                <span className={`tp-pill ${rentStatus.className}`}>
                  {rentStatus.label}
                </span>
              </div>
 
              <div className="td-rent__actions">
                <button
                  type="button"
                  className="tp-btn tp-btn--primary"
                  onClick={() => navigate("/tenant/payments?action=pay")}
                >
                  <CreditCard />
                  Pay rent
                </button>
                <Link to="/tenant/payments" className="tp-btn tp-btn--quiet">
                  <Receipt />
                  Statements
                </Link>
              </div>
 
              <div className="td-rent__last">
                {lastPayment ? (
                  <>
                    <CheckCircle2 />
                    <span>
                      Last payment{" "}
                      <strong>{money(lastPayment.amount, currency)}</strong> on{" "}
                      {longDate(lastPayment.payment_date)}
                    </span>
                  </>
                ) : (
                  <>
                    <Receipt />
                    <span>No payments recorded yet.</span>
                  </>
                )}
                <Link to="/tenant/payments" className="tp-btn tp-btn--link">
                  History
                </Link>
              </div>
            </article>
          )}
 
          {loading ? (
            <span className="tp-skeleton td-skeleton-lead" />
          ) : (
            <article className="tp-card td-home">
              <div className="td-home__head">
                <span className="td-home__mark" aria-hidden="true">
                  <Home />
                </span>
                <div>
                  <h2 className="td-home__name">
                    {home?.property_name ?? "Your home"}
                  </h2>
                  <p className="td-home__where">
                    <MapPin />
                    {[home?.address, home?.city, home?.country]
                      .filter(Boolean)
                      .join(", ") || "Address not on file"}
                  </p>
                </div>
              </div>
 
              <div className="td-home__groups">
                <section className="td-home__group" aria-label="Unit information">
                  <p className="td-home__group-title">Unit information</p>
                  <div className="td-home__data">
                    <div className="td-home__data-row"><Building2 /><div><dt>Building</dt><dd>{home?.property_name ?? "Your home"}</dd></div></div>
                    <div className="td-home__data-row"><KeyRound /><div><dt>Unit</dt><dd>{home?.unit_number ?? "—"}</dd></div></div>
                    <div className="td-home__data-row"><MapPin /><div><dt>Location</dt><dd>{[home?.city, home?.country].filter(Boolean).join(", ") || "—"}</dd></div></div>
                  </div>
                </section>
                <section className="td-home__group td-home__group--lease" aria-label="Financial and lease information">
                  <p className="td-home__group-title">Financial & lease</p>
                  <div className="td-home__data">
                    <div className="td-home__data-row"><CreditCard /><div><dt>Monthly rent</dt><dd className="tp-money">{money(lease?.monthly_rent, currency)}</dd></div></div>
                    <div className="td-home__data-row"><FileText /><div><dt>Lease status</dt><dd>{(() => { const meta = leaseStatusMeta(lease?.status); return <span className={`tp-pill ${meta.className}`}>{meta.label}</span>; })()}</dd></div></div>
                    <div className="td-home__data-row"><CalendarDays /><div><dt>Lease ends</dt><dd>{longDate(lease?.end_date)}</dd></div></div>
                  </div>
                </section>
              </div>

              <div className="td-manager">
                {home?.manager_logo_url ? (
                  <img
                    src={home.manager_logo_url}
                    alt=""
                    className="td-manager__logo"
                  />
                ) : (
                  <ShieldCheck />
                )}
                <span>{home?.manager_name ?? "Property management"}</span>
                {home?.manager_phone && (
                  <a href={`tel:${home.manager_phone}`}>
                    <Phone aria-hidden="true" /> {home.manager_phone}
                  </a>
                )}
              </div>

              <div className="td-home__actions">
                <Link to="/tenant/home" className="tp-btn tp-btn--quiet">
                  <Home />
                  View my home
                </Link>
              </div>
            </article>
          )}
        </section>
 
        {/* ---------- maintenance + lease ---------- */}
        <section className="td-duo" aria-label="Maintenance and lease">
          {loading ? (
            <span className="tp-skeleton td-skeleton-tile" />
          ) : (
            <article className="tp-card td-tile">
              <div className="td-tile__head">
                <Wrench />
                <h2>Maintenance</h2>
              </div>
 
              <dl className="td-counts">
                <div className="td-count td-count--open">
                  <dt className="tp-label">Open</dt>
                  <dd>{openRequests.length}</dd>
                </div>
                <div className="td-count td-count--done">
                  <dt className="tp-label">Resolved</dt>
                  <dd>{resolvedRequests.length}</dd>
                </div>
              </dl>
 
              {openRequests.length > 0 && (
                <ul className="td-mini">
                  {openRequests.slice(0, 2).map((request) => (
                    <li key={String(request.id)}>
                      <span className="td-mini__title">{request.title}</span>
                      <span className="td-mini__meta">
                        <span
                          className={`tp-pill ${requestTone(request.status)}`}
                        >
                          {REQUEST_LABEL[request.status ?? "open"]}
                        </span>
                        <span className="td-mini__when">
                          {relativeDay(request.reported_date)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
 
              <div className="td-tile__foot">
                <Link
                  to="/tenant/maintenance?action=new"
                  className="tp-btn tp-btn--primary"
                >
                  <Wrench />
                  Report a problem
                </Link>
              </div>
            </article>
          )}
 
          {loading ? (
            <span className="tp-skeleton td-skeleton-tile" />
          ) : (
            <article className="tp-card td-tile">
              <div className="td-tile__head">
                <FileText />
                <h2>Lease</h2>
              </div>
 
              <dl className="td-lease__grid">
                <div>
                  <dt className="tp-label">Starts</dt>
                  <dd>{longDate(lease?.start_date)}</dd>
                </div>
                <div>
                  <dt className="tp-label">Ends</dt>
                  <dd>{longDate(lease?.end_date)}</dd>
                </div>
                <div>
                  <dt className="tp-label">Monthly rent</dt>
                  <dd className="tp-money">
                    {money(lease?.monthly_rent, currency)}
                  </dd>
                </div>
                <div>
                  <dt className="tp-label">Deposit held</dt>
                  <dd className="tp-money">
                    {money(lease?.deposit_amount, currency)}
                  </dd>
                </div>
              </dl>
 
              {leaseProgress && (
                <div>
                  <div
                    className="td-progress"
                    role="progressbar"
                    aria-valuenow={leaseProgress.percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Lease term elapsed"
                  >
                    <span style={{ width: `${leaseProgress.percent}%` }} />
                  </div>
                  <p className="td-progress__note">
                    {leaseProgress.daysLeft} days left on this lease
                  </p>
                </div>
              )}
 
              <div className="td-tile__foot">
                <Link to="/tenant/lease" className="tp-btn tp-btn--quiet">
                  <FileText />
                  View lease details
                </Link>
              </div>
            </article>
          )}
        </section>
 
        {/* ---------- notifications ---------- */}
        <section className="tp-section td-reveal" aria-label="Notifications">
          <div className="tp-section__head td-activity-head">
            <div className="td-activity-head__copy">
              <h2 className="tp-section__title">Recent activity</h2>
              <p className="tp-section__sub">
                Your latest home updates, receipts, and maintenance logs.
              </p>
              <Link to="/tenant/notifications" className="td-activity-see-all">
                See all <ArrowRight />
              </Link>
            </div>
          </div>
 
          {loading ? (
            <span className="tp-skeleton td-skeleton-tile" />
          ) : notifications.length === 0 ? (
            <div className="tp-card td-activity-empty">
              <div className="td-activity-empty__inner">
                <span className="td-activity-empty__icon" aria-hidden="true">
                  <Bell />
                </span>
                <h3 className="td-activity-empty__title">All caught up!</h3>
                <p className="td-activity-empty__text">
                  Your home is quiet right now. Payment receipts, maintenance
                  updates and messages will appear here when there is something
                  new for you.
                </p>
                <div className="td-activity-empty__actions" aria-label="Quick actions">
                  <Link to="/tenant/payments" className="td-activity-pill">
                    Make a payment <ArrowRight />
                  </Link>
                  <Link to="/tenant/maintenance?action=new" className="td-activity-pill">
                    Request maintenance <ArrowRight />
                  </Link>
                  <Link to="/tenant/lease" className="td-activity-pill">
                    Check lease <ArrowRight />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="tp-card">
              <ul className="td-feed">
                {notifications.slice(0, 5).map((item) => (
                  <li
                    key={String(item.id)}
                    className={item.read_at ? undefined : "td-unread"}
                  >
                    <span
                      className="td-feed__icon"
                      data-tone={notificationTone(item.type)}
                      aria-hidden="true"
                    >
                      {notificationIcon(item.type)}
                    </span>
                    <div className="td-feed__body">
                      <p className="td-feed__title">{item.title}</p>
                      {item.body && <p className="td-feed__text">{item.body}</p>}
                    </div>
                    <span className="td-feed__when">
                      {relativeDay(item.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
 
        {/* ---------- vacancies ---------- */}
        {vacancies.length > 0 && (
          <section className="tp-section td-reveal" aria-label="Available properties">
            <div className="td-discovery-head">
              <div className="td-discovery-head__copy">
                <h2 className="tp-section__title">Explore Available Units</h2>
                <p className="tp-section__sub">
                  {vacancies.length} premium{" "}
                  {vacancies.length === 1 ? "space" : "spaces"} managed by{" "}
                  {home?.property_name ?? home?.manager_name ?? "your property manager"}.
                </p>
              </div>
              <Link to="/tenant/vacancies" className="td-discovery-browse">
                Browse All Units <ArrowRight />
              </Link>
            </div>
 
            <div className="td-vacancies">
              {vacancies.slice(0, 3).map((vacancy) => (
                <article className="td-vacancy" key={String(vacancy.id)}>
                  <span className="td-vacancy__anchor" aria-hidden="true">
                    <Building2 />
                  </span>

                  <div className="td-vacancy__body">
                    <h3 className="td-vacancy__name">
                      {vacancy.property_name ?? "Available unit"}
                    </h3>
                    <p className="td-vacancy__meta">
                      {[vacancy.unit_type, vacancy.unit_number]
                        .filter(Boolean)
                        .join(" • ") || "Space details on request"}
                    </p>
                    <div className="td-vacancy__context">
                      {vacancy.city && <span>{vacancy.city}</span>}
                      <span>Managed residence</span>
                    </div>
                    <span className="td-vacancy__badge">
                      <span className="td-vacancy__badge-dot" aria-hidden="true" />
                      Available now
                    </span>
                  </div>

                  <div className="td-vacancy__price" aria-label="Monthly rent">
                    <p className="td-vacancy__rent tp-money">
                      {money(vacancy.monthly_rent, currency)}
                    </p>
                    <span className="td-vacancy__per">/ month</span>
                  </div>

                  <Link
                    to={`/tenant/vacancies?unit=${vacancy.id}`}
                    className="td-vacancy__link"
                  >
                    View space
                    <ChevronRight />
                  </Link>
                </article>
              ))}
            </div>
          </section>
        )}
 
        <p className="tp-section__sub">
          <Building2
            aria-hidden="true"
            style={{
              width: "0.875rem",
              height: "0.875rem",
              verticalAlign: "-2px",
              marginRight: "0.375rem",
            }}
          />
          Managed by {home?.manager_name ?? "your property manager"}. Need help?{" "}
          <Link to="/tenant/help" className="tp-btn tp-btn--link">
            Contact support
            <ArrowRight style={{ width: "0.875rem", height: "0.875rem" }} />
          </Link>
        </p>
      </div>
    </TenantDashboardLayout>
  );
}
 
function readTenantFirstName(): string {
  const raw = readStored("user");
  if (!raw) return "there";
 
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      const name = (parsed as Record<string, unknown>).name;
      if (typeof name === "string" && name.trim()) {
        return name.trim().split(/\s+/)[0];
      }
    }
  } catch {
    /* fall through to the default */
  }
 
  return "there";
}
 
export default TenantDashboardPage;