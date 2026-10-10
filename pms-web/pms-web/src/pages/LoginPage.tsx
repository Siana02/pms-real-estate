import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Fingerprint,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { ApiError, apiRequest, API_BASE } from "../services/api";

/* ------------------------------------------------------------------ */
/*  STYLES — vanilla CSS                                               */
/* ------------------------------------------------------------------ */

const styles = `
:root {
  --lg-bg: #030712;
  --lg-surface: rgba(15, 23, 42, 0.55);
  --lg-glass: rgba(255, 255, 255, 0.05);
  --lg-glass-strong: rgba(255, 255, 255, 0.1);
  --lg-border: rgba(255, 255, 255, 0.1);
  --lg-border-soft: rgba(255, 255, 255, 0.06);
  --lg-text: #f8fafc;
  --lg-muted: #94a3b8;
  --lg-faint: #64748b;
  --lg-blue: #3b82f6;
  --lg-blue-strong: #2563eb;
  --lg-indigo: #4f46e5;
  --lg-danger: #f87171;
  --lg-success: #4ade80;
  --lg-radius-sm: 0.75rem;
  --lg-radius-md: 1rem;
  --lg-radius-lg: 1.5rem;
  --lg-shadow: 0 30px 60px -20px rgba(0, 0, 0, 0.75);
  --lg-shadow-blue: 0 10px 25px -5px rgba(59, 130, 246, 0.3);
  --lg-font: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Inter, Roboto,
    "Helvetica Neue", Arial, sans-serif;
}

/* ---------- base ---------- */
.lg-root,
.lg-root * {
  box-sizing: border-box;
}

.lg-root {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  overflow-x: hidden;
  background: var(--lg-bg);
  color: var(--lg-text);
  font-family: var(--lg-font);
  letter-spacing: -0.015em;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.lg-root a {
  color: inherit;
  text-decoration: none;
}

.lg-root button {
  font-family: inherit;
  color: inherit;
  border: none;
  background: none;
  cursor: pointer;
}

.lg-root input {
  font-family: inherit;
  font-size: 1rem;
}

/* ---------- soft gradient background + orbs ---------- */
.lg-backdrop {
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  background: radial-gradient(
      120% 100% at 50% 0%,
      rgba(30, 41, 59, 0.9) 0%,
      var(--lg-bg) 60%
    ),
    var(--lg-bg);
}

.lg-orb {
  position: absolute;
  border-radius: 9999px;
  filter: blur(96px);
  will-change: transform, opacity;
}

.lg-orb--indigo {
  top: -10rem;
  left: -8rem;
  width: 26rem;
  height: 26rem;
  background: rgba(79, 70, 229, 0.22);
  animation: lg-float 18s ease-in-out infinite,
    lg-glow 8s ease-in-out infinite;
}

.lg-orb--blue {
  bottom: -12rem;
  right: -8rem;
  width: 30rem;
  height: 30rem;
  background: rgba(37, 99, 235, 0.18);
  animation: lg-float 22s ease-in-out infinite reverse,
    lg-glow 10s ease-in-out 1.4s infinite;
}

.lg-orb--purple {
  top: 30%;
  left: 45%;
  width: 24rem;
  height: 24rem;
  background: rgba(147, 51, 234, 0.16);
  animation: lg-float 26s ease-in-out 2s infinite,
    lg-glow 12s ease-in-out 2.6s infinite;
}

@keyframes lg-float {
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

@keyframes lg-glow {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

/* ---------- shell (mobile-first: single centered column) ---------- */
.lg-shell {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
}

.lg-brandpane {
  display: none;
}

.lg-formpane {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 2rem 1rem;
}

.lg-card {
  width: 100%;
  max-width: 26rem;
  padding: 1.75rem 1.5rem;
  border-radius: var(--lg-radius-lg);
  border: 1px solid var(--lg-border);
  background: var(--lg-surface);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  box-shadow: var(--lg-shadow);
}

/* ---------- card header ---------- */
.lg-card__head {
  text-align: center;
  margin-bottom: 1.75rem;
}

.lg-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: var(--lg-radius-md);
  border: 1px solid var(--lg-border);
  background: linear-gradient(
    145deg,
    rgba(59, 130, 246, 0.25),
    rgba(79, 70, 229, 0.15)
  );
  color: #93c5fd;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.lg-wordmark {
  margin: 0.75rem 0 0;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--lg-faint);
}

.lg-title {
  margin: 0.5rem 0 0;
  font-size: 1.625rem;
  font-weight: 600;
  letter-spacing: -0.03em;
  color: #fff;
}

.lg-subtitle {
  margin: 0.5rem auto 0;
  max-width: 22rem;
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--lg-muted);
}

/* ---------- SSO first ---------- */
.lg-sso {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.625rem;
}

.lg-sso__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.625rem;
  width: 100%;
  min-height: 3rem;
  padding: 0.75rem 1rem;
  border-radius: var(--lg-radius-sm);
  border: 1px solid var(--lg-border);
  background: var(--lg-glass);
  backdrop-filter: blur(12px);
  font-size: 0.9375rem;
  font-weight: 500;
  color: #e2e8f0;
  transition: background-color 0.25s ease, border-color 0.25s ease,
    transform 0.25s ease;
}

.lg-sso__btn:hover {
  border-color: rgba(255, 255, 255, 0.22);
  background: var(--lg-glass-strong);
  transform: translateY(-1px);
}

.lg-sso__btn:active {
  transform: translateY(0);
}

.lg-sso__icon {
  width: 1.25rem;
  height: 1.25rem;
  flex: none;
}

.lg-passkey {
  margin-top: 0.625rem;
  color: #bfdbfe;
  border-color: rgba(59, 130, 246, 0.35);
  background: rgba(59, 130, 246, 0.1);
}

.lg-passkey:hover {
  border-color: rgba(59, 130, 246, 0.55);
  background: rgba(59, 130, 246, 0.16);
}

/* ---------- divider ---------- */
.lg-divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1.5rem 0;
}

.lg-divider::before,
.lg-divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--lg-border);
}

.lg-divider span {
  font-size: 0.6875rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--lg-faint);
}

/* ---------- form ---------- */
.lg-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.lg-field__top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.lg-label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #cbd5e1;
}

.lg-field__top .lg-label {
  margin-bottom: 0;
}

.lg-recover {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #60a5fa;
  border-radius: 0.375rem;
  transition: color 0.25s ease;
}

.lg-recover:hover {
  color: #93c5fd;
  text-decoration: underline;
}

.lg-input-wrap {
  position: relative;
}

.lg-input-icon {
  position: absolute;
  top: 50%;
  left: 1rem;
  width: 1.125rem;
  height: 1.125rem;
  transform: translateY(-50%);
  color: var(--lg-faint);
  pointer-events: none;
  transition: color 0.25s ease;
}

.lg-input {
  width: 100%;
  min-height: 3.25rem;
  padding: 0.9375rem 1rem 0.9375rem 2.875rem;
  border-radius: var(--lg-radius-sm);
  border: 1px solid var(--lg-border);
  background: var(--lg-glass);
  color: #fff;
  outline: none;
  transition: border-color 0.25s ease, box-shadow 0.25s ease,
    background-color 0.25s ease;
}

.lg-input--action {
  padding-right: 3.25rem;
}

.lg-input::placeholder {
  color: var(--lg-faint);
}

.lg-input:hover {
  border-color: rgba(255, 255, 255, 0.18);
}

.lg-input:focus,
.lg-input:focus-visible {
  border-color: var(--lg-blue);
  background: rgba(59, 130, 246, 0.08);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.35);
}

.lg-input-wrap:focus-within .lg-input-icon {
  color: #93c5fd;
}

.lg-input--invalid {
  border-color: rgba(248, 113, 113, 0.7);
}

.lg-input--invalid:focus {
  border-color: var(--lg-danger);
  background: rgba(248, 113, 113, 0.08);
  box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.3);
}

.lg-reveal {
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
  color: var(--lg-muted);
  transition: color 0.25s ease, background-color 0.25s ease;
}

.lg-reveal:hover {
  color: #fff;
  background: var(--lg-glass);
}

.lg-reveal svg {
  width: 1.125rem;
  height: 1.125rem;
}

/* ---------- inline validation ---------- */
.lg-hint {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin: 0.5rem 0 0;
  font-size: 0.8125rem;
  color: var(--lg-danger);
  animation: lg-slide-in 0.2s ease-out;
}

.lg-hint svg {
  width: 0.875rem;
  height: 0.875rem;
  flex: none;
}

@keyframes lg-slide-in {
  from {
    opacity: 0;
    transform: translateY(-3px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ---------- remember me ---------- */
.lg-remember {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  font-size: 0.875rem;
  color: #cbd5e1;
  cursor: pointer;
  user-select: none;
}

.lg-remember input {
  width: 1.125rem;
  height: 1.125rem;
  accent-color: var(--lg-blue-strong);
  cursor: pointer;
}

.lg-remember input:focus-visible {
  outline: 2px solid var(--lg-blue);
  outline-offset: 2px;
}

/* ---------- submit ---------- */
.lg-submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  min-height: 3.25rem;
  padding: 0.9375rem 1.5rem;
  border-radius: var(--lg-radius-sm);
  font-size: 0.9375rem;
  font-weight: 600;
  color: #fff;
  background-image: linear-gradient(
    to right,
    var(--lg-blue-strong),
    var(--lg-indigo)
  );
  box-shadow: var(--lg-shadow-blue);
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.lg-submit:hover {
  opacity: 0.92;
  transform: translateY(-2px);
}

.lg-submit:active {
  transform: translateY(0);
}

.lg-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.lg-submit svg {
  width: 1.0625rem;
  height: 1.0625rem;
  transition: transform 0.25s ease;
}

.lg-submit:hover svg {
  transform: translateX(2px);
}

.lg-spinner {
  width: 1.0625rem;
  height: 1.0625rem;
  border-radius: 9999px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  animation: lg-spin 0.7s linear infinite;
}

@keyframes lg-spin {
  to {
    transform: rotate(360deg);
  }
}

/* ---------- alerts ---------- */
.lg-alert {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: var(--lg-radius-sm);
  font-size: 0.875rem;
  line-height: 1.5;
  animation: lg-slide-in 0.2s ease-out;
}

.lg-alert svg {
  width: 1rem;
  height: 1rem;
  flex: none;
  margin-top: 0.125rem;
}

.lg-alert--error {
  border: 1px solid rgba(248, 113, 113, 0.35);
  background: rgba(127, 29, 29, 0.35);
  color: #fecaca;
}

.lg-alert--success {
  border: 1px solid rgba(74, 222, 128, 0.35);
  background: rgba(20, 83, 45, 0.35);
  color: #bbf7d0;
}

/* ---------- footers ---------- */
.lg-card__foot {
  margin: 1.5rem 0 0;
  text-align: center;
  font-size: 0.875rem;
  color: var(--lg-muted);
}

.lg-card__foot button {
  font-weight: 600;
  color: #60a5fa;
  border-radius: 0.375rem;
  transition: color 0.25s ease;
}

.lg-card__foot button:hover {
  color: #93c5fd;
  text-decoration: underline;
}

.lg-secure {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  margin: 1.25rem 0 0;
  font-size: 0.75rem;
  color: var(--lg-faint);
}

.lg-secure svg {
  width: 0.875rem;
  height: 0.875rem;
}
.lg-legal { display:flex; justify-content:center; gap:1rem; margin:1rem 0 0; font-size:.75rem; color:var(--lg-muted); }
.lg-legal a:hover { color:#fff; text-decoration:underline; }

/* ---------- keyboard focus visibility ---------- */
.lg-root a:focus-visible,
.lg-root button:focus-visible {
  outline: 2px solid var(--lg-blue);
  outline-offset: 2px;
}

.lg-root :focus:not(:focus-visible) {
  outline: none;
}

/* ---------- tablet ---------- */
@media (min-width: 640px) {
  .lg-formpane {
    padding: 3rem 2rem;
  }

  .lg-card {
    max-width: 30rem;
    padding: 2.5rem;
  }

  .lg-title {
    font-size: 1.875rem;
  }

  .lg-sso {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .lg-sso__btn {
    gap: 0.5rem;
    padding: 0.75rem 0.5rem;
    font-size: 0.875rem;
  }

  .lg-passkey {
    grid-column: 1 / -1;
  }
}

/* ---------- desktop: split screen ---------- */
@media (min-width: 1024px) {
  .lg-shell {
    display: grid;
    grid-template-columns: 1.05fr 1fr;
  }

  .lg-brandpane {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 3.5rem;
    border-right: 1px solid var(--lg-border-soft);
    overflow: hidden;
  }

  .lg-brand {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    font-size: 1.0625rem;
    font-weight: 600;
    color: #fff;
  }

  .lg-brand__mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: var(--lg-radius-sm);
    border: 1px solid var(--lg-border);
    background: var(--lg-glass);
    color: #60a5fa;
  }

  .lg-brand__dot {
    color: var(--lg-blue);
  }

  .lg-pitch {
    max-width: 30rem;
  }

  .lg-pitch__badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.875rem;
    border-radius: 9999px;
    border: 1px solid var(--lg-border);
    background: var(--lg-glass);
    backdrop-filter: blur(12px);
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: #cbd5e1;
  }

  .lg-pitch__badge svg {
    width: 0.875rem;
    height: 0.875rem;
    color: #60a5fa;
  }

  .lg-pitch__title {
    margin: 1.5rem 0 0;
    font-size: 2.75rem;
    font-weight: 600;
    line-height: 1.1;
    letter-spacing: -0.035em;
    background-image: linear-gradient(to right, #ffffff, #e2e8f0, #94a3b8);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    -webkit-text-fill-color: transparent;
  }

  .lg-pitch__text {
    margin: 1.25rem 0 0;
    font-size: 1rem;
    line-height: 1.75;
    color: var(--lg-muted);
  }

  .lg-stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.75rem;
    margin-top: 2.5rem;
  }

  .lg-stat {
    padding: 0.875rem 1rem;
    border-radius: var(--lg-radius-md);
    border: 1px solid var(--lg-border-soft);
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(12px);
  }

  .lg-stat svg {
    width: 1rem;
    height: 1rem;
    color: #60a5fa;
  }

  .lg-stat__value {
    margin: 0.5rem 0 0;
    font-size: 1.0625rem;
    font-weight: 600;
    color: #fff;
  }

  .lg-stat__label {
    margin: 0.125rem 0 0;
    font-size: 0.75rem;
    color: var(--lg-faint);
  }

  .lg-quote {
    max-width: 30rem;
    font-size: 0.875rem;
    line-height: 1.7;
    color: var(--lg-faint);
  }

  .lg-quote strong {
    display: block;
    margin-top: 0.5rem;
    font-weight: 600;
    color: #cbd5e1;
  }

  .lg-formpane {
    padding: 3rem 3.5rem;
  }

  .lg-card {
    max-width: 27rem;
    padding: 2.5rem;
  }

  .lg-card__head {
    text-align: left;
  }

  .lg-subtitle {
    margin-left: 0;
  }
}

@media (min-width: 1280px) {
  .lg-brandpane {
    padding: 4rem;
  }

  .lg-pitch__title {
    font-size: 3.25rem;
  }

  .lg-formpane {
    padding: 3rem 5rem;
  }

  .lg-card {
    max-width: 28rem;
  }
}

/* ---------- reduced motion ---------- */
@media (prefers-reduced-motion: reduce) {
  .lg-orb {
    animation: none;
  }

  .lg-root *,
  .lg-root *::before,
  .lg-root *::after {
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
    <svg viewBox="0 0 24 24" className="lg-sso__icon" aria-hidden="true">
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


/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */

function validateLogin(value: string): string {
  if (!value.trim()) return "Username or email is required.";
  return "";
}

function validatePassword(value: string): string {
  if (!value) return "Password is required.";
  if (value.length < 8) return "Password must be at least 8 characters.";
  return "";
}

const STATS = [
  { icon: TrendingUp, value: "KSh 10B+", label: "Assets managed" },
  { icon: ShieldCheck, value: "99.9%", label: "Platform up-time" },
  { icon: Building2, value: "12,000+", label: "Units on-boarded" },
];

function decodeBase64Url(value: string): ArrayBuffer {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0)).buffer;
}

function encodeBase64Url(value: ArrayBuffer): string {
  const bytes = new Uint8Array(value);
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/* ------------------------------------------------------------------ */
/*  COMPONENT                                                          */
/* ------------------------------------------------------------------ */

function LoginPage() {
  // Reuse the in-flight exchange when React StrictMode replays this effect.
  const oauthExchangePromise = useRef<Promise<unknown> | null>(null);
  const navigate = useNavigate();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [loginError, setLoginError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loginTouched, setLoginTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);

  async function handlePasskeyLogin() {
    if (passkeyLoading) return;

    setError("");
    setMessage("");
    setPasskeyLoading(true);

    try {
      if (!window.PublicKeyCredential) {
        throw new Error("Passkeys are not supported by this browser.");
      }

      const backendOrigin = API_BASE.trim().replace(/\/+$/, "").replace(/\/api$/i, "");
      const optionsResponse = await fetch(`${backendOrigin}/passkeys/login/options`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ remember }),
      });
      const optionsPayload = await optionsResponse.json();
      if (!optionsResponse.ok) {
        throw new Error(optionsPayload.message ?? "Could not start passkey sign-in.");
      }

      const requestOptions = optionsPayload.publicKey ?? optionsPayload;
      const credential = await navigator.credentials.get({
        publicKey: {
          ...requestOptions,
          challenge: decodeBase64Url(requestOptions.challenge),
          allowCredentials: requestOptions.allowCredentials?.map(
            (item: { id: string; type: PublicKeyCredentialType; transports?: AuthenticatorTransport[] }) => ({
              ...item,
              id: decodeBase64Url(item.id),
            })
          ),
        },
      }) as PublicKeyCredential | null;

      if (!credential) throw new Error("Passkey sign-in was cancelled.");

      const assertion = credential.response as AuthenticatorAssertionResponse;
      const verifyResponse = await fetch(`${backendOrigin}/passkeys/login`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          id: credential.id,
          rawId: encodeBase64Url(credential.rawId),
          type: credential.type,
          response: {
            clientDataJSON: encodeBase64Url(assertion.clientDataJSON),
            authenticatorData: encodeBase64Url(assertion.authenticatorData),
            signature: encodeBase64Url(assertion.signature),
            userHandle: assertion.userHandle ? encodeBase64Url(assertion.userHandle) : null,
          },
          clientExtensionResults: credential.getClientExtensionResults(),
          remember,
        }),
      });
      const response = (await verifyResponse.json()) as {
        token?: string;
        organization?: unknown;
        user?: { role?: string; must_change_password?: boolean };
      };

      if (!verifyResponse.ok) {
        throw new Error((response as { message?: string }).message ?? "Passkey verification failed.");
      }

      if (!response?.token || !response.user) {
        throw new Error("Passkey authentication completed without a valid application session.");
      }

      const store = remember ? localStorage : sessionStorage;
      store.setItem("token", response.token);
      store.setItem("user", JSON.stringify(response.user));

      if (response.organization) {
        store.setItem("organization", JSON.stringify(response.organization));
      }

      const role = (response.user.role ?? "").toString().trim().toLowerCase();
      const redirectPath =
        response.user.must_change_password === true
          ? "/password-setup"
          : role === "tenant"
          ? "/tenant/dashboard"
          : "/manager/dashboard";

      window.location.href = redirectPath;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Passkey sign-in was not completed. Try your password instead."
      );
    } finally {
      setPasskeyLoading(false);
    }
  }

  function startOAuth(provider: "google") {
    const backendOrigin = API_BASE.replace(/\/api$/, "");
    window.location.href = `${backendOrigin}/auth/${provider}/redirect?mode=login`;
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("oauth_error");
    const oauthCode = params.get("oauth_code");

    if (oauthError) {
      setError(oauthError);
      window.history.replaceState({}, "", "/login");
      return;
    }

    if (!oauthCode) return;

    let cancelled = false;
    if (!oauthExchangePromise.current) {
      oauthExchangePromise.current = apiRequest("/oauth/exchange", {
        method: "POST",
        body: JSON.stringify({ code: oauthCode }),
      });
    }

    oauthExchangePromise.current
      .then((payload) => {
        if (cancelled) return;
        const data = payload as {
          token: string;
          organization?: unknown;
          user?: { role?: string; must_change_password?: boolean };
        };
        const store = remember ? localStorage : sessionStorage;
        store.setItem("token", data.token);
        store.setItem("user", JSON.stringify(data.user));

        if (data.organization) {
          store.setItem("organization", JSON.stringify(data.organization));
        }

        const role = (data.user?.role ?? "").toString().trim().toLowerCase();
        window.history.replaceState({}, "", "/login");
        window.location.href =
          data.user?.must_change_password === true
            ? "/password-setup"
            : role === "tenant"
            ? "/tenant/dashboard"
            : "/manager/dashboard";
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "OAuth sign-in could not be completed.");
          window.history.replaceState({}, "", "/login");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function handleLoginChange(value: string) {
    setLogin(value);
    if (loginTouched) setLoginError(validateLogin(value));
  }

  function handlePasswordChange(value: string) {
    setPassword(value);
    if (passwordTouched) setPasswordError(validatePassword(value));
  }

 async function handleLogin(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  const nextLoginError = validateLogin(login);
  const nextPasswordError = validatePassword(password);

  setLoginTouched(true);
  setPasswordTouched(true);
  setLoginError(nextLoginError);
  setPasswordError(nextPasswordError);

  if (nextLoginError || nextPasswordError) return;

  setMessage("");
  setError("");
  setLoading(true);

  try {
    const data = (await apiRequest("/login", {
      method: "POST",
      body: JSON.stringify({
        login: login.trim(),
        password,
      }),
    })) as {
      token: string;
      organization?: unknown;
      user?: {
        role?: string;
        must_change_password?: boolean;
      };
    };

    const store = remember ? localStorage : sessionStorage;

    store.setItem("token", data.token);
    store.setItem("user", JSON.stringify(data.user));

    if (data.organization) {
      store.setItem(
        "organization",
        JSON.stringify(data.organization)
      );
    }

    const role = (data.user?.role ?? "")
      .toString()
      .trim()
      .toLowerCase();

    const isTenant = role === "tenant";
    const needsPasswordChange = data.user?.must_change_password === true;

    const redirectPath = needsPasswordChange
      ? "/password-setup"
      : isTenant
      ? "/tenant/dashboard"
      : "/manager/dashboard";

    setMessage(
      needsPasswordChange
        ? "Login successful — please set a permanent password."
        : isTenant
        ? "Login successful — taking you to your tenant portal."
        : "Login successful — taking you to your manager dashboard."
    );

    setTimeout(() => {
      window.location.href = redirectPath;
    }, 1500);
  } catch (err) {
    setError(
      err instanceof ApiError
        ? err.message
        : err instanceof Error
        ? err.message
        : "Something went wrong while logging in."
    );
  } finally {
    setLoading(false);
  }
}

  return (
    <main className="lg-root">
      <style>{styles}</style>

      <div className="lg-backdrop" aria-hidden="true">
        <div className="lg-orb lg-orb--indigo" />
        <div className="lg-orb lg-orb--blue" />
        <div className="lg-orb lg-orb--purple" />
      </div>

      <div className="lg-shell">
        {/* Brand visual — desktop only */}
        <aside className="lg-brandpane">
          <div className="lg-brand">
            <span className="lg-brand__mark">
              <Building2 size={20} />
            </span>
            <span>
              PMS<span className="lg-brand__dot">.</span>
            </span>
          </div>

          <div className="lg-pitch">
            <span className="lg-pitch__badge">
              <Sparkles />
              Property management, elevated
            </span>

            <h2 className="lg-pitch__title">
              One workspace for every property you own.
            </h2>

            <p className="lg-pitch__text">
              Leases, tenants, payments, expenses and maintenance — reconciled
              in real time, so your portfolio reports itself.
            </p>

            <div className="lg-stats">
              {STATS.map(({ icon: Icon, value, label }) => (
                <div className="lg-stat" key={label}>
                  <Icon />
                  <p className="lg-stat__value">{value}</p>
                  <p className="lg-stat__label">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="lg-quote">
            “We closed our month-end in two hours instead of two days.”
            <strong>Amina W. — Head of Operations, Nairobi</strong>
          </p>
        </aside>

        {/* Login form */}
        <section className="lg-formpane">
          <div className="lg-card">
            <div className="lg-card__head">
              <span className="lg-logo">
                <Building2 size={24} />
              </span>
              <p className="lg-wordmark">PMS</p>
              <h1 className="lg-title">Welcome back</h1>
              <p className="lg-subtitle">
                Sign in to manage your properties and organization.
              </p>
            </div>

            {/* Passwordless / SSO first */}
            <button type="button" className="lg-sso__btn lg-passkey" onClick={() => void handlePasskeyLogin()} disabled={passkeyLoading}>
              <Fingerprint className="lg-sso__icon" />
              <span>{passkeyLoading ? "Authenticating…" : "Continue with a passkey"}</span>
            </button>

            <div className="lg-divider">
              <span>or use a provider</span>
            </div>

            <div className="lg-sso">
              <button
                type="button"
                className="lg-sso__btn"
                aria-label="Continue with Google"
                onClick={() => startOAuth("google")}
              >
                <GoogleIcon />
                <span>Google</span>
              </button>
            </div>

            <div className="lg-divider">
              <span>or sign in with email or username</span>
            </div>

            <form className="lg-form" onSubmit={handleLogin} noValidate>
              <div>
  <label className="lg-label" htmlFor="login">
    Username or email
  </label>

  <div className="lg-input-wrap">
    <Mail className="lg-input-icon" />

    <input
      id="login"
      name="login"
      type="text"
      autoComplete="username"
      autoCapitalize="none"
      spellCheck={false}
      value={login}
      onChange={(event) => handleLoginChange(event.target.value)}
      onBlur={() => {
        setLoginTouched(true);
        setLoginError(validateLogin(login));
      }}
      placeholder="Username or email"
      aria-invalid={Boolean(loginError)}
      aria-describedby={loginError ? "login-error" : undefined}
      className={`lg-input${
        loginError ? " lg-input--invalid" : ""
      }`}
    />
  </div>

  {loginError && (
    <p className="lg-hint" id="login-error" role="alert">
      <AlertCircle />
      {loginError}
    </p>
  )}
</div>

              <div>
                <div className="lg-field__top">
                  <label className="lg-label" htmlFor="password">
                    Password
                  </label>
                  <a className="lg-recover" href="/forgot-password">
                    Forgot password?
                  </a>
                </div>
                <div className="lg-input-wrap">
                  <Lock className="lg-input-icon" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) =>
                      handlePasswordChange(event.target.value)
                    }
                    onBlur={() => {
                      setPasswordTouched(true);
                      setPasswordError(validatePassword(password));
                    }}
                    placeholder="Enter your password"
                    aria-invalid={Boolean(passwordError)}
                    aria-describedby={
                      passwordError ? "password-error" : undefined
                    }
                    className={`lg-input lg-input--action${
                      passwordError ? " lg-input--invalid" : ""
                    }`}
                  />
                  <button
                    type="button"
                    className="lg-reveal"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>
                {passwordError && (
                  <p className="lg-hint" id="password-error" role="alert">
                    <AlertCircle />
                    {passwordError}
                  </p>
                )}
              </div>

              <label className="lg-remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                />
                Keep me signed in on this device
              </label>

              {error && (
                <div className="lg-alert lg-alert--error" role="alert">
                  <AlertCircle />
                  {error}
                </div>
              )}

              {message && (
                <div className="lg-alert lg-alert--success" role="status">
                  <CheckCircle2 />
                  {message}
                </div>
              )}

              <button type="submit" className="lg-submit" disabled={loading}>
                {loading ? (
                  <>
                    <span className="lg-spinner" aria-hidden="true" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight />
                  </>
                )}
              </button>
            </form>

            <p className="lg-card__foot">
              Don&apos;t have an account?{" "}
              <button type="button" onClick={() => navigate("/register")}>
                Create an account
              </button>
            </p>

            <p className="lg-secure">
              <ShieldCheck />
              Secured with 256-bit encryption
            </p>
            <nav className="lg-legal" aria-label="Legal information">
              <a href="/terms">Terms of Service</a>
              <a href="/privacy">Privacy Policy</a>
              <a href="/help">Help Centre</a>
            </nav>
          </div>
        </section>
      </div>
    </main>
  );
}

export default LoginPage;
