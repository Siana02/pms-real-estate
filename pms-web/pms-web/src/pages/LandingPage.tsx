import { useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  Key,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  STYLES — vanilla CSS                                               */
/* ------------------------------------------------------------------ */

const styles = `
:root {
  --pms-bg: #030712;
  --pms-surface: rgba(15, 23, 42, 0.4);
  --pms-glass: rgba(255, 255, 255, 0.05);
  --pms-glass-strong: rgba(255, 255, 255, 0.1);
  --pms-border: rgba(255, 255, 255, 0.1);
  --pms-border-soft: rgba(255, 255, 255, 0.06);
  --pms-text: #f1f5f9;
  --pms-muted: #94a3b8;
  --pms-faint: #64748b;
  --pms-blue: #3b82f6;
  --pms-blue-strong: #2563eb;
  --pms-indigo: #4f46e5;
  --pms-radius-sm: 0.75rem;
  --pms-radius-md: 1rem;
  --pms-radius-lg: 1.5rem;
  --pms-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
  --pms-shadow-blue: 0 10px 25px -5px rgba(59, 130, 246, 0.25);
  --pms-font: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Inter,
    Roboto, "Helvetica Neue", Arial, sans-serif;
}

/* ---------- base ---------- */
.pms-root,
.pms-root * {
  box-sizing: border-box;
}

.pms-root {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background: var(--pms-bg);
  color: var(--pms-text);
  font-family: var(--pms-font);
  letter-spacing: -0.02em;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.pms-root a {
  text-decoration: none;
  color: inherit;
}

.pms-root button {
  font-family: inherit;
  cursor: pointer;
  border: none;
  background: none;
  color: inherit;
}

.pms-root input {
  font-family: inherit;
}

/* ---------- animated background mesh ---------- */
.pms-mesh {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.pms-orb {
  position: absolute;
  border-radius: 9999px;
  filter: blur(96px);
  will-change: transform, opacity;
}

.pms-orb--indigo {
  top: -8rem;
  left: -10rem;
  width: 28rem;
  height: 28rem;
  background: rgba(79, 70, 229, 0.2);
  animation: pms-float 16s ease-in-out infinite,
    pms-glow 7s ease-in-out infinite;
}

.pms-orb--blue {
  top: 6rem;
  right: -10rem;
  width: 32rem;
  height: 32rem;
  background: rgba(37, 99, 235, 0.15);
  animation: pms-float 20s ease-in-out infinite reverse,
    pms-glow 9s ease-in-out 1.2s infinite;
}

.pms-orb--purple {
  bottom: -14rem;
  left: 32%;
  width: 30rem;
  height: 30rem;
  background: rgba(147, 51, 234, 0.2);
  animation: pms-float 24s ease-in-out 2s infinite,
    pms-glow 11s ease-in-out 2.4s infinite;
}

.pms-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at top,
    rgba(15, 23, 42, 0) 0%,
    var(--pms-bg) 75%
  );
}

@keyframes pms-float {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(1);
  }
  33% {
    transform: translate3d(3rem, -2rem, 0) scale(1.08);
  }
  66% {
    transform: translate3d(-2rem, 2.5rem, 0) scale(0.95);
  }
}

@keyframes pms-glow {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.55;
  }
}

/* ---------- layout ---------- */
.pms-nav,
.pms-hero {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 80rem;
  margin: 0 auto;
  padding-left: 1rem;
  padding-right: 1rem;
}

.pms-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 1.5rem;
  padding-bottom: 1.5rem;
  z-index: 20;
}

.pms-hero {
  padding-top: 2rem;
  padding-bottom: 2rem;
}

.pms-grid {
  display: block;
  width: 100%;
  margin: 0 auto;
}

.pms-col + .pms-col {
  margin-top: 3rem;
}

/* ---------- brand ---------- */
.pms-brand {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.pms-brand__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: var(--pms-radius-sm);
  border: 1px solid var(--pms-border);
  background: var(--pms-glass);
  color: #60a5fa;
  backdrop-filter: blur(12px);
}

.pms-brand__name {
  font-size: 1.125rem;
  font-weight: 600;
  color: #fff;
}

.pms-brand__dot {
  color: var(--pms-blue);
}

.pms-nav__actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.pms-nav__link {
  display: none;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--pms-muted);
  transition: color 0.3s ease;
}

.pms-nav__link:hover {
  color: #fff;
}

/* ---------- buttons ---------- */
.pms-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: var(--pms-radius-sm);
  font-size: 0.875rem;
  font-weight: 600;
  transition: transform 0.3s ease, opacity 0.3s ease, background-color 0.3s ease,
    border-color 0.3s ease, color 0.3s ease;
}

.pms-btn--ghost {
  padding: 0.5rem 1rem;
  border: 1px solid var(--pms-border);
  background: var(--pms-glass);
  color: #e2e8f0;
  backdrop-filter: blur(12px);
}

.pms-btn--ghost:hover {
  border-color: rgba(255, 255, 255, 0.2);
  background: var(--pms-glass-strong);
}

.pms-btn--primary {
  padding: 0.875rem 1.5rem;
  color: #fff;
  background-image: linear-gradient(
    to right,
    var(--pms-blue-strong),
    var(--pms-indigo)
  );
  box-shadow: var(--pms-shadow-blue);
}

.pms-btn--primary:hover {
  opacity: 0.9;
  transform: translateY(-2px);
}

.pms-btn--primary:active {
  transform: translateY(0);
}

.pms-btn--primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.pms-btn--secondary {
  padding: 0.875rem 1.5rem;
  border: 1px solid var(--pms-border);
  background: var(--pms-glass);
  color: #e2e8f0;
  backdrop-filter: blur(12px);
}

.pms-btn--secondary:hover {
  border-color: rgba(255, 255, 255, 0.2);
  background: var(--pms-glass-strong);
}

.pms-btn--block {
  width: 100%;
}

.pms-btn__icon {
  width: 1rem;
  height: 1rem;
  transition: transform 0.3s ease;
}

.pms-btn:hover .pms-btn__icon--arrow {
  transform: translateX(2px);
}

.pms-btn__icon--accent {
  color: #60a5fa;
}

/* ---------- left column ---------- */
.pms-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 1rem;
  border-radius: 9999px;
  border: 1px solid var(--pms-border);
  background: var(--pms-glass);
  backdrop-filter: blur(12px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.22em;
  color: #cbd5e1;
}

.pms-badge__icon {
  width: 0.875rem;
  height: 0.875rem;
  color: #60a5fa;
}

.pms-title {
  margin: 1.5rem 0 0;
  font-size: 2.25rem;
  font-weight: 600;
  line-height: 1.05;
  letter-spacing: -0.035em;
  background-image: linear-gradient(to right, #ffffff, #e2e8f0, #94a3b8);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
}

.pms-title__break {
  display: none;
}

.pms-subtitle {
  margin: 1.5rem 0 0;
  max-width: 36rem;
  font-size: 1rem;
  line-height: 1.75;
  letter-spacing: -0.01em;
  color: var(--pms-muted);
}

.pms-cta {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 2rem;
}

.pms-stats {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  margin-top: 2.5rem;
  padding-top: 2rem;
  border-top: 1px solid var(--pms-border-soft);
}

.pms-stat {
  padding: 0.75rem 1rem;
  border-radius: var(--pms-radius-md);
  border: 1px solid var(--pms-border-soft);
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(12px);
}

.pms-stat__icon {
  width: 1rem;
  height: 1rem;
  color: #60a5fa;
}

.pms-stat__value {
  margin: 0.5rem 0 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #fff;
}

.pms-stat__label {
  margin: 0.125rem 0 0;
  font-size: 0.75rem;
  color: var(--pms-faint);
}

/* ---------- sign-in card ---------- */
.pms-auth {
  position: relative;
  width: 100%;
  max-width: 28rem;
  margin: 0 auto;
}

.pms-auth__halo {
  position: absolute;
  inset: -1px;
  border-radius: var(--pms-radius-lg);
  background-image: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.15),
    transparent
  );
  filter: blur(2px);
  opacity: 0.6;
  pointer-events: none;
}

.pms-card {
  position: relative;
  padding: 1.5rem;
  border-radius: var(--pms-radius-lg);
  border: 1px solid var(--pms-border);
  background: var(--pms-surface);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  box-shadow: var(--pms-shadow);
}

.pms-card__head {
  margin-bottom: 1.75rem;
}

.pms-card__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: var(--pms-radius-md);
  border: 1px solid var(--pms-border);
  background: var(--pms-glass);
  color: #60a5fa;
}

.pms-card__title {
  margin: 1rem 0 0;
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: -0.03em;
  color: #fff;
}

.pms-card__subtitle {
  margin: 0.375rem 0 0;
  font-size: 0.875rem;
  color: var(--pms-muted);
}

.pms-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.pms-field__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.375rem;
}

.pms-label {
  display: block;
  margin-bottom: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--pms-muted);
}

.pms-field__row .pms-label {
  margin-bottom: 0;
}

.pms-link {
  font-size: 0.75rem;
  font-weight: 500;
  color: #60a5fa;
  transition: color 0.3s ease;
}

.pms-link:hover {
  color: #93c5fd;
}

.pms-input-wrap {
  position: relative;
}

.pms-input-icon {
  position: absolute;
  top: 50%;
  left: 0.875rem;
  width: 1rem;
  height: 1rem;
  transform: translateY(-50%);
  color: var(--pms-faint);
  pointer-events: none;
}

.pms-input {
  width: 100%;
  padding: 0.75rem 0.75rem 0.75rem 2.5rem;
  border-radius: var(--pms-radius-sm);
  border: 1px solid var(--pms-border);
  background: var(--pms-glass);
  color: #fff;
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.3s ease, box-shadow 0.3s ease,
    background-color 0.3s ease;
}

.pms-input--with-action {
  padding-right: 2.75rem;
}

.pms-input::placeholder {
  color: var(--pms-faint);
}

.pms-input:focus {
  border-color: var(--pms-blue);
  box-shadow: 0 0 0 1px var(--pms-blue);
}

.pms-input-action {
  position: absolute;
  top: 50%;
  right: 0.75rem;
  display: inline-flex;
  padding: 0.25rem;
  transform: translateY(-50%);
  border-radius: 0.5rem;
  color: var(--pms-faint);
  transition: color 0.3s ease;
}

.pms-input-action:hover {
  color: #cbd5e1;
}

.pms-input-action svg {
  width: 1rem;
  height: 1rem;
}

.pms-check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-top: 0.25rem;
  font-size: 0.875rem;
  color: var(--pms-muted);
  cursor: pointer;
}

.pms-check input {
  width: 1rem;
  height: 1rem;
  accent-color: var(--pms-blue-strong);
  cursor: pointer;
}

/* ---------- divider + SSO ---------- */
.pms-divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1.5rem 0;
}

.pms-divider::before,
.pms-divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--pms-border);
}

.pms-divider span {
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--pms-faint);
}

.pms-sso {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

.pms-sso__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.625rem;
  padding: 0.75rem 1rem;
  border-radius: var(--pms-radius-sm);
  border: 1px solid var(--pms-border);
  background: var(--pms-glass);
  backdrop-filter: blur(12px);
  font-size: 0.875rem;
  font-weight: 500;
  color: #e2e8f0;
  transition: background-color 0.3s ease, border-color 0.3s ease,
    transform 0.3s ease;
}

.pms-sso__btn:hover {
  border-color: rgba(255, 255, 255, 0.2);
  background: var(--pms-glass-strong);
  transform: translateY(-1px);
}

.pms-sso__icon {
  width: 1.25rem;
  height: 1.25rem;
}

.pms-card__foot {
  margin: 1.5rem 0 0;
  text-align: center;
  font-size: 0.875rem;
  color: var(--pms-faint);
}

.pms-card__foot a {
  font-weight: 600;
  color: #60a5fa;
  transition: color 0.3s ease;
}

.pms-card__foot a:hover {
  color: #93c5fd;
}

.pms-secure {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  margin: 1rem 0 0;
  font-size: 0.75rem;
  color: var(--pms-faint);
}

.pms-secure svg {
  width: 0.875rem;
  height: 0.875rem;
}

/* ---------- tablet ---------- */
@media (min-width: 640px) {
  .pms-nav,
  .pms-hero {
    padding-left: 2rem;
    padding-right: 2rem;
  }

  .pms-hero {
    padding-top: 3rem;
    padding-bottom: 3rem;
  }

  .pms-nav__link {
    display: block;
  }

  .pms-btn--ghost {
    padding: 0.625rem 1.25rem;
  }

  .pms-title {
    font-size: 3.75rem;
  }

  .pms-title__break {
    display: inline;
  }

  .pms-subtitle {
    font-size: 1.125rem;
    line-height: 2;
  }

  .pms-cta {
    flex-direction: row;
    align-items: center;
  }

  .pms-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .pms-card {
    padding: 2rem;
  }

  .pms-sso {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 768px) {
  .pms-grid {
    max-width: 42rem;
  }
}

/* ---------- desktop ---------- */
@media (min-width: 1024px) {
  .pms-nav,
  .pms-hero {
    padding-left: 4rem;
    padding-right: 4rem;
  }

  .pms-hero {
    display: flex;
    align-items: center;
    min-height: calc(100vh - 88px);
    padding-top: 4rem;
    padding-bottom: 4rem;
  }

  .pms-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: center;
    gap: 4rem;
    max-width: none;
  }

  .pms-col + .pms-col {
    margin-top: 0;
  }

  .pms-title {
    font-size: 3rem;
  }
}

@media (min-width: 1280px) {
  .pms-grid {
    gap: 6rem;
  }

  .pms-title {
    font-size: 3.75rem;
  }
}

/* ---------- accessibility ---------- */
@media (prefers-reduced-motion: reduce) {
  .pms-orb {
    animation: none;
  }

  .pms-root *,
  .pms-root *::before,
  .pms-root *::after {
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
    <svg viewBox="0 0 24 24" className="pms-sso__icon" aria-hidden="true">
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

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="pms-sso__icon" aria-hidden="true">
      <path fill="#F25022" d="M3 3h8.5v8.5H3z" />
      <path fill="#7FBA00" d="M12.5 3H21v8.5h-8.5z" />
      <path fill="#00A4EF" d="M3 12.5h8.5V21H3z" />
      <path fill="#FFB900" d="M12.5 12.5H21V21h-8.5z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  DATA                                                               */
/* ------------------------------------------------------------------ */

const STATS = [
  { icon: TrendingUp, value: "KSh 10B+", label: "Assets managed" },
  { icon: ShieldCheck, value: "99.9%", label: "Platform up-time" },
  { icon: Building2, value: "12,000+", label: "Units on-boarded" },
];

/* ------------------------------------------------------------------ */
/*  COMPONENT                                                          */
/* ------------------------------------------------------------------ */

function LandingPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/api/login", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Login failed.");
      }
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      if (data.organization) {
        localStorage.setItem("organization", JSON.stringify(data.organization));
      }
      const role = (data.user?.role ?? "").toString().trim().toLowerCase();
      const redirect = role === "tenant" ? "/tenant/dashboard" : "/manager/dashboard";
      window.location.href = redirect;
    } catch (err) {
      console.error(err);
      window.setTimeout(() => setSubmitting(false), 1200);
    }
  }

  return (
    <main className="pms-root">
      <style>{styles}</style>

      {/* Animated background mesh */}
      <div className="pms-mesh" aria-hidden="true">
        <div className="pms-orb pms-orb--indigo" />
        <div className="pms-orb pms-orb--blue" />
        <div className="pms-orb pms-orb--purple" />
        <div className="pms-vignette" />
      </div>

      {/* Navigation */}
      <nav className="pms-nav">
        <div className="pms-brand">
          <span className="pms-brand__mark">
            <Building2 size={20} />
          </span>
          <span className="pms-brand__name">
            PMS<span className="pms-brand__dot">.</span>
          </span>
        </div>

        <div className="pms-nav__actions">
          <a href="#features" className="pms-nav__link">
            Platform
          </a>
          <a href="/login" className="pms-btn pms-btn--ghost">
            Sign in
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="pms-hero">
        <div className="pms-grid">
          {/* LEFT — marketing */}
          <div className="pms-col">
            <div className="pms-badge">
              <Sparkles className="pms-badge__icon" />
              Property management, elevated
            </div>

            <h1 className="pms-title">
              The operating system
              <br className="pms-title__break" /> for modern portfolios.
            </h1>

            <p className="pms-subtitle">
              Properties, units, tenants, leases, payments, expenses and
              maintenance — unified in one executive workspace built for
              portfolio owners who expect precision.
            </p>

            <div className="pms-cta">
              <a href="/register" className="pms-btn pms-btn--primary">
                Create an account
                <ArrowRight className="pms-btn__icon pms-btn__icon--arrow" />
              </a>
              <a href="/login" className="pms-btn pms-btn--secondary">
                <Key className="pms-btn__icon pms-btn__icon--accent" />
                Book a walkthrough
              </a>
            </div>

            <div className="pms-stats" id="features">
              {STATS.map(({ icon: Icon, value, label }) => (
                <div className="pms-stat" key={label}>
                  <Icon className="pms-stat__icon" />
                  <p className="pms-stat__value">{value}</p>
                  <p className="pms-stat__label">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — sign-in */}
          <div className="pms-col" id="signin">
            <div className="pms-auth">
              <div className="pms-auth__halo" aria-hidden="true" />

              <div className="pms-card">
                <div className="pms-card__head">
                  <span className="pms-card__mark">
                    <ShieldCheck size={20} />
                  </span>
                  <h2 className="pms-card__title">Welcome back</h2>
                  <p className="pms-card__subtitle">
                    Enter your credentials to access your dashboard
                  </p>
                </div>

                <form className="pms-form" onSubmit={handleSubmit}>
                  <div>
                    <label className="pms-label" htmlFor="pms-email">
                      Email
                    </label>
                    <div className="pms-input-wrap">
                      <Mail className="pms-input-icon" />
                      <input
                        id="pms-email"
                        className="pms-input"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="pms-field__row">
                      <label className="pms-label" htmlFor="pms-password">
                        Password
                      </label>
                      <a href="#reset" className="pms-link">
                        Forgot?
                      </a>
                    </div>
                    <div className="pms-input-wrap">
                      <Lock className="pms-input-icon" />
                      <input
                        id="pms-password"
                        className="pms-input pms-input--with-action"
                        type={showPassword ? "text" : "password"}
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        className="pms-input-action"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? <EyeOff /> : <Eye />}
                      </button>
                    </div>
                  </div>

                  <label className="pms-check">
                    <input type="checkbox" />
                    Keep me signed in
                  </label>

                  <button
                    type="submit"
                    className="pms-btn pms-btn--primary pms-btn--block"
                    disabled={submitting}
                  >
                    {submitting ? "Signing in…" : "Sign in to dashboard"}
                    <ArrowRight className="pms-btn__icon pms-btn__icon--arrow" />
                  </button>
                </form>

                <div className="pms-divider">
                  <span>or continue with</span>
                </div>

                <div className="pms-sso">
                  <button type="button" className="pms-sso__btn">
                    <GoogleIcon />
                    Google
                  </button>
                  <button type="button" className="pms-sso__btn">
                    <MicrosoftIcon />
                    Microsoft
                  </button>
                </div>

                <p className="pms-card__foot">
                  New to PMS? <a href="/register">Create an account</a>
                </p>
              </div>

              <p className="pms-secure">
                <Lock />
                Secured with 256-bit encryption
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default LandingPage;
