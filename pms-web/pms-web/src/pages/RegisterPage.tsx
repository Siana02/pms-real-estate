import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  AtSign,
  Building2,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe2,
  Loader2,
  Lock,
  Mail,
  Quote,
  ShieldCheck,
  Sparkles,
  User,
  Wallet,
} from "lucide-react";

import { API_BASE, ApiError, apiRequest } from "../services/api";

/* ------------------------------------------------------------------ */
/*  STYLES — vanilla CSS                                               */
/* ------------------------------------------------------------------ */

const styles = `
:root {
  --rg-bg: #030712;
  --rg-surface: rgba(15, 23, 42, 0.55);
  --rg-glass: rgba(255, 255, 255, 0.05);
  --rg-glass-strong: rgba(255, 255, 255, 0.1);
  --rg-border: rgba(255, 255, 255, 0.1);
  --rg-border-soft: rgba(255, 255, 255, 0.06);
  --rg-text: #f8fafc;
  --rg-muted: #94a3b8;
  --rg-faint: #64748b;
  --rg-blue: #3b82f6;
  --rg-blue-strong: #2563eb;
  --rg-indigo: #4f46e5;
  --rg-danger: #f87171;
  --rg-success: #4ade80;
  --rg-radius-sm: 0.75rem;
  --rg-radius-md: 1rem;
  --rg-radius-lg: 1.5rem;
  --rg-shadow: 0 30px 60px -20px rgba(0, 0, 0, 0.75);
  --rg-shadow-blue: 0 10px 25px -5px rgba(59, 130, 246, 0.3);
  --rg-font: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Inter, Roboto,
    "Helvetica Neue", Arial, sans-serif;
}

/* ---------- base ---------- */
.rg-root,
.rg-root * {
  box-sizing: border-box;
}

.rg-root {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  overflow-x: hidden;
  background: var(--rg-bg);
  color: var(--rg-text);
  font-family: var(--rg-font);
  letter-spacing: -0.015em;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.rg-root a {
  color: inherit;
  text-decoration: none;
}

.rg-root button {
  font-family: inherit;
  color: inherit;
  border: none;
  background: none;
  cursor: pointer;
}

.rg-root input,
.rg-root select {
  font-family: inherit;
  font-size: 1rem;
}

.rg-root a:focus-visible,
.rg-root button:focus-visible,
.rg-root select:focus-visible {
  outline: 2px solid var(--rg-blue);
  outline-offset: 2px;
}

.rg-sr {
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
.rg-backdrop {
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  background: radial-gradient(
      120% 100% at 50% 0%,
      rgba(30, 41, 59, 0.9) 0%,
      var(--rg-bg) 60%
    ),
    var(--rg-bg);
}

.rg-orb {
  position: absolute;
  border-radius: 9999px;
  filter: blur(96px);
  will-change: transform, opacity;
}

.rg-orb--indigo {
  top: -10rem;
  left: -8rem;
  width: 26rem;
  height: 26rem;
  background: rgba(79, 70, 229, 0.22);
  animation: rg-float 18s ease-in-out infinite,
    rg-glow 8s ease-in-out infinite;
}

.rg-orb--blue {
  bottom: -12rem;
  right: -8rem;
  width: 30rem;
  height: 30rem;
  background: rgba(37, 99, 235, 0.18);
  animation: rg-float 22s ease-in-out infinite reverse,
    rg-glow 10s ease-in-out 1.4s infinite;
}

.rg-orb--purple {
  top: 28%;
  left: 42%;
  width: 24rem;
  height: 24rem;
  background: rgba(147, 51, 234, 0.16);
  animation: rg-float 26s ease-in-out 2s infinite,
    rg-glow 12s ease-in-out 2.6s infinite;
}

@keyframes rg-float {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(1);
  }
  33% {
    transform: translate3d(2.5rem, -2rem, 0) scale(1.08);
  }
  66% {
    transform: translate3d(-2rem, 2rem, 0) scale(0.95);
  }
}

@keyframes rg-glow {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

@keyframes rg-fade-up {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes rg-spin {
  to {
    transform: rotate(360deg);
  }
}

/* ---------- shell (mobile-first) ---------- */
.rg-shell {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
}

.rg-showcase {
  display: none;
}

.rg-formpane {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  width: 100%;
  padding: 2rem 1rem;
}

.rg-card {
  width: 100%;
  max-width: 30rem;
  padding: 1.75rem 1.5rem;
  border-radius: var(--rg-radius-lg);
  border: 1px solid var(--rg-border);
  background: var(--rg-surface);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  box-shadow: var(--rg-shadow);
}

/* ---------- card header ---------- */
.rg-card__head {
  text-align: center;
  margin-bottom: 1.5rem;
}

.rg-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: var(--rg-radius-md);
  border: 1px solid var(--rg-border);
  background: linear-gradient(
    145deg,
    rgba(59, 130, 246, 0.25),
    rgba(79, 70, 229, 0.15)
  );
  color: #93c5fd;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.rg-wordmark {
  margin: 0.75rem 0 0;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--rg-faint);
}

.rg-title {
  margin: 0.5rem 0 0;
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: -0.03em;
  color: #fff;
}

.rg-subtitle {
  margin: 0.5rem auto 0;
  max-width: 24rem;
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--rg-muted);
}

/* ---------- step tracker ---------- */
.rg-tracker {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  padding: 0.875rem;
  border-radius: var(--rg-radius-md);
  border: 1px solid var(--rg-border-soft);
  background: rgba(255, 255, 255, 0.03);
}

.rg-step {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  text-align: center;
}

.rg-step__dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 9999px;
  border: 1px solid var(--rg-border);
  background: var(--rg-glass);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--rg-faint);
  transition: all 0.3s ease;
}

.rg-step__dot svg {
  width: 0.875rem;
  height: 0.875rem;
}

.rg-step--active .rg-step__dot {
  border-color: transparent;
  color: #fff;
  background-image: linear-gradient(
    to right,
    var(--rg-blue-strong),
    var(--rg-indigo)
  );
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.18);
}

.rg-step--done .rg-step__dot {
  border-color: rgba(74, 222, 128, 0.5);
  background: rgba(74, 222, 128, 0.12);
  color: var(--rg-success);
}

.rg-step__label {
  font-size: 0.6875rem;
  font-weight: 500;
  line-height: 1.3;
  color: var(--rg-faint);
}

.rg-step--active .rg-step__label {
  color: #e2e8f0;
}

/* ---------- OAuth ---------- */
.rg-oauth {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.625rem;
}

.rg-oauth__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.625rem;
  width: 100%;
  min-height: 3rem;
  padding: 0.75rem 1rem;
  border-radius: var(--rg-radius-sm);
  border: 1px solid var(--rg-border);
  background: var(--rg-glass);
  backdrop-filter: blur(12px);
  font-size: 0.9375rem;
  font-weight: 500;
  color: #e2e8f0;
  transition: background-color 0.25s ease, border-color 0.25s ease,
    transform 0.25s ease;
}

.rg-oauth__btn:hover {
  border-color: rgba(255, 255, 255, 0.22);
  background: var(--rg-glass-strong);
  transform: translateY(-1px);
}

.rg-oauth__btn:active {
  transform: translateY(0);
}

.rg-oauth__icon {
  width: 1.25rem;
  height: 1.25rem;
  flex: none;
}

/* ---------- divider ---------- */
.rg-divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1.5rem 0;
}

.rg-divider::before,
.rg-divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--rg-border);
}

.rg-divider span {
  font-size: 0.6875rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--rg-faint);
}

/* ---------- form ---------- */
.rg-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.rg-fieldset {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin: 0;
  padding: 0;
  border: none;
  animation: rg-fade-up 0.25s ease-out;
}

.rg-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
}

.rg-label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #cbd5e1;
}

.rg-input-wrap {
  position: relative;
}

.rg-input-icon {
  position: absolute;
  top: 50%;
  left: 1rem;
  width: 1.125rem;
  height: 1.125rem;
  transform: translateY(-50%);
  color: var(--rg-faint);
  pointer-events: none;
  transition: color 0.25s ease;
}

.rg-input,
.rg-select {
  width: 100%;
  min-height: 3.25rem;
  padding: 0.9375rem 1rem 0.9375rem 2.875rem;
  border-radius: var(--rg-radius-sm);
  border: 1px solid var(--rg-border);
  background: var(--rg-glass);
  color: #fff;
  outline: none;
  transition: border-color 0.25s ease, box-shadow 0.25s ease,
    background-color 0.25s ease;
}

.rg-select {
  appearance: none;
  cursor: pointer;
  background-image: linear-gradient(45deg, transparent 50%, #94a3b8 50%),
    linear-gradient(135deg, #94a3b8 50%, transparent 50%);
  background-position: right 1.15rem center, right 0.85rem center;
  background-size: 0.35rem 0.35rem, 0.35rem 0.35rem;
  background-repeat: no-repeat;
}

.rg-select option {
  background: #0f172a;
  color: #fff;
}

.rg-spin {
  animation: rg-spin 0.8s linear infinite;
}

.rg-choice-list {
  display: grid;
  gap: 0.25rem;
  max-height: 12rem;
  margin: 0.5rem 0 0;
  padding: 0.375rem;
  overflow-y: auto;
  border: 1px solid var(--rg-border);
  border-radius: var(--rg-radius-sm);
  background: #0f172a;
}

.rg-choice {
  padding: 0.625rem 0.75rem;
  border-radius: 0.5rem;
  text-align: left;
  color: #e2e8f0;
}

.rg-choice:hover,
.rg-choice[aria-selected="true"] {
  background: rgba(59, 130, 246, 0.18);
}

.rg-input--action {
  padding-right: 3.25rem;
}

.rg-input::placeholder {
  color: var(--rg-faint);
}

.rg-input:hover,
.rg-select:hover {
  border-color: rgba(255, 255, 255, 0.18);
}

.rg-input:focus,
.rg-select:focus {
  border-color: var(--rg-blue);
  background-color: rgba(59, 130, 246, 0.08);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.35);
}

.rg-input-wrap:focus-within .rg-input-icon {
  color: #93c5fd;
}

.rg-input--invalid {
  border-color: rgba(248, 113, 113, 0.7);
}

.rg-input--invalid:focus {
  border-color: var(--rg-danger);
  background-color: rgba(248, 113, 113, 0.08);
  box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.3);
}

.rg-input--valid {
  border-color: rgba(74, 222, 128, 0.5);
}

.rg-status {
  position: absolute;
  top: 50%;
  right: 0.875rem;
  transform: translateY(-50%);
  display: inline-flex;
}

.rg-status svg {
  width: 1.0625rem;
  height: 1.0625rem;
}

.rg-status--ok {
  color: var(--rg-success);
}

.rg-status--bad {
  color: var(--rg-danger);
}

.rg-status--busy {
  color: var(--rg-muted);
  animation: rg-spin 0.8s linear infinite;
}

.rg-reveal {
  position: absolute;
  top: 50%;
  right: 0.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  transform: translateY(-50%);
  border-radius: 0.625rem;
  color: var(--rg-muted);
  transition: color 0.25s ease, background-color 0.25s ease;
}

.rg-reveal:hover {
  color: #fff;
  background: var(--rg-glass);
}

.rg-reveal svg {
  width: 1.125rem;
  height: 1.125rem;
}

/* ---------- helper + validation text ---------- */
.rg-help {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin: 0.5rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--rg-faint);
  animation: rg-fade-up 0.2s ease-out;
}

.rg-help svg {
  width: 0.875rem;
  height: 0.875rem;
  flex: none;
}

.rg-help--error {
  color: var(--rg-danger);
}

.rg-help--ok {
  color: var(--rg-success);
}

.rg-link-btn {
  background: none;
  border: none;
  padding: 0;
  margin-left: 0.25rem;
  color: inherit;
  font: inherit;
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
}

/* ---------- password checklist ---------- */
.rg-meter {
  display: flex;
  gap: 0.25rem;
  margin-top: 0.75rem;
}

.rg-meter__seg {
  flex: 1;
  height: 4px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.1);
  transition: background-color 0.3s ease;
}

.rg-meter__seg--on-weak {
  background: #fb923c;
}

.rg-meter__seg--on-mid {
  background: #facc15;
}

.rg-meter__seg--on-strong {
  background: var(--rg-success);
}

.rg-checklist {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem;
  margin: 0.875rem 0 0;
  padding: 0;
  list-style: none;
}

.rg-checklist li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: var(--rg-faint);
  transition: color 0.25s ease;
}

.rg-checklist li svg {
  width: 0.875rem;
  height: 0.875rem;
  flex: none;
}

.rg-tick {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.125rem;
  height: 1.125rem;
  flex: none;
  border-radius: 9999px;
  border: 1px solid var(--rg-border);
  background: var(--rg-glass);
  color: transparent;
  transition: all 0.25s ease;
}

.rg-checklist li.rg-met {
  color: var(--rg-success);
}

.rg-checklist li.rg-met .rg-tick {
  border-color: rgba(74, 222, 128, 0.6);
  background: rgba(74, 222, 128, 0.15);
  color: var(--rg-success);
}

/* ---------- role selector ---------- */
.rg-role-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.625rem;
}

.rg-role {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
  padding: 0.875rem 1rem;
  border-radius: var(--rg-radius-sm);
  border: 1px solid var(--rg-border);
  background: var(--rg-glass);
  text-align: left;
  transition: border-color 0.25s ease, background-color 0.25s ease,
    transform 0.25s ease;
}

.rg-role:hover {
  border-color: rgba(255, 255, 255, 0.22);
  background: var(--rg-glass-strong);
  transform: translateY(-1px);
}

.rg-role--active {
  border-color: rgba(59, 130, 246, 0.5);
  background: rgba(59, 130, 246, 0.1);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.rg-role__icon {
  width: 1.25rem;
  height: 1.25rem;
  color: #60a5fa;
}

.rg-role__title {
  font-weight: 600;
  font-size: 0.9375rem;
  color: #e2e8f0;
}

.rg-role__desc {
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--rg-faint);
}

@media (min-width: 640px) {
  .rg-role-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* ---------- terms ---------- */
.rg-terms {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: #cbd5e1;
  cursor: pointer;
}

.rg-terms input {
  width: 1.125rem;
  height: 1.125rem;
  margin-top: 0.0625rem;
  flex: none;
  accent-color: var(--rg-blue-strong);
  cursor: pointer;
}

.rg-terms a {
  font-weight: 600;
  color: #60a5fa;
}

.rg-terms a:hover {
  text-decoration: underline;
}

/* ---------- actions ---------- */
.rg-actions {
  display: flex;
  gap: 0.75rem;
}

.rg-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 3.25rem;
  padding: 0.9375rem 1.5rem;
  border-radius: var(--rg-radius-sm);
  font-size: 0.9375rem;
  font-weight: 600;
  transition: transform 0.25s ease, opacity 0.25s ease,
    background-color 0.25s ease, border-color 0.25s ease;
}

.rg-btn svg {
  width: 1.0625rem;
  height: 1.0625rem;
}

.rg-btn--back {
  flex: none;
  border: 1px solid var(--rg-border);
  background: var(--rg-glass);
  color: #e2e8f0;
}

.rg-btn--back:hover {
  border-color: rgba(255, 255, 255, 0.22);
  background: var(--rg-glass-strong);
}

.rg-btn--primary {
  flex: 1;
  color: #fff;
  background-image: linear-gradient(
    to right,
    var(--rg-blue-strong),
    var(--rg-indigo)
  );
  box-shadow: var(--rg-shadow-blue);
}

.rg-btn--primary:hover:not(:disabled) {
  opacity: 0.92;
  transform: translateY(-2px);
}

.rg-btn--primary:active:not(:disabled) {
  transform: translateY(0);
}

.rg-btn--primary:disabled {
  cursor: not-allowed;
  color: var(--rg-muted);
  background-image: none;
  background-color: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--rg-border);
  box-shadow: none;
}

.rg-btn__spinner {
  width: 1.0625rem;
  height: 1.0625rem;
  border-radius: 9999px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  animation: rg-spin 0.7s linear infinite;
}

/* ---------- alerts ---------- */
.rg-alert {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: var(--rg-radius-sm);
  font-size: 0.875rem;
  line-height: 1.5;
  animation: rg-fade-up 0.2s ease-out;
}

.rg-alert svg {
  width: 1rem;
  height: 1rem;
  flex: none;
  margin-top: 0.125rem;
}

.rg-alert--error {
  border: 1px solid rgba(248, 113, 113, 0.35);
  background: rgba(127, 29, 29, 0.35);
  color: #fecaca;
}

.rg-alert--success {
  border: 1px solid rgba(74, 222, 128, 0.35);
  background: rgba(20, 83, 45, 0.35);
  color: #bbf7d0;
}

/* ---------- footer ---------- */
.rg-card__foot {
  margin: 1.5rem 0 0;
  text-align: center;
  font-size: 0.875rem;
  color: var(--rg-muted);
}

.rg-card__foot button {
  font-weight: 600;
  color: #60a5fa;
  border-radius: 0.375rem;
}

.rg-card__foot button:hover {
  color: #93c5fd;
  text-decoration: underline;
}

.rg-secure {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  margin: 1.25rem 0 0;
  font-size: 0.75rem;
  color: var(--rg-faint);
}

.rg-secure svg {
  width: 0.875rem;
  height: 0.875rem;
}

/* ---------- tablet ---------- */
@media (min-width: 640px) {
  .rg-formpane {
    padding: 3rem 2rem;
  }

  .rg-card {
    max-width: 32rem;
    padding: 2.5rem;
  }

  .rg-title {
    font-size: 1.75rem;
  }

  .rg-oauth {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .rg-oauth__btn {
    gap: 0.5rem;
    padding: 0.75rem 0.5rem;
    font-size: 0.875rem;
  }

  .rg-row--split {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .rg-checklist {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .rg-step__label {
    font-size: 0.75rem;
  }
}

/* ---------- desktop: split screen ---------- */
@media (min-width: 1024px) {
  .rg-shell {
    display: grid;
    grid-template-columns: 1fr 1.05fr;
  }

  .rg-showcase {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 3.5rem;
    border-right: 1px solid var(--rg-border-soft);
    overflow: hidden;
  }

  .rg-brand {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    font-size: 1.0625rem;
    font-weight: 600;
    color: #fff;
  }

  .rg-brand__mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: var(--rg-radius-sm);
    border: 1px solid var(--rg-border);
    background: var(--rg-glass);
    color: #60a5fa;
  }

  .rg-brand__dot {
    color: var(--rg-blue);
  }

  .rg-pitch {
    max-width: 30rem;
  }

  .rg-pitch__badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.875rem;
    border-radius: 9999px;
    border: 1px solid var(--rg-border);
    background: var(--rg-glass);
    backdrop-filter: blur(12px);
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: #cbd5e1;
  }

  .rg-pitch__badge svg {
    width: 0.875rem;
    height: 0.875rem;
    color: #60a5fa;
  }

  .rg-pitch__title {
    margin: 1.5rem 0 0;
    font-size: 2.5rem;
    font-weight: 600;
    line-height: 1.1;
    letter-spacing: -0.035em;
    background-image: linear-gradient(to right, #ffffff, #e2e8f0, #94a3b8);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    -webkit-text-fill-color: transparent;
  }

  .rg-pitch__text {
    margin: 1.25rem 0 0;
    font-size: 1rem;
    line-height: 1.75;
    color: var(--rg-muted);
  }

  /* rolling testimonial / metric panel */
  .rg-roll {
    margin-top: 2.5rem;
    padding: 1.5rem;
    border-radius: var(--rg-radius-lg);
    border: 1px solid var(--rg-border);
    background: rgba(255, 255, 255, 0.04);
    backdrop-filter: blur(16px);
  }

  .rg-roll__quote {
    display: flex;
    gap: 0.875rem;
    min-height: 6.5rem;
    animation: rg-fade-up 0.45s ease-out;
  }

  .rg-roll__icon {
    flex: none;
    width: 1.25rem;
    height: 1.25rem;
    color: #60a5fa;
  }

  .rg-roll__body p {
    margin: 0;
    font-size: 0.9375rem;
    line-height: 1.7;
    color: #e2e8f0;
  }

  .rg-roll__meta {
    margin-top: 0.75rem;
    font-size: 0.8125rem;
    color: var(--rg-faint);
  }

  .rg-roll__meta strong {
    display: block;
    font-weight: 600;
    color: #cbd5e1;
  }

  .rg-roll__dots {
    display: flex;
    gap: 0.375rem;
    margin-top: 1.25rem;
  }

  .rg-roll__dot {
    width: 1.5rem;
    height: 3px;
    padding: 0;
    border-radius: 9999px;
    background: rgba(255, 255, 255, 0.15);
    transition: background-color 0.3s ease;
  }

  .rg-roll__dot--on {
    background: var(--rg-blue);
  }

  .rg-metrics {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.75rem;
    max-width: 30rem;
  }

  .rg-metric {
    padding: 0.875rem 1rem;
    border-radius: var(--rg-radius-md);
    border: 1px solid var(--rg-border-soft);
    background: rgba(255, 255, 255, 0.03);
  }

  .rg-metric svg {
    width: 1rem;
    height: 1rem;
    color: #60a5fa;
  }

  .rg-metric__value {
    margin: 0.5rem 0 0;
    font-size: 1.0625rem;
    font-weight: 600;
    color: #fff;
  }

  .rg-metric__label {
    margin: 0.125rem 0 0;
    font-size: 0.75rem;
    color: var(--rg-faint);
  }

  .rg-formpane {
    align-items: center;
    padding: 3rem 3.5rem;
  }

  .rg-card {
    max-width: 30rem;
    padding: 2.5rem;
  }

  .rg-card__head {
    text-align: left;
  }

  .rg-subtitle {
    margin-left: 0;
  }
}

@media (min-width: 1280px) {
  .rg-showcase {
    padding: 4rem;
  }

  .rg-pitch__title {
    font-size: 3rem;
  }

  .rg-formpane {
    padding: 3rem 5rem;
  }
}

/* ---------- reduced motion ---------- */
@media (prefers-reduced-motion: reduce) {
  .rg-orb {
    animation: none;
  }

  .rg-root *,
  .rg-root *::before,
  .rg-root *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
`;

/* ------------------------------------------------------------------ */
/*  BRAND ICONS                                                        */
/* ------------------------------------------------------------------ */

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="rg-oauth__icon" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5a4.7 4.7 0 0 1-2 3.1l3.2 2.5c1.9-1.7 3-4.3 3-7.3 0-.7-.1-1.4-.2-2H12Z"
      />
      <path
        fill="#34A853"
        d="M6.6 14.3 5.9 14l-2.3 1.8A9 9 0 0 0 12 21c2.4 0 4.5-.8 6-2.2l-3.2-2.5c-.8.6-1.9.9-2.8.9a5.2 5.2 0 0 1-4.9-3.6Z"
      />
      <path
        fill="#FBBC05"
        d="M3.6 8.2A9 9 0 0 0 3.6 15.8L6.6 13.5a5.4 5.4 0 0 1 0-3.4L3.6 8.2Z"
      />
      <path
        fill="#4285F4"
        d="M12 6.6c1.4 0 2.6.5 3.5 1.4l2.6-2.6A9 9 0 0 0 3.6 8.2l3 2.3A5.2 5.2 0 0 1 12 6.6Z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="rg-oauth__icon" aria-hidden="true">
      <path
        fill="#f8fafc"
        d="M16.4 12.7c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.7.8-3.3.8-.7 0-1.7-.8-2.8-.8-1.5 0-2.8.8-3.6 2.1-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.6 2.2 2.7 2.2 1.1 0 1.5-.7 2.8-.7s1.6.7 2.8.7c1.1 0 1.9-1 2.6-2.1.8-1.2 1.2-2.3 1.2-2.4-.1 0-2.2-.9-2.2-3.3ZM14.2 5.9c.6-.7 1-1.7.9-2.7-.9 0-2 .6-2.6 1.3-.6.6-1.1 1.7-1 2.6 1 .1 2-.5 2.7-1.2Z"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="rg-oauth__icon" aria-hidden="true">
      <path
        fill="#f8fafc"
        d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48l-.01-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.95 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.03a9.5 9.5 0 0 1 5 0c1.91-1.3 2.75-1.03 2.75-1.03.55 1.38.2 2.4.1 2.65.64.7 1.03 1.6 1.03 2.69 0 3.85-2.34 4.7-4.57 4.95.36.31.68.92.68 1.86l-.01 2.75c0 .26.18.58.69.48A10 10 0 0 0 12 2Z"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  CONSTANTS & HELPERS                                                */
/* ------------------------------------------------------------------ */

const STEPS = [
  { id: 1, label: "Organization" },
  { id: 2, label: "Your details" },
  { id: 3, label: "Security" },
];

const COUNTRIES = [
  { code: "KE", name: "Kenya", currency: "KES" },
  { code: "UG", name: "Uganda", currency: "UGX" },
  { code: "TZ", name: "Tanzania", currency: "TZS" },
  { code: "RW", name: "Rwanda", currency: "RWF" },
  { code: "NG", name: "Nigeria", currency: "NGN" },
  { code: "ZA", name: "South Africa", currency: "ZAR" },
  { code: "GB", name: "United Kingdom", currency: "GBP" },
  { code: "US", name: "United States", currency: "USD" },
  { code: "AE", name: "United Arab Emirates", currency: "AED" },
];

const CURRENCIES = ["KES", "UGX", "TZS", "RWF", "NGN", "ZAR", "GBP", "USD", "AED", "EUR"];

const TESTIMONIALS = [
  {
    quote:
      "We onboarded 340 units in a weekend. Month-end reconciliation went from two days to two hours.",
    name: "Amina W.",
    role: "Head of Operations, Nairobi",
  },
  {
    quote:
      "Tenants pay through the portal and the ledger updates itself. Our arrears dropped 38% in one quarter.",
    name: "Daniel K.",
    role: "Managing Director, Kilimani Estates",
  },
  {
    quote:
      "Maintenance requests, approvals and invoices finally live in one place. No more WhatsApp archaeology.",
    name: "Priya S.",
    role: "Portfolio Manager, Mombasa",
  },
];

const METRICS = [
  { icon: Building2, value: "12,000+", label: "Units on-boarded" },
  { icon: Wallet, value: "KSh 10B+", label: "Assets managed" },
  { icon: ShieldCheck, value: "99.9%", label: "Platform up-time" },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$/;

type UsernameState = "idle" | "checking" | "available" | "taken" | "invalid" | "unknown";

type Organization = {
  id: number;
  name: string;
  username: string | null;
  country: string | null;
};

type PropertyOption = {
  id: number;
  name: string;
};

type UnitOption = {
  id: number;
  unit_number: string;
  unit_type: string | null;
  monthly_rent: number;
};

type LoadState = "idle" | "loading" | "loaded" | "error";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function positiveId(value: unknown): number | null {
  if (
    typeof value !== "number" &&
    (typeof value !== "string" || !/^\d+$/.test(value))
  ) {
    return null;
  }
  const id = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function parseOrganizationOptions(payload: unknown): Organization[] {
  if (!Array.isArray(payload)) return [];

  return payload.flatMap((item) => {
    if (!isRecord(item)) return [];
    const id = positiveId(item.id);
    if (!id || typeof item.name !== "string" || !item.name.trim()) return [];

    return [{
      id,
      name: item.name,
      username: typeof item.username === "string" ? item.username : null,
      country: typeof item.country === "string" ? item.country : null,
    }];
  });
}

function parsePropertyOptions(payload: unknown): PropertyOption[] {
  if (!Array.isArray(payload)) return [];

  return payload.flatMap((item) => {
    if (!isRecord(item)) return [];
    const id = positiveId(item.id);
    return id && typeof item.name === "string" ? [{ id, name: item.name }] : [];
  });
}

function parseUnitOptions(payload: unknown): UnitOption[] {
  if (!Array.isArray(payload)) return [];

  return payload.flatMap((item) => {
    if (!isRecord(item)) return [];
    const id = positiveId(item.id);
    if (!id || typeof item.unit_number !== "string") return [];

    return [{
      id,
      unit_number: item.unit_number,
      unit_type: typeof item.unit_type === "string" ? item.unit_type : null,
      monthly_rent: Number(item.monthly_rent) || 0,
    }];
  });
}

function detectCountry(): string {
  const candidates: string[] = [];

  if (typeof navigator !== "undefined") {
    const languages = navigator.languages ?? [navigator.language];
    languages.forEach((tag) => {
      const region = tag?.split("-")[1];
      if (region) candidates.push(region.toUpperCase());
    });
  }

  const match = candidates.find((code) =>
    COUNTRIES.some((country) => country.code === code)
  );

  return match ?? "KE";
}

function currencyForCountry(code: string): string {
  return COUNTRIES.find((country) => country.code === code)?.currency ?? "USD";
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

const PASSWORD_RULES = [
  { id: "length", label: "8+ characters", test: (v: string) => v.length >= 8 },
  { id: "case", label: "Upper & lowercase", test: (v: string) => /[a-z]/.test(v) && /[A-Z]/.test(v) },
  { id: "number", label: "At least 1 number", test: (v: string) => /\d/.test(v) },
  { id: "symbol", label: "1 symbol (!@#$…)", test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

/* ------------------------------------------------------------------ */
/*  COMPONENT                                                          */
/* ------------------------------------------------------------------ */

function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const [role, setRole] = useState<"manager" | "tenant">("manager");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationsStatus, setOrganizationsStatus] = useState<LoadState>("idle");
  const [organizationsError, setOrganizationsError] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [organizationQuery, setOrganizationQuery] = useState("");
  const [organizationReload, setOrganizationReload] = useState(0);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [propertiesStatus, setPropertiesStatus] = useState<LoadState>("idle");
  const [propertiesError, setPropertiesError] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [propertyReload, setPropertyReload] = useState(0);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [unitsStatus, setUnitsStatus] = useState<LoadState>("idle");
  const [unitsError, setUnitsError] = useState("");
  const [unitId, setUnitId] = useState("");
  const [unitsReload, setUnitsReload] = useState(0);
  const [organizationName, setOrganizationName] = useState("");
  const [country, setCountry] = useState(detectCountry);
  const [currency, setCurrency] = useState(() =>
    currencyForCountry(detectCountry())
  );

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameEdited, setUsernameEdited] = useState(false);
  const [usernameState, setUsernameState] = useState<UsernameState>("idle");

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [employerName, setEmployerName] = useState("");
  const [employerPhone, setEmployerPhone] = useState("");
  const [nextOfKinName, setNextOfKinName] = useState("");
  const [nextOfKinPhone, setNextOfKinPhone] = useState("");
  const [requestedMoveInDate, setRequestedMoveInDate] = useState("");
  const [requestedMoveOutDate, setRequestedMoveOutDate] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const usernameRequest = useRef(0);

  useEffect(() => {
    if (role !== "tenant") return;

    let cancelled = false;
    setOrganizationsStatus("loading");
    setOrganizationsError("");

    apiRequest("/organizations")
      .then((data) => {
        if (cancelled) return;
        setOrganizations(parseOrganizationOptions(data));
        setOrganizationsStatus("loaded");
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setOrganizations([]);
        setOrganizationsStatus("error");
        setOrganizationsError(
          caught instanceof ApiError
            ? caught.message
            : "Could not load organizations. Check your connection and try again."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [role, organizationReload]);

  useEffect(() => {
    if (role !== "tenant" || !organizationId) {
      setProperties([]);
      setPropertiesStatus("idle");
      setPropertyId("");
      setUnits([]);
      setUnitsStatus("idle");
      setUnitId("");
      return;
    }

    let cancelled = false;
    setPropertiesStatus("loading");
    setPropertiesError("");
    setPropertyId("");
    setUnits([]);
    setUnitsStatus("idle");
    setUnitId("");

    apiRequest(`/organizations/${encodeURIComponent(organizationId)}/properties`)
      .then((data) => {
        if (cancelled) return;
        setProperties(parsePropertyOptions(data));
        setPropertiesStatus("loaded");
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setProperties([]);
        setPropertiesStatus("error");
        setPropertiesError(
          caught instanceof ApiError
            ? caught.message
            : "Could not load properties. Check your connection and try again."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [role, organizationId, propertyReload]);

  useEffect(() => {
    if (role !== "tenant" || !propertyId) {
      setUnits([]);
      setUnitsStatus("idle");
      setUnitId("");
      return;
    }

    let cancelled = false;
    setUnitsStatus("loading");
    setUnitsError("");
    setUnitId("");

    apiRequest(`/properties/${encodeURIComponent(propertyId)}/available-units`)
      .then((data) => {
        if (cancelled) return;
        setUnits(parseUnitOptions(data));
        setUnitsStatus("loaded");
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setUnits([]);
        setUnitsStatus("error");
        setUnitsError(
          caught instanceof ApiError
            ? caught.message
            : "Could not load available units. Check your connection and try again."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [role, propertyId, unitsReload]);

  function retryLoadOrganizations() {
    setOrganizationReload((current) => current + 1);
  }

  /* --- smart defaults: keep currency in sync with country --- */
  function handleCountryChange(code: string) {
    setCountry(code);
    setCurrency(currencyForCountry(code));
  }

  /* --- suggest a username from the organization name --- */
  useEffect(() => {
    if (usernameEdited) return;
    setUsername(slugify(organizationName));
  }, [organizationName, usernameEdited]);

  /* --- debounced availability check --- */
  useEffect(() => {
    const value = username.trim();

    if (!value) {
      setUsernameState("idle");
      return;
    }

    if (!USERNAME_PATTERN.test(value)) {
      setUsernameState("invalid");
      return;
    }

    setUsernameState("checking");
    const requestId = usernameRequest.current + 1;
    usernameRequest.current = requestId;

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `${API_BASE}/username-available?username=${encodeURIComponent(value)}`,
          { headers: { Accept: "application/json" } }
        );
        const data = await response.json();
        if (usernameRequest.current !== requestId) return;
        setUsernameState(data.available ? "available" : "taken");
      } catch {
        if (usernameRequest.current !== requestId) return;
        setUsernameState("unknown");
      }
    }, 500);

    return () => window.clearTimeout(timer);
  }, [username]);

  /* --- validation --- */
  const passwordChecks = useMemo(
    () => PASSWORD_RULES.map((rule) => ({ ...rule, met: rule.test(password) })),
    [password]
  );

  const passwordScore = passwordChecks.filter((rule) => rule.met).length;
  const emailValid = EMAIL_PATTERN.test(email.trim());
  const orgValid = organizationName.trim().length >= 2;
  const tenantOrgValid =
    Number.isSafeInteger(Number(organizationId)) && Number(organizationId) > 0;
  const tenantPropertyValid =
    Number.isSafeInteger(Number(propertyId)) && Number(propertyId) > 0;
  const tenantUnitValid =
    Number.isSafeInteger(Number(unitId)) && Number(unitId) > 0;
  const organizationSearchResults = useMemo(() => {
    const query = organizationQuery.trim().toLowerCase();
    return organizations.filter((organization) =>
      `${organization.name} ${organization.country ?? ""}`
        .toLowerCase()
        .includes(query)
    ).slice(0, 25);
  }, [organizations, organizationQuery]);
  const nameValid = name.trim().length >= 2;
  const phoneValid = role !== "tenant" || phone.trim().length >= 7;
  const requestedStartValid = true;
  const requestedEndValid = role !== "tenant" || !requestedMoveOutDate || requestedMoveOutDate >= requestedMoveInDate;
  const usernameValid =
    USERNAME_PATTERN.test(username.trim()) && usernameState !== "taken";
  const passwordValid = passwordScore === PASSWORD_RULES.length;

  const stepValid: Record<number, boolean> = {
    1: role === "tenant"
      ? tenantOrgValid && tenantPropertyValid && tenantUnitValid
      : orgValid,
    2:
      role === "tenant"
        ? nameValid && emailValid && phoneValid && requestedStartValid && requestedEndValid
        : nameValid && usernameValid && emailValid && usernameState !== "checking",
    3: passwordValid && acceptedTerms,
  };

  const canSubmit =
    stepValid[1] && stepValid[2] && stepValid[3] && !loading;

  function markTouched(field: string) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  function goNext() {
    if (step === 1) {
      markTouched("organizationId");
      markTouched("propertyId");
      markTouched("unitId");
    }
    if (step === 2) {
      markTouched("name");
      if (role !== "tenant") markTouched("username");
      markTouched("email");
      if (role === "tenant") {
        markTouched("phone");
        markTouched("requestedMoveInDate");
        markTouched("requestedMoveOutDate");
      }
    }
    if (stepValid[step]) setStep((current) => Math.min(current + 1, 3));
  }

  function goBack() {
    setStep((current) => Math.max(current - 1, 1));
  }

  const usernameMessage = (() => {
    switch (usernameState) {
      case "checking":
        return { tone: "", text: "Checking availability…" };
      case "available":
        return { tone: "rg-help--ok", text: `${username} is available.` };
      case "taken":
        return { tone: "rg-help--error", text: "That workspace name is taken." };
      case "invalid":
        return {
          tone: "rg-help--error",
          text: "Use 3–30 lowercase letters, numbers or hyphens.",
        };
      case "unknown":
        return {
          tone: "",
          text: "Could not verify right now — we'll confirm on submit.",
        };
      default:
        return { tone: "", text: "This becomes your workspace URL." };
    }
  })();

  /* --- rolling testimonials --- */
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(
      () => setSlide((current) => (current + 1) % TESTIMONIALS.length),
      6000
    );
    return () => window.clearInterval(timer);
  }, []);

  /* --- submit --- */
 // ...existing code...

/* --- submit --- */
async function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  if (!canSubmit) return;

  setError("");
  setSuccess("");
  setLoading(true);

  try {
    // Build payload based on role
    const isTenant = role === "tenant";
    const countryName = COUNTRIES.find((c) => c.code === country)?.name || country;

    await apiRequest("/register", {
      method: "POST",
      body: JSON.stringify(
        isTenant
          ? {
              role,
              organization_id: Number(organizationId),
              property_id: Number(propertyId),
              unit_id: Number(unitId),
              name,
              email,
              password,
              password_confirmation: password,
            }
          : {
              role,
              organization_name: organizationName,
              username: username,
              country: countryName,
              name,
              email,
              password,
              password_confirmation: password,
            }
      ),
    });

    // Success message before redirect
    setSuccess("Account created successfully — redirecting to login…");
    setError("");

    // Clear form data
    setOrganizationName("");
    setOrganizationId("");
    setOrganizationQuery("");
    setPropertyId("");
    setUnitId("");
    setName("");
    setUsername("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setAcceptedTerms(false);
    setStep(1);

    // Redirect to login page after 2 seconds
    setTimeout(() => {
      window.location.href = "/login";
    }, 2000);
  } catch (err) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Unable to connect to the server. Make sure Laravel is running.";
    
    setError(errorMessage);
    setLoading(false);
  }
}

// ...existing code...
  const testimonial = TESTIMONIALS[slide];

  return (
    <main className="rg-root">
      <style>{styles}</style>

      <div className="rg-backdrop" aria-hidden="true">
        <div className="rg-orb rg-orb--indigo" />
        <div className="rg-orb rg-orb--blue" />
        <div className="rg-orb rg-orb--purple" />
      </div>

      <div className="rg-shell">
        {/* Showcase — desktop only */}
        <aside className="rg-showcase">
          <div className="rg-brand">
            <span className="rg-brand__mark">
              <Building2 size={20} />
            </span>
            <span>
              PMS<span className="rg-brand__dot">.</span>
            </span>
          </div>

          <div className="rg-pitch">
            <span className="rg-pitch__badge">
              <Sparkles />
              Free 14-day trial
            </span>

            <h2 className="rg-pitch__title">
              Set up your portfolio in three short steps.
            </h2>

            <p className="rg-pitch__text">
              No card required. Invite your team, import units and start
              collecting rent the same day.
            </p>

            <div className="rg-roll">
              <div className="rg-roll__quote" key={slide}>
                <Quote className="rg-roll__icon" />
                <div className="rg-roll__body">
                  <p>{testimonial.quote}</p>
                  <div className="rg-roll__meta">
                    <strong>{testimonial.name}</strong>
                    {testimonial.role}
                  </div>
                </div>
              </div>

              <div className="rg-roll__dots">
                {TESTIMONIALS.map((item, index) => (
                  <button
                    key={item.name}
                    type="button"
                    className={`rg-roll__dot${
                      index === slide ? " rg-roll__dot--on" : ""
                    }`}
                    onClick={() => setSlide(index)}
                    aria-label={`Show testimonial ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="rg-metrics">
            {METRICS.map(({ icon: Icon, value, label }) => (
              <div className="rg-metric" key={label}>
                <Icon />
                <p className="rg-metric__value">{value}</p>
                <p className="rg-metric__label">{label}</p>
              </div>
            ))}
          </div>
        </aside>

        {/* Form */}
        <section className="rg-formpane">
          <div className="rg-card">
            <div className="rg-card__head">
              <span className="rg-logo">
                <Building2 size={24} />
              </span>
              <p className="rg-wordmark">PMS</p>
              <h1 className="rg-title">Create your account</h1>
              <p className="rg-subtitle">
                Set up your organization and start managing properties in
                minutes.
              </p>
            </div>

            {/* Step tracker */}
            <ol className="rg-tracker" aria-label="Registration progress">
              {STEPS.map((item) => {
                const state =
                  item.id === step
                    ? "rg-step--active"
                    : item.id < step
                    ? "rg-step--done"
                    : "";
                return (
                  <li
                    key={item.id}
                    className={`rg-step ${state}`}
                    aria-current={item.id === step ? "step" : undefined}
                  >
                    <span className="rg-step__dot">
                      {item.id < step ? <Check /> : item.id}
                    </span>
                    <span className="rg-step__label">{item.label}</span>
                  </li>
                );
              })}
            </ol>

            {/* OAuth — bypass the form entirely */}
            {step === 1 && (
              <>
                <div className="rg-oauth">
                  <button
                    type="button"
                    className="rg-oauth__btn"
                    aria-label="Sign up with Google"
                  >
                    <GoogleIcon />
                    Google
                  </button>
                  <button
                    type="button"
                    className="rg-oauth__btn"
                    aria-label="Sign up with Apple"
                  >
                    <AppleIcon />
                    Apple
                  </button>
                  <button
                    type="button"
                    className="rg-oauth__btn"
                    aria-label="Sign up with GitHub"
                  >
                    <GitHubIcon />
                    GitHub
                  </button>
                </div>

                <div className="rg-divider">
                  <span>or sign up with email</span>
                </div>
              </>
            )}

            <form className="rg-form" onSubmit={handleSubmit} noValidate>
              {/* STEP 1 — organization */}
              {step === 1 && (
                <fieldset className="rg-fieldset">
<legend className="rg-sr">Organization details</legend>

                  {role === "tenant" ? (
                    <>
                      <div>
                        <label className="rg-label" htmlFor="organizationSearch">
                          Property management company
                        </label>
                        <div className="rg-input-wrap">
                          <Building2 className="rg-input-icon" />
                          <input
                            id="organizationSearch"
                            name="organization_search"
                            type="search"
                            className="rg-input"
                            value={organizationQuery}
                            disabled={organizationsStatus === "loading"}
                            placeholder="Search property management company…"
                            autoComplete="off"
                            onChange={(event) => {
                              setOrganizationQuery(event.target.value);
                              setOrganizationId("");
                              setPropertyId("");
                              setUnitId("");
                            }}
                            onBlur={() => markTouched("organizationId")}
                            aria-invalid={touched.organizationId && !tenantOrgValid}
                            aria-describedby="organization-help"
                          />
                        </div>
                        {organizationsStatus === "loading" ? (
                          <p className="rg-help" role="status">
                            <Loader2 className="rg-spin" />
                            Loading organizations…
                          </p>
                        ) : organizationsStatus === "error" ? (
                          <p className="rg-help rg-help--error" id="organization-help" role="alert">
                            <AlertCircle />
                            {organizationsError || "Could not load organizations."}{" "}
                            <button
                              type="button"
                              className="rg-link-btn"
                              onClick={retryLoadOrganizations}
                            >
                              Retry
                            </button>
                          </p>
                        ) : organizationsStatus === "loaded" && organizations.length === 0 ? (
                          <p className="rg-help rg-help--error" id="organization-help" role="alert">
                            <AlertCircle />
                            No organizations exist yet. Ask your property manager to register first.
                          </p>
                        ) : organizationId ? (
                          <p className="rg-help rg-help--ok" id="organization-help">
                            <CheckCircle2 />
                            {organizations.find((item) => String(item.id) === organizationId)?.name} selected
                          </p>
                        ) : (
                          <>
                            <p className={`rg-help${touched.organizationId && !tenantOrgValid ? " rg-help--error" : ""}`} id="organization-help">
                              {touched.organizationId && !tenantOrgValid
                                ? "Select an existing organization from the results."
                                : "Choose an existing organization; new organizations cannot be created here."}
                            </p>
                            {organizationQuery.trim() && organizationSearchResults.length > 0 && (
                              <div className="rg-choice-list" role="listbox" aria-label="Organizations">
                                {organizationSearchResults.map((organization) => (
                                  <button
                                    key={organization.id}
                                    type="button"
                                    role="option"
                                    aria-selected={false}
                                    className="rg-choice"
                                    onClick={() => {
                                      setOrganizationId(String(organization.id));
                                      setOrganizationQuery(organization.name);
                                      setPropertyId("");
                                      setUnitId("");
                                    }}
                                  >
                                    {organization.name}
                                    {organization.country ? ` — ${organization.country}` : ""}
                                  </button>
                                ))}
                              </div>
                            )}
                            {organizationQuery.trim() && organizationSearchResults.length === 0 && (
                              <p className="rg-help" role="status">No matching organizations found.</p>
                            )}
                          </>
                        )}
                      </div>

                      {organizationId && (
                        <div>
                          <label className="rg-label" htmlFor="propertyId">Property</label>
                          <div className="rg-input-wrap">
                            <Building2 className="rg-input-icon" />
                            <select
                              id="propertyId"
                              className="rg-select"
                              value={propertyId}
                              disabled={propertiesStatus !== "loaded" || properties.length === 0}
                              onChange={(event) => {
                                setPropertyId(event.target.value);
                                setUnitId("");
                              }}
                            >
                              <option value="">
                                {propertiesStatus === "loading" ? "Loading properties…" :
                                  propertiesStatus === "error" ? "Properties unavailable" :
                                  properties.length === 0 ? "No properties available" : "Select a property"}
                              </option>
                              {properties.map((property) => (
                                <option key={property.id} value={property.id}>{property.name}</option>
                              ))}
                            </select>
                          </div>
                          {propertiesStatus === "error" ? (
                            <p className="rg-help rg-help--error" role="alert">
                              <AlertCircle />{propertiesError}{" "}
                              <button type="button" className="rg-link-btn" onClick={() => setPropertyReload((value) => value + 1)}>Retry</button>
                            </p>
                          ) : propertiesStatus === "loaded" && properties.length === 0 ? (
                            <p className="rg-help" role="status">This organization has no properties yet.</p>
                          ) : touched.propertyId && !tenantPropertyValid ? (
                            <p className="rg-help rg-help--error" role="alert"><AlertCircle />Select a property.</p>
                          ) : null}
                        </div>
                      )}

                      {propertyId && (
                        <div>
                          <label className="rg-label" htmlFor="unitId">Available unit</label>
                          <div className="rg-input-wrap">
                            <Building2 className="rg-input-icon" />
                            <select
                              id="unitId"
                              className="rg-select"
                              value={unitId}
                              disabled={unitsStatus !== "loaded" || units.length === 0}
                              onChange={(event) => setUnitId(event.target.value)}
                            >
                              <option value="">
                                {unitsStatus === "loading" ? "Loading available units…" :
                                  unitsStatus === "error" ? "Units unavailable" :
                                  units.length === 0 ? "No available units" : "Select a unit"}
                              </option>
                              {units.map((unit) => (
                                <option key={unit.id} value={unit.id}>
                                  {unit.unit_number}{unit.unit_type ? ` — ${unit.unit_type}` : ""} — KSh {unit.monthly_rent.toLocaleString()}
                                </option>
                              ))}
                            </select>
                          </div>
                          {unitsStatus === "error" ? (
                            <p className="rg-help rg-help--error" role="alert">
                              <AlertCircle />{unitsError}{" "}
                              <button type="button" className="rg-link-btn" onClick={() => setUnitsReload((value) => value + 1)}>Retry</button>
                            </p>
                          ) : unitsStatus === "loaded" && units.length === 0 ? (
                            <p className="rg-help" role="status">No vacant units are currently available in this property.</p>
                          ) : touched.unitId && !tenantUnitValid ? (
                            <p className="rg-help rg-help--error" role="alert"><AlertCircle />Select an available unit.</p>
                          ) : null}
                        </div>
                      )}
                    </>

                  ) : (
                    <div>
                      <label className="rg-label" htmlFor="organizationName">
                        Organization name
                      </label>
                      <div className="rg-input-wrap">
                        <Building2 className="rg-input-icon" />
                        <input
                          id="organizationName"
                          name="organization"
                          type="text"
                          autoComplete="organization"
                          value={organizationName}
                          onChange={(event) =>
                            setOrganizationName(event.target.value)
                          }
                          onBlur={() => markTouched("organizationName")}
                          placeholder="e.g. Siana Properties Ltd"
                          aria-invalid={touched.organizationName && !orgValid}
                          className={`rg-input${
                            touched.organizationName && !orgValid
                              ? " rg-input--invalid"
                              : orgValid
                              ? " rg-input--valid"
                              : ""
                          }`}
                        />
                      </div>
                      {touched.organizationName && !orgValid ? (
                        <p className="rg-help rg-help--error" role="alert">
                          <AlertCircle />
                          Enter your organization's legal or trading name.
                        </p>
                      ) : (
                        <p className="rg-help">
                          Shown on invoices and tenant statements.
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <span className="rg-label">I am registering as</span>
                    <div className="rg-role-grid">
                      <button
                        type="button"
                        className={`rg-role${role === "manager" ? " rg-role--active" : ""}`}
                        onClick={() => setRole("manager")}
                        aria-pressed={role === "manager"}
                      >
                        <Building2 className="rg-role__icon" />
                        <span className="rg-role__title">Property Manager</span>
                        <span className="rg-role__desc">
                          Manage properties, units, leases and tenants
                        </span>
                      </button>
                      <button
                        type="button"
                        className={`rg-role${role === "tenant" ? " rg-role--active" : ""}`}
                        onClick={() => setRole("tenant")}
                        aria-pressed={role === "tenant"}
                      >
                        <User className="rg-role__icon" />
                        <span className="rg-role__title">Tenant</span>
                        <span className="rg-role__desc">
                          Pay rent, submit requests and view your home
                        </span>
                      </button>
                    </div>
                    <p className="rg-help">
                      Select how you'll be using the platform.
                    </p>
                  </div>

                  {role !== "tenant" && (
                    <div className="rg-row rg-row--split">
                      <div>
                        <label className="rg-label" htmlFor="country">
                          Country
                        </label>
                        <div className="rg-input-wrap">
                          <Globe2 className="rg-input-icon" />
                          <select
                            id="country"
                            name="country"
                            className="rg-select"
                            value={country}
                            onChange={(event) =>
                              handleCountryChange(event.target.value)
                            }
                          >
                            {COUNTRIES.map((item) => (
                              <option key={item.code} value={item.code}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <p className="rg-help">Detected from your browser.</p>
                      </div>

                      <div>
                        <label className="rg-label" htmlFor="currency">
                          Currency
                        </label>
                        <div className="rg-input-wrap">
                          <Wallet className="rg-input-icon" />
                          <select
                            id="currency"
                            name="currency"
                            className="rg-select"
                            value={currency}
                            onChange={(event) => setCurrency(event.target.value)}
                          >
                            {CURRENCIES.map((code) => (
                              <option key={code} value={code}>
                                {code}
                              </option>
                            ))}
                          </select>
                        </div>
                        <p className="rg-help">Used for rent and reporting.</p>
                      </div>
                    </div>
                  )}
                </fieldset>
              )}

              {/* STEP 2 — your details */}
              {step === 2 && (
                <fieldset className="rg-fieldset">
                  <legend className="rg-sr">Your details</legend>

                  <div>
                    <label className="rg-label" htmlFor="name">
                      Your full name
                    </label>
                    <div className="rg-input-wrap">
                      <User className="rg-input-icon" />
                      <input
                        id="name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        onBlur={() => markTouched("name")}
                        placeholder="e.g. Siana Onyango"
                        aria-invalid={touched.name && !nameValid}
                        className={`rg-input${
                          touched.name && !nameValid
                            ? " rg-input--invalid"
                            : nameValid
                            ? " rg-input--valid"
                            : ""
                        }`}
                      />
                    </div>
                    {touched.name && !nameValid && (
                      <p className="rg-help rg-help--error" role="alert">
                        <AlertCircle />
                        Please enter your full name.
                      </p>
                    )}
                  </div>

                  {role !== "tenant" && (
                    <div>
                      <label className="rg-label" htmlFor="username">
                        Workspace handle
                      </label>
                    <div className="rg-input-wrap">
                      <AtSign className="rg-input-icon" />
                      <input
                        id="username"
                        name="username"
                        type="text"
                        autoComplete="username"
                        autoCapitalize="none"
                        spellCheck={false}
                        value={username}
                        onChange={(event) => {
                          setUsernameEdited(true);
                          setUsername(event.target.value.toLowerCase());
                        }}
                        onBlur={() => markTouched("username")}
                        placeholder="siana-properties"
                        aria-invalid={
                          usernameState === "taken" ||
                          usernameState === "invalid"
                        }
                        aria-describedby="username-help"
                        className={`rg-input rg-input--action${
                          usernameState === "taken" ||
                          usernameState === "invalid"
                            ? " rg-input--invalid"
                            : usernameState === "available"
                            ? " rg-input--valid"
                            : ""
                        }`}
                      />
                      {usernameState === "checking" && (
                        <span className="rg-status rg-status--busy">
                          <Loader2 />
                        </span>
                      )}
                      {usernameState === "available" && (
                        <span className="rg-status rg-status--ok">
                          <CheckCircle2 />
                        </span>
                      )}
                      {(usernameState === "taken" ||
                        usernameState === "invalid") && (
                        <span className="rg-status rg-status--bad">
                          <AlertCircle />
                        </span>
                      )}
                    </div>
                    <p
                      className={`rg-help ${usernameMessage.tone}`}
                      id="username-help"
                    >
                      {usernameState === "taken" ||
                      usernameState === "invalid" ? (
                        <AlertCircle />
                      ) : usernameState === "available" ? (
                        <CheckCircle2 />
                      ) : null}
                      {usernameMessage.text}
                    </p>
                    </div>
                  )}

                  <div>
                    <label className="rg-label" htmlFor="email">
                      Work email
                    </label>
                    <div className="rg-input-wrap">
                      <Mail className="rg-input-icon" />
                      <input
                        id="email"
                        name="email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        autoCapitalize="none"
                        spellCheck={false}
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        onBlur={() => markTouched("email")}
                        placeholder="name@company.com"
                        aria-invalid={touched.email && !emailValid}
                        className={`rg-input${
                          touched.email && !emailValid
                            ? " rg-input--invalid"
                            : emailValid
                            ? " rg-input--valid"
                            : ""
                        }`}
                      />
                    </div>
                    {touched.email && !emailValid && (
                      <p className="rg-help rg-help--error" role="alert">
                        <AlertCircle />
                        Enter a valid email, e.g. name@company.com
                      </p>
                    )}
                  </div>

                  {role === "tenant" && (
                    <>
                      <div className="rg-row rg-row--split">
                        <div>
                          <label className="rg-label" htmlFor="phone">Phone number</label>
                          <div className="rg-input-wrap">
                            <User className="rg-input-icon" />
                            <input
                              id="phone"
                              className="rg-input"
                              type="tel"
                              value={phone}
                              onChange={(event) => setPhone(event.target.value)}
                              onBlur={() => markTouched("phone")}
                              placeholder="e.g. 0712 345 678"
                              aria-invalid={touched.phone && !phoneValid}
                            />
                          </div>
                          {touched.phone && !phoneValid && <p className="rg-help rg-help--error"><AlertCircle />Enter your phone number.</p>}
                        </div>
                        <div>
                          <label className="rg-label" htmlFor="national-id">National ID number</label>
                          <div className="rg-input-wrap">
                            <User className="rg-input-icon" />
                            <input
                              id="national-id"
                              className="rg-input"
                              value={nationalId}
                              onChange={(event) => setNationalId(event.target.value)}
                              placeholder="ID number"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="rg-row rg-row--split">
                        <div>
                          <label className="rg-label" htmlFor="requested-move-in">Requested lease start</label>
                          <div className="rg-input-wrap">
                            <Globe2 className="rg-input-icon" />
                            <input
                              id="requested-move-in"
                              className="rg-input"
                              type="date"
                              value={requestedMoveInDate}
                              onChange={(event) => setRequestedMoveInDate(event.target.value)}
                              onBlur={() => markTouched("requestedMoveInDate")}
                              aria-invalid={false}
                            />
                          </div>
                          <p className="rg-help">Optional. If provided, the manager will review it as your requested lease start.</p>
                        </div>
                        <div>
                          <label className="rg-label" htmlFor="requested-move-out">Requested lease end</label>
                          <div className="rg-input-wrap">
                            <Globe2 className="rg-input-icon" />
                            <input
                              id="requested-move-out"
                              className="rg-input"
                              type="date"
                              min={requestedMoveInDate || undefined}
                              value={requestedMoveOutDate}
                              onChange={(event) => setRequestedMoveOutDate(event.target.value)}
                              onBlur={() => markTouched("requestedMoveOutDate")}
                            />
                          </div>
                          <p className="rg-help">Optional. Leave blank if you do not know your requested lease end yet.</p>
                        </div>
                      </div>

                      <div className="rg-row rg-row--split">
                        <div>
                          <label className="rg-label" htmlFor="employer-name">Employer name</label>
                          <div className="rg-input-wrap">
                            <Building2 className="rg-input-icon" />
                            <input id="employer-name" className="rg-input" value={employerName} onChange={(event) => setEmployerName(event.target.value)} placeholder="Employer / company" />
                          </div>
                        </div>
                        <div>
                          <label className="rg-label" htmlFor="employer-phone">Employer phone</label>
                          <div className="rg-input-wrap">
                            <Building2 className="rg-input-icon" />
                            <input id="employer-phone" className="rg-input" type="tel" value={employerPhone} onChange={(event) => setEmployerPhone(event.target.value)} placeholder="Work contact number" />
                          </div>
                        </div>
                      </div>

                      <div className="rg-row rg-row--split">
                        <div>
                          <label className="rg-label" htmlFor="next-of-kin-name">Next of kin</label>
                          <div className="rg-input-wrap">
                            <User className="rg-input-icon" />
                            <input id="next-of-kin-name" className="rg-input" value={nextOfKinName} onChange={(event) => setNextOfKinName(event.target.value)} placeholder="Full name" />
                          </div>
                        </div>
                        <div>
                          <label className="rg-label" htmlFor="next-of-kin-phone">Next of kin phone</label>
                          <div className="rg-input-wrap">
                            <User className="rg-input-icon" />
                            <input id="next-of-kin-phone" className="rg-input" type="tel" value={nextOfKinPhone} onChange={(event) => setNextOfKinPhone(event.target.value)} placeholder="Contact number" />
                          </div>
                        </div>
                      </div>

                      {touched.requestedMoveOutDate && !requestedEndValid && (
                        <p className="rg-help rg-help--error" role="alert"><AlertCircle />Requested lease end must be on or after the requested start.</p>
                      )}
                    </>
                  )}
                </fieldset>
              )}

              {/* STEP 3 — security */}
              {step === 3 && (
                <fieldset className="rg-fieldset">
                  <legend className="rg-sr">Security</legend>

                  <div>
                    <label className="rg-label" htmlFor="new-password">
                      Create a password
                    </label>
                    <div className="rg-input-wrap">
                      <Lock className="rg-input-icon" />
                      <input
                        id="new-password"
                        name="new-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        onBlur={() => markTouched("password")}
                        placeholder="At least 8 characters"
                        aria-describedby="password-checklist"
                        className={`rg-input rg-input--action${
                          touched.password && !passwordValid
                            ? " rg-input--invalid"
                            : passwordValid
                            ? " rg-input--valid"
                            : ""
                        }`}
                      />
                      <button
                        type="button"
                        className="rg-reveal"
                        onClick={() => setShowPassword((value) => !value)}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        aria-pressed={showPassword}
                      >
                        {showPassword ? <EyeOff /> : <Eye />}
                      </button>
                    </div>

                    <div
                      className="rg-meter"
                      aria-hidden="true"
                    >
                      {PASSWORD_RULES.map((rule, index) => {
                        const tone =
                          passwordScore >= 4
                            ? "rg-meter__seg--on-strong"
                            : passwordScore >= 3
                            ? "rg-meter__seg--on-mid"
                            : "rg-meter__seg--on-weak";
                        return (
                          <span
                            key={rule.id}
                            className={`rg-meter__seg${
                              index < passwordScore ? ` ${tone}` : ""
                            }`}
                          />
                        );
                      })}
                    </div>

                    <ul className="rg-checklist" id="password-checklist">
                      {passwordChecks.map((rule) => (
                        <li
                          key={rule.id}
                          className={rule.met ? "rg-met" : undefined}
                        >
                          <span className="rg-tick">
                            <Check />
                          </span>
                          {rule.label}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <label className="rg-terms">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(event) =>
                        setAcceptedTerms(event.target.checked)
                      }
                    />
                    <span>
                      I agree to the{" "}
                      <a
                        href="/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Terms of Service
                      </a>{" "}
                      and{" "}
                      <a
                        href="/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Privacy Policy
                      </a>
                      . They open in a new tab so you keep your progress.
                    </span>
                  </label>
                </fieldset>
              )}

              {error && (
                <div className="rg-alert rg-alert--error" role="alert">
                  <AlertCircle />
                  {error}
                </div>
              )}

              {success && (
                <div className="rg-alert rg-alert--success" role="status">
                  <CheckCircle2 />
                  {success}
                </div>
              )}

              <div className="rg-actions">
                {step > 1 && (
                  <button
                    type="button"
                    className="rg-btn rg-btn--back"
                    onClick={goBack}
                  >
                    <ArrowLeft />
                    Back
                  </button>
                )}

                {step < 3 ? (
                  <button
                    type="button"
                    className="rg-btn rg-btn--primary"
                    onClick={goNext}
                    disabled={!stepValid[step]}
                  >
                    Continue
                    <ArrowRight />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="rg-btn rg-btn--primary"
                    disabled={!canSubmit}
                  >
                    {loading ? (
                      <>
                        <span className="rg-btn__spinner" aria-hidden="true" />
                        Creating account…
                      </>
                    ) : (
                      <>
                        Create account
                        <ArrowRight />
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>

            <p className="rg-card__foot">
              Already have an account?{" "}
              <button type="button" onClick={() => navigate("/login")}>
                Sign in
              </button>
            </p>

            <p className="rg-secure">
              <ShieldCheck />
              Secured with 256-bit encryption
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default RegisterPage;
