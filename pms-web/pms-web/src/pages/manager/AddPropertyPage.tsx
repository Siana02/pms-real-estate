import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Building2,
  CheckCircle2,
  DoorOpen,
  Factory,
  FileText,
  Home,
  Landmark,
  Loader2,
  MapPin,
  Minus,
  Plus,
  Save,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { apiRequest } from "../../services/api";

/* ------------------------------------------------------------------ */
/*  STYLES — vanilla CSS                                               */
/* ------------------------------------------------------------------ */

const styles = `
.ap-root {
  --ap-bg: #030712;
  --ap-surface: rgba(15, 23, 42, 0.55);
  --ap-glass: rgba(255, 255, 255, 0.05);
  --ap-glass-strong: rgba(255, 255, 255, 0.1);
  --ap-border: rgba(255, 255, 255, 0.1);
  --ap-border-soft: rgba(255, 255, 255, 0.06);
  --ap-muted: #94a3b8;
  --ap-faint: #64748b;
  --ap-blue: #3b82f6;
  --ap-indigo: #4f46e5;
  --ap-danger: #f87171;
  --ap-success: #4ade80;
  --ap-radius-sm: 0.75rem;
  --ap-radius-md: 1rem;
  --ap-radius-lg: 1.5rem;
  --ap-shadow: 0 30px 60px -20px rgba(0, 0, 0, 0.75);
  --ap-font: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Inter, Roboto,
    "Helvetica Neue", Arial, sans-serif;

  position: relative;
  min-height: 100%;
  overflow-x: hidden;
  background: var(--ap-bg);
  color: #f8fafc;
  font-family: var(--ap-font);
  letter-spacing: -0.015em;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.ap-root,
.ap-root * {
  box-sizing: border-box;
}

.ap-root button {
  font-family: inherit;
  color: inherit;
  border: none;
  background: none;
  cursor: pointer;
}

.ap-root input,
.ap-root textarea,
.ap-root select {
  font-family: inherit;
}

.ap-root button:focus-visible,
.ap-root input:focus-visible,
.ap-root textarea:focus-visible,
.ap-root select:focus-visible {
  outline: 2px solid var(--ap-blue);
  outline-offset: 2px;
}

.ap-sr {
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
.ap-backdrop {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  background: radial-gradient(
    120% 90% at 15% 0%,
    rgba(30, 41, 59, 0.85) 0%,
    var(--ap-bg) 60%
  );
}

.ap-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.5;
  animation: ap-float 14s ease-in-out infinite;
}

.ap-orb--indigo {
  top: -14rem;
  left: -10rem;
  width: 28rem;
  height: 28rem;
  background: rgba(79, 70, 229, 0.28);
}

.ap-orb--blue {
  bottom: -16rem;
  right: -10rem;
  width: 30rem;
  height: 30rem;
  background: rgba(37, 99, 235, 0.2);
  animation-delay: -6s;
}

@keyframes ap-float {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(1);
  }
  50% {
    transform: translate3d(0, -1.75rem, 0) scale(1.06);
  }
}

/* ---------- shell ---------- */
.ap-shell {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 78rem;
  margin: 0 auto;
  padding: 1.5rem 1.25rem 6.5rem;
}

.ap-back {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.5rem;
  padding: 0.5rem 0.875rem;
  border-radius: var(--ap-radius-sm);
  border: 1px solid var(--ap-border);
  background: var(--ap-glass);
  font-size: 0.875rem;
  font-weight: 500;
  color: #e2e8f0;
  transition: background-color 0.25s ease, border-color 0.25s ease,
    transform 0.25s ease;
}

.ap-back:hover {
  border-color: rgba(255, 255, 255, 0.22);
  background: var(--ap-glass-strong);
  transform: translateX(-2px);
}

.ap-back svg {
  width: 1rem;
  height: 1rem;
}

/* ---------- header ---------- */
.ap-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-top: 1.25rem;
}

.ap-header__mark {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: var(--ap-radius-md);
  border: 1px solid var(--ap-border);
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.28),
    rgba(79, 70, 229, 0.28)
  );
  color: #bfdbfe;
}

.ap-header__mark svg {
  width: 1.25rem;
  height: 1.25rem;
}

.ap-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.2;
  background: linear-gradient(100deg, #ffffff 0%, #e2e8f0 45%, #94a3b8 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.ap-subtitle {
  margin: 0.375rem 0 0;
  max-width: 34rem;
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--ap-muted);
}

/* ---------- layout ---------- */
.ap-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
  margin-top: 1.5rem;
  align-items: start;
}

.ap-card {
  padding: 1.25rem;
  border-radius: var(--ap-radius-lg);
  border: 1px solid var(--ap-border-soft);
  background: var(--ap-surface);
  backdrop-filter: blur(18px);
  box-shadow: var(--ap-shadow);
}

.ap-section + .ap-section {
  margin-top: 1.75rem;
  padding-top: 1.75rem;
  border-top: 1px solid var(--ap-border-soft);
}

.ap-section__title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--ap-faint);
}

.ap-section__title svg {
  width: 0.875rem;
  height: 0.875rem;
  color: #60a5fa;
}

/* ---------- fields ---------- */
.ap-fields {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  margin-top: 1rem;
}

.ap-field--full {
  grid-column: 1 / -1;
}

.ap-label {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #cbd5e1;
}

.ap-label__req {
  color: #93c5fd;
}

.ap-label__count {
  font-size: 0.6875rem;
  font-variant-numeric: tabular-nums;
  color: var(--ap-faint);
}

.ap-input,
.ap-textarea,
.ap-select {
  width: 100%;
  min-height: 2.875rem;
  padding: 0.6875rem 0.9375rem;
  border-radius: var(--ap-radius-sm);
  border: 1px solid var(--ap-border);
  background: var(--ap-glass);
  color: #fff;
  font-size: 0.9375rem;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease,
    background-color 0.2s ease;
}

.ap-textarea {
  min-height: 6rem;
  line-height: 1.6;
  resize: vertical;
}

.ap-select {
  cursor: pointer;
  appearance: none;
  background-image: linear-gradient(45deg, transparent 50%, #94a3b8 50%),
    linear-gradient(135deg, #94a3b8 50%, transparent 50%);
  background-position: calc(100% - 1.125rem) 1.25rem,
    calc(100% - 0.75rem) 1.25rem;
  background-size: 0.375rem 0.375rem, 0.375rem 0.375rem;
  background-repeat: no-repeat;
  padding-right: 2.5rem;
}

.ap-select option {
  background: #0b1120;
  color: #f8fafc;
}

.ap-input::placeholder,
.ap-textarea::placeholder {
  color: var(--ap-faint);
}

.ap-input:focus,
.ap-textarea:focus,
.ap-select:focus {
  border-color: var(--ap-blue);
  background-color: rgba(59, 130, 246, 0.08);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}

.ap-input--invalid,
.ap-textarea--invalid {
  border-color: rgba(248, 113, 113, 0.6);
}

.ap-input--invalid:focus,
.ap-textarea--invalid:focus {
  box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.28);
}

.ap-help,
.ap-error {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin: 0.4375rem 0 0;
  font-size: 0.75rem;
  line-height: 1.5;
}

.ap-help {
  color: var(--ap-faint);
}

.ap-error {
  color: #fca5a5;
}

.ap-error svg {
  width: 0.875rem;
  height: 0.875rem;
  flex: none;
}

/* ---------- property type picker ---------- */
.ap-types {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.625rem;
  margin-top: 1rem;
}
 
.ap-type {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  padding: 0.875rem;
  border-radius: var(--ap-radius-sm);
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.04);
  font-size: 0.875rem;
  font-weight: 500;
  color: #cbd5e1;
  text-align: left;
  min-height: 4.25rem;
  transition: border-color 0.2s ease, background-color 0.2s ease,
    color 0.2s ease, transform 0.2s ease;
}
 
.ap-type:hover {
  border-color: rgba(255, 255, 255, 0.2);
  background: var(--ap-glass-strong);
  transform: translateY(-1px);
}
 
.ap-type svg {
  width: 1.0625rem;
  height: 1.0625rem;
  flex: none;
  margin-top: 0.125rem;
  color: var(--ap-muted);
}
 
.ap-type__text {
  display: flex;
  flex-direction: column;
  gap: 0.1875rem;
  min-width: 0;
}
 
.ap-type__label {
  font-size: 0.875rem;
  font-weight: 600;
  color: inherit;
}
 
.ap-type__hint {
  font-size: 0.6875rem;
  font-weight: 400;
  color: var(--ap-faint);
  overflow-wrap: anywhere;
}

.ap-type--active {
  color: #fff;
  border-color: rgba(96, 165, 250, 0.85);
  background: linear-gradient(
    120deg,
    rgba(59, 130, 246, 0.38),
    rgba(79, 70, 229, 0.28)
  );
  box-shadow: 0 0 0 1px rgba(96, 165, 250, 0.35),
    0 10px 25px -12px rgba(59, 130, 246, 0.8);
}

.ap-type--active svg {
  color: #93c5fd;
}

/* ---------- stepper ---------- */
.ap-stepper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.ap-stepper .ap-input {
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.ap-step-btn {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 2.875rem;
  height: 2.875rem;
  border-radius: var(--ap-radius-sm);
  border: 1px solid var(--ap-border);
  background: var(--ap-glass);
  color: #e2e8f0;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.ap-step-btn:hover {
  border-color: rgba(255, 255, 255, 0.22);
  background: var(--ap-glass-strong);
}

.ap-step-btn svg {
  width: 1rem;
  height: 1rem;
}

.ap-step-btn[disabled] {
  cursor: not-allowed;
  opacity: 0.45;
}
 
.ap-step-btn--wide {
  width: auto;
  height: auto;
  min-height: 2.75rem;
  padding: 0.625rem 1rem;
  gap: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 600;
  white-space: nowrap;
}
 
.ap-step-btn--wide svg {
  width: 1rem;
  height: 1rem;
}
 
.ap-step-btn--primary {
  color: #fff;
  border-color: transparent;
  background: linear-gradient(90deg, var(--ap-blue) 0%, var(--ap-indigo) 100%);
}

/* ---------- alerts ---------- */
.ap-alert {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  margin-bottom: 1.25rem;
  padding: 0.875rem 1rem;
  border-radius: var(--ap-radius-sm);
  font-size: 0.875rem;
  line-height: 1.5;
}

.ap-alert svg {
  width: 1.0625rem;
  height: 1.0625rem;
  flex: none;
  margin-top: 0.0625rem;
}

.ap-alert--error {
  border: 1px solid rgba(248, 113, 113, 0.35);
  background: rgba(127, 29, 29, 0.28);
  color: #fecaca;
}

.ap-alert--success {
  border: 1px solid rgba(74, 222, 128, 0.35);
  background: rgba(20, 83, 45, 0.32);
  color: #bbf7d0;
}

/* ---------- preview ---------- */
.ap-aside {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.ap-preview__label {
  margin: 0 0 0.875rem;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--ap-faint);
}

.ap-preview__row {
  display: flex;
  align-items: center;
  gap: 0.875rem;
}

.ap-preview__avatar {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: var(--ap-radius-sm);
  border: 1px solid var(--ap-border);
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.25),
    rgba(79, 70, 229, 0.25)
  );
  font-size: 0.875rem;
  font-weight: 600;
  color: #dbeafe;
}

.ap-preview__name {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ap-preview__meta {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin: 0.3125rem 0 0;
  font-size: 0.8125rem;
  color: var(--ap-muted);
}

.ap-preview__meta svg {
  width: 0.875rem;
  height: 0.875rem;
  flex: none;
  color: var(--ap-faint);
}

.ap-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}

.ap-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.3125rem 0.625rem;
  border-radius: 999px;
  border: 1px solid var(--ap-border);
  background: var(--ap-glass);
  font-size: 0.75rem;
  color: #cbd5e1;
  text-transform: capitalize;
}

.ap-chip svg {
  width: 0.875rem;
  height: 0.875rem;
  color: #93c5fd;
}

.ap-tips {
  margin: 0;
  padding-left: 1.125rem;
  font-size: 0.8125rem;
  line-height: 1.7;
  color: var(--ap-muted);
}

.ap-fieldset {
  border: none;
  margin: 0;
  padding: 0;
}

/* ---------- rollup metrics ---------- */
.ap-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  gap: 0.625rem;
  margin-top: 1rem;
}

.ap-metric {
  padding: 0.875rem;
  border-radius: var(--ap-radius-sm);
  border: 1px solid var(--ap-border-soft);
  background: var(--ap-glass);
}

.ap-metric__label {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin: 0;
  font-size: 0.75rem;
  color: var(--ap-muted);
}

.ap-metric__label svg {
  width: 0.875rem;
  height: 0.875rem;
  flex: none;
  color: #93c5fd;
}

.ap-metric__value {
  margin: 0.375rem 0 0;
  font-size: 1.0625rem;
  font-weight: 600;
  color: #fff;
  font-variant-numeric: tabular-nums;
}

.ap-metric__hint {
  margin: 0.25rem 0 0;
  font-size: 0.6875rem;
  color: var(--ap-faint);
}

/* ---------- units builder ---------- */
.ap-units-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 1rem;
}
 
.ap-units-bar--actions {
  justify-content: flex-start;
}
 
.ap-units-bar__hint--generate {
  margin-top: 0.5rem;
}

.ap-units-bar__hint {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--ap-muted);
}

.ap-units {
  display: grid;
  gap: 0.75rem;
  margin-top: 0.875rem;
}

.ap-unit {
  padding: 1rem;
  border-radius: var(--ap-radius-sm);
  border: 1px solid var(--ap-border-soft);
  background: rgba(255, 255, 255, 0.03);
  transition: border-color 0.25s ease;
}

.ap-unit--occupied {
  border-color: rgba(74, 222, 128, 0.3);
}

.ap-unit__head {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.ap-unit__index {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--ap-border);
  background: var(--ap-glass);
  font-size: 0.75rem;
  font-weight: 600;
  color: #bfdbfe;
}

.ap-unit__grow {
  flex: 1;
  min-width: 0;
}

.ap-toggle {
  display: inline-flex;
  flex: none;
  border-radius: 999px;
  border: 1px solid var(--ap-border);
  overflow: hidden;
}

.ap-toggle button {
  padding: 0.4375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--ap-muted);
  transition: background-color 0.2s ease, color 0.2s ease;
}

.ap-toggle button:hover {
  background: var(--ap-glass);
  color: #e2e8f0;
}

.ap-toggle button.is-active {
  color: #fff;
  background: linear-gradient(
    120deg,
    rgba(59, 130, 246, 0.45),
    rgba(79, 70, 229, 0.35)
  );
}

.ap-iconbtn {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.625rem;
  border: 1px solid var(--ap-border);
  background: var(--ap-glass);
  color: var(--ap-muted);
  transition: border-color 0.2s ease, background-color 0.2s ease,
    color 0.2s ease;
}

.ap-iconbtn svg {
  width: 1rem;
  height: 1rem;
}

.ap-iconbtn:hover {
  border-color: rgba(248, 113, 113, 0.45);
  background: rgba(127, 29, 29, 0.28);
  color: #fecaca;
}

.ap-iconbtn[disabled] {
  cursor: not-allowed;
  opacity: 0.45;
}

.ap-unit__fields {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  margin-top: 0.875rem;
}

.ap-unit__fields .ap-input {
  min-height: 2.5rem;
  font-size: 0.8125rem;
}

.ap-unit__label {
  display: block;
  margin-bottom: 0.3125rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--ap-muted);
}

/* ---------- action bar ---------- */
.ap-actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 30;
  display: flex;
  gap: 0.75rem;
  padding: 0.875rem 1.25rem;
  border-top: 1px solid var(--ap-border-soft);
  background: rgba(3, 7, 18, 0.9);
  backdrop-filter: blur(18px);
}

.ap-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 2.875rem;
  padding: 0.6875rem 1.25rem;
  border-radius: var(--ap-radius-sm);
  font-size: 0.875rem;
  font-weight: 600;
  transition: background-color 0.25s ease, border-color 0.25s ease,
    transform 0.25s ease, opacity 0.25s ease;
}

.ap-btn svg {
  width: 1rem;
  height: 1rem;
}

.ap-btn--primary {
  flex: 1;
  color: #fff;
  background: linear-gradient(90deg, var(--ap-blue) 0%, var(--ap-indigo) 100%);
  box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.3);
}

.ap-btn--primary:hover {
  transform: translateY(-1px);
  opacity: 0.94;
}

.ap-btn--ghost {
  border: 1px solid var(--ap-border);
  background: var(--ap-glass);
  color: #e2e8f0;
}

.ap-btn--ghost:hover {
  border-color: rgba(255, 255, 255, 0.22);
  background: var(--ap-glass-strong);
}

.ap-btn[disabled] {
  cursor: not-allowed;
  opacity: 0.55;
  transform: none;
}

.ap-spin {
  animation: ap-spin 0.9s linear infinite;
}

@keyframes ap-spin {
  to {
    transform: rotate(360deg);
  }
}

/* ---------- small phones ---------- */
@media (max-width: 560px) {
  .ap-unit__head {
    flex-wrap: wrap;
  }
 
  .ap-unit__grow {
    order: 3;
    flex: 1 0 100%;
  }
 
  .ap-types {
    grid-template-columns: 1fr;
  }
}

/* ---------- tablet ---------- */
@media (min-width: 640px) {
  .ap-shell {
    padding: 2rem 1.75rem 6.5rem;
  }

  .ap-title {
    font-size: 1.75rem;
  }

  .ap-card {
    padding: 1.75rem;
  }

  .ap-fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .ap-types {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .ap-unit__fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* ---------- desktop ---------- */
@media (min-width: 1024px) {
  .ap-shell {
    padding: 2.5rem 2.5rem 3rem;
  }

  .ap-grid {
    grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
    gap: 1.5rem;
  }

  .ap-aside {
    position: sticky;
    top: 2.5rem;
  }

  .ap-actions {
    position: static;
    padding: 0;
    border: none;
    background: none;
    backdrop-filter: none;
    margin-top: 1.75rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ap-root *,
  .ap-root *::before,
  .ap-root *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}
`;

/* ------------------------------------------------------------------ */
/*  TYPES, DATA & HELPERS                                              */
/* ------------------------------------------------------------------ */

interface UnitForm {
  id: string;
  unit_number: string;
  unit_type: string;
  status: "occupied" | "vacant";
  monthly_rent: number;
  tenant_name: string;
  tenant_email: string;
  tenant_phone: string;
  lease_start: string;
  lease_end: string;
}

interface PropertyForm {
  name: string;
  description: string;
  property_type: string;
  address: string;
  city: string;
  country: string;
}

interface Rollup {
  units_count: number;
  occupied_units: number;
  vacant_units: number;
  active_tenants: number;
  active_leases: number;
  monthly_revenue: number;
  potential_monthly_revenue: number;
  occupancy: number;
}

const initialForm: PropertyForm = {
  name: "",
  description: "",
  property_type: "residential",
  address: "",
  city: "",
  country: "",
};

const PROPERTY_TYPES = [
  {
    value: "residential",
    label: "Residential",
    hint: "Apartments, houses, flats",
    icon: Home,
  },
  {
    value: "commercial",
    label: "Commercial",
    hint: "Offices, retail, shops",
    icon: Briefcase,
  },
  {
    value: "industrial",
    label: "Industrial",
    hint: "Warehouses, factories",
    icon: Factory,
  },
  {
    value: "mixed-use",
    label: "Mixed use",
    hint: "Residential + commercial",
    icon: Landmark,
  },
];

const DESCRIPTION_MAX = 500;
const MAX_UNITS = 200;

type FieldErrors = Partial<Record<keyof PropertyForm, string>>;
type UnitErrors = Record<string, Partial<Record<keyof UnitForm, string>>>;

let unitSeq = 0;

function makeUnit(index: number): UnitForm {
  unitSeq += 1;
  return {
    id: `unit-${unitSeq}`,
    unit_number: `Unit ${index}`,
    unit_type: "",
    status: "vacant",
    monthly_rent: 0,
    tenant_name: "",
    tenant_email: "",
    tenant_phone: "",
    lease_start: "",
    lease_end: "",
  };
}

function validate(form: PropertyForm): FieldErrors {
  const errors: FieldErrors = {};

  if (form.name.trim().length < 2) {
    errors.name = "Give the property a name of at least 2 characters.";
  }

  if (form.description.length > DESCRIPTION_MAX) {
    errors.description = `Keep the description under ${DESCRIPTION_MAX} characters.`;
  }

  return errors;
}

function validateUnits(units: UnitForm[]): UnitErrors {
  const errors: UnitErrors = {};

  const seen = new Map<string, number>();
  units.forEach((unit) => {
    const key = unit.unit_number.trim().toLowerCase();
    seen.set(key, (seen.get(key) ?? 0) + 1);
  });

  units.forEach((unit) => {
    const unitError: Partial<Record<keyof UnitForm, string>> = {};

    if (!unit.unit_number.trim()) {
      unitError.unit_number = "Name this unit.";
    } else if ((seen.get(unit.unit_number.trim().toLowerCase()) ?? 0) > 1) {
      unitError.unit_number = "Unit names must be unique in a property.";
    }

    if (!Number.isFinite(unit.monthly_rent) || unit.monthly_rent < 0) {
      unitError.monthly_rent = "Rent cannot be negative.";
    }

    if (unit.status === "occupied") {
      if (!unit.tenant_name.trim()) {
        unitError.tenant_name = "Occupied units need a tenant.";
      }

      if (
        unit.tenant_email.trim() &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(unit.tenant_email.trim())
      ) {
        unitError.tenant_email = "Enter a valid email address.";
      }

      if (!unit.tenant_phone.trim()) {
        unitError.tenant_phone = "A phone number is required for tenants.";
      }

      if (!unit.lease_start) {
        unitError.lease_start = "Add the lease start date.";
      }

      if (
        unit.lease_start &&
        unit.lease_end &&
        unit.lease_end < unit.lease_start
      ) {
        unitError.lease_end = "Lease end must come after the start date.";
      }
    }

    if (Object.keys(unitError).length > 0) {
      errors[unit.id] = unitError;
    }
  });

  return errors;
}

function rollup(units: UnitForm[]): Rollup {
  const occupied = units.filter((unit) => unit.status === "occupied");

  const monthly_revenue = occupied.reduce(
    (total, unit) => total + (Number.isFinite(unit.monthly_rent) ? unit.monthly_rent : 0),
    0
  );

  const potential_monthly_revenue = units.reduce(
    (total, unit) => total + (Number.isFinite(unit.monthly_rent) ? unit.monthly_rent : 0),
    0
  );

  const active_leases = occupied.filter((unit) => Boolean(unit.lease_start)).length;

  return {
    units_count: units.length,
    occupied_units: occupied.length,
    vacant_units: units.length - occupied.length,
    active_tenants: occupied.filter((unit) => Boolean(unit.tenant_name.trim())).length,
    active_leases,
    monthly_revenue,
    potential_monthly_revenue,
    occupancy:
      units.length > 0
        ? Math.round((occupied.length / units.length) * 1000) / 10
        : 0,
  };
}

function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "PR";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function detectCountry(): string {
  try {
    const locale = new Intl.Locale(navigator.language);
    const region = locale.region;
    if (!region) return "";
    const names = new Intl.DisplayNames([navigator.language], {
      type: "region",
    });
    return names.of(region) ?? "";
  } catch {
    return "";
  }
}

function readCurrency(): string {
  try {
    const raw =
      localStorage.getItem("organization") ??
      sessionStorage.getItem("organization");
    const organization = raw ? (JSON.parse(raw) as { currency?: string }) : {};
    return organization.currency || "KSh";
  } catch {
    return "KSh";
  }
}

function formatMoney(value: number, currency: string): string {
  return `${currency} ${new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

/* ------------------------------------------------------------------ */
/*  COMPONENT                                                          */
/* ------------------------------------------------------------------ */

function AddProperties() {
  const navigate = useNavigate();
  const currency = useMemo(readCurrency, []);

  const [form, setForm] = useState<PropertyForm>(initialForm);
  const [units, setUnits] = useState<UnitForm[]>(() => [makeUnit(1)]);
  const [inventory, setInventory] = useState([
    { unit_type: "One Bedroom", quantity: 1, monthly_rent: 0 },
  ]);
  const [inventoryError, setInventoryError] = useState("");
  const [touched, setTouched] = useState<
    Partial<Record<keyof PropertyForm, boolean>>
  >({});
  const [unitsTouched, setUnitsTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const country = detectCountry();
    if (country) setForm((prev) => ({ ...prev, country }));
  }, []);

  const errors = useMemo(() => validate(form), [form]);
  const unitErrors = useMemo(() => validateUnits(units), [units]);
  const totals = useMemo(() => rollup(units), [units]);

  const isValid =
    Object.keys(errors).length === 0 &&
    Object.keys(unitErrors).length === 0 &&
    units.length > 0;

  function showError(field: keyof PropertyForm): string {
    return touched[field] ? errors[field] ?? "" : "";
  }

  function showUnitError(unit: UnitForm, field: keyof UnitForm): string {
    return unitsTouched ? unitErrors[unit.id]?.[field] ?? "" : "";
  }

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name as keyof PropertyForm]: value }));
  }

  function handleBlur(field: keyof PropertyForm) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  function updateUnit(id: string, patch: Partial<UnitForm>) {
    setUnits((prev) =>
      prev.map((unit) => (unit.id === id ? { ...unit, ...patch } : unit))
    );
  }

  function addUnit() {
    setUnits((prev) =>
      prev.length >= MAX_UNITS ? prev : [...prev, makeUnit(prev.length + 1)]
    );
  }

  function removeUnit(id: string) {
    setUnits((prev) =>
      prev.length <= 1 ? prev : prev.filter((unit) => unit.id !== id)
    );
  }

  function setUnitCount(next: number) {
    const target = Math.max(1, Math.min(MAX_UNITS, next));

    setUnits((prev) => {
      if (target === prev.length) return prev;
      if (target < prev.length) return prev.slice(0, target);

      const added = Array.from({ length: target - prev.length }, (_, index) =>
        makeUnit(prev.length + index + 1)
      );
      return [...prev, ...added];
    });
  }

  function applyInventory() {
    setInventoryError("");
    const invalid = inventory.some((item) =>
      !item.unit_type.trim() ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      !Number.isFinite(item.monthly_rent) ||
      item.monthly_rent < 0
    );
    const total = inventory.reduce((sum, item) => sum + item.quantity, 0);

    if (invalid || total < 1 || total > MAX_UNITS) {
      setInventoryError(
        `Enter a unit type, a quantity from 1–${MAX_UNITS}, and a non-negative rent.`
      );
      return;
    }

    const usedPrefixes = new Set<string>();
    const generated = inventory.flatMap((item, groupIndex) => {
      const initials = item.unit_type
        .trim()
        .split(/\s+/)
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "U";
      const prefix = usedPrefixes.has(initials)
        ? `${initials}${groupIndex + 1}`
        : initials;
      usedPrefixes.add(initials);

      return Array.from({ length: item.quantity }, (_, index) => ({
        ...makeUnit(index + 1),
        unit_number: `${prefix}${String(index + 1).padStart(2, "0")}`,
        unit_type: item.unit_type.trim(),
        monthly_rent: item.monthly_rent,
      }));
    });

    setUnits(generated);
    setUnitsTouched(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setTouched({ name: true, description: true });
    setUnitsTouched(true);
    if (!isValid) return;

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await apiRequest("/properties", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          property_type: form.property_type,
          address: form.address.trim(),
          city: form.city.trim(),
          country: form.country.trim(),
          monthly_rent: totals.monthly_revenue,

          units: units.map((unit) => {
            const occupied = unit.status === "occupied";
            const [first, ...rest] = unit.tenant_name.trim().split(/\s+/);

            return {
              unit_number: unit.unit_number.trim(),
              unit_type: unit.unit_type.trim() || form.property_type,
              status: occupied ? "occupied" : "vacant",
              monthly_rent: unit.monthly_rent,
              tenant:
                occupied && unit.tenant_name.trim()
                  ? {
                      first_name: first,
                      last_name: rest.join(" ") || first,
                      email: unit.tenant_email.trim() || null,
                      phone: unit.tenant_phone.trim(),
                      status: "active",
                    }
                  : null,
              lease:
                occupied && unit.lease_start
                  ? {
                      start_date: unit.lease_start,
                      end_date: unit.lease_end || null,
                      monthly_rent: unit.monthly_rent,
                      status: "active",
                    }
                  : null,
            };
          }),
        }),
      });

      setSuccess(
        `${form.name.trim()} was added with ${totals.units_count} ${
          totals.units_count === 1 ? "unit" : "units"
        }. Taking you back to the dashboard…`
      );
      setForm(initialForm);
      setUnits([makeUnit(1)]);
      setTouched({});
      setUnitsTouched(false);

      setTimeout(() => navigate("/dashboard"), 1600);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to add property. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const previewName = form.name.trim() || "New property";
  const previewLocation =
    [form.city.trim(), form.country.trim()].filter(Boolean).join(", ") ||
    "Location not set";

  return (
    <DashboardLayout>
      <div className="ap-root">
        <style>{styles}</style>

        <div className="ap-backdrop" aria-hidden="true">
          <span className="ap-orb ap-orb--indigo" />
          <span className="ap-orb ap-orb--blue" />
        </div>

        <div className="ap-shell">
          <button
            type="button"
            className="ap-back"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft />
            Back to dashboard
          </button>

          <header className="ap-header">
            <span className="ap-header__mark">
              <Building2 />
            </span>
            <div>
              <h1 className="ap-title">Add a property</h1>
              <p className="ap-subtitle">
                Register a building, then add each unit with its rent, tenant
                and lease — occupancy and revenue are calculated for you.
              </p>
            </div>
          </header>

          <div className="ap-grid">
            {/* ---------- form ---------- */}
            <form className="ap-card" onSubmit={handleSubmit} noValidate>
              {error && (
                <div className="ap-alert ap-alert--error" role="alert">
                  <AlertCircle />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="ap-alert ap-alert--success" role="status">
                  <CheckCircle2 />
                  <span>{success}</span>
                </div>
              )}

              {/* ---------- basics ---------- */}
              <section className="ap-section">
                <h2 className="ap-section__title">
                  <Building2 />
                  Property details
                </h2>

                <div className="ap-fields">
                  <div className="ap-field--full">
                    <label className="ap-label" htmlFor="name">
                      <span>
                        Property name <span className="ap-label__req">*</span>
                      </span>
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      autoComplete="off"
                      className={`ap-input${
                        showError("name") ? " ap-input--invalid" : ""
                      }`}
                      value={form.name}
                      onChange={handleChange}
                      onBlur={() => handleBlur("name")}
                      placeholder="e.g. Siana Plaza"
                      aria-invalid={Boolean(showError("name"))}
                      aria-describedby={showError("name") ? "name-error" : undefined}
                    />
                    {showError("name") ? (
                      <p className="ap-error" id="name-error">
                        <AlertCircle />
                        {showError("name")}
                      </p>
                    ) : (
                      <p className="ap-help">
                        Tenants and reports will see this name.
                      </p>
                    )}
                  </div>

                  <div className="ap-field--full">
                    <label className="ap-label" htmlFor="description">
                      <span>Description</span>
                      <span className="ap-label__count">
                        {form.description.length}/{DESCRIPTION_MAX}
                      </span>
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      rows={3}
                      maxLength={DESCRIPTION_MAX}
                      className={`ap-textarea${
                        showError("description") ? " ap-textarea--invalid" : ""
                      }`}
                      value={form.description}
                      onChange={handleChange}
                      onBlur={() => handleBlur("description")}
                      placeholder="Amenities, access notes, anything your team should know."
                    />
                    {showError("description") && (
                      <p className="ap-error">
                        <AlertCircle />
                        {showError("description")}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* ---------- type ---------- */}
              <section className="ap-section">
                <h2 className="ap-section__title">
                  <DoorOpen />
                  Property type
                </h2>
                <p className="ap-units-bar__hint">
                  Pick the closest match — it drives how this property is
                  grouped and filtered across the portal.
                </p>
 
                <fieldset className="ap-fieldset" aria-label="Property type">
                  <div className="ap-types">
                    {PROPERTY_TYPES.map(({ value, label, hint, icon: Icon }) => (
                      <button
                        key={value}
                        type="button"
                        className={`ap-type${
                          form.property_type === value ? " ap-type--active" : ""
                        }`}
                        onClick={() =>
                          setForm((prev) => ({ ...prev, property_type: value }))
                        }
                        aria-pressed={form.property_type === value}
                      >
                        <Icon />
                        <span className="ap-type__text">
                          <span className="ap-type__label">{label}</span>
                          <span className="ap-type__hint">{hint}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </fieldset>
              </section>

              {/* ---------- units, tenants & leases ---------- */}
              <section className="ap-section">
                <h2 className="ap-section__title">
                  <DoorOpen />
                  Unit inventory
                </h2>
                <p className="ap-units-bar__hint">
                  Set a type, quantity and default rent. Generated unit numbers can be edited below.
                </p>

                <div className="ap-units">
                  {inventory.map((item, index) => (
                    <div className="ap-unit" key={index}>
                      <div className="ap-unit__fields">
                        <div>
                          <label className="ap-unit__label" htmlFor={`inventory-type-${index}`}>Unit type</label>
                          <input
                            id={`inventory-type-${index}`}
                            className="ap-input"
                            value={item.unit_type}
                            onChange={(event) => setInventory((current) => current.map((row, rowIndex) =>
                              rowIndex === index ? { ...row, unit_type: event.target.value } : row
                            ))}
                            placeholder="e.g. One Bedroom"
                          />
                        </div>
                        <div>
                          <label className="ap-unit__label" htmlFor={`inventory-quantity-${index}`}>Quantity</label>
                          <input
                            id={`inventory-quantity-${index}`}
                            className="ap-input"
                            type="number"
                            min={1}
                            max={MAX_UNITS}
                            value={item.quantity}
                            onChange={(event) => setInventory((current) => current.map((row, rowIndex) =>
                              rowIndex === index ? { ...row, quantity: Number.parseInt(event.target.value, 10) || 0 } : row
                            ))}
                          />
                        </div>
                        <div>
                          <label className="ap-unit__label" htmlFor={`inventory-rent-${index}`}>Default rent ({currency})</label>
                          <input
                            id={`inventory-rent-${index}`}
                            className="ap-input"
                            type="number"
                            min={0}
                            step="0.01"
                            value={item.monthly_rent}
                            onChange={(event) => setInventory((current) => current.map((row, rowIndex) =>
                              rowIndex === index ? { ...row, monthly_rent: Number.parseFloat(event.target.value) || 0 } : row
                            ))}
                          />
                        </div>
                        <button
                          type="button"
                          className="ap-iconbtn"
                          onClick={() => setInventory((current) => current.filter((_, rowIndex) => rowIndex !== index))}
                          disabled={inventory.length === 1}
                          aria-label={`Remove inventory type ${index + 1}`}
                        >
                          <Trash2 />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {inventoryError && <p className="ap-error" role="alert"><AlertCircle />{inventoryError}</p>}
                <div className="ap-units-bar ap-units-bar--actions">
                  <button
                    type="button"
                    className="ap-step-btn ap-step-btn--wide"
                    onClick={() => setInventory((current) => [...current, { unit_type: "", quantity: 1, monthly_rent: 0 }])}
                  >
                    <Plus /> Add unit type
                  </button>
                  <button
                    type="button"
                    className="ap-step-btn ap-step-btn--wide ap-step-btn--primary"
                    onClick={applyInventory}
                  >
                    <DoorOpen /> Generate units
                  </button>
                </div>
                <p className="ap-units-bar__hint ap-units-bar__hint--generate">
                  Generating replaces the individual unit list below with
                  freshly numbered units for each type above — edit the
                  results afterwards as needed.
                </p>

                <h3 className="ap-section__title">Individual units, tenants &amp; leases</h3>

                <div className="ap-units-bar">
                  <p className="ap-units-bar__hint">
                    {totals.units_count}{" "}
                    {totals.units_count === 1 ? "unit" : "units"} ·{" "}
                    {totals.occupied_units} occupied · {totals.vacant_units}{" "}
                    vacant
                  </p>

                  <div className="ap-stepper">
                    <button
                      type="button"
                      className="ap-step-btn"
                      onClick={() => setUnitCount(units.length - 1)}
                      disabled={units.length <= 1}
                      aria-label="Remove last unit"
                    >
                      <Minus />
                    </button>

                    <input
                      id="units_count"
                      name="units_count"
                      type="number"
                      min={1}
                      max={MAX_UNITS}
                      inputMode="numeric"
                      className="ap-input"
                      value={units.length}
                      onChange={(event) =>
                        setUnitCount(Number.parseInt(event.target.value, 10) || 1)
                      }
                      aria-label="Number of units"
                    />

                    <button
                      type="button"
                      className="ap-step-btn"
                      onClick={() => setUnitCount(units.length + 1)}
                      disabled={units.length >= MAX_UNITS}
                      aria-label="Add a unit"
                    >
                      <Plus />
                    </button>
                  </div>
                </div>

                <div className="ap-units">
                  {units.map((unit, index) => (
                    <article
                      key={unit.id}
                      className={`ap-unit${
                        unit.status === "occupied" ? " ap-unit--occupied" : ""
                      }`}
                    >
                      <div className="ap-unit__head">
                        <span className="ap-unit__index" aria-hidden="true">
                          {index + 1}
                        </span>

                        <div className="ap-unit__grow">
                          <input
                            type="text"
                            className={`ap-input${
                              showUnitError(unit, "unit_number")
                                ? " ap-input--invalid"
                                : ""
                            }`}
                            value={unit.unit_number}
                            onChange={(event) =>
                              updateUnit(unit.id, {
                                unit_number: event.target.value,
                              })
                            }
                            placeholder="Unit name, e.g. A1"
                            aria-label={`Unit ${index + 1} name`}
                          />
                        </div>

                        <div
                          className="ap-toggle"
                          role="group"
                          aria-label={`Unit ${index + 1} occupancy`}
                        >
                          <button
                            type="button"
                            className={unit.status === "vacant" ? "is-active" : ""}
                            onClick={() =>
                              updateUnit(unit.id, { status: "vacant" })
                            }
                            aria-pressed={unit.status === "vacant"}
                          >
                            Vacant
                          </button>
                          <button
                            type="button"
                            className={
                              unit.status === "occupied" ? "is-active" : ""
                            }
                            onClick={() =>
                              updateUnit(unit.id, { status: "occupied" })
                            }
                            aria-pressed={unit.status === "occupied"}
                          >
                            Occupied
                          </button>
                        </div>

                        <button
                          type="button"
                          className="ap-iconbtn"
                          onClick={() => removeUnit(unit.id)}
                          disabled={units.length <= 1}
                          aria-label={`Remove unit ${index + 1}`}
                        >
                          <Trash2 />
                        </button>
                      </div>

                      <div className="ap-unit__fields">
                        <div>
                          <label
                            className="ap-unit__label"
                            htmlFor={`${unit.id}-type`}
                          >
                            Unit type
                          </label>
                          <input
                            id={`${unit.id}-type`}
                            className="ap-input"
                            value={unit.unit_type}
                            onChange={(event) =>
                              updateUnit(unit.id, { unit_type: event.target.value })
                            }
                            placeholder={form.property_type}
                          />
                        </div>
                        <div>
                          <label
                            className="ap-unit__label"
                            htmlFor={`${unit.id}-rent`}
                          >
                            Monthly rent ({currency})
                          </label>
                          <input
                            id={`${unit.id}-rent`}
                            type="number"
                            min={0}
                            step="0.01"
                            inputMode="decimal"
                            className={`ap-input${
                              showUnitError(unit, "monthly_rent")
                                ? " ap-input--invalid"
                                : ""
                            }`}
                            value={unit.monthly_rent}
                            onChange={(event) =>
                              updateUnit(unit.id, {
                                monthly_rent:
                                  Number.parseFloat(event.target.value) || 0,
                              })
                            }
                            placeholder="0.00"
                          />
                        </div>

                        <div>
                          <label
                            className="ap-unit__label"
                            htmlFor={`${unit.id}-tenant`}
                          >
                            Tenant name
                            {unit.status === "occupied" ? " *" : ""}
                          </label>
                          <input
                            id={`${unit.id}-tenant`}
                            type="text"
                            className={`ap-input${
                              showUnitError(unit, "tenant_name")
                                ? " ap-input--invalid"
                                : ""
                            }`}
                            value={unit.tenant_name}
                            onChange={(event) =>
                              updateUnit(unit.id, {
                                tenant_name: event.target.value,
                              })
                            }
                            disabled={unit.status === "vacant"}
                            placeholder={
                              unit.status === "vacant"
                                ? "Mark occupied to add a tenant"
                                : "e.g. Amina Wanjiru"
                            }
                          />
                          {showUnitError(unit, "tenant_name") && (
                            <p className="ap-error">
                              <AlertCircle />
                              {showUnitError(unit, "tenant_name")}
                            </p>
                          )}
                        </div>

                        <div>
                          <label
                            className="ap-unit__label"
                            htmlFor={`${unit.id}-email`}
                          >
                            Tenant email
                          </label>
                          <input
                            id={`${unit.id}-email`}
                            type="email"
                            className={`ap-input${
                              showUnitError(unit, "tenant_email")
                                ? " ap-input--invalid"
                                : ""
                            }`}
                            value={unit.tenant_email}
                            onChange={(event) =>
                              updateUnit(unit.id, {
                                tenant_email: event.target.value,
                              })
                            }
                            disabled={unit.status === "vacant"}
                            placeholder="tenant@email.com"
                          />
                          {showUnitError(unit, "tenant_email") && (
                            <p className="ap-error">
                              <AlertCircle />
                              {showUnitError(unit, "tenant_email")}
                            </p>
                          )}
                        </div>

                        <div>
                          <label
                            className="ap-unit__label"
                            htmlFor={`${unit.id}-phone`}
                          >
                            Tenant phone{unit.status === "occupied" ? " *" : ""}
                          </label>
                          <input
                            id={`${unit.id}-phone`}
                            type="tel"
                            className={`ap-input${
                              showUnitError(unit, "tenant_phone")
                                ? " ap-input--invalid"
                                : ""
                            }`}
                            value={unit.tenant_phone}
                            onChange={(event) =>
                              updateUnit(unit.id, {
                                tenant_phone: event.target.value,
                              })
                            }
                            disabled={unit.status === "vacant"}
                            placeholder="+254 7…"
                          />
                          {showUnitError(unit, "tenant_phone") && (
                            <p className="ap-error">
                              <AlertCircle />
                              {showUnitError(unit, "tenant_phone")}
                            </p>
                          )}
                        </div>

                        <div>
                          <label
                            className="ap-unit__label"
                            htmlFor={`${unit.id}-start`}
                          >
                            Lease start{unit.status === "occupied" ? " *" : ""}
                          </label>
                          <input
                            id={`${unit.id}-start`}
                            type="date"
                            className={`ap-input${
                              showUnitError(unit, "lease_start")
                                ? " ap-input--invalid"
                                : ""
                            }`}
                            value={unit.lease_start}
                            onChange={(event) =>
                              updateUnit(unit.id, {
                                lease_start: event.target.value,
                              })
                            }
                            disabled={unit.status === "vacant"}
                          />
                          {showUnitError(unit, "lease_start") && (
                            <p className="ap-error">
                              <AlertCircle />
                              {showUnitError(unit, "lease_start")}
                            </p>
                          )}
                        </div>

                        <div>
                          <label
                            className="ap-unit__label"
                            htmlFor={`${unit.id}-end`}
                          >
                            Lease end
                          </label>
                          <input
                            id={`${unit.id}-end`}
                            type="date"
                            min={unit.lease_start || undefined}
                            className={`ap-input${
                              showUnitError(unit, "lease_end")
                                ? " ap-input--invalid"
                                : ""
                            }`}
                            value={unit.lease_end}
                            onChange={(event) =>
                              updateUnit(unit.id, {
                                lease_end: event.target.value,
                              })
                            }
                            disabled={unit.status === "vacant"}
                          />
                          {showUnitError(unit, "lease_end") && (
                            <p className="ap-error">
                              <AlertCircle />
                              {showUnitError(unit, "lease_end")}
                            </p>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="ap-units-bar">
                  <button
                    type="button"
                    className="ap-btn ap-btn--ghost"
                    onClick={addUnit}
                    disabled={units.length >= MAX_UNITS}
                  >
                    <Plus />
                    Add another unit
                  </button>
                  <p className="ap-units-bar__hint">
                    Occupied units create a tenant and a lease record.
                  </p>
                </div>
              </section>

              {/* ---------- location ---------- */}
              <section className="ap-section">
                <h2 className="ap-section__title">
                  <MapPin />
                  Location
                </h2>

                <div className="ap-fields">
                  <div className="ap-field--full">
                    <label className="ap-label" htmlFor="address">
                      <span>Street address</span>
                    </label>
                    <input
                      id="address"
                      name="address"
                      type="text"
                      autoComplete="street-address"
                      className="ap-input"
                      value={form.address}
                      onChange={handleChange}
                      placeholder="e.g. 14 Ngong Road"
                    />
                  </div>

                  <div>
                    <label className="ap-label" htmlFor="city">
                      <span>City</span>
                    </label>
                    <input
                      id="city"
                      name="city"
                      type="text"
                      autoComplete="address-level2"
                      className="ap-input"
                      value={form.city}
                      onChange={handleChange}
                      placeholder="e.g. Nairobi"
                    />
                  </div>

                  <div>
                    <label className="ap-label" htmlFor="country">
                      <span>Country</span>
                    </label>
                    <input
                      id="country"
                      name="country"
                      type="text"
                      autoComplete="country-name"
                      className="ap-input"
                      value={form.country}
                      onChange={handleChange}
                      placeholder="e.g. Kenya"
                    />
                    <p className="ap-help">Prefilled from your browser locale.</p>
                  </div>
                </div>
              </section>

              {/* ---------- actions ---------- */}
              <div className="ap-actions">
                <button
                  type="button"
                  className="ap-btn ap-btn--ghost"
                  onClick={() => navigate("/dashboard")}
                  disabled={loading}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="ap-btn ap-btn--primary"
                  disabled={loading || !isValid}
                >
                  {loading ? (
                    <>
                      <Loader2 className="ap-spin" />
                      Adding property…
                    </>
                  ) : (
                    <>
                      <Save />
                      Save property
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* ---------- live preview ---------- */}
            <aside className="ap-aside">
              <div className="ap-card">
                <p className="ap-preview__label">Preview</p>

                <div className="ap-preview__row">
                  <span className="ap-preview__avatar" aria-hidden="true">
                    {initials(previewName)}
                  </span>
                  <div className="ap-unit__grow">
                    <p className="ap-preview__name" title={previewName}>
                      {previewName}
                    </p>
                    <p className="ap-preview__meta">
                      <MapPin />
                      {previewLocation}
                    </p>
                  </div>
                </div>

                <div className="ap-chips">
                  <span className="ap-chip">
                    <Building2 />
                    {form.property_type.replace("-", " ")}
                  </span>
                  <span className="ap-chip">
                    <DoorOpen />
                    {totals.units_count}{" "}
                    {totals.units_count === 1 ? "unit" : "units"}
                  </span>
                  <span className="ap-chip">
                    <CheckCircle2 />
                    {totals.occupancy}% occupied
                  </span>
                </div>

                <div className="ap-metrics">
                  <div className="ap-metric">
                    <p className="ap-metric__label">
                      <Users />
                      Active tenants
                    </p>
                    <p className="ap-metric__value">{totals.active_tenants}</p>
                  </div>

                  <div className="ap-metric">
                    <p className="ap-metric__label">
                      <FileText />
                      Active leases
                    </p>
                    <p className="ap-metric__value">{totals.active_leases}</p>
                  </div>

                  <div className="ap-metric">
                    <p className="ap-metric__label">
                      <Wallet />
                      Monthly revenue
                    </p>
                    <p className="ap-metric__value">
                      {formatMoney(totals.monthly_revenue, currency)}
                    </p>
                    <p className="ap-metric__hint">
                      {formatMoney(totals.potential_monthly_revenue, currency)}{" "}
                      at full occupancy
                    </p>
                  </div>

                  <div className="ap-metric">
                    <p className="ap-metric__label">
                      <DoorOpen />
                      Occupied units
                    </p>
                    <p className="ap-metric__value">
                      {totals.occupied_units}/{totals.units_count}
                    </p>
                  </div>
                </div>
              </div>

              <div className="ap-card">
                <p className="ap-preview__label">Before you save</p>
                <ul className="ap-tips">
                  <li>Every unit you add is created with the property.</li>
                  <li>
                    Marking a unit occupied creates its tenant and lease, and
                    counts towards active tenants.
                  </li>
                  <li>
                    Monthly revenue is the sum of rent on occupied units only.
                  </li>
                  <li>Occupancy is derived from occupied ÷ total units.</li>
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default AddProperties;
