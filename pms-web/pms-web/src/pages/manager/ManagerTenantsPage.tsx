import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import { apiRequest } from "../../services/api";
import {
  AlertCircle,
  Building2,
  Check,
  Copy,
  DoorOpen,
  FileText,
  KeyRound,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Search,
  UserPlus,
  Users,
  Wrench,
  X,
} from "lucide-react";
 
/* ------------------------------------------------------------------ */
/*  STYLES — vanilla CSS                                               */
/* ------------------------------------------------------------------ */
 
const styles = `
.tn-root {
  --tn-bg: var(--pms-bg, #030712);
  --tn-surface: var(--pms-surface, rgba(15, 23, 42, 0.55));
  --tn-glass: var(--pms-glass, rgba(255, 255, 255, 0.05));
  --tn-border: var(--pms-border, rgba(255, 255, 255, 0.1));
  --tn-border-soft: var(--pms-border-soft, rgba(255, 255, 255, 0.06));
  --tn-text: var(--pms-text, #f8fafc);
  --tn-muted: var(--pms-muted, #94a3b8);
  --tn-faint: var(--pms-faint, #64748b);
  --tn-blue: var(--pms-accent, #3b82f6);
  --tn-indigo: var(--pms-accent-2, #4f46e5);
  --tn-danger: var(--pms-danger, #f87171);
  --tn-warn: var(--pms-warn, #fbbf24);
  --tn-success: var(--pms-success, #4ade80);
  --tn-radius-sm: 0.75rem;
  --tn-radius-md: 1rem;
  --tn-radius-lg: 1.5rem;
 
  position: relative;
  min-height: 100%;
  padding: 1.5rem 1rem 3rem;
  background: var(--pms-bg, #030712);
  color: var(--tn-text);
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Inter,
    Roboto, "Helvetica Neue", Arial, sans-serif;
  letter-spacing: -0.015em;
}
 
.tn-root,
.tn-root * {
  box-sizing: border-box;
}
 
.tn-root button {
  font-family: inherit;
  border: none;
  background: none;
  cursor: pointer;
  color: inherit;
}
 
.tn-root button:focus-visible,
.tn-root input:focus-visible,
.tn-root select:focus-visible,
.tn-root textarea:focus-visible {
  outline: 2px solid var(--tn-blue);
  outline-offset: 2px;
}
 
.tn-shell {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 78rem;
  margin: 0 auto;
}
 
/* ---------- header ---------- */
.tn-header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
 
.tn-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: #93c5fd;
}
 
.tn-eyebrow svg { width: 0.875rem; height: 0.875rem; }
 
.tn-title {
  margin: 0.5rem 0 0;
  font-size: clamp(1.5rem, 4vw, 2rem);
  font-weight: 600;
  line-height: 1.15;
  color: #fff;
}
 
.tn-subtitle {
  margin: 0.5rem 0 0;
  max-width: 46rem;
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--tn-muted);
}
 
.tn-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
 
.tn-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 2.75rem;
  padding: 0 1.125rem;
  border-radius: var(--tn-radius-sm);
  border: 1px solid var(--tn-border);
  font-size: 0.875rem;
  font-weight: 500;
  transition: transform 0.2s ease, border-color 0.2s ease,
    background-color 0.2s ease;
}
 
.tn-btn svg { width: 1rem; height: 1rem; }
 
.tn-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
 
.tn-btn--ghost {
  color: #e2e8f0;
  background: var(--tn-glass);
}
 
.tn-btn--ghost:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.2);
}
 
.tn-btn--primary {
  border-color: transparent;
  color: #fff;
  background: linear-gradient(135deg, var(--tn-blue), var(--tn-indigo));
  box-shadow: 0 18px 35px -22px rgba(59, 130, 246, 0.9);
}
 
.tn-btn--primary:hover:not(:disabled) {
  transform: translateY(-1px);
}
 
.tn-btn--subtle {
  color: var(--tn-muted);
  background: transparent;
}
 
.tn-btn--subtle:hover:not(:disabled) {
  color: #e2e8f0;
  background: var(--tn-glass);
}
 
/* ---------- alerts ---------- */
.tn-alert {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  padding: 0.875rem 1rem;
  border-radius: var(--tn-radius-sm);
  border: 1px solid rgba(248, 113, 113, 0.3);
  background: rgba(127, 29, 29, 0.25);
  font-size: 0.8125rem;
  color: #fecaca;
}
 
.tn-alert svg { width: 1rem; height: 1rem; flex: none; margin-top: 0.0625rem; }
.tn-link {
  padding: 0;
  color: #93c5fd;
  text-decoration: underline;
  font: inherit;
}
 
.tn-alert--ok {
  border-color: rgba(74, 222, 128, 0.28);
  background: rgba(20, 83, 45, 0.25);
  color: #bbf7d0;
}
 
.tn-credential {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  font-size: 0.8125rem;
}
 
.tn-credential code {
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(74, 222, 128, 0.28);
  background: rgba(2, 6, 23, 0.5);
  font-size: 0.8125rem;
  color: #fff;
}
 
/* ---------- stats ---------- */
.tn-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  gap: 1rem;
}
 
.tn-stat {
  padding: 1.125rem;
  border-radius: var(--tn-radius-md);
  border: 1px solid var(--tn-border-soft);
  background: var(--tn-surface);
  backdrop-filter: blur(18px);
}
 
.tn-stat__label {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--tn-muted);
}
 
.tn-stat__value {
  margin: 0.5rem 0 0;
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.1;
  color: #fff;
  overflow-wrap: anywhere;
  font-variant-numeric: tabular-nums;
}
 
/* ---------- toolbar ---------- */
.tn-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}
 
.tn-search {
  position: relative;
  flex: 1 1 16rem;
  min-width: 0;
}
 
.tn-search svg {
  position: absolute;
  top: 50%;
  left: 0.875rem;
  width: 1rem;
  height: 1rem;
  transform: translateY(-50%);
  color: var(--tn-faint);
  pointer-events: none;
}
 
.tn-input,
.tn-select,
.tn-textarea {
  width: 100%;
  min-height: 2.75rem;
  padding: 0.6875rem 0.875rem;
  border-radius: var(--tn-radius-sm);
  border: 1px solid var(--tn-border);
  background: rgba(2, 6, 23, 0.55);
  font-family: inherit;
  font-size: 0.875rem;
  color: var(--tn-text);
}
 
.tn-input::placeholder,
.tn-textarea::placeholder { color: var(--tn-faint); }
 
.tn-search .tn-input { padding-left: 2.5rem; }
 
.tn-textarea {
  min-height: 5.5rem;
  resize: vertical;
  line-height: 1.5;
}
 
.tn-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}
 
.tn-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 2.25rem;
  padding: 0 0.75rem;
  border-radius: 999px;
  border: 1px solid var(--tn-border-soft);
  background: var(--tn-glass);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--tn-muted);
  transition: color 0.2s ease, border-color 0.2s ease;
}
 
.tn-chip:hover { color: #e2e8f0; }
 
.tn-chip--on {
  border-color: rgba(59, 130, 246, 0.45);
  color: #fff;
  background: rgba(59, 130, 246, 0.16);
}
 
.tn-chip__count {
  font-variant-numeric: tabular-nums;
  color: var(--tn-faint);
}

.tn-chip--on .tn-chip__count { color: #bfdbfe; }

.tn-toolbar__field {
  flex: 1 1 18rem;
  min-width: 0;
}
 
/* ---------- groups ---------- */
.tn-groups {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
 
.tn-group__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  padding-bottom: 0.625rem;
  border-bottom: 1px solid var(--tn-border-soft);
}
 
.tn-group__title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #e2e8f0;
}
 
.tn-group__title svg { width: 1rem; height: 1rem; color: #93c5fd; }
 
.tn-group__meta {
  font-size: 0.75rem;
  color: var(--tn-faint);
  font-variant-numeric: tabular-nums;
}
 
.tn-list {
  display: flex;
  flex-direction: column;
}
 
.tn-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  padding: 1rem 0;
  border-bottom: 1px solid var(--tn-border-soft);
}
 
.tn-row:last-child { border-bottom: none; }
 
.tn-person {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}
 
.tn-avatar {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--tn-radius-sm);
  border: 1px solid var(--tn-border);
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.28),
    rgba(79, 70, 229, 0.28)
  );
  font-size: 0.8125rem;
  font-weight: 600;
  color: #dbeafe;
}
 
.tn-person__body { min-width: 0; }
 
.tn-person__name {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #fff;
  overflow-wrap: anywhere;
}
 
.tn-person__contact {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin: 0.25rem 0 0;
  font-size: 0.75rem;
  color: var(--tn-muted);
}
 
.tn-person__contact span {
  display: inline-flex;
  align-items: center;
  gap: 0.3125rem;
  min-width: 0;
  overflow-wrap: anywhere;
}
 
.tn-person__contact svg { width: 0.8125rem; height: 0.8125rem; flex: none; }
 
.tn-cell {
  min-width: 0;
}
 
.tn-cell__label {
  margin: 0;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--tn-faint);
}
 
.tn-cell__value {
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
  color: #e2e8f0;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
 
.tn-cell--money .tn-cell__value { color: #fff; font-weight: 600; }
 
.tn-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
}
 
.tn-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  border-radius: 999px;
  border: 1px solid var(--tn-border-soft);
  background: var(--tn-glass);
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--tn-muted);
  white-space: nowrap;
}
 
.tn-pill svg { width: 0.75rem; height: 0.75rem; }
 
.tn-pill--active {
  border-color: rgba(74, 222, 128, 0.28);
  background: rgba(20, 83, 45, 0.28);
  color: #bbf7d0;
}
 
.tn-pill--inactive {
  border-color: rgba(148, 163, 184, 0.25);
  color: #cbd5e1;
}
 
.tn-pill--warn {
  border-color: rgba(251, 191, 36, 0.28);
  background: rgba(120, 53, 15, 0.28);
  color: #fde68a;
}

.tn-cell__sub {
  margin: 0.25rem 0 0;
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--tn-muted);
  overflow-wrap: anywhere;
}

.tn-claim {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  margin-top: 0.625rem;
  padding: 0.75rem;
  border-radius: var(--tn-radius-sm);
  border: 1px solid rgba(251, 191, 36, 0.28);
  background: rgba(120, 53, 15, 0.2);
}

.tn-claim__title {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #fff7ed;
}

.tn-claim__text {
  margin: 0.25rem 0 0;
  font-size: 0.75rem;
  line-height: 1.5;
  color: #fde68a;
}

.tn-row__aside {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 0;
}

.tn-inline-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
 
/* ---------- states ---------- */
.tn-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 3rem 1.5rem;
  border-radius: var(--tn-radius-lg);
  border: 1px dashed var(--tn-border);
  background: rgba(2, 6, 23, 0.35);
  text-align: center;
}
 
.tn-state__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: var(--tn-radius-md);
  border: 1px solid var(--tn-border);
  background: var(--tn-glass);
  color: #93c5fd;
}
 
.tn-state__icon svg { width: 1.375rem; height: 1.375rem; }
 
.tn-state__title {
  margin: 0.5rem 0 0;
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
}
 
.tn-state__text {
  margin: 0;
  max-width: 28rem;
  font-size: 0.8125rem;
  line-height: 1.6;
  color: var(--tn-muted);
}
 
.tn-skeleton {
  display: block;
  height: 4.5rem;
  border-radius: var(--tn-radius-md);
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.05) 25%,
    rgba(255, 255, 255, 0.12) 37%,
    rgba(255, 255, 255, 0.05) 63%
  );
  background-size: 400% 100%;
  animation: tn-shimmer 1.4s ease infinite;
}
 
@keyframes tn-shimmer {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}
 
.tn-spin { animation: tn-rotate 1s linear infinite; }
 
@keyframes tn-rotate {
  to { transform: rotate(360deg); }
}
 
/* ---------- drawer ---------- */
.tn-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  justify-content: flex-end;
  background: rgba(2, 6, 23, 0.7);
  backdrop-filter: blur(4px);
}
 
.tn-drawer {
  display: flex;
  flex-direction: column;
  width: min(30rem, 100%);
  max-height: 100%;
  border-left: 1px solid var(--tn-border);
  background: #070d1c;
  box-shadow: -30px 0 60px -30px rgba(0, 0, 0, 0.9);
}
 
.tn-drawer__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem;
  border-bottom: 1px solid var(--tn-border-soft);
}
 
.tn-drawer__title {
  margin: 0;
  font-size: 1.0625rem;
  font-weight: 600;
  color: #fff;
}
 
.tn-drawer__text {
  margin: 0.375rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.6;
  color: var(--tn-muted);
}
 
.tn-close {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: var(--tn-radius-sm);
  border: 1px solid var(--tn-border-soft);
  color: var(--tn-muted);
}
 
.tn-close:hover { color: #fff; background: var(--tn-glass); }
.tn-close svg { width: 1rem; height: 1rem; }
 
.tn-form {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  overflow-y: auto;
}
 
.tn-fieldset {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  margin: 0;
  padding: 0;
  border: none;
}
 
.tn-legend {
  padding: 0;
  margin-bottom: 0.25rem;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--tn-faint);
}
 
.tn-field__label {
  display: block;
  margin-bottom: 0.375rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #cbd5e1;
}
 
.tn-field__hint {
  margin: 0.375rem 0 0;
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--tn-faint);
}
 
.tn-grid2 {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.875rem;
}
 
.tn-check {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  padding: 0.875rem;
  border-radius: var(--tn-radius-sm);
  border: 1px solid var(--tn-border-soft);
  background: var(--tn-glass);
}
 
.tn-check input {
  width: 1rem;
  height: 1rem;
  margin-top: 0.125rem;
  accent-color: var(--tn-blue);
}
 
.tn-check__title {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #e2e8f0;
}
 
.tn-drawer__foot {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1.25rem;
  border-top: 1px solid var(--tn-border-soft);
}
 
@media (min-width: 640px) {
  .tn-grid2 { grid-template-columns: 1fr 1fr; }
}
 
@media (min-width: 768px) {
  .tn-root { padding: 2rem 1.5rem 3.5rem; }
 
  .tn-header {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
  }
}
 
@media (min-width: 720px) {
  .tn-row {
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 0.9fr)
      minmax(0, 1.25fr) minmax(0, 1.4fr);
    align-items: start;
    gap: 1rem;
  }
}
 
@media (prefers-reduced-motion: reduce) {
  .tn-root *,
  .tn-root *::before {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}
 
/* Align tenant management with the selected workspace theme. */
.tn-eyebrow { color: var(--pms-accent); }
.tn-title, .tn-person__name, .tn-state__title, .tn-drawer__title { color: var(--pms-heading); }
.tn-btn--ghost { color: var(--pms-text); }
.tn-btn--primary {
  background: linear-gradient(135deg, var(--pms-accent), var(--pms-accent-2));
  box-shadow: 0 12px 28px -20px var(--pms-accent);
}
.tn-stat {
  min-width: 0;
  padding: 1rem 1.125rem;
  border-radius: 1rem;
  border-color: var(--pms-border-soft);
  background: linear-gradient(145deg, var(--pms-surface), var(--pms-glass));
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.055);
}
.tn-stat__value { font-size: clamp(1.1rem, 1.8vw, 1.45rem); letter-spacing: -0.035em; }
.tn-toolbar {
  align-items: flex-end;
  padding: 1rem;
  border: 1px solid var(--pms-border-soft);
  border-radius: 1.125rem;
  background: var(--pms-surface);
}
.tn-input, .tn-select, .tn-textarea {
  background: var(--pms-bg);
  border-color: var(--pms-border);
  color: var(--pms-text);
}
.tn-chip { border-color: var(--pms-border-soft); }
.tn-chip--on {
  border-color: var(--pms-accent);
  background: var(--pms-glass-strong, var(--pms-glass));
  color: var(--pms-heading);
}
.tn-group__head { align-items: center; padding: 0.25rem 0 0.75rem; border-bottom: 0; }
.tn-group__title { color: var(--pms-heading); font-size: 1rem; }
.tn-group__title svg { color: var(--pms-accent); }
.tn-list { gap: 0.75rem; }
.tn-row {
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--pms-border-soft);
  border-radius: 1.125rem;
  background: linear-gradient(155deg, var(--pms-surface), var(--pms-glass));
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.04);
}
.tn-row:last-child { border-bottom: 1px solid var(--pms-border-soft); }
.tn-avatar { background: var(--pms-glass); border-color: var(--pms-border); color: var(--pms-accent); }
.tn-person__name { font-size: 0.95rem; }
.tn-cell__label { letter-spacing: 0.1em; }
.tn-cell__value { color: var(--pms-text); line-height: 1.5; }
.tn-cell--money .tn-cell__value { color: var(--pms-heading); }
.tn-pill { background: var(--pms-glass); }
.tn-state { border-color: var(--pms-border); background: var(--pms-surface); }
.tn-state__icon { color: var(--pms-accent); }
.tn-drawer { background: var(--pms-surface); border-left-color: var(--pms-border); }
.tn-drawer__title { color: var(--pms-heading); }
.tn-field__label, .tn-check__title { color: var(--pms-text); }
.tn-check { border-color: var(--pms-border-soft); background: var(--pms-glass); }
.tn-credential code { background: var(--pms-bg); }
@media (min-width: 720px) {
  .tn-row {
    grid-template-columns: minmax(12rem, 1.5fr) minmax(6rem, 0.7fr) minmax(5rem, 0.6fr) minmax(10rem, 1.1fr) minmax(10rem, 1.25fr);
    align-items: start;
  }
  .tn-row__aside { grid-column: 1 / -1; }
}
@media (max-width: 38rem) {
  .tn-root { padding: 1rem 0.75rem 2.5rem; }
  .tn-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.625rem; }
  .tn-stat { padding: 0.875rem; }
  .tn-toolbar { padding: 0.75rem; }
  .tn-row { padding: 0.875rem; }
}

 
/* The root button reset has higher specificity than bare utility classes; restore intentional variants. */
.tn-root .tn-btn {
  border: 1px solid var(--tn-border);
  color: var(--tn-text);
  background: transparent;
}
.tn-root .tn-btn--ghost {
  border-color: var(--tn-border);
  color: var(--pms-text);
  background: var(--tn-glass);
}
.tn-root .tn-btn--primary {
  border-color: transparent;
  color: #fff;
  background: linear-gradient(135deg, var(--pms-accent), var(--pms-accent-2));
}
.tn-root .tn-btn--subtle {
  border-color: transparent;
  color: var(--tn-muted);
  background: transparent;
}
.tn-root .tn-chip {
  border: 1px solid var(--tn-border-soft);
  color: var(--tn-muted);
  background: var(--tn-glass);
}
.tn-root .tn-chip--on {
  border-color: var(--pms-accent);
  color: var(--pms-heading);
  background: var(--pms-glass-strong, var(--pms-glass));
}
.tn-root .tn-link {
  border: 0;
  color: var(--pms-accent);
  background: transparent;
}
.tn-root .tn-close {
  border: 1px solid var(--tn-border-soft);
  color: var(--tn-muted);
  background: transparent;
}

`;
 
/* ------------------------------------------------------------------ */
/*  TYPES & HELPERS                                                    */
/* ------------------------------------------------------------------ */
 
interface TenantRecord {
  id: number;
  name: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  property: { id: number; name: string } | null;
  unit: { id: number; unit_number: string } | null;
  monthly_rent: number;
  lease_id: number | null;
  lease_status: string | null;
  lease_start: string | null;
  lease_end: string | null;
  deposit_status: string | null;
  deposit_amount_required: number;
  deposit_amount_paid: number;
  tenant_marked_paid_at: string | null;
  open_maintenance_requests: number;
  has_login?: boolean;
}
 
interface ProvisionedAccount {
  email: string;
  created: boolean;
  temporary_password: string | null;
}

interface PropertyOption {
  id: number;
  name: string;
}

interface UnitOption {
  id: number;
  property_id: number;
  unit_number: string;
  unit_type: string | null;
  monthly_rent: number;
  deposit_amount: number;
  status: string;
  pending_registration: boolean;
  pending_email: string | null;
}

const UNASSIGNED = "No active lease";
 
function readCurrency(): string {
  try {
    const raw =
      localStorage.getItem("organization") ??
      sessionStorage.getItem("organization");
    const parsed: unknown = raw ? JSON.parse(raw) : null;
 
    if (parsed && typeof parsed === "object") {
      const value = (parsed as Record<string, unknown>).currency;
      if (typeof value === "string" && value.length === 3) return value;
    }
  } catch {
    /* stored value is not valid JSON */
  }
 
  return "KES";
}
 
function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}
 
function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "T";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
 
function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}
 
function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}
 
function asNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}
 
function namedRef(
  value: unknown,
  key: string
): { id: number; name: string } | null {
  const record = toRecord(value);
  const label = asString(record[key]);
  return label ? { id: asNumber(record.id), name: label } : null;
}
 
function parseTenants(payload: unknown): TenantRecord[] {
  const rows = toRecord(payload).data;
  if (!Array.isArray(rows)) return [];
 
  return rows.map((row) => {
    const record = toRecord(row);
    const first = asString(record.first_name);
    const last = asString(record.last_name);
    const unit = namedRef(record.unit, "unit_number");
    const lease = toRecord(record.lease);
    const deposit = toRecord(record.deposit);
 
    return {
      id: asNumber(record.id),
      first_name: first,
      last_name: last,
      name: asString(record.name) || `${first} ${last}`.trim(),
      email: asString(record.email) || null,
      phone: asString(record.phone) || null,
      status: asString(record.status) || "active",
      property: namedRef(record.property, "name"),
      unit: unit ? { id: unit.id, unit_number: unit.name } : null,
      monthly_rent: asNumber(record.monthly_rent),
      lease_id: asNumber(lease.id) || null,
      lease_status: asString(lease.status) || null,
      lease_start: asString(lease.start_date) || null,
      lease_end: asString(lease.end_date) || null,
      deposit_status: asString(deposit.status) || null,
      deposit_amount_required:
        deposit.amount_required !== undefined
          ? asNumber(deposit.amount_required)
          : asNumber(lease.deposit_amount),
      deposit_amount_paid: asNumber(deposit.amount_paid),
      tenant_marked_paid_at: asString(deposit.tenant_marked_paid_at) || null,
      open_maintenance_requests: asNumber(record.open_maintenance_requests),
      has_login: record.has_login === true,
    };
  });
}
 
function parseAccount(payload: unknown): ProvisionedAccount | null {
  const account = toRecord(payload).account;
  if (!account || typeof account !== "object") return null;
 
  const record = toRecord(account);
  const email = asString(record.email);
  if (!email) return null;
 
  return {
    email,
    created: record.created === true,
    temporary_password: asString(record.temporary_password) || null,
  };
}
 
/* ------------------------------------------------------------------ */
/*  ADD TENANT DRAWER                                                  */
/* ------------------------------------------------------------------ */
 
interface DrawerProps {
  onClose: () => void;
  onCreated: (account: ProvisionedAccount | null) => void;
}
 
function AddTenantDrawer({ onClose, onCreated }: DrawerProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [employerName, setEmployerName] = useState("");
  const [employerPhone, setEmployerPhone] = useState("");
  const [nextOfKinName, setNextOfKinName] = useState("");
  const [nextOfKinPhone, setNextOfKinPhone] = useState("");
  const [status, setStatus] = useState("active");
  const [notes, setNotes] = useState("");
  const [createLogin, setCreateLogin] = useState(true);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState("");
  const [optionsReload, setOptionsReload] = useState(0);
  const [propertyId, setPropertyId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositPaid, setDepositPaid] = useState(false);
  const [depositPaymentDate, setDepositPaymentDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setOptionsLoading(true);
    setOptionsError("");

    Promise.all([apiRequest("/properties"), apiRequest("/units")])
      .then(([propertyPayload, unitPayload]) => {
        if (cancelled) return;
        const propertyRows = Array.isArray(propertyPayload) ? propertyPayload : [];
        const unitRows = Array.isArray(unitPayload) ? unitPayload : [];
        setProperties(propertyRows.flatMap((item) => {
          const record = toRecord(item);
          const id = asNumber(record.id);
          const name = asString(record.name);
          return id > 0 && name ? [{ id, name }] : [];
        }));
        setUnits(unitRows.flatMap((item) => {
          const record = toRecord(item);
          const id = asNumber(record.id);
          const property_id = asNumber(record.property_id);
          const unit_number = asString(record.unit_number);
          if (!id || !property_id || !unit_number) return [];
          return [{
            id,
            property_id,
            unit_number,
            unit_type: asString(record.unit_type) || null,
            monthly_rent: asNumber(record.monthly_rent),
            deposit_amount: asNumber(record.deposit_amount),
            status: asString(record.status),
            pending_registration: record.pending_registration === true,
            pending_email: asString(record.pending_email) || null,
          }];
        }));
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setOptionsError(caught instanceof Error ? caught.message : "Could not load properties and units.");
        }
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [optionsReload]);

  const availableUnits = units.filter((unit) =>
    unit.property_id === Number(propertyId) &&
    (unit.status === "vacant" ||
      (unit.pending_registration &&
        unit.pending_email?.toLowerCase() === email.trim().toLowerCase()))
  );
  const selectedUnit = availableUnits.find((unit) => String(unit.id) === unitId);
  const hasLeaseAssignment = Boolean(propertyId || unitId || startDate || monthlyRent);
  const leaseAssignmentValid = !hasLeaseAssignment || Boolean(
    propertyId && unitId && selectedUnit && startDate && monthlyRent !== "" &&
    Number.isFinite(Number(monthlyRent)) && Number(monthlyRent) >= 0 &&
    (!endDate || endDate >= startDate)
  );

  const canSubmit =
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 2 &&
    phone.trim().length >= 6 &&
    leaseAssignmentValid &&
    (!depositPaid || Boolean(depositPaymentDate)) &&
    !saving;
 
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
 
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
 
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) {
      setError("Enter a first name, last name, and a valid phone number.");
      return;
    }
 
    setSaving(true);
    setError("");
 
    try {
      const payload = await apiRequest("/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim() || null,
          phone: phone.trim(),
          national_id: nationalId.trim() || null,
          employer_name: employerName.trim() || null,
          employer_phone: employerPhone.trim() || null,
          next_of_kin_name: nextOfKinName.trim() || null,
          next_of_kin_phone: nextOfKinPhone.trim() || null,
          status,
          notes: notes.trim() || null,
          create_login: createLogin && email.trim().length > 0,
          property_id: propertyId ? Number(propertyId) : null,
          unit_id: unitId ? Number(unitId) : null,
          start_date: propertyId ? startDate : null,
          end_date: propertyId ? endDate || null : null,
          monthly_rent: propertyId ? Number(monthlyRent) : null,
          deposit_amount: depositAmount.trim() !== "" ? Number(depositAmount) : null,
          deposit_paid: depositPaid,
          deposit_payment_date: depositPaid ? depositPaymentDate : null,
        }),
      });
 
      onCreated(parseAccount(payload));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The tenant could not be saved. Try again."
      );
    } finally {
      setSaving(false);
    }
  }
 
  return (
    <div
      className="tn-overlay"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        className="tn-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tn-drawer-title"
      >
        <div className="tn-drawer__head">
          <div>
            <h2 className="tn-drawer__title" id="tn-drawer-title">
              Add a tenant
            </h2>
            <p className="tn-drawer__text">
              Add the tenant, assign a vacant unit and record lease and deposit details in one step.
            </p>
          </div>
 
          <button
            type="button"
            className="tn-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X />
          </button>
        </div>
 
        <form
          id="tn-add-tenant-form"
          className="tn-form"
          onSubmit={handleSubmit}
          noValidate
        >
          {error && (
            <div className="tn-alert" role="alert">
              <AlertCircle />
              <span>{error}</span>
            </div>
          )}
 
          <fieldset className="tn-fieldset">
            <legend className="tn-legend">Tenant</legend>
 
            <div className="tn-grid2">
              <div>
                <label className="tn-field__label" htmlFor="tn-first">
                  First name
                </label>
                <input
                  id="tn-first"
                  className="tn-input"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  autoComplete="given-name"
                  required
                />
              </div>
 
              <div>
                <label className="tn-field__label" htmlFor="tn-last">
                  Last name
                </label>
                <input
                  id="tn-last"
                  className="tn-input"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  autoComplete="family-name"
                  required
                />
              </div>
            </div>
 
            <div>
              <label className="tn-field__label" htmlFor="tn-phone">
                Phone
              </label>
              <input
                id="tn-phone"
                className="tn-input"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+254 712 000 000"
                autoComplete="tel"
                required
              />
            </div>
 
            <div>
              <label className="tn-field__label" htmlFor="tn-email">
                Email
              </label>
              <input
                id="tn-email"
                className="tn-input"
                type="email"
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (selectedUnit?.pending_registration) setUnitId("");
                }}
                placeholder="tenant@example.com"
                autoComplete="email"
              />
              <p className="tn-field__hint">
                Required if you want them to sign in to the tenant portal.
              </p>
            </div>
 
            <div className="tn-grid2">
              <div>
                <label className="tn-field__label" htmlFor="tn-id">
                  National ID
                </label>
                <input
                  id="tn-id"
                  className="tn-input"
                  value={nationalId}
                  onChange={(event) => setNationalId(event.target.value)}
                />
              </div>
 
              <div>
                <label className="tn-field__label" htmlFor="tn-status">
                  Status
                </label>
                <select
                  id="tn-status"
                  className="tn-select"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="tn-grid2">
              <div>
                <label className="tn-field__label" htmlFor="tn-employer">
                  Employer
                </label>
                <input
                  id="tn-employer"
                  className="tn-input"
                  value={employerName}
                  onChange={(event) => setEmployerName(event.target.value)}
                  placeholder="Not provided"
                  autoComplete="organization"
                />
              </div>

              <div>
                <label className="tn-field__label" htmlFor="tn-employer-phone">
                  Employer phone
                </label>
                <input
                  id="tn-employer-phone"
                  className="tn-input"
                  type="tel"
                  inputMode="tel"
                  value={employerPhone}
                  onChange={(event) => setEmployerPhone(event.target.value)}
                  placeholder="Not provided"
                  autoComplete="tel"
                />
              </div>
            </div>

            <div className="tn-grid2">
              <div>
                <label className="tn-field__label" htmlFor="tn-next-of-kin">
                  Next of kin
                </label>
                <input
                  id="tn-next-of-kin"
                  className="tn-input"
                  value={nextOfKinName}
                  onChange={(event) => setNextOfKinName(event.target.value)}
                  placeholder="Not provided"
                  autoComplete="name"
                />
              </div>

              <div>
                <label className="tn-field__label" htmlFor="tn-next-of-kin-phone">
                  Next of kin phone
                </label>
                <input
                  id="tn-next-of-kin-phone"
                  className="tn-input"
                  type="tel"
                  inputMode="tel"
                  value={nextOfKinPhone}
                  onChange={(event) => setNextOfKinPhone(event.target.value)}
                  placeholder="Not provided"
                  autoComplete="tel"
                />
              </div>
            </div>

            <p className="tn-field__hint">
              These details are included in the lease automatically. Leave a field blank if the information is not available yet.
            </p>
 
            <div>
              <label className="tn-field__label" htmlFor="tn-notes">
                Notes
              </label>
              <textarea
                id="tn-notes"
                className="tn-textarea"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Anything the team should know about this tenancy."
              />
            </div>
          </fieldset>

          <fieldset className="tn-fieldset">
            <legend className="tn-legend">Property, lease &amp; deposit (optional)</legend>
            {optionsLoading ? (
              <p className="tn-field__hint" role="status">Loading your properties and units…</p>
            ) : optionsError ? (
              <div className="tn-alert" role="alert">
                <AlertCircle />
                <span>{optionsError}{" "}
                  <button type="button" className="tn-link" onClick={() => setOptionsReload((value) => value + 1)}>Retry</button>
                </span>
              </div>
            ) : (
              <>
                <div>
                  <label className="tn-field__label" htmlFor="tn-property">Property</label>
                  <select
                    id="tn-property"
                    className="tn-select"
                    value={propertyId}
                    onChange={(event) => {
                      setPropertyId(event.target.value);
                      setUnitId("");
                      setMonthlyRent("");
                      setDepositAmount("");
                    }}
                  >
                    <option value="">Create tenant without assigning a property</option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>{property.name}</option>
                    ))}
                  </select>
                  {properties.length === 0 && <p className="tn-field__hint">Create a property and units before assigning a tenancy.</p>}
                </div>

                {propertyId && (
                  <>
                    <div>
                      <label className="tn-field__label" htmlFor="tn-unit">Vacant unit</label>
                      <select
                        id="tn-unit"
                        className="tn-select"
                        value={unitId}
                        onChange={(event) => {
                          const nextId = event.target.value;
                          setUnitId(nextId);
                          const selected = availableUnits.find((unit) => String(unit.id) === nextId);
                          setMonthlyRent(selected ? String(selected.monthly_rent) : "");
                          setDepositAmount(selected ? String(selected.deposit_amount) : "");
                        }}
                      >
                        <option value="">Select a vacant unit</option>
                        {availableUnits.map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.unit_number}{unit.unit_type ? ` — ${unit.unit_type}` : ""} · {formatMoney(unit.monthly_rent, readCurrency())}{unit.pending_registration ? " · Confirm pending registration" : ""}
                          </option>
                        ))}
                      </select>
                      {availableUnits.length === 0 && <p className="tn-field__hint">No vacant units are available in this property.</p>}
                    </div>

                    {unitId && (
                      <>
                        <div className="tn-grid2">
                          <div>
                            <label className="tn-field__label" htmlFor="tn-lease-start">Lease start date</label>
                            <input id="tn-lease-start" className="tn-input" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
                          </div>
                          <div>
                            <label className="tn-field__label" htmlFor="tn-lease-end">Lease end date (optional)</label>
                            <input id="tn-lease-end" className="tn-input" type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} />
                          </div>
                        </div>
                        <div className="tn-grid2">
                          <div>
                            <label className="tn-field__label" htmlFor="tn-monthly-rent">Agreed monthly rent</label>
                            <input id="tn-monthly-rent" className="tn-input" type="number" min={0} step="0.01" value={monthlyRent} onChange={(event) => setMonthlyRent(event.target.value)} required />
                            <p className="tn-field__hint">Unit standard: {selectedUnit ? formatMoney(selectedUnit.monthly_rent, readCurrency()) : "—"}. Changing this affects this lease only.</p>
                          </div>
                          <div>
                            <label className="tn-field__label" htmlFor="tn-deposit-amount">Agreed security deposit</label>
                            <input id="tn-deposit-amount" className="tn-input" type="number" min={0} step="0.01" value={depositAmount} onChange={(event) => setDepositAmount(event.target.value)} />
                            <p className="tn-field__hint">Prefilled from the unit's standard deposit; changing this affects this lease only.</p>
                          </div>
                        </div>
                        <label className="tn-check" htmlFor="tn-deposit-paid">
                          <input id="tn-deposit-paid" type="checkbox" checked={depositPaid} onChange={(event) => setDepositPaid(event.target.checked)} />
                          <span className="tn-check__title">Deposit has been paid</span>
                        </label>
                        {depositPaid && (
                          <div>
                            <label className="tn-field__label" htmlFor="tn-deposit-date">Deposit payment date</label>
                            <input id="tn-deposit-date" className="tn-input" type="date" value={depositPaymentDate} onChange={(event) => setDepositPaymentDate(event.target.value)} required />
                            <p className="tn-field__hint">This date is recorded separately from the lease start date.</p>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </fieldset>

          <fieldset className="tn-fieldset">
            <legend className="tn-legend">Portal access</legend>
 
            <label className="tn-check" htmlFor="tn-login">
              <input
                id="tn-login"
                type="checkbox"
                checked={createLogin}
                onChange={(event) => setCreateLogin(event.target.checked)}
                disabled={email.trim().length === 0}
              />
              <span>
                <span className="tn-check__title">
                  Create a tenant portal login
                </span>
                <p className="tn-field__hint">
                  We generate a temporary password and show it once, so you can
                  pass it on. They sign in on the same login page you use.
                </p>
              </span>
            </label>
          </fieldset>
        </form>
 
        <div className="tn-drawer__foot">
          <button type="button" className="tn-btn tn-btn--subtle" onClick={onClose}>
            Cancel
          </button>
 
          <button
            type="submit"
            form="tn-add-tenant-form"
            className="tn-btn tn-btn--primary"
            disabled={!canSubmit}
          >
            <UserPlus />
            {saving ? "Saving…" : "Add tenant"}
          </button>
        </div>
      </aside>
    </div>
  );
}
 
/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */
 
function ManagerTenantsPage() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "pending" | "inactive"
  >("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [account, setAccount] = useState<ProvisionedAccount | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmingLeaseId, setConfirmingLeaseId] = useState<number | null>(null);
 
  const currency = useMemo(readCurrency, []);
 
  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
 
    try {
      const payload = await apiRequest("/tenants");
      setTenants(parseTenants(payload));
      setError("");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Tenants could not be loaded right now."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
 
  useEffect(() => {
    void load();
  }, [load]);
 
  const counts = useMemo(
    () => ({
      all: tenants.length,
      active: tenants.filter((tenant) => tenant.status === "active").length,
      pending: tenants.filter((tenant) => tenant.status === "pending").length,
      inactive: tenants.filter((tenant) => tenant.status === "inactive").length,
    }),
    [tenants]
  );
 
  const housed = useMemo(
    () => tenants.filter((tenant) => tenant.unit !== null).length,
    [tenants]
  );
 
  const openRequests = useMemo(
    () =>
      tenants.reduce(
        (total, tenant) => total + tenant.open_maintenance_requests,
        0
      ),
    [tenants]
  );
 
  const rentRoll = useMemo(
    () => tenants.reduce((total, tenant) => total + tenant.monthly_rent, 0),
    [tenants]
  );
 
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
 
    return tenants.filter((tenant) => {
      if (statusFilter === "active" && tenant.status !== "active") return false;
      if (statusFilter === "pending" && tenant.status !== "pending") return false;
      if (statusFilter === "inactive" && tenant.status !== "inactive") return false;
      if (!term) return true;
 
      return [
        tenant.name,
        tenant.email,
        tenant.phone,
        tenant.property?.name,
        tenant.unit?.unit_number,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [tenants, query, statusFilter]);
 
  const groups = useMemo(() => {
    const map = new Map<string, TenantRecord[]>();
 
    visible.forEach((tenant) => {
      const key = tenant.property?.name ?? UNASSIGNED;
      const bucket = map.get(key);
      if (bucket) bucket.push(tenant);
      else map.set(key, [tenant]);
    });
 
    return [...map.entries()].sort(([a], [b]) => {
      if (a === UNASSIGNED) return 1;
      if (b === UNASSIGNED) return -1;
      return a.localeCompare(b);
    });
  }, [visible]);
 
  async function copyPassword(password: string) {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }
 
  const filters: { key: "all" | "active" | "pending" | "inactive"; label: string; count: number }[] =
    [
      { key: "all", label: "All", count: counts.all },
      { key: "active", label: "Active", count: counts.active },
      { key: "pending", label: "Pending onboarding", count: counts.pending },
      { key: "inactive", label: "Inactive", count: counts.inactive },
    ];

  function todayDate(): string {
    return new Date().toISOString().slice(0, 10);
  }

  async function confirmDepositReceipt(tenant: TenantRecord) {
    if (!tenant.lease_id || tenant.deposit_amount_required <= 0) return;

    setConfirmingLeaseId(tenant.lease_id);

    try {
      await apiRequest(`/leases/${tenant.lease_id}`, {
        method: "PATCH",
        body: JSON.stringify({
          deposit_paid_amount: tenant.deposit_amount_required,
          deposit_payment_date: todayDate(),
        }),
      });
      setError("");
      await load(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not confirm the deposit receipt right now."
      );
    } finally {
      setConfirmingLeaseId(null);
    }
  }
 
  return (
    <DashboardLayout>
      <div className="tn-root tn-root--redesigned">
        <style>{styles}</style>
 
        <div className="tn-shell">
          <header className="tn-header">
            <div>
              <span className="tn-eyebrow">
                <Users />
                People
              </span>
 
              <h1 className="tn-title">Tenants</h1>
 
              <p className="tn-subtitle">
                Everyone renting in your organization, grouped by the property
                they live in. Adding a tenant here can also give them a login
                for the tenant portal.
              </p>
            </div>
 
            <div className="tn-actions">
              <button
                type="button"
                className="tn-btn tn-btn--ghost"
                onClick={() => void load(true)}
                disabled={loading || refreshing}
              >
                <RefreshCw className={refreshing ? "tn-spin" : undefined} />
                {refreshing ? "Refreshing…" : "Refresh"}
              </button>
 
              <button
                type="button"
                className="tn-btn tn-btn--primary"
                onClick={() => setDrawerOpen(true)}
              >
                <Plus />
                Add tenant
              </button>
            </div>
          </header>
 
          {error && (
            <div className="tn-alert" role="alert">
              <AlertCircle />
              <span>{error}</span>
            </div>
          )}
 
          {account && (
            <div className="tn-alert tn-alert--ok" role="status">
              <KeyRound />
              <div>
                <span>
                  {account.created
                    ? `Portal login created for ${account.email}.`
                    : `${account.email} already had an account — it is now linked to this tenant.`}
                </span>
 
                {account.temporary_password && (
                  <span className="tn-credential">
                    Temporary password
                    <code>{account.temporary_password}</code>
                    <button
                      type="button"
                      className="tn-btn tn-btn--subtle"
                      onClick={() =>
                        void copyPassword(account.temporary_password ?? "")
                      }
                    >
                      {copied ? <Check /> : <Copy />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}
 
          <section className="tn-stats" aria-label="Tenant summary">
            <article className="tn-stat">
              <p className="tn-stat__label">Tenants</p>
              <p className="tn-stat__value">{counts.all}</p>
            </article>
 
            <article className="tn-stat">
              <p className="tn-stat__label">Active</p>
              <p className="tn-stat__value">{counts.active}</p>
            </article>
 
            <article className="tn-stat">
              <p className="tn-stat__label">Housed in a unit</p>
              <p className="tn-stat__value">
                {housed}/{counts.all}
              </p>
            </article>
 
            <article className="tn-stat">
              <p className="tn-stat__label">Monthly rent roll</p>
              <p className="tn-stat__value">{formatMoney(rentRoll, currency)}</p>
            </article>
 
            <article className="tn-stat">
              <p className="tn-stat__label">Open requests</p>
              <p className="tn-stat__value">{openRequests}</p>
            </article>
          </section>
 
          <div className="tn-toolbar">
            <div className="tn-toolbar__field">
              <label className="tn-field__label" htmlFor="tn-search-input">
                Search tenants
              </label>
              <div className="tn-search">
                <Search />
                <input
                  id="tn-search-input"
                  className="tn-input"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Type a name, property, unit, email or phone…"
                />
              </div>
            </div>
 
            <div className="tn-filters">
              {filters.map(({ key, label, count }) => (
                <button
                  key={key}
                  type="button"
                  className={`tn-chip${statusFilter === key ? " tn-chip--on" : ""}`}
                  onClick={() => setStatusFilter(key)}
                  aria-pressed={statusFilter === key}
                >
                  {label}
                  <span className="tn-chip__count">{count}</span>
                </button>
              ))}
            </div>
          </div>
 
          {loading ? (
            <div className="tn-groups" aria-hidden="true">
              <span className="tn-skeleton" />
              <span className="tn-skeleton" />
              <span className="tn-skeleton" />
            </div>
          ) : tenants.length === 0 ? (
            <div className="tn-state">
              <span className="tn-state__icon">
                <Users />
              </span>
              <h2 className="tn-state__title">No tenants yet</h2>
              <p className="tn-state__text">
                Add your first tenant to start tracking leases, rent and
                maintenance for a real person rather than a unit number.
              </p>
              <button
                type="button"
                className="tn-btn tn-btn--primary"
                onClick={() => setDrawerOpen(true)}
              >
                <Plus />
                Add tenant
              </button>
            </div>
          ) : visible.length === 0 ? (
            <div className="tn-state">
              <span className="tn-state__icon">
                <Search />
              </span>
              <h2 className="tn-state__title">No matches</h2>
              <p className="tn-state__text">
                Nothing matches that search or filter. Clear it to see everyone
                again.
              </p>
            </div>
          ) : (
            <div className="tn-groups">
              {groups.map(([property, rows]) => (
                <section key={property} aria-label={property}>
                  <div className="tn-group__head">
                    <h2 className="tn-group__title">
                      <Building2 />
                      {property}
                    </h2>
                    <span className="tn-group__meta">
                      {rows.length} {rows.length === 1 ? "tenant" : "tenants"}
                    </span>
                  </div>
 
                  <div className="tn-list">
                    {rows.map((tenant) => (
                      <article className="tn-row" key={tenant.id}>
                        <div className="tn-person">
                          <span className="tn-avatar" aria-hidden="true">
                            {initials(tenant.name)}
                          </span>
 
                          <div className="tn-person__body">
                            <p className="tn-person__name">{tenant.name}</p>
                            <p className="tn-person__contact">
                              {tenant.phone && (
                                <span>
                                  <Phone />
                                  {tenant.phone}
                                </span>
                              )}
                              {tenant.email && (
                                <span>
                                  <Mail />
                                  {tenant.email}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
 
                        <div className="tn-cell">
                          <p className="tn-cell__label">Unit</p>
                          <p className="tn-cell__value">
                            {tenant.unit
                              ? `${tenant.unit.unit_number}`
                              : "Not assigned"}
                          </p>
                          <p className="tn-cell__sub">
                            {tenant.property?.name ?? UNASSIGNED}
                          </p>
                        </div>
 
                        <div className="tn-cell tn-cell--money">
                          <p className="tn-cell__label">Rent</p>
                          <p className="tn-cell__value">
                            {tenant.monthly_rent > 0
                              ? formatMoney(tenant.monthly_rent, currency)
                              : "—"}
                          </p>
                        </div>

                        <div className="tn-cell">
                          <p className="tn-cell__label">Lease</p>
                          <p className="tn-cell__value">
                            {tenant.lease_status
                              ? `${tenant.lease_status}${tenant.lease_start ? ` · ${tenant.lease_start}` : ""}${tenant.lease_end ? ` – ${tenant.lease_end}` : ""}`
                              : tenant.status === "pending" ? "Pending manager confirmation" : "No lease"}
                          </p>
                          {tenant.lease_id && (
                            <div className="tn-inline-actions" style={{ marginTop: "0.5rem" }}>
                              <button
                                type="button"
                                className="tn-link"
                                onClick={() => navigate(`/manager/leases?lease=${tenant.lease_id}`)}
                              >
                                <FileText />
                                View lease agreement
                              </button>
                            </div>
                          )}
                        </div>
 
                        <div className="tn-cell">
                          <p className="tn-cell__label">Deposit</p>
                          <p className="tn-cell__value">
                            {tenant.deposit_status
                              ? tenant.deposit_status.replace(/_/g, " ")
                              : "—"}
                          </p>
                          {tenant.lease_id ? (
                            <p className="tn-cell__sub">
                              Confirmed {formatMoney(tenant.deposit_amount_paid, currency)} of{" "}
                              {formatMoney(tenant.deposit_amount_required, currency)}
                            </p>
                          ) : null}
                          {tenant.lease_id &&
                            tenant.tenant_marked_paid_at &&
                            tenant.deposit_status !== "paid" && (
                              <div className="tn-claim">
                                <div>
                                  <p className="tn-claim__title">
                                    Tenant says they&apos;ve paid
                                  </p>
                                  <p className="tn-claim__text">
                                    Claimed on {tenant.tenant_marked_paid_at}. Confirm
                                    receipt once the funds arrive.
                                  </p>
                                </div>
                                <div className="tn-inline-actions">
                                  <button
                                    type="button"
                                    className="tn-btn tn-btn--primary"
                                    onClick={() => void confirmDepositReceipt(tenant)}
                                    disabled={confirmingLeaseId === tenant.lease_id}
                                  >
                                    {confirmingLeaseId === tenant.lease_id
                                      ? "Confirming…"
                                      : "Confirm receipt"}
                                  </button>
                                </div>
                              </div>
                            )}
                        </div>
 
                        <div className="tn-row__aside">
                          <div className="tn-tags">
                            <span
                              className={`tn-pill tn-pill--${
                                tenant.status === "active"
                                  ? "active"
                                  : tenant.status === "pending" ? "warn" : "inactive"
                              }
/* Tenant directory redesign: a card grid, theme-aware controls, and stronger hierarchy. */
.tn-root--redesigned .tn-shell{max-width:88rem;gap:1.6rem}
.tn-root--redesigned .tn-header{padding:clamp(1.15rem,2.6vw,2rem);border:1px solid var(--tn-border);border-left:5px solid var(--tn-blue);border-radius:1.4rem;background:radial-gradient(ellipse at 100% 0%,color-mix(in srgb,var(--tn-blue) 16%,transparent),transparent 50%),var(--tn-surface)}
.tn-root--redesigned .tn-eyebrow{padding:.35rem .7rem;border:1px solid var(--tn-border);border-radius:999px;background:var(--tn-glass);color:var(--tn-blue);letter-spacing:.12em}
.tn-root--redesigned .tn-title{margin-top:.75rem;font-size:clamp(2rem,3.8vw,2.8rem);letter-spacing:-.05em}
.tn-root--redesigned .tn-subtitle{max-width:46rem;line-height:1.65}
.tn-root--redesigned .tn-stats{grid-template-columns:repeat(5,minmax(0,1fr));gap:.75rem}
.tn-root--redesigned .tn-stat{position:relative;overflow:hidden;min-height:7rem;padding:1rem;border:1px solid var(--tn-border);border-radius:1rem;background:var(--tn-surface);box-shadow:0 8px 26px rgba(0,0,0,.06)}
.tn-root--redesigned .tn-stat::after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;background:var(--tn-blue)}
.tn-root--redesigned .tn-stat__label{font-size:.68rem;letter-spacing:.1em;text-transform:uppercase}
.tn-root--redesigned .tn-stat__value{color:var(--tn-text);margin-top:.65rem;font-size:clamp(1.35rem,2vw,1.8rem);letter-spacing:-.045em}
.tn-root--redesigned .tn-toolbar{align-items:end;padding:.9rem;border:1px solid var(--tn-border);border-radius:1.1rem;background:var(--tn-glass)}
.tn-root--redesigned .tn-field__label{display:block;margin-bottom:.45rem;font-size:.7rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--tn-muted)}
.tn-root--redesigned .tn-input,.tn-root--redesigned .tn-select,.tn-root--redesigned .tn-textarea{border-color:var(--tn-border);background:var(--tn-surface);color:var(--tn-text)}
.tn-root--redesigned .tn-input:focus,.tn-root--redesigned .tn-select:focus,.tn-root--redesigned .tn-textarea:focus{border-color:var(--tn-blue);outline:2px solid color-mix(in srgb,var(--tn-blue) 22%,transparent);outline-offset:1px}
.tn-root--redesigned .tn-filters{gap:.45rem}
.tn-root--redesigned .tn-chip{border-color:var(--tn-border);background:var(--tn-surface);color:var(--tn-muted)}
.tn-root--redesigned .tn-chip--on{border-color:var(--tn-blue);background:color-mix(in srgb,var(--tn-blue) 15%,var(--tn-surface));color:var(--tn-text)}
.tn-root--redesigned .tn-groups{display:flex;flex-direction:column;gap:1.25rem}
.tn-root--redesigned .tn-group__head{display:flex;align-items:center;justify-content:space-between;gap:.75rem;margin-bottom:.75rem;padding:0 .15rem}
.tn-root--redesigned .tn-group__title{font-size:1.05rem;letter-spacing:-.025em}
.tn-root--redesigned .tn-group__meta{padding:.3rem .6rem;border:1px solid var(--tn-border);border-radius:999px;background:var(--tn-glass)}
.tn-root--redesigned .tn-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.9rem}
.tn-root--redesigned .tn-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-content:start;gap:.9rem;min-width:0;padding:1.1rem;border:1px solid var(--tn-border);border-radius:1.2rem;background:var(--tn-surface);box-shadow:0 10px 28px rgba(0,0,0,.05);transition:border-color .18s ease,transform .18s ease,box-shadow .18s ease}
.tn-root--redesigned .tn-row:hover{border-color:var(--tn-blue);transform:translateY(-2px);box-shadow:0 15px 34px rgba(0,0,0,.09)}
.tn-root--redesigned .tn-person{grid-column:1/-1;align-items:center;padding-bottom:.85rem;border-bottom:1px solid var(--tn-border-soft)}
.tn-root--redesigned .tn-avatar{width:2.9rem;height:2.9rem;border-radius:1rem;border-color:color-mix(in srgb,var(--tn-blue) 30%,var(--tn-border));background:color-mix(in srgb,var(--tn-blue) 15%,var(--tn-surface));color:var(--tn-text)}
.tn-root--redesigned .tn-person__name{color:var(--tn-text);font-size:1rem;letter-spacing:-.02em}
.tn-root--redesigned .tn-cell{padding:.15rem 0}
.tn-root--redesigned .tn-cell__label{letter-spacing:.1em}
.tn-root--redesigned .tn-cell__value{color:var(--tn-text);line-height:1.5}
.tn-root--redesigned .tn-cell--money .tn-cell__value{color:var(--tn-text);font-size:1.05rem;font-weight:750}
.tn-root--redesigned .tn-cell__sub{color:var(--tn-muted)}
.tn-root--redesigned .tn-row__aside{grid-column:1/-1;padding-top:.8rem;border-top:1px solid var(--tn-border-soft)}
.tn-root--redesigned .tn-state{padding:3rem 1.5rem;border:1px solid var(--tn-border);border-radius:1.3rem;background:var(--tn-surface)}
.tn-root--redesigned .tn-state__title,.tn-root--redesigned .tn-state__text{color:var(--tn-text)}
@media(max-width:65rem){.tn-root--redesigned .tn-stats{grid-template-columns:repeat(3,minmax(0,1fr))}.tn-root--redesigned .tn-list{grid-template-columns:1fr}}
@media(max-width:38rem){.tn-root--redesigned .tn-header{padding:1rem;border-radius:1.05rem}.tn-root--redesigned .tn-stats{grid-template-columns:repeat(2,minmax(0,1fr));gap:.55rem}.tn-root--redesigned .tn-stat{min-height:6rem;padding:.8rem}.tn-root--redesigned .tn-stat__value{font-size:1.35rem}.tn-root--redesigned .tn-toolbar{padding:.7rem}.tn-root--redesigned .tn-row{padding:.9rem;gap:.75rem}}
`}
                            >
                              {tenant.status === "pending"
                                ? "Pending onboarding"
                                : tenant.status === "active" ? "Active" : "Inactive"}
                            </span>

                            {tenant.unit === null && tenant.status !== "pending" && (
                              <span className="tn-pill">
                                <DoorOpen />
                                No lease
                              </span>
                            )}

                            {tenant.open_maintenance_requests > 0 && (
                              <span className="tn-pill tn-pill--warn">
                                <Wrench />
                                {tenant.open_maintenance_requests} open
                              </span>
                            )}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
 
        {drawerOpen && (
          <AddTenantDrawer
            onClose={() => setDrawerOpen(false)}
            onCreated={(created) => {
              setDrawerOpen(false);
              setAccount(created);
              void load(true);
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
 
export default ManagerTenantsPage;