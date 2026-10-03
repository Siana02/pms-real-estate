import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import { apiRequest } from "../../services/api";
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock,
  DoorOpen,
  Home,
  MapPin,
  Phone,
  Play,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  TrendingDown,
  Users,
  Sun,
  Moon,
  Wallet,
  Wrench,
  X,
} from "lucide-react";
 
/* ------------------------------------------------------------------ */
/*  STYLES — vanilla CSS                                               */
/* ------------------------------------------------------------------ */
 
const styles = `
:root {
  --db-bg: #030712;
  --db-surface: rgba(15, 23, 42, 0.55);
  --db-glass: rgba(255, 255, 255, 0.05);
  --db-glass-strong: rgba(255, 255, 255, 0.1);
  --db-border: rgba(255, 255, 255, 0.1);
  --db-border-soft: rgba(255, 255, 255, 0.06);
  --db-text: #f8fafc;
  --db-muted: #94a3b8;
  --db-faint: #64748b;
  --db-blue: #3b82f6;
  --db-indigo: #4f46e5;
  --db-danger: #f87171;
  --db-warn: #fbbf24;
  --db-success: #4ade80;
  --db-radius-sm: 0.75rem;
  --db-radius-md: 1rem;
  --db-radius-lg: 1.5rem;
  --db-shadow: 0 30px 60px -20px rgba(0, 0, 0, 0.75);
  --db-shadow-blue: 0 10px 25px -5px rgba(59, 130, 246, 0.3);
  --db-font: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Inter, Roboto,
    "Helvetica Neue", Arial, sans-serif;
}
 
/* ---------- base ---------- */
.db-root,
.db-root * {
  box-sizing: border-box;
  min-width: 0;
}
 
.db-root {
  position: relative;
  min-height: 100%;
  overflow-x: hidden;
  background: var(--db-bg);
  color: var(--db-text);
  font-family: var(--db-font);
  letter-spacing: -0.015em;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
 
.db-root button {
  font-family: inherit;
  color: inherit;
  border: none;
  background: none;
  cursor: pointer;
}
 
.db-root input {
  font-family: inherit;
  font-size: 1rem;
}
 
.db-root a {
  color: inherit;
  text-decoration: none;
}
 
.db-root a:focus-visible,
.db-root button:focus-visible,
.db-root input:focus-visible {
  outline: 2px solid var(--db-blue);
  outline-offset: 2px;
}
 
.db-sr {
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
 
/* ---------- background ---------- */
.db-backdrop {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  background: radial-gradient(
    120% 90% at 15% 0%,
    rgba(30, 41, 59, 0.85) 0%,
    var(--db-bg) 60%
  );
}
 
.db-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.55;
  animation: db-float 14s ease-in-out infinite;
}
 
.db-orb--indigo {
  top: -14rem;
  left: -10rem;
  width: 28rem;
  height: 28rem;
  background: rgba(79, 70, 229, 0.28);
}
 
.db-orb--blue {
  top: 4rem;
  right: -12rem;
  width: 30rem;
  height: 30rem;
  background: rgba(37, 99, 235, 0.2);
  animation-delay: -4s;
}
 
.db-orb--purple {
  bottom: -16rem;
  left: 35%;
  width: 26rem;
  height: 26rem;
  background: rgba(147, 51, 234, 0.18);
  animation-delay: -8s;
}
 
@keyframes db-float {
  0%,
  100% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(0, -1.75rem, 0) scale(1.06); }
}
 
/* ---------- shell ---------- */
.db-shell {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 90rem;
  margin: 0 auto;
  padding: 1.5rem 1.25rem 3rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
 
/* ---------- header ---------- */
.db-header {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
 
.db-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  align-self: flex-start;
  padding: 0.375rem 0.875rem;
  border-radius: 999px;
  border: 1px solid var(--db-border);
  background: var(--db-glass);
  backdrop-filter: blur(12px);
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: #cbd5e1;
}
 
.db-eyebrow svg {
  width: 0.875rem;
  height: 0.875rem;
  color: #60a5fa;
}
 
.db-title {
  margin: 0.875rem 0 0;
  font-size: 1.75rem;
  font-weight: 600;
  line-height: 1.15;
  background: linear-gradient(100deg, #ffffff 0%, #e2e8f0 45%, #94a3b8 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  overflow-wrap: anywhere;
}
 
.db-subtitle {
  margin: 0.625rem 0 0;
  max-width: 38rem;
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--db-muted);
}
 
.db-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
 
.db-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 2.75rem;
  padding: 0.625rem 1.125rem;
  border-radius: var(--db-radius-sm);
  font-size: 0.875rem;
  font-weight: 600;
  transition: background-color 0.25s ease, border-color 0.25s ease,
    transform 0.25s ease, opacity 0.25s ease;
}
 
.db-btn svg { width: 1rem; height: 1rem; }
 
.db-btn--primary {
  color: #fff;
  background: linear-gradient(90deg, var(--db-blue) 0%, var(--db-indigo) 100%);
  box-shadow: var(--db-shadow-blue);
}
 
.db-btn--primary:hover { transform: translateY(-1px); opacity: 0.92; }
 
.db-btn--ghost {
  border: 1px solid var(--db-border);
  background: var(--db-glass);
  backdrop-filter: blur(12px);
  color: #e2e8f0;
}
 
.db-btn--ghost:hover {
  border-color: rgba(255, 255, 255, 0.22);
  background: var(--db-glass-strong);
  transform: translateY(-1px);
}
 
.db-btn:active { transform: translateY(0); }
 
.db-btn[disabled] {
  cursor: not-allowed;
  opacity: 0.55;
  transform: none;
}
 
.db-spin { animation: db-spin 0.9s linear infinite; }
 
@keyframes db-spin {
  to { transform: rotate(360deg); }
}
 
/* ---------- stat cards ---------- */
.db-stats {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}
 
.db-stat {
  position: relative;
  overflow: hidden;
  padding: 1.25rem;
  border-radius: var(--db-radius-md);
  border: 1px solid var(--db-border-soft);
  background: var(--db-surface);
  backdrop-filter: blur(18px);
  box-shadow: 0 18px 40px -28px rgba(0, 0, 0, 0.9);
  transition: border-color 0.25s ease, transform 0.25s ease;
}
 
.db-stat:hover {
  border-color: var(--db-border);
  transform: translateY(-2px);
}
 
.db-stat::after {
  content: "";
  position: absolute;
  top: 0;
  left: 1.25rem;
  right: 1.25rem;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.25),
    transparent
  );
}
 
.db-stat__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}
 
.db-stat__label {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--db-muted);
}
 
.db-stat__icon {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: var(--db-radius-sm);
  border: 1px solid var(--db-border);
  background: var(--db-glass);
  color: #93c5fd;
}
 
.db-stat__icon svg { width: 1.125rem; height: 1.125rem; }
 
.db-stat__value {
  margin: 1rem 0 0;
  font-size: 1.625rem;
  font-weight: 600;
  line-height: 1.1;
  color: #fff;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
 
.db-stat__hint {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin: 0.5rem 0 0;
  font-size: 0.75rem;
  color: var(--db-faint);
}
 
.db-stat__hint svg {
  width: 0.875rem;
  height: 0.875rem;
  flex: none;
  color: var(--db-success);
}
 
.db-stat__hint--warn svg { color: var(--db-warn); }
 
.db-root button.db-stat--action {
  display: block;
  width: 100%;
  text-align: left;
  font: inherit;
  color: inherit;
  border: 1px solid var(--db-border-soft);
  background: var(--db-surface);
  cursor: pointer;
}
 
.db-root button.db-stat--action:hover {
  border-color: rgba(59, 130, 246, 0.45);
}
 
.db-stat--action:hover .db-stat__icon {
  border-color: rgba(59, 130, 246, 0.45);
  color: #bfdbfe;
}
 
.db-stat--action:focus-visible {
  outline: 2px solid var(--db-blue);
  outline-offset: 2px;
}
 
.db-stat__go {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin: 0.5rem 0 0;
  font-size: 0.75rem;
  font-weight: 500;
  color: #93c5fd;
}
 
.db-stat__go svg { width: 0.875rem; height: 0.875rem; }
 
/* ---------- skeletons ---------- */
.db-skeleton {
  display: block;
  border-radius: 0.5rem;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.05) 25%,
    rgba(255, 255, 255, 0.12) 37%,
    rgba(255, 255, 255, 0.05) 63%
  );
  background-size: 400% 100%;
  animation: db-shimmer 1.4s ease infinite;
}
 
.db-skeleton--value { width: 60%; height: 2rem; margin-top: 1rem; }
.db-skeleton--hint { width: 40%; height: 0.75rem; margin-top: 0.75rem; }
.db-skeleton--row { height: 7.5rem; border-radius: var(--db-radius-md); }
.db-skeleton--task { height: 5rem; border-radius: var(--db-radius-md); }
 
@keyframes db-shimmer {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}
 
/* ---------- money / occupancy split ---------- */
.db-split {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}
 
.db-card {
  padding: 1.25rem;
  border-radius: var(--db-radius-md);
  border: 1px solid var(--db-border-soft);
  background: var(--db-surface);
  backdrop-filter: blur(18px);
}
 
.db-card__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
}
 
.db-card__title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #e2e8f0;
}
 
.db-card__title svg {
  width: 1rem;
  height: 1rem;
  color: #93c5fd;
}
 
.db-card__value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #93c5fd;
  font-variant-numeric: tabular-nums;
}
 
.db-bar {
  margin-top: 0.875rem;
  height: 0.5rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.07);
  overflow: hidden;
}
 
.db-bar__fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--db-blue), var(--db-indigo));
  transition: width 0.6s ease;
}
 
.db-card__hint {
  margin: 0.625rem 0 0;
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--db-faint);
}
 
.db-ledger {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
}
 
.db-ledger__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.8125rem;
  color: var(--db-muted);
}
 
.db-ledger__row span:last-child {
  font-variant-numeric: tabular-nums;
  color: #e2e8f0;
  white-space: nowrap;
}
 
.db-ledger__row--minus span:last-child { color: var(--db-danger); }
 
.db-ledger__row--total {
  padding-top: 0.625rem;
  border-top: 1px solid var(--db-border-soft);
  font-weight: 600;
  color: #e2e8f0;
}
 
.db-ledger__row--total span:last-child {
  font-size: 1rem;
  color: var(--db-success);
}
 
/* ---------- panel ---------- */
.db-panel {
  padding: 1.25rem;
  border-radius: var(--db-radius-lg);
  border: 1px solid var(--db-border-soft);
  background: var(--db-surface);
  backdrop-filter: blur(18px);
  box-shadow: var(--db-shadow);
}
 
.db-panel__head {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}
 
.db-panel__title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #fff;
}
 
.db-panel__title svg {
  width: 1.125rem;
  height: 1.125rem;
  color: #93c5fd;
}
 
.db-panel__sub {
  margin: 0.25rem 0 0;
  font-size: 0.8125rem;
  color: var(--db-muted);
}
 
.db-search {
  position: relative;
  width: 100%;
}
 
.db-search svg {
  position: absolute;
  top: 50%;
  left: 0.875rem;
  width: 1rem;
  height: 1rem;
  transform: translateY(-50%);
  color: var(--db-faint);
  pointer-events: none;
}
 
.db-search input {
  width: 100%;
  min-height: 2.75rem;
  padding: 0.625rem 0.875rem 0.625rem 2.5rem;
  border-radius: var(--db-radius-sm);
  border: 1px solid var(--db-border);
  background: var(--db-glass);
  color: #fff;
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.25s ease, box-shadow 0.25s ease,
    background-color 0.25s ease;
}
 
.db-search input::placeholder { color: var(--db-faint); }
 
.db-search input:focus {
  border-color: var(--db-blue);
  background-color: rgba(59, 130, 246, 0.08);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.35);
}
 
/* ---------- filters ---------- */
.db-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}
 
.db-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 2.25rem;
  padding: 0.375rem 0.75rem;
  border-radius: 999px;
  border: 1px solid var(--db-border);
  background: var(--db-glass);
  font-size: 0.8125rem;
  font-weight: 500;
  color: #cbd5e1;
  transition: background-color 0.2s ease, border-color 0.2s ease,
    color 0.2s ease;
}
 
.db-chip:hover {
  border-color: rgba(255, 255, 255, 0.24);
  background: var(--db-glass-strong);
}
 
.db-chip--on {
  border-color: rgba(59, 130, 246, 0.55);
  background: rgba(59, 130, 246, 0.16);
  color: #dbeafe;
}
 
.db-chip__count {
  padding: 0 0.375rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  font-size: 0.6875rem;
  font-variant-numeric: tabular-nums;
}
 
/* ---------- maintenance queue ---------- */
.db-queue {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1.25rem;
}
 
.db-task {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.875rem;
  padding: 1rem;
  border-radius: var(--db-radius-md);
  border: 1px solid var(--db-border-soft);
  border-left: 3px solid var(--db-faint);
  background: var(--db-glass);
  transition: border-color 0.25s ease, background-color 0.25s ease,
    transform 0.25s ease, opacity 0.25s ease;
}
 
.db-task:hover {
  background: var(--db-glass-strong);
  transform: translateY(-2px);
}
 
.db-task--urgent { border-left-color: #ef4444; }
.db-task--high { border-left-color: #fb923c; }
.db-task--medium { border-left-color: #38bdf8; }
.db-task--low { border-left-color: #64748b; }
.db-task--busy { opacity: 0.55; pointer-events: none; }
 
.db-task__main { min-width: 0; }
 
.db-task__tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
}
 
.db-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.3125rem;
  padding: 0.1875rem 0.5rem;
  border-radius: 999px;
  border: 1px solid var(--db-border);
  background: rgba(255, 255, 255, 0.04);
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #cbd5e1;
  white-space: nowrap;
}
 
.db-pill svg { width: 0.75rem; height: 0.75rem; }
 
.db-pill--urgent {
  border-color: rgba(239, 68, 68, 0.45);
  background: rgba(127, 29, 29, 0.35);
  color: #fecaca;
}
 
.db-pill--high {
  border-color: rgba(251, 146, 60, 0.4);
  background: rgba(120, 53, 15, 0.3);
  color: #fed7aa;
}
 
.db-pill--medium {
  border-color: rgba(56, 189, 248, 0.35);
  background: rgba(12, 74, 110, 0.3);
  color: #bae6fd;
}
 
.db-pill--low { color: #cbd5e1; }
 
.db-pill--open {
  border-color: rgba(148, 163, 184, 0.35);
  color: #e2e8f0;
}
 
.db-pill--in_progress {
  border-color: rgba(59, 130, 246, 0.45);
  background: rgba(30, 58, 138, 0.3);
  color: #bfdbfe;
}
 
.db-pill--completed {
  border-color: rgba(74, 222, 128, 0.35);
  background: rgba(6, 78, 59, 0.3);
  color: #bbf7d0;
}
 
.db-pill--cancelled { color: var(--db-faint); }
 
.db-task__title {
  margin: 0.5rem 0 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #fff;
  overflow-wrap: anywhere;
}
 
.db-task__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.75rem;
  margin: 0.375rem 0 0;
  font-size: 0.8125rem;
  color: var(--db-muted);
}
 
.db-task__meta span {
  display: inline-flex;
  align-items: center;
  gap: 0.3125rem;
  overflow-wrap: anywhere;
}
 
.db-task__meta svg {
  width: 0.8125rem;
  height: 0.8125rem;
  flex: none;
  color: var(--db-faint);
}
 
.db-task__desc {
  margin: 0.5rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.55;
  color: var(--db-muted);
  overflow-wrap: anywhere;
}
 
.db-task__side {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}
 
.db-task__cost {
  margin-right: auto;
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
  color: #e2e8f0;
  white-space: nowrap;
}
 
.db-task__cost small {
  display: block;
  font-size: 0.6875rem;
  color: var(--db-faint);
}
 
.db-action {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 2.25rem;
  padding: 0.375rem 0.75rem;
  border-radius: var(--db-radius-sm);
  border: 1px solid var(--db-border);
  background: var(--db-glass);
  font-size: 0.8125rem;
  font-weight: 600;
  color: #e2e8f0;
  transition: border-color 0.2s ease, background-color 0.2s ease,
    color 0.2s ease;
}
 
.db-action svg { width: 0.875rem; height: 0.875rem; }
 
.db-action:hover {
  border-color: rgba(255, 255, 255, 0.24);
  background: var(--db-glass-strong);
}
 
.db-action--go {
  border-color: rgba(59, 130, 246, 0.45);
  background: rgba(30, 58, 138, 0.28);
  color: #dbeafe;
}
 
.db-action--done {
  border-color: rgba(74, 222, 128, 0.4);
  background: rgba(6, 78, 59, 0.28);
  color: #bbf7d0;
}
 
.db-action--drop:hover {
  border-color: rgba(248, 113, 113, 0.45);
  background: rgba(127, 29, 29, 0.28);
  color: #fecaca;
}
 
/* ---------- property list ---------- */
.db-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 17.5rem), 1fr));
  align-items: stretch;
  gap: 0.875rem;
  margin-top: 1.25rem;
}
 
.db-property {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  height: 100%;
  padding: 1.125rem 1rem 1rem;
  border-radius: var(--db-radius-md);
  border: 1px solid var(--db-border-soft);
  background: linear-gradient(
    180deg,
    rgba(30, 41, 59, 0.5),
    rgba(15, 23, 42, 0.55)
  );
  overflow: hidden;
  transition: border-color 0.25s ease, background-color 0.25s ease,
    box-shadow 0.25s ease, transform 0.25s ease;
}
 
.db-property::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 2px;
  background: linear-gradient(90deg, var(--db-blue), var(--db-indigo));
  opacity: 0.65;
}
 
.db-property:hover {
  border-color: rgba(255, 255, 255, 0.2);
  background: var(--db-glass-strong);
  box-shadow: 0 18px 40px -28px rgba(59, 130, 246, 0.9);
  transform: translateY(-2px);
}
 
.db-property:focus-within {
  border-color: var(--db-blue);
}
 
.db-property__head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 0.5rem 0.75rem;
}
 
.db-property__avatar {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: var(--db-radius-sm);
  border: 1px solid var(--db-border);
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.25),
    rgba(79, 70, 229, 0.25)
  );
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #dbeafe;
}
 
.db-property__body { min-width: 0; }
 
.db-property__name {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.01em;
  color: #fff;
  overflow-wrap: anywhere;
}
 
.db-property__meta {
  display: flex;
  align-items: flex-start;
  gap: 0.375rem;
  margin: 0.3125rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: var(--db-muted);
  overflow-wrap: anywhere;
}
 
.db-property__meta svg {
  width: 0.875rem;
  height: 0.875rem;
  flex: none;
  margin-top: 0.125rem;
  color: var(--db-faint);
}
 
.db-property__head .db-badge {
  grid-column: 1 / -1;
  justify-self: start;
}
 
.db-badge {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 0.375rem;
  padding: 0.3125rem 0.625rem;
  border-radius: 999px;
  border: 1px solid var(--db-border);
  background: var(--db-glass);
  font-size: 0.75rem;
  font-weight: 500;
  color: #cbd5e1;
  white-space: nowrap;
}
 
.db-badge svg { width: 0.875rem; height: 0.875rem; color: #93c5fd; }
 
.db-badge--warn {
  border-color: rgba(251, 191, 36, 0.4);
  background: rgba(120, 53, 15, 0.28);
  color: #fde68a;
}
 
.db-badge--warn svg { color: #fbbf24; }
 
.db-property__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
  align-items: stretch;
  margin: 0;
}
 
.db-metric {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  min-width: 0;
  padding: 0.5rem 0.625rem;
  border-radius: var(--db-radius-sm);
  border: 1px solid var(--db-border-soft);
  background: rgba(2, 6, 23, 0.35);
}
 
.db-metric dt {
  margin: 0;
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--db-faint);
}
 
.db-metric dd {
  margin: 0.25rem 0 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #f1f5f9;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
 
.db-metric dd small {
  display: block;
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--db-faint);
}
 
.db-metric:nth-of-type(3),
.db-metric--net {
  grid-column: 1 / -1;
}
 
.db-metric--net {
  border-color: rgba(74, 222, 128, 0.22);
  background: rgba(6, 78, 59, 0.18);
}
 
.db-metric--net dd { color: var(--db-success); }
 
.db-metric--net dd.db-negative { color: var(--db-danger); }
 
.db-property__bar {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-top: auto;
  padding-top: 0.875rem;
  border-top: 1px solid var(--db-border-soft);
}
 
.db-property__bar .db-bar { flex: 1; margin-top: 0; }
 
.db-property__bar span {
  font-size: 0.75rem;
  color: var(--db-muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
 
/* ---------- states ---------- */
.db-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1.25rem;
  padding: 2.5rem 1.25rem;
  border-radius: var(--db-radius-md);
  border: 1px dashed var(--db-border);
  background: rgba(255, 255, 255, 0.02);
  text-align: center;
}
 
.db-state__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: var(--db-radius-md);
  border: 1px solid var(--db-border);
  background: var(--db-glass);
  color: #93c5fd;
}
 
.db-state__icon svg { width: 1.375rem; height: 1.375rem; }
 
.db-state__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #e2e8f0;
}
 
.db-state__text {
  margin: 0;
  max-width: 26rem;
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--db-muted);
}
 
.db-alert {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  padding: 0.875rem 1rem;
  border-radius: var(--db-radius-sm);
  border: 1px solid rgba(248, 113, 113, 0.35);
  background: rgba(127, 29, 29, 0.28);
  font-size: 0.875rem;
  line-height: 1.5;
  color: #fecaca;
}
 
.db-alert--soft {
  border-color: rgba(251, 191, 36, 0.35);
  background: rgba(120, 53, 15, 0.25);
  color: #fde68a;
}
 
.db-alert svg {
  width: 1.0625rem;
  height: 1.0625rem;
  flex: none;
  margin-top: 0.0625rem;
}
 
/* ---------- tablet ---------- */
@media (min-width: 640px) {
  .db-shell { padding: 2rem 1.75rem 3.5rem; gap: 1.75rem; }
 
  .db-header {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
  }
 
  .db-title { font-size: 2.125rem; }
 
  .db-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
 
  .db-panel { padding: 1.75rem; }
 
  .db-panel__head {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
 
  .db-search { width: 16rem; }
 
  .db-task {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
  }
 
  .db-task__side {
    flex-direction: column;
    align-items: stretch;
    gap: 0.375rem;
    min-width: 9.5rem;
  }
 
  .db-task__cost { margin: 0 0 0.25rem; text-align: right; }
 
  .db-action { justify-content: center; }
 
  .db-list { gap: 1rem; }
}
 
/* ---------- desktop ---------- */
@media (min-width: 1024px) {
  .db-shell { padding: 2.5rem 2.5rem 4rem; gap: 2rem; }
 
  .db-title { font-size: 2.375rem; }
 
  .db-stats { grid-template-columns: repeat(4, minmax(0, 1fr)); }
 
  .db-stat { padding: 1.5rem; }
 
  .db-split { grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr); }
}
 
@media (min-width: 1280px) {
  .db-shell { padding: 3rem 3rem 4.5rem; }
 
  .db-list {
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 20rem), 1fr));
  }
}
 
@media (prefers-reduced-motion: reduce) {
  .db-root *,
  .db-root *::before,
  .db-root *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}

/* LUXURY DASHBOARD OVERRIDE — intentionally last in this stylesheet so legacy dark/glass rules cannot win. */


/* HEADER SIGNATURE — restrained editorial hierarchy and tactile luxury motion. */
.db-header{
  display:flex!important;
  flex-direction:row!important;
  align-items:flex-start!important;
  justify-content:space-between!important;
  gap:2rem!important;
}
.db-header__copy{flex:1 1 auto!important;min-width:0!important}
.db-eyebrow{
  display:inline-flex!important;
  align-items:center!important;
  gap:.48rem!important;
  margin:0!important;
  padding:0!important;
  border:0!important;
  background:transparent!important;
  border-radius:0!important;
  color:#64748B!important;
  font-size:.72rem!important;
  font-weight:600!important;
  line-height:1!important;
  text-transform:uppercase!important;
  letter-spacing:.15em!important;
}
.db-eyebrow svg{
  width:.82rem!important;
  height:.82rem!important;
  color:#94A3B8!important;
  stroke-width:1.35!important;
}
.db-title{
  display:flex!important;
  flex-direction:column!important;
  gap:.28rem!important;
  margin:.72rem 0 0!important;
  background:none!important;
  -webkit-text-fill-color:initial!important;
  color:#0F172A!important;
  font-size:clamp(2rem,2.55vw,2.25rem)!important;
  font-weight:400!important;
  line-height:1.08!important;
  letter-spacing:-.035em!important;
}
.db-title__greeting{
  font-family:Georgia,"Times New Roman",serif!important;
  font-size:1em!important;
  font-weight:400!important;
  color:#0F172A!important;
}
.db-title__org{
  font-family:var(--db-font)!important;
  font-size:1.12rem!important;
  font-weight:600!important;
  line-height:1.25!important;
  letter-spacing:.055em!important;
  text-transform:uppercase!important;
  color:#0F172A!important;
}
.db-subtitle{
  display:block!important;
  width:100%!important;
  max-width:none!important;
  margin:.62rem 0 0!important;
  color:#64748B!important;
  font-size:.875rem!important;
  font-weight:400!important;
  line-height:1.45!important;
  white-space:nowrap!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
}
.db-actions{
  display:flex!important;
  flex:0 0 auto!important;
  align-items:center!important;
  justify-content:flex-end!important;
  gap:.55rem!important;
  margin:0!important;
  padding:0!important;
  align-self:flex-start!important;
}
.db-btn{
  transition:background-color .4s ease,box-shadow .4s ease,transform .4s cubic-bezier(.16,1,.3,1),color .4s ease!important;
}
.db-btn--primary{
  min-height:2.55rem!important;
  padding:.55rem .78rem .55rem .9rem!important;
  border-radius:5px!important;
  background:#0A1931!important;
  border:1px solid #0A1931!important;
  box-shadow:0 10px 24px -16px rgba(10,25,49,.55)!important;
  color:#fff!important;
}
.db-btn--primary .db-btn__arrow{
  width:.82rem!important;
  height:.82rem!important;
  stroke-width:1.5!important;
  opacity:.78!important;
  transition:transform .4s cubic-bezier(.16,1,.3,1)!important;
}
.db-btn--primary:hover{
  background:#152A4A!important;
  border-color:#152A4A!important;
  box-shadow:0 12px 28px -15px rgba(10,25,49,.5),0 0 0 5px rgba(10,25,49,.06)!important;
  transform:translateY(-1px)!important;
}
.db-btn--primary:hover .db-btn__arrow{
  transform:translate(1px,-1px)!important;
}
.db-btn--refresh{
  width:2.55rem!important;
  height:2.55rem!important;
  min-height:2.55rem!important;
  padding:0!important;
  border:0!important;
  border-radius:5px!important;
  background:#F1F5F9!important;
  color:#64748B!important;
}
.db-btn--refresh:hover{
  background:#E8EEF4!important;
  color:#0F172A!important;
  transform:none!important;
}
.db-btn--refresh svg{
  width:.95rem!important;
  height:.95rem!important;
  stroke-width:1.45!important;
}
.db-spin{
  animation:db-refresh-spin .8s cubic-bezier(.16,1,.3,1) 1!important;
}
@keyframes db-refresh-spin{
  from{transform:rotate(0deg)}
  to{transform:rotate(360deg)}
}
@keyframes db-header-eyebrow-in{
  from{opacity:0}
  to{opacity:1}
}
@keyframes db-header-copy-in{
  from{opacity:0;transform:translateY(10px)}
  to{opacity:1;transform:translateY(0)}
}
@keyframes db-header-actions-in{
  from{opacity:0;transform:translateX(10px)}
  to{opacity:1;transform:translateX(0)}
}
.db-eyebrow{
  animation:db-header-eyebrow-in .6s ease-out both;
}
.db-title,.db-subtitle{
  animation:db-header-copy-in .8s cubic-bezier(.16,1,.3,1) both;
}
.db-title{animation-delay:.12s}
.db-subtitle{animation-delay:.2s}
.db-actions{
  animation:db-header-actions-in .65s cubic-bezier(.16,1,.3,1) .3s both;
}
@media(max-width:900px){
  .db-header{
    flex-direction:column!important;
    align-items:flex-start!important;
    gap:1.15rem!important;
  }
  .db-actions{
    width:auto!important;
    margin-left:auto!important;
  }
}
@media(max-width:620px){
  .db-header{gap:1rem!important}
  .db-actions{width:100%!important;margin-left:0!important}
  .db-actions .db-btn--primary{margin-left:auto!important}
  .db-title{font-size:2rem!important}
  .db-title__org{font-size:1rem!important}
}
@media(prefers-reduced-motion:reduce){
  .db-eyebrow,.db-title,.db-subtitle,.db-actions{animation:none!important}
  .db-spin{animation:none!important}
}

/* FINAL POLISH — hierarchy, grounding and executive visualization. */
.db-header__copy{min-width:0!important}
.db-eyebrow{display:inline-flex!important;align-items:center!important;gap:.42rem!important;margin-bottom:.2rem!important}
.db-eyebrow svg{stroke-width:1.5!important}
.db-title{display:flex!important;flex-direction:column!important;gap:.12rem!important;margin:.45rem 0 0!important;font-size:clamp(1.7rem,2.6vw,2.45rem)!important;line-height:1.12!important;letter-spacing:-.025em!important}
.db-title__greeting{font-family:Georgia,"Times New Roman",serif!important;font-weight:500!important;color:#25313d!important}
.db-title__org{font-family:var(--db-font)!important;font-size:.43em!important;font-weight:500!important;line-height:1.3!important;letter-spacing:.055em!important;text-transform:uppercase!important;color:#89939e!important}
.db-header{position:relative!important;align-items:flex-start!important}
.db-actions{align-self:flex-start!important;margin-left:auto!important;padding-top:.15rem!important}
.db-stats{gap:1px!important;border:1px solid #e1e4e7!important;border-radius:.65rem!important;overflow:hidden!important;background:#e1e4e7!important;box-shadow:0 10px 30px -10px rgba(0,0,0,.04)!important}
.db-stat,.db-root button.db-stat--action{min-height:9.8rem!important;border:0!important;box-shadow:none!important}
.db-stat:not(:last-child){border-right:0!important}
.db-stat:hover,.db-root button.db-stat--action:hover{box-shadow:inset 0 -2px 0 #0a192f!important}
.db-stat__value{font-size:clamp(1.65rem,2vw,2rem)!important;white-space:nowrap!important;overflow:visible!important}
.db-stat:last-child .db-stat__value{font-size:clamp(1.25rem,1.55vw,1.72rem)!important;letter-spacing:-.035em!important}
.db-trend{padding:1.55rem 1.6rem 1.15rem!important;border:1px solid #e1e4e7!important;border-radius:.7rem!important;background:#fff!important;box-shadow:0 14px 40px -36px rgba(24,32,42,.4)!important}
.db-trend__head{display:flex!important;align-items:flex-end!important;justify-content:space-between!important;gap:1.5rem!important}
.db-trend__eyebrow{margin:0 0 .35rem!important;font-size:.65rem!important;font-weight:700!important;text-transform:uppercase!important;letter-spacing:.13em!important;color:#89939e!important}
.db-trend__title{margin:0!important;font-family:Georgia,"Times New Roman",serif!important;font-size:1.35rem!important;font-weight:500!important;letter-spacing:-.02em!important;color:#25313d!important}
.db-trend__summary{display:flex!important;flex-direction:column!important;align-items:flex-end!important;gap:.15rem!important}
.db-trend__summary span{font-size:.65rem!important;text-transform:uppercase!important;letter-spacing:.1em!important;color:#89939e!important}
.db-trend__summary strong{font-size:1rem!important;font-weight:600!important;color:#25313d!important;white-space:nowrap!important}
.db-trend__chart{height:220px!important;margin-top:1.1rem!important}
.db-trend__svg{display:block!important;width:100%!important;height:100%!important;overflow:visible!important}
.db-trend__baseline{stroke:#edf0f1!important;stroke-width:1!important}
.db-trend__area{fill:url(#db-trend-fill)!important;opacity:.08!important}
.db-trend__line{stroke:#315f8a!important;stroke-width:3!important;stroke-linecap:round!important;stroke-linejoin:round!important;vector-effect:non-scaling-stroke!important}
.db-trend__dot{fill:#fff!important;stroke:#315f8a!important;stroke-width:2!important;vector-effect:non-scaling-stroke!important}
.db-trend__labels{display:grid!important;grid-template-columns:repeat(6,minmax(0,1fr))!important;margin-top:.15rem!important;padding:0 .15rem!important;color:#9aa3ac!important;font-size:.65rem!important;text-transform:uppercase!important;letter-spacing:.08em!important;text-align:center!important}
.db-trend__empty{height:100%!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:.7rem!important;border:1px dashed #e1e5e8!important;border-radius:.5rem!important;color:#89939e!important;font-size:.75rem!important}
.db-trend__empty-line{width:70%!important;height:1px!important;background:#e5e8ea!important}
@media(max-width:900px){.db-header{align-items:flex-start!important}.db-actions{padding-top:0!important}.db-title{font-size:2rem!important}.db-trend__head{align-items:flex-start!important}}
@media(max-width:620px){.db-title{font-size:1.8rem!important}.db-title__org{font-size:.46em!important}.db-header{gap:1rem!important}.db-actions{width:auto!important;margin-left:0!important}.db-trend{padding:1.15rem 1rem 1rem!important}.db-trend__head{flex-direction:column!important;gap:.7rem!important}.db-trend__summary{align-items:flex-start!important}.db-trend__chart{height:180px!important}.db-trend__labels{font-size:.58rem!important}}

.db-root{background:#f7f7f5!important;color:#18202a!important;min-height:100vh!important;letter-spacing:-.012em!important}
.db-backdrop{display:none!important}
.db-shell{max-width:1440px!important;margin:0 auto!important;padding:3rem 3.25rem 5rem!important;gap:2.5rem!important}
.db-header{align-items:flex-end!important;gap:2rem!important}
.db-eyebrow{padding:0!important;border:0!important;background:transparent!important;backdrop-filter:none!important;border-radius:0!important;color:#738091!important;font-size:.65rem!important;letter-spacing:.16em!important}
.db-eyebrow svg{color:#315f8a!important;width:.8rem!important;height:.8rem!important}
.db-title{margin:.7rem 0 0!important;background:none!important;-webkit-text-fill-color:initial!important;color:#18202a!important;font-family:Georgia,"Times New Roman",serif!important;font-size:clamp(2.15rem,3.4vw,3.45rem)!important;font-weight:500!important;line-height:1.02!important;letter-spacing:-.04em!important}
.db-subtitle{display:block!important}
.db-actions{align-items:center!important;gap:.65rem!important}
.db-btn{border-radius:.42rem!important;min-height:2.55rem!important;padding:.55rem .9rem!important;font-size:.78rem!important;letter-spacing:.01em!important}
.db-btn--primary{background:#0a192f!important;color:#fff!important;border:1px solid #0a192f!important;box-shadow:0 10px 24px -16px rgba(10,25,47,.55)!important}
.db-btn--primary:hover{background:#162b46!important;opacity:1!important;transform:translateY(-1px)!important}
.db-btn--ghost{border:0!important;background:transparent!important;color:#52606f!important;box-shadow:none!important}
.db-btn--ghost:hover{background:#edf0f2!important;color:#18202a!important;transform:none!important}
.db-stats{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:0!important;border-top:1px solid #e1e4e7!important;border-bottom:1px solid #e1e4e7!important}
.db-stat,.db-root button.db-stat--action{min-height:10.5rem!important;padding:1.45rem 1.5rem!important;border:0!important;border-radius:0!important;background:#fff!important;box-shadow:none!important;color:#18202a!important}
.db-stat:not(:last-child){border-right:1px solid #e7e9eb!important}
.db-stat:hover,.db-root button.db-stat--action:hover{border-color:inherit!important;background:#fff!important;transform:none!important;box-shadow:inset 0 -2px 0 #0a192f!important}
.db-stat:after{display:none!important}
.db-stat__top{align-items:flex-start!important}
.db-stat__label{font-size:.68rem!important;font-weight:650!important;text-transform:uppercase!important;letter-spacing:.1em!important;color:#7a8592!important}
.db-stat__icon{display:none!important}
.db-stat__value{margin:1.35rem 0 .45rem!important;font-size:2.05rem!important;font-weight:500!important;line-height:1!important;color:#18202a!important}
.db-stat__hint{display:inline-flex!important;align-items:center!important;gap:.3rem!important;margin:0!important;padding:.27rem .5rem!important;border:1px solid #e2e5e8!important;border-radius:999px!important;background:#f5f1e8!important;color:#756746!important;font-size:.65rem!important;font-weight:650!important;letter-spacing:.01em!important}
.db-stat__hint svg{width:.7rem!important;height:.7rem!important;color:#9b6b32!important}
.db-stat__hint--warn{background:#f4eee7!important;border-color:#eadbca!important;color:#7b4e2d!important}
.db-stat__hint--warn svg{color:#9b6b32!important}
.db-stat__go{display:none!important}
.db-skeleton{background:linear-gradient(90deg,#eef0f1 25%,#f8f9f9 37%,#eef0f1 63%)!important}
.db-split{grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr)!important;gap:1px!important;background:#e4e6e8!important}
.db-card{padding:1.5rem 1.6rem!important;border:0!important;border-radius:0!important;background:#fff!important;box-shadow:none!important}
.db-card__title{font-size:.72rem!important;text-transform:uppercase!important;letter-spacing:.11em!important;color:#687482!important;font-weight:700!important}
.db-card__title svg{color:#55738f!important}
.db-card__value{font-size:1.15rem!important;color:#18202a!important;font-weight:600!important}
.db-bar{height:.35rem!important;background:#e9ecee!important}
.db-bar__fill{background:#315f8a!important}
.db-card__hint{color:#7b8794!important;font-size:.73rem!important}
.db-ledger{gap:.55rem!important}
.db-ledger__row{font-size:.75rem!important;color:#7a8592!important}
.db-ledger__row span:last-child{color:#364250!important}
.db-ledger__row--minus span:last-child{color:#8b665c!important}
.db-ledger__row--total{border-top:1px solid #e4e7e9!important;color:#26313c!important}
.db-ledger__row--total span:last-child{color:#315f4b!important}
.db-panel{padding:1.6rem!important;border:1px solid #e1e4e7!important;border-radius:.7rem!important;background:#fff!important;box-shadow:0 14px 40px -36px rgba(24,32,42,.4)!important}
.db-panel__title{font-size:.82rem!important;text-transform:uppercase!important;letter-spacing:.1em!important;color:#4f5c69!important}
.db-panel__title svg{color:#55738f!important}
.db-panel__sub{color:#89939e!important}
.db-search input{border:1px solid #dfe3e6!important;border-radius:.4rem!important;background:#fafafa!important;color:#18202a!important;box-shadow:none!important}
.db-search input:focus{border-color:#8ca4b8!important;background:#fff!important;box-shadow:0 0 0 3px #edf2f6!important}
.db-filters{gap:.4rem!important}
.db-chip{min-height:2rem!important;border:1px solid #e1e5e8!important;background:#fff!important;color:#687482!important;border-radius:999px!important;font-size:.7rem!important}
.db-chip--on{border-color:#b9c9d7!important;background:#eef3f7!important;color:#294b67!important}
.db-chip__count{background:#f0f2f3!important;color:#687482!important}
.db-task{padding:1rem 1.1rem!important;border:1px solid #e5e8ea!important;border-left:2px solid #b5bec7!important;border-radius:.55rem!important;background:#fff!important}
.db-task:hover{background:#fcfcfb!important;transform:none!important;border-color:#cbd3da!important}
.db-task--urgent{border-left-color:#8b4b45!important}.db-task--high{border-left-color:#9b7650!important}.db-task--medium{border-left-color:#55738f!important}.db-task--low{border-left-color:#aeb7bf!important}
.db-pill{border-color:#e1e5e8!important;background:#f7f8f8!important;color:#66727f!important}
.db-pill--urgent{border-color:#ead8d5!important;background:#f7eeec!important;color:#82463f!important}.db-pill--high{border-color:#eadfce!important;background:#f6f0e5!important;color:#80633b!important}.db-pill--medium{border-color:#d8e3eb!important;background:#eef4f7!important;color:#315b78!important}.db-pill--completed{border-color:#d6e5da!important;background:#edf5ef!important;color:#426b52!important}
.db-task__title{color:#25303b!important}.db-task__meta,.db-task__desc{color:#7b8794!important}.db-task__meta svg{color:#9aa5af!important}.db-task__cost{color:#364250!important}
.db-action{border:1px solid #dfe4e7!important;background:#fff!important;color:#52606f!important;border-radius:.4rem!important}.db-action:hover{background:#f4f6f7!important}.db-action--go{border-color:#c7d7e3!important;background:#f0f5f8!important;color:#315b78!important}.db-action--done{border-color:#d4e4d8!important;background:#eef5ef!important;color:#426b52!important}
.db-list{gap:.75rem!important}
.db-property{padding:1.15rem!important;border:1px solid #e2e5e8!important;border-radius:.55rem!important;background:#fff!important;box-shadow:none!important}
.db-property:before{display:none!important}
.db-property:hover{border-color:#c8d1d8!important;background:#fff!important;box-shadow:0 16px 34px -30px rgba(24,32,42,.4)!important;transform:translateY(-2px)!important}
.db-property__avatar{border:1px solid #e0e5e9!important;background:#f1f4f6!important;color:#536779!important}
.db-property__name{color:#25303b!important}.db-property__meta{color:#7f8993!important}.db-property__meta svg{color:#9ca7b0!important}
.db-badge{border-color:#e0e5e8!important;background:#f7f8f8!important;color:#64717d!important}.db-badge svg{color:#69839a!important}.db-badge--warn{border-color:#eadfce!important;background:#f6f0e5!important;color:#80633b!important}
.db-metric{border:0!important;border-top:1px solid #edf0f1!important;border-radius:0!important;background:transparent!important;padding:.55rem .15rem!important}
.db-metric dt{color:#89939e!important}.db-metric dd{color:#364250!important}.db-metric--net{border-color:#dfe9e2!important;background:#f4f8f5!important}.db-metric--net dd{color:#426b52!important}
.db-property__bar{border-top:1px solid #edf0f1!important}.db-property__bar span{color:#7b8794!important}
.db-state{border-color:#dfe4e7!important;background:#fff!important}.db-state__icon{border-color:#dfe4e7!important;background:#f1f4f6!important;color:#55738f!important}.db-state__title{color:#364250!important}.db-state__text{color:#7b8794!important}
.db-alert{border-color:#ead8d5!important;background:#f8efed!important;color:#82463f!important}.db-alert--soft{border-color:#eadfce!important;background:#f7f1e7!important;color:#80633b!important}
@media(max-width:900px){.db-shell{padding:2rem 1.25rem 3rem!important}.db-stats{grid-template-columns:repeat(2,minmax(0,1fr))!important}.db-stat:nth-child(2){border-right:0!important}.db-stat:nth-child(3),.db-stat:nth-child(4){border-top:1px solid #e7e9eb!important}.db-stat:nth-child(4){border-right:0!important}.db-header{align-items:flex-start!important}.db-title{font-size:2.35rem!important}.db-actions{width:100%!important}.db-actions .db-btn--primary{margin-left:auto!important}.db-split{grid-template-columns:1fr!important;gap:1px!important}}
@media(max-width:620px){.db-shell{padding:1.5rem .85rem 2.5rem!important;gap:1.5rem!important}.db-header{gap:1rem!important}.db-title{font-size:2rem!important}.db-stats{grid-template-columns:1fr!important}.db-stat{min-height:8.5rem!important;border-right:0!important;border-top:1px solid #e7e9eb!important}.db-stat:first-child{border-top:0!important}.db-stat:nth-child(2),.db-stat:nth-child(3),.db-stat:nth-child(4){border-top:1px solid #e7e9eb!important}.db-actions .db-btn--primary{margin-left:0!important}.db-actions .db-btn--ghost{display:none!important}.db-panel{padding:1rem!important}.db-panel__head{gap:.75rem!important}.db-search{width:100%!important}.db-task{grid-template-columns:1fr!important}.db-task__side{flex-direction:row!important;align-items:center!important;min-width:0!important}.db-task__cost{margin-right:auto!important}.db-property__grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}

`;
 
/* ------------------------------------------------------------------ */
/*  TYPES & HELPERS                                                    */
/* ------------------------------------------------------------------ */
 
type Priority = "urgent" | "high" | "medium" | "low";
type RequestStatus = "open" | "in_progress" | "completed" | "cancelled";
 
interface RevenueTrendPoint {
  label: string;
  value: number;
}

interface DashboardStats {
  properties?: number;
  units?: number;
  occupied_units?: number;
  active_tenants?: number;
  monthly_revenue?: number;
  revenue_trend?: RevenueTrendPoint[];
}
 
interface DashboardResponse {
  stats?: DashboardStats;
}
 
interface Property {
  id: number | string;
  name?: string;
  city?: string;
  country?: string;
  property_type?: string;
  units_count?: number;
  occupied_units?: number;
  vacant_units?: number;
  active_tenants?: number;
  active_leases?: number;
  monthly_revenue?: number;
  potential_monthly_revenue?: number;
  occupancy?: number;
}
 
interface TenantRef {
  id?: number | string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
}
 
interface MaintenanceRequest {
  id: number | string;
  property_id: number | string;
  unit_id?: number | string | null;
  tenant_id?: number | string | null;
  title: string;
  description?: string;
  priority: Priority;
  status: RequestStatus;
  assigned_to?: string | null;
  estimated_cost?: number | string | null;
  actual_cost?: number | string | null;
  reported_date: string;
  completed_date?: string | null;
  property?: { id?: number | string; name?: string };
  unit?: { id?: number | string; unit_number?: string };
  tenant?: TenantRef;
}
 
interface Expense {
  id: number | string;
  property_id: number | string;
  amount: number | string;
  expense_date: string;
  category?: string;
}
 
interface Organization {
  name?: string;
  currency?: string;
}
 
const PRIORITY_RANK: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};
 
const PRIORITY_LABEL: Record<Priority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};
 
const STATUS_LABEL: Record<RequestStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};
 
const OPEN_STATUSES: RequestStatus[] = ["open", "in_progress"];
 
function readOrganization(): Organization {
  try {
    const raw =
      localStorage.getItem("organization") ??
      sessionStorage.getItem("organization");
    return raw ? (JSON.parse(raw) as Organization) : {};
  } catch {
    return {};
  }
}
 
function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "PR";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
 
function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}
 
function formatMoney(value: number, currency: string): string {
  return `${currency} ${new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 0,
  }).format(Math.round(value))}`;
}
 
function toNumber(value: number | string | null | undefined): number {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : 0;
}
 
function unwrap<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && "data" in payload) {
    const data = (payload as { data?: unknown }).data;
    if (Array.isArray(data)) return data as T[];
  }
  return [];
}
 
function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
 
function daysSince(date: string): number {
  const reported = new Date(date).getTime();
  if (Number.isNaN(reported)) return 0;
  return Math.max(0, Math.floor((Date.now() - reported) / 86_400_000));
}
 
function ageLabel(date: string): string {
  const days = daysSince(date);
  if (days === 0) return "Reported today";
  if (days === 1) return "1 day open";
  return `${days} days open`;
}
 
function isThisMonth(date: string | null | undefined): boolean {
  if (!date) return false;
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return false;
  const now = new Date();
  return (
    value.getFullYear() === now.getFullYear() &&
    value.getMonth() === now.getMonth()
  );
}
 
/** Actual cost when known, otherwise the estimate. */
function requestCost(request: MaintenanceRequest): number {
  const actual = toNumber(request.actual_cost);
  return actual > 0 ? actual : toNumber(request.estimated_cost);
}
 
function tenantName(tenant: TenantRef | undefined): string {
  if (!tenant) return "";
  return [tenant.first_name, tenant.last_name].filter(Boolean).join(" ").trim();
}
 
/* ------------------------------------------------------------------ */
/*  COMPONENT                                                          */
/* ------------------------------------------------------------------ */
 
function DashboardPage() {
  const navigate = useNavigate();
  const organization = useMemo(readOrganization, []);
  const currency = organization.currency || "KSh";
 
  const [stats, setStats] = useState<DashboardStats>({});
  const [properties, setProperties] = useState<Property[]>([]);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | RequestStatus>(
    "active"
  );
  const [busyId, setBusyId] = useState<string | null>(null);
 
  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    setError("");
    setNotice("");
 
    const [dashboard, propertyList, maintenance, expenseList] =
      await Promise.allSettled([
        apiRequest("/dashboard"),
        apiRequest("/properties"),
        apiRequest("/maintenance-requests"),
        apiRequest("/expenses"),
      ]);
 
    if (dashboard.status === "fulfilled") {
      setStats((dashboard.value as DashboardResponse)?.stats ?? {});
    }
 
    if (propertyList.status === "fulfilled") {
      setProperties(unwrap<Property>(propertyList.value));
    }
 
    if (maintenance.status === "fulfilled") {
      setRequests(unwrap<MaintenanceRequest>(maintenance.value));
    } else {
      setRequests([]);
      setNotice(
        "Maintenance requests couldn't be loaded — check that /maintenance-requests is available."
      );
    }
 
    if (expenseList.status === "fulfilled") {
      setExpenses(unwrap<Expense>(expenseList.value));
    } else {
      setExpenses([]);
    }
 
    if (dashboard.status === "rejected" && propertyList.status === "rejected") {
      const reason = propertyList.reason;
      setError(
        reason instanceof Error
          ? reason.message
          : "We couldn't load your dashboard. Check your connection and try again."
      );
    }
 
    setLoading(false);
    setRefreshing(false);
  }
 
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
 
  async function updateStatus(
    request: MaintenanceRequest,
    status: RequestStatus
  ) {
    const id = String(request.id);
    const previous = requests;
 
    setBusyId(id);
    setRequests((current) =>
      current.map((item) =>
        String(item.id) === id
          ? {
              ...item,
              status,
              completed_date:
                status === "completed"
                  ? new Date().toISOString().slice(0, 10)
                  : null,
            }
          : item
      )
    );
 
    try {
      await apiRequest(`/maintenance-requests/${request.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          completed_date:
            status === "completed"
              ? new Date().toISOString().slice(0, 10)
              : null,
        }),
      });
    } catch (err) {
      setRequests(previous);
      setNotice(
        err instanceof Error
          ? `Couldn't update that request: ${err.message}`
          : "Couldn't update that request."
      );
    } finally {
      setBusyId(null);
    }
  }
 
  /* ---------- portfolio rollups ---------- */
 
  const portfolio = useMemo(() => {
    const fromProperties = properties.reduce(
      (totals, property) => ({
        units: totals.units + toNumber(property.units_count),
        occupied: totals.occupied + toNumber(property.occupied_units),
        tenants: totals.tenants + toNumber(property.active_tenants),
        revenue: totals.revenue + toNumber(property.monthly_revenue),
        potential:
          totals.potential + toNumber(property.potential_monthly_revenue),
      }),
      { units: 0, occupied: 0, tenants: 0, revenue: 0, potential: 0 }
    );
 
    // Fall back to /dashboard stats when the property payload has no metrics.
    return {
      properties: properties.length || toNumber(stats.properties),
      units: fromProperties.units || toNumber(stats.units),
      occupied: fromProperties.occupied || toNumber(stats.occupied_units),
      tenants: fromProperties.tenants || toNumber(stats.active_tenants),
      revenue: fromProperties.revenue || toNumber(stats.monthly_revenue),
      potential: fromProperties.potential,
    };
  }, [properties, stats]);
 
  const occupancy =
    portfolio.units > 0
      ? Math.min(100, Math.round((portfolio.occupied / portfolio.units) * 100))
      : 0;
 
  const maintenanceByProperty = useMemo(() => {
    const map = new Map<
      string,
      { open: number; urgent: number; committed: number; spent: number }
    >();
 
    requests.forEach((request) => {
      if (request.status === "cancelled") return;
 
      const key = String(request.property_id);
      const entry = map.get(key) ?? {
        open: 0,
        urgent: 0,
        committed: 0,
        spent: 0,
      };
 
      if (OPEN_STATUSES.includes(request.status)) {
        entry.open += 1;
        entry.committed += requestCost(request);
        if (request.priority === "urgent" || request.priority === "high") {
          entry.urgent += 1;
        }
      } else if (isThisMonth(request.completed_date)) {
        entry.spent += requestCost(request);
      }
 
      map.set(key, entry);
    });
 
    return map;
  }, [requests]);
 
  const expensesByProperty = useMemo(() => {
    const map = new Map<string, number>();
 
    expenses.forEach((expense) => {
      if (!isThisMonth(expense.expense_date)) return;
      const key = String(expense.property_id);
      map.set(key, (map.get(key) ?? 0) + toNumber(expense.amount));
    });
 
    return map;
  }, [expenses]);
 
  const money = useMemo(() => {
    let maintenanceSpent = 0;
    let maintenanceCommitted = 0;
 
    requests.forEach((request) => {
      if (request.status === "cancelled") return;
      if (OPEN_STATUSES.includes(request.status)) {
        maintenanceCommitted += requestCost(request);
      } else if (isThisMonth(request.completed_date)) {
        maintenanceSpent += requestCost(request);
      }
    });
 
    const otherExpenses = expenses.reduce(
      (total, expense) =>
        isThisMonth(expense.expense_date)
          ? total + toNumber(expense.amount)
          : total,
      0
    );
 
    return {
      gross: portfolio.revenue,
      maintenanceSpent,
      maintenanceCommitted,
      otherExpenses,
      net: portfolio.revenue - maintenanceSpent - otherExpenses,
      projectedNet:
        portfolio.revenue -
        maintenanceSpent -
        otherExpenses -
        maintenanceCommitted,
    };
  }, [requests, expenses, portfolio.revenue]);
 
  /* ---------- maintenance queue ---------- */
 
  const counts = useMemo(() => {
    const base = { active: 0, open: 0, in_progress: 0, completed: 0, cancelled: 0 };
 
    requests.forEach((request) => {
      base[request.status] += 1;
      if (OPEN_STATUSES.includes(request.status)) base.active += 1;
    });
 
    return base;
  }, [requests]);
 
  const queue = useMemo(() => {
    const visible = requests.filter((request) =>
      statusFilter === "active"
        ? OPEN_STATUSES.includes(request.status)
        : request.status === statusFilter
    );
 
    return [...visible].sort((a, b) => {
      const rank = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (rank !== 0) return rank;
      return (
        new Date(a.reported_date).getTime() -
        new Date(b.reported_date).getTime()
      );
    });
  }, [requests, statusFilter]);
 
  const urgentCount = useMemo(
    () =>
      requests.filter(
        (request) =>
          OPEN_STATUSES.includes(request.status) && request.priority === "urgent"
      ).length,
    [requests]
  );
 
  /* ---------- properties ---------- */
 
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return properties;
    return properties.filter((property) =>
      [property.name, property.city, property.country]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [properties, query]);
 
  const cards = [
    {
      label: "Properties",
      icon: Building2,
      value: formatNumber(portfolio.properties),
      hint: `${formatNumber(portfolio.units)} units tracked`,
      to: "/manager/properties",
      action: "View properties",
    },
    {
      label: "Occupied units",
      icon: DoorOpen,
      value: `${formatNumber(portfolio.occupied)}/${formatNumber(
        portfolio.units
      )}`,
      hint: `${occupancy}% occupancy`,
      to: "/manager/units",
      action: "View units",
    },
    {
      label: "Active tenants",
      icon: Users,
      value: formatNumber(portfolio.tenants),
      hint: "On active leases",
      to: "/manager/tenants",
      action: "Manage tenants",
    },
    {
      label: "Net monthly revenue",
      icon: Wallet,
      value: formatMoney(money.net, currency),
      hint: `${formatMoney(money.gross, currency)} rent − ${formatMoney(
        money.maintenanceSpent + money.otherExpenses,
        currency
      )} costs`,
      warn: true,
    },
  ];
 
  const statusFilters: { key: "active" | RequestStatus; label: string; count: number }[] =
    [
      { key: "active", label: "Needs action", count: counts.active },
      { key: "open", label: "Open", count: counts.open },
      { key: "in_progress", label: "In progress", count: counts.in_progress },
      { key: "completed", label: "Completed", count: counts.completed },
      { key: "cancelled", label: "Cancelled", count: counts.cancelled },
    ];
 
  const revenueTrend = stats.revenue_trend ?? [];
  const trendWidth = 720;
  const trendHeight = 220;
  const trendPaddingX = 12;
  const trendPaddingY = 24;
  const trendMax = Math.max(
    1,
    ...revenueTrend.map((point) => toNumber(point.value))
  );
  const trendPoints = revenueTrend.map((point, index) => {
    const denominator = Math.max(revenueTrend.length - 1, 1);
    const x =
      trendPaddingX +
      (index / denominator) * (trendWidth - trendPaddingX * 2);
    const y =
      trendHeight -
      trendPaddingY -
      (toNumber(point.value) / trendMax) *
        (trendHeight - trendPaddingY * 2);
    return { ...point, x, y };
  });
  const trendLine = trendPoints.map((point) => point.x + ',' + point.y).join(' ');
  const trendArea =
    trendPoints.length > 0
      ? 'M ' +
        trendPoints[0].x +
        ' ' +
        (trendHeight - trendPaddingY) +
        ' L ' +
        trendPoints.map((point) => point.x + ' ' + point.y).join(' L ') +
        ' L ' +
        trendPoints[trendPoints.length - 1].x +
        ' ' +
        (trendHeight - trendPaddingY) +
        ' Z'
      : '';

  const timeOfDayIcon =
    greeting() === 'Good evening' ? <Moon /> : <Sun />;

  return (
    <DashboardLayout>
      <div className="db-root">
        <style>{styles}</style>
 
        <div className="db-backdrop" aria-hidden="true">
          <span className="db-orb db-orb--indigo" />
          <span className="db-orb db-orb--blue" />
          <span className="db-orb db-orb--purple" />
        </div>
 
        <div className="db-shell">
          {/* ---------- header ---------- */}
          <header className="db-header">
            <div className="db-header__copy">
              <span className="db-eyebrow">
                {timeOfDayIcon}
                {greeting()}
              </span>

              <h1 className="db-title">
                <span className="db-title__greeting">Portfolio overview</span>
                <span className="db-title__org">
                  {organization.name || "Your property workspace"}
                </span>
              </h1>

              <p className="db-subtitle">
                Your real estate portfolio at a glance today.
              </p>
            </div>

            <div className="db-actions" aria-label="Dashboard actions">
              <button
                type="button"
                className="db-btn db-btn--ghost db-btn--refresh"
                onClick={() => load(true)}
                disabled={refreshing || loading}
                aria-label={refreshing ? "Refreshing dashboard" : "Refresh dashboard"}
                title="Refresh dashboard"
              >
                <RefreshCw className={refreshing ? "db-spin" : undefined} />
                <span className="db-sr">Refresh</span>
              </button>

              <button
                type="button"
                className="db-btn db-btn--primary"
                onClick={() => navigate("/manager/properties/add")}
              >
                <Plus />
                <span>Add property</span>
                <ArrowUpRight className="db-btn__arrow" aria-hidden="true" />
              </button>
            </div>
          </header>
 
          {error && (
            <div className="db-alert" role="alert">
              <AlertCircle />
              <span>{error}</span>
            </div>
          )}
 
          {notice && (
            <div className="db-alert db-alert--soft" role="status">
              <AlertTriangle />
              <span>{notice}</span>
            </div>
          )}
 
          {/* ---------- stats ---------- */}
          <section className="db-stats" aria-label="Portfolio summary">
            {cards.map(({ label, icon: Icon, value, hint, warn, to, action }) => {
              const body = (
                <>
                  <div className="db-stat__top">
                    <p className="db-stat__label">{label}</p>
                    <span className="db-stat__icon">
                      <Icon />
                    </span>
                  </div>
 
                  {loading ? (
                    <>
                      <span className="db-skeleton db-skeleton--value" />
                      <span className="db-skeleton db-skeleton--hint" />
                    </>
                  ) : (
                    <>
                      <p className="db-stat__value">{value}</p>
                      <p
                        className={`db-stat__hint${
                          warn ? " db-stat__hint--warn" : ""
                        }`}
                      >
                        {warn ? <TrendingDown /> : null}
                        {hint}
                      </p>
                      {action && (
                        <span className="db-stat__go">
                          {action}
                          <ArrowUpRight />
                        </span>
                      )}
                    </>
                  )}
                </>
              );
 
              return to ? (
                <button
                  key={label}
                  type="button"
                  className="db-stat db-stat--action"
                  onClick={() => navigate(to)}
                >
                  {body}
                </button>
              ) : (
                <article key={label} className="db-stat">
                  {body}
                </article>
              );
            })}
          </section>
 
          {/* ---------- revenue visualization ---------- */}
          <section className="db-trend" aria-label="Revenue trend">
            <div className="db-trend__head">
              <div>
                <p className="db-trend__eyebrow">Cash performance</p>
                <h2 className="db-trend__title">Revenue over the last six months</h2>
              </div>
              <div className="db-trend__summary">
                <span>Current month</span>
                <strong>
                  {loading
                    ? "—"
                    : revenueTrend.length
                    ? formatMoney(
                        toNumber(revenueTrend[revenueTrend.length - 1].value),
                        currency
                      )
                    : formatMoney(money.gross, currency)}
                </strong>
              </div>
            </div>

            <div className="db-trend__chart">
              {loading || revenueTrend.length === 0 ? (
                <div className="db-trend__empty">
                  <span className="db-trend__empty-line" />
                  <span>Revenue history will appear here as payments are recorded.</span>
                </div>
              ) : (
                <svg
                  className="db-trend__svg"
                  viewBox={'0 0 ' + trendWidth + ' ' + trendHeight}
                  preserveAspectRatio="none"
                  role="img"
                  aria-label="Six month revenue trend"
                >
                  <defs>
                    <linearGradient id="db-trend-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#315f8a" />
                      <stop offset="100%" stopColor="#315f8a" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <line
                    x1="12"
                    y1={trendHeight - trendPaddingY}
                    x2={trendWidth - 12}
                    y2={trendHeight - trendPaddingY}
                    className="db-trend__baseline"
                  />
                  <path d={trendArea} className="db-trend__area" />
                  <polyline
                    points={trendLine}
                    className="db-trend__line"
                    fill="none"
                  />
                  {trendPoints.map((point) => (
                    <circle
                      key={point.label}
                      cx={point.x}
                      cy={point.y}
                      r="3.5"
                      className="db-trend__dot"
                    />
                  ))}
                </svg>
              )}
            </div>

            {revenueTrend.length > 0 && (
              <div className="db-trend__labels" aria-hidden="true">
                {revenueTrend.map((point) => (
                  <span key={point.label}>{point.label}</span>
                ))}
              </div>
            )}
          </section>

          {/* ---------- occupancy + revenue ledger ---------- */}
          <section className="db-split" aria-label="Occupancy and revenue">
            <div className="db-card">
              <div className="db-card__head">
                <h2 className="db-card__title">
                  <DoorOpen />
                  Occupancy
                </h2>
                <span className="db-card__value">
                  {loading ? "—" : `${occupancy}%`}
                </span>
              </div>
 
              <div
                className="db-bar"
                role="progressbar"
                aria-valuenow={occupancy}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Occupied units"
              >
                <div
                  className="db-bar__fill"
                  style={{ width: `${loading ? 0 : occupancy}%` }}
                />
              </div>
 
              <p className="db-card__hint">
                {loading
                  ? "Calculating occupancy…"
                  : portfolio.units > 0
                  ? `${formatNumber(portfolio.occupied)} of ${formatNumber(
                      portfolio.units
                    )} units occupied · ${formatNumber(
                      portfolio.units - portfolio.occupied
                    )} vacant${
                      portfolio.potential > portfolio.revenue
                        ? ` · ${formatMoney(
                            portfolio.potential - portfolio.revenue,
                            currency
                          )} idle rent`
                        : ""
                    }`
                  : "Add units to start tracking occupancy."}
              </p>
            </div>
 
            <div className="db-card">
              <div className="db-card__head">
                <h2 className="db-card__title">
                  <Receipt />
                  This month
                </h2>
                <span className="db-card__value">
                  {loading ? "—" : formatMoney(money.net, currency)}
                </span>
              </div>
 
              <div className="db-ledger">
                <div className="db-ledger__row">
                  <span>Rent from occupied units</span>
                  <span>{formatMoney(money.gross, currency)}</span>
                </div>
                <div className="db-ledger__row db-ledger__row--minus">
                  <span>Maintenance completed</span>
                  <span>−{formatMoney(money.maintenanceSpent, currency)}</span>
                </div>
                <div className="db-ledger__row db-ledger__row--minus">
                  <span>Other expenses</span>
                  <span>−{formatMoney(money.otherExpenses, currency)}</span>
                </div>
                <div className="db-ledger__row db-ledger__row--total">
                  <span>Net revenue</span>
                  <span>{formatMoney(money.net, currency)}</span>
                </div>
              </div>
 
              <p className="db-card__hint">
                {money.maintenanceCommitted > 0
                  ? `${formatMoney(
                      money.maintenanceCommitted,
                      currency
                    )} of open maintenance is still committed — projected net ${formatMoney(
                      money.projectedNet,
                      currency
                    )}.`
                  : "No open maintenance costs are pending against this month."}
              </p>
            </div>
          </section>
 
          {/* ---------- maintenance ---------- */}
          <section className="db-panel" aria-label="Maintenance requests">
            <div className="db-panel__head">
              <div>
                <h2 className="db-panel__title">
                  <Wrench />
                  Maintenance requests
                </h2>
                <p className="db-panel__sub">
                  {loading
                    ? "Loading tenant requests…"
                    : counts.active === 0
                    ? "Nothing needs action right now."
                    : `${formatNumber(
                        counts.active
                      )} need action${
                        urgentCount > 0
                          ? ` · ${formatNumber(urgentCount)} urgent`
                          : ""
                      } · ${formatMoney(
                        money.maintenanceCommitted,
                        currency
                      )} committed`}
                </p>
              </div>
 
              <button
                type="button"
                className="db-btn db-btn--ghost"
                onClick={() => navigate("/maintenance")}
              >
                <Wrench />
                Open queue
              </button>
            </div>
 
            <div className="db-filters" role="tablist" aria-label="Filter requests">
              {statusFilters.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === filter.key}
                  className={`db-chip${
                    statusFilter === filter.key ? " db-chip--on" : ""
                  }`}
                  onClick={() => setStatusFilter(filter.key)}
                >
                  {filter.label}
                  <span className="db-chip__count">
                    {formatNumber(filter.count)}
                  </span>
                </button>
              ))}
            </div>
 
            {loading ? (
              <div className="db-queue">
                {[0, 1, 2].map((key) => (
                  <span key={key} className="db-skeleton db-skeleton--task" />
                ))}
              </div>
            ) : queue.length === 0 ? (
              <div className="db-state">
                <span className="db-state__icon">
                  <CheckCircle2 />
                </span>
                <h3 className="db-state__title">
                  {statusFilter === "active"
                    ? "No open requests"
                    : `No ${STATUS_LABEL[statusFilter as RequestStatus].toLowerCase()} requests`}
                </h3>
                <p className="db-state__text">
                  {statusFilter === "active"
                    ? "Every tenant request has been handled. New ones appear here sorted by priority."
                    : "Switch filters to see the rest of the queue."}
                </p>
              </div>
            ) : (
              <div className="db-queue">
                {queue.map((request) => {
                  const id = String(request.id);
                  const propertyName =
                    request.property?.name ??
                    properties.find(
                      (property) =>
                        String(property.id) === String(request.property_id)
                    )?.name ??
                    "Unassigned property";
                  const tenant = tenantName(request.tenant);
                  const cost = requestCost(request);
                  const isOpen = OPEN_STATUSES.includes(request.status);
 
                  return (
                    <article
                      key={id}
                      className={`db-task db-task--${request.priority}${
                        busyId === id ? " db-task--busy" : ""
                      }`}
                    >
                      <div className="db-task__main">
                        <div className="db-task__tags">
                          <span className={`db-pill db-pill--${request.priority}`}>
                            {request.priority === "urgent" ? (
                              <AlertTriangle />
                            ) : null}
                            {PRIORITY_LABEL[request.priority]}
                          </span>
                          <span className={`db-pill db-pill--${request.status}`}>
                            {STATUS_LABEL[request.status]}
                          </span>
                          {isOpen && daysSince(request.reported_date) >= 7 && (
                            <span className="db-pill db-pill--high">
                              <Clock />
                              Overdue
                            </span>
                          )}
                        </div>
 
                        <h3 className="db-task__title">{request.title}</h3>
 
                        <p className="db-task__meta">
                          <span>
                            <Building2 />
                            {propertyName}
                            {request.unit?.unit_number
                              ? ` · ${request.unit.unit_number}`
                              : ""}
                          </span>
                          {tenant && (
                            <span>
                              <Users />
                              {tenant}
                            </span>
                          )}
                          <span>
                            <Clock />
                            {ageLabel(request.reported_date)}
                          </span>
                          {request.assigned_to && (
                            <span>
                              <Wrench />
                              {request.assigned_to}
                            </span>
                          )}
                        </p>
 
                        {request.description && (
                          <p className="db-task__desc">{request.description}</p>
                        )}
                      </div>
 
                      <div className="db-task__side">
                        <p className="db-task__cost">
                          {formatMoney(cost, currency)}
                          <small>
                            {toNumber(request.actual_cost) > 0
                              ? "actual cost"
                              : "estimated"}
                          </small>
                        </p>
 
                        {request.tenant?.phone && (
                          <a
                            className="db-action"
                            href={`tel:${request.tenant.phone}`}
                          >
                            <Phone />
                            Call tenant
                          </a>
                        )}
 
                        {request.status === "open" && (
                          <button
                            type="button"
                            className="db-action db-action--go"
                            onClick={() => updateStatus(request, "in_progress")}
                          >
                            <Play />
                            Start work
                          </button>
                        )}
 
                        {isOpen && (
                          <button
                            type="button"
                            className="db-action db-action--done"
                            onClick={() => updateStatus(request, "completed")}
                          >
                            <CheckCircle2 />
                            Complete
                          </button>
                        )}
 
                        {isOpen && (
                          <button
                            type="button"
                            className="db-action db-action--drop"
                            onClick={() => updateStatus(request, "cancelled")}
                          >
                            <X />
                            Cancel
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
 
          {/* ---------- properties ---------- */}
          <section className="db-panel" aria-label="Properties">
            <div className="db-panel__head">
              <div>
                <h2 className="db-panel__title">
                  <Building2 />
                  Properties
                </h2>
                <p className="db-panel__sub">
                  {loading
                    ? "Loading your portfolio…"
                    : `${formatNumber(filtered.length)} of ${formatNumber(
                        properties.length
                      )} shown`}
                </p>
              </div>
 
              <div className="db-search">
                <Search />
                <label className="db-sr" htmlFor="property-search">
                  Search properties
                </label>
                <input
                  id="property-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by name or city…"
                  disabled={loading}
                />
              </div>
            </div>
 
            {loading ? (
              <div className="db-list">
                {[0, 1, 2].map((key) => (
                  <span key={key} className="db-skeleton db-skeleton--row" />
                ))}
              </div>
            ) : properties.length === 0 ? (
              <div className="db-state">
                <span className="db-state__icon">
                  <Building2 />
                </span>
                <h3 className="db-state__title">No properties yet</h3>
                <p className="db-state__text">
                  Add your first property to start tracking units, tenants and
                  rent collection.
                </p>
                <button
                  type="button"
                  className="db-btn db-btn--primary"
                  onClick={() => navigate("/manager/properties/add")}
                >
                  <Plus />
                  Add your first property
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="db-state">
                <span className="db-state__icon">
                  <Search />
                </span>
                <h3 className="db-state__title">No matches</h3>
                <p className="db-state__text">
                  Nothing matches “{query}”. Try a different name or city.
                </p>
                <button
                  type="button"
                  className="db-btn db-btn--ghost"
                  onClick={() => setQuery("")}
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="db-list">
                {filtered.map((property) => {
                  const key = String(property.id);
                  const name = property.name || "Untitled property";
                  const location = [property.city, property.country]
                    .filter(Boolean)
                    .join(", ");
 
                  const units = toNumber(property.units_count);
                  const occupied = toNumber(property.occupied_units);
                  const rate =
                    typeof property.occupancy === "number"
                      ? Math.round(property.occupancy)
                      : units > 0
                      ? Math.round((occupied / units) * 100)
                      : 0;
 
                  const revenue = toNumber(property.monthly_revenue);
                  const work = maintenanceByProperty.get(key);
                  const spent =
                    (work?.spent ?? 0) + (expensesByProperty.get(key) ?? 0);
                  const net = revenue - spent;
 
                  return (
                    <article key={key} className="db-property">
                      <div className="db-property__head">
                        <span className="db-property__avatar" aria-hidden="true">
                          {initials(name)}
                        </span>
 
                        <div className="db-property__body">
                          <p className="db-property__name" title={name}>
                            {name}
                          </p>
                          <p className="db-property__meta">
                            <MapPin />
                            {location || "Location not set"}
                          </p>
                        </div>
 
                        {work && work.open > 0 ? (
                          <span className="db-badge db-badge--warn">
                            <Wrench />
                            {formatNumber(work.open)} open
                          </span>
                        ) : (
                          <span className="db-badge">
                            <DoorOpen />
                            {formatNumber(units)} units
                          </span>
                        )}
                      </div>
 
                      <dl className="db-property__grid">
                        <div className="db-metric">
                          <dt>Occupied</dt>
                          <dd>
                            {formatNumber(occupied)}/{formatNumber(units)}
                          </dd>
                        </div>
                        <div className="db-metric">
                          <dt>Tenants</dt>
                          <dd>{formatNumber(toNumber(property.active_tenants))}</dd>
                        </div>
                        <div className="db-metric">
                          <dt>Rent</dt>
                          <dd>{formatMoney(revenue, currency)}</dd>
                        </div>
                        <div className="db-metric db-metric--net">
                          <dt>Net</dt>
                          <dd className={net < 0 ? "db-negative" : undefined}>
                            {formatMoney(net, currency)}
                            <small>
                              {spent > 0
                                ? `−${formatMoney(spent, currency)} costs`
                                : "no costs yet"}
                            </small>
                          </dd>
                        </div>
                      </dl>
 
                      <div className="db-property__bar">
                        <div
                          className="db-bar"
                          role="progressbar"
                          aria-valuenow={rate}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${name} occupancy`}
                        >
                          <div
                            className="db-bar__fill"
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <span>{rate}% full</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
 
          <p className="db-stat__hint">
            <ArrowUpRight />
            Net revenue deducts completed maintenance and expenses dated this
            month.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
 
export default DashboardPage;


