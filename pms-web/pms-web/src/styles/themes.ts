/* ------------------------------------------------------------------ */
/*  THEME ENGINE                                                        */
/*                                                                      */
/*  Themes are plain CSS custom properties written onto <html>. Every   */
/*  page reads the same `--pms-*` tokens, and a bridge stylesheet maps  */
/*  the older per-page variables (--db-*, --dl-*, --sb-*, --tn-*) onto  */
/*  those tokens so a theme change repaints the whole portal.           */
/* ------------------------------------------------------------------ */
 
export interface ThemeTokens {
  bg: string;
  bgSoft: string;
  rail: string;
  surface: string;
  glass: string;
  glassStrong: string;
  border: string;
  borderSoft: string;
  text: string;
  heading: string;
  muted: string;
  faint: string;
  accent: string;
  accent2: string;
  accentSoft: string;
  success: string;
  warn: string;
  danger: string;
  shadow: string;
}
 
export interface Theme {
  id: string;
  name: string;
  description: string;
  scheme: "dark" | "light";
  tokens: ThemeTokens;
}
 
export const THEMES: Theme[] = [
  {
    id: "midnight",
    name: "Midnight",
    description: "The default deep-navy portal with a blue-indigo accent.",
    scheme: "dark",
    tokens: {
      bg: "#030712",
      bgSoft: "#0b1220",
      rail: "rgba(9, 14, 28, 0.94)",
      surface: "rgba(15, 23, 42, 0.55)",
      glass: "rgba(255, 255, 255, 0.05)",
      glassStrong: "rgba(255, 255, 255, 0.1)",
      border: "rgba(255, 255, 255, 0.1)",
      borderSoft: "rgba(255, 255, 255, 0.06)",
      text: "#f8fafc",
      heading: "#ffffff",
      muted: "#94a3b8",
      faint: "#64748b",
      accent: "#3b82f6",
      accent2: "#4f46e5",
      accentSoft: "rgba(59, 130, 246, 0.16)",
      success: "#4ade80",
      warn: "#fbbf24",
      danger: "#f87171",
      shadow: "0 30px 60px -20px rgba(0, 0, 0, 0.75)",
    },
  },
  {
    id: "graphite",
    name: "Graphite",
    description: "Neutral charcoal with a cool teal accent — low glare.",
    scheme: "dark",
    tokens: {
      bg: "#0c0d10",
      bgSoft: "#15171c",
      rail: "rgba(18, 20, 25, 0.95)",
      surface: "rgba(32, 35, 42, 0.6)",
      glass: "rgba(255, 255, 255, 0.045)",
      glassStrong: "rgba(255, 255, 255, 0.09)",
      border: "rgba(255, 255, 255, 0.1)",
      borderSoft: "rgba(255, 255, 255, 0.06)",
      text: "#f4f4f5",
      heading: "#ffffff",
      muted: "#a1a1aa",
      faint: "#71717a",
      accent: "#22d3ee",
      accent2: "#0891b2",
      accentSoft: "rgba(34, 211, 238, 0.15)",
      success: "#34d399",
      warn: "#fbbf24",
      danger: "#fb7185",
      shadow: "0 30px 60px -20px rgba(0, 0, 0, 0.8)",
    },
  },
  {
    id: "ledger",
    name: "Emerald ledger",
    description: "Finance-forward green on near-black, for money-heavy days.",
    scheme: "dark",
    tokens: {
      bg: "#04120c",
      bgSoft: "#071b13",
      rail: "rgba(6, 26, 19, 0.95)",
      surface: "rgba(12, 40, 30, 0.55)",
      glass: "rgba(209, 250, 229, 0.05)",
      glassStrong: "rgba(209, 250, 229, 0.1)",
      border: "rgba(167, 243, 208, 0.14)",
      borderSoft: "rgba(167, 243, 208, 0.08)",
      text: "#ecfdf5",
      heading: "#ffffff",
      muted: "#8fb8a6",
      faint: "#5f8a78",
      accent: "#10b981",
      accent2: "#047857",
      accentSoft: "rgba(16, 185, 129, 0.16)",
      success: "#4ade80",
      warn: "#fcd34d",
      danger: "#fb7185",
      shadow: "0 30px 60px -20px rgba(0, 20, 12, 0.8)",
    },
  },
  {
    id: "royal",
    name: "Royal violet",
    description: "Warm violet accents over a plum-tinted dark shell.",
    scheme: "dark",
    tokens: {
      bg: "#0b0716",
      bgSoft: "#150e26",
      rail: "rgba(19, 12, 36, 0.95)",
      surface: "rgba(35, 24, 62, 0.55)",
      glass: "rgba(233, 213, 255, 0.05)",
      glassStrong: "rgba(233, 213, 255, 0.1)",
      border: "rgba(216, 180, 254, 0.14)",
      borderSoft: "rgba(216, 180, 254, 0.08)",
      text: "#f5f3ff",
      heading: "#ffffff",
      muted: "#a99cc4",
      faint: "#7c6f99",
      accent: "#a855f7",
      accent2: "#6366f1",
      accentSoft: "rgba(168, 85, 247, 0.18)",
      success: "#4ade80",
      warn: "#fbbf24",
      danger: "#fb7185",
      shadow: "0 30px 60px -20px rgba(10, 0, 25, 0.8)",
    },
  },
  {
    id: "daylight",
    name: "Daylight",
    description: "Light off-white workspace for bright offices and printing.",
    scheme: "light",
    tokens: {
      bg: "#f1f5f9",
      bgSoft: "#e2e8f0",
      rail: "rgba(255, 255, 255, 0.97)",
      surface: "#ffffff",
      glass: "rgba(15, 23, 42, 0.035)",
      glassStrong: "rgba(15, 23, 42, 0.07)",
      border: "rgba(15, 23, 42, 0.14)",
      borderSoft: "rgba(15, 23, 42, 0.08)",
      text: "#0f172a",
      heading: "#0b1220",
      muted: "#475569",
      faint: "#64748b",
      accent: "#2563eb",
      accent2: "#4338ca",
      accentSoft: "rgba(37, 99, 235, 0.1)",
      success: "#15803d",
      warn: "#b45309",
      danger: "#b91c1c",
      shadow: "0 20px 45px -28px rgba(15, 23, 42, 0.45)",
    },
  },
];
 
export const DEFAULT_THEME_ID = "midnight";
 
const THEME_KEY = "pms.theme";
const LOGO_KEY = "pms.brand.logo";
const BRIDGE_ID = "pms-theme-bridge";
 
/* The bridge lets pages written before the theme engine follow it too. */
const BRIDGE_CSS = `
:root,
.dl-root {
  --dl-bg: var(--pms-bg);
  --dl-rail: var(--pms-rail);
  --dl-glass: var(--pms-glass);
  --dl-glass-strong: var(--pms-glass-strong);
  --dl-border: var(--pms-border);
  --dl-border-soft: var(--pms-border-soft);
  --dl-text: var(--pms-text);
  --dl-muted: var(--pms-muted);
  --dl-faint: var(--pms-faint);
  --dl-blue: var(--pms-accent);
  --dl-indigo: var(--pms-accent-2);
  --dl-danger: var(--pms-danger);
 
  --db-bg: var(--pms-bg);
  --db-surface: var(--pms-surface);
  --db-glass: var(--pms-glass);
  --db-glass-strong: var(--pms-glass-strong);
  --db-border: var(--pms-border);
  --db-border-soft: var(--pms-border-soft);
  --db-text: var(--pms-text);
  --db-muted: var(--pms-muted);
  --db-faint: var(--pms-faint);
  --db-blue: var(--pms-accent);
  --db-indigo: var(--pms-accent-2);
  --db-danger: var(--pms-danger);
  --db-warn: var(--pms-warn);
  --db-success: var(--pms-success);
  --db-shadow: var(--pms-shadow);
}
 
.sb {
  --sb-glass: var(--pms-glass);
  --sb-border: var(--pms-border);
  --sb-border-soft: var(--pms-border-soft);
  --sb-muted: var(--pms-muted);
  --sb-faint: var(--pms-faint);
  --sb-blue: var(--pms-accent);
  --sb-indigo: var(--pms-accent-2);
  --sb-danger: var(--pms-danger);
  color: var(--pms-text);
}
 
.tn-root {
  --tn-bg: var(--pms-bg);
  --tn-surface: var(--pms-surface);
  --tn-glass: var(--pms-glass);
  --tn-border: var(--pms-border);
  --tn-border-soft: var(--pms-border-soft);
  --tn-text: var(--pms-text);
  --tn-muted: var(--pms-muted);
  --tn-faint: var(--pms-faint);
  --tn-blue: var(--pms-accent);
  --tn-indigo: var(--pms-accent-2);
  --tn-danger: var(--pms-danger);
  --tn-warn: var(--pms-warn);
  --tn-success: var(--pms-success);
}
 
.dl-topbar { background: var(--pms-rail); }
 
[data-pms-scheme="light"] .dl-rail,
[data-pms-scheme="light"] .dl-topbar { backdrop-filter: none; }
`;
 
function ensureBridge(): void {
  if (document.getElementById(BRIDGE_ID)) return;
 
  const style = document.createElement("style");
  style.id = BRIDGE_ID;
  style.textContent = BRIDGE_CSS;
  document.head.appendChild(style);
}
 
export function findTheme(id: string): Theme {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0];
}
 
export function readThemeId(): string {
  return localStorage.getItem(THEME_KEY) ?? DEFAULT_THEME_ID;
}
 
export function readBrandLogo(): string | null {
  return localStorage.getItem(LOGO_KEY);
}
 
export function saveBrandLogo(dataUrl: string | null): void {
  if (dataUrl) localStorage.setItem(LOGO_KEY, dataUrl);
  else localStorage.removeItem(LOGO_KEY);
 
  window.dispatchEvent(new CustomEvent("pms:brand"));
}
 
export function applyTheme(id: string, persist = true): Theme {
  const theme = findTheme(id);
  const root = document.documentElement;
  const { tokens } = theme;
 
  ensureBridge();
 
  root.style.setProperty("--pms-bg", tokens.bg);
  root.style.setProperty("--pms-bg-soft", tokens.bgSoft);
  root.style.setProperty("--pms-rail", tokens.rail);
  root.style.setProperty("--pms-surface", tokens.surface);
  root.style.setProperty("--pms-glass", tokens.glass);
  root.style.setProperty("--pms-glass-strong", tokens.glassStrong);
  root.style.setProperty("--pms-border", tokens.border);
  root.style.setProperty("--pms-border-soft", tokens.borderSoft);
  root.style.setProperty("--pms-text", tokens.text);
  root.style.setProperty("--pms-heading", tokens.heading);
  root.style.setProperty("--pms-muted", tokens.muted);
  root.style.setProperty("--pms-faint", tokens.faint);
  root.style.setProperty("--pms-accent", tokens.accent);
  root.style.setProperty("--pms-accent-2", tokens.accent2);
  root.style.setProperty("--pms-accent-soft", tokens.accentSoft);
  root.style.setProperty("--pms-success", tokens.success);
  root.style.setProperty("--pms-warn", tokens.warn);
  root.style.setProperty("--pms-danger", tokens.danger);
  root.style.setProperty("--pms-shadow", tokens.shadow);
  root.style.setProperty("color-scheme", theme.scheme);
 
  root.dataset.pmsTheme = theme.id;
  root.dataset.pmsScheme = theme.scheme;
  document.body.style.background = tokens.bg;
 
  if (persist) localStorage.setItem(THEME_KEY, theme.id);
 
  return theme;
}

