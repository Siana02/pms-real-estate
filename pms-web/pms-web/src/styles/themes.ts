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
    id: "dark",
    name: "Obsidian",
    description: "A quiet, premium charcoal workspace with sapphire accents.",
    scheme: "dark",
    tokens: {
      bg: "#0b1018", bgSoft: "#111a27", rail: "#0d1420",
      surface: "#151f2d", glass: "rgba(255,255,255,.045)", glassStrong: "rgba(255,255,255,.085)",
      border: "rgba(203,213,225,.16)", borderSoft: "rgba(203,213,225,.09)",
      text: "#f1f5f9", heading: "#ffffff", muted: "#bdc8d7", faint: "#91a0b4",
      accent: "#7aa7ff", accent2: "#9b8cff", accentSoft: "rgba(122,167,255,.16)",
      success: "#5ee0a0", warn: "#ffd166", danger: "#ff8b9a",
      shadow: "0 24px 64px -24px rgba(0,0,0,.62)",
    },
  },
  {
    id: "light",
    name: "Porcelain",
    description: "Warm porcelain surfaces, crisp ink and understated blue details.",
    scheme: "light",
    tokens: {
      bg: "#f5f6f8", bgSoft: "#e9edf2", rail: "#ffffff",
      surface: "#ffffff", glass: "rgba(15,23,42,.035)", glassStrong: "rgba(15,23,42,.07)",
      border: "rgba(30,41,59,.16)", borderSoft: "rgba(30,41,59,.09)",
      text: "#172033", heading: "#0b1220", muted: "#4b5568", faint: "#667085",
      accent: "#2459c4", accent2: "#4f46a5", accentSoft: "rgba(36,89,196,.11)",
      success: "#167348", warn: "#965a08", danger: "#b42335",
      shadow: "0 20px 48px -28px rgba(15,23,42,.3)",
    },
  },
  {
    id: "pink",
    name: "Rosewood",
    description: "Muted rose, plum and soft champagne for a polished warm finish.",
    scheme: "light",
    tokens: {
      bg: "#fbf5f7", bgSoft: "#f2e6ec", rail: "#fffafb",
      surface: "#ffffff", glass: "rgba(89,34,62,.04)", glassStrong: "rgba(89,34,62,.075)",
      border: "rgba(89,34,62,.16)", borderSoft: "rgba(89,34,62,.09)",
      text: "#382130", heading: "#281321", muted: "#725666", faint: "#8b7182",
      accent: "#9a4168", accent2: "#6f365e", accentSoft: "rgba(154,65,104,.12)",
      success: "#236c50", warn: "#89520b", danger: "#a52e48",
      shadow: "0 20px 48px -28px rgba(76,32,56,.24)",
    },
  },
  {
    id: "blue",
    name: "Sapphire",
    description: "A tailored blue-grey palette with deep navy and bright sapphire highlights.",
    scheme: "dark",
    tokens: {
      bg: "#0b1524", bgSoft: "#11243a", rail: "#0d1c30",
      surface: "#142b43", glass: "rgba(191,219,254,.05)", glassStrong: "rgba(191,219,254,.1)",
      border: "rgba(191,219,254,.18)", borderSoft: "rgba(191,219,254,.1)",
      text: "#eaf3ff", heading: "#ffffff", muted: "#b5cbe2", faint: "#8eabc9",
      accent: "#70b7ff", accent2: "#91a8ff", accentSoft: "rgba(112,183,255,.17)",
      success: "#5ee0b0", warn: "#ffd166", danger: "#ff91a4",
      shadow: "0 24px 64px -24px rgba(0,8,25,.62)",
    },
  },
];

export const DEFAULT_THEME_ID = "dark";
 
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
 
.tp-root {
  --tp-bg: var(--pms-bg);
  --tp-surface: var(--pms-surface);
  --tp-surface-sunken: var(--pms-glass-strong);
  --tp-surface-tint: var(--pms-accent-soft);
  --tp-ink: var(--pms-text);
  --tp-ink-soft: var(--pms-text);
  --tp-muted: var(--pms-muted);
  --tp-faint: var(--pms-faint);
  --tp-line: var(--pms-border);
  --tp-line-soft: var(--pms-border-soft);
  --tp-blue: var(--pms-accent);
  --tp-blue-dark: var(--pms-accent);
  --tp-blue-pale: var(--pms-accent-soft);
  --tp-green: var(--pms-success);
  --tp-green-pale: var(--pms-glass);
  --tp-amber: var(--pms-warn);
  --tp-amber-pale: var(--pms-glass);
  --tp-red: var(--pms-danger);
  --tp-red-pale: var(--pms-glass);
  color: var(--pms-text);
}
.tp-root .tp-top,
.tp-root .tp-tabs { background: var(--pms-rail); border-color: var(--pms-border); }
.tp-root .tp-side { background: var(--pms-rail); border-color: var(--pms-border); }
.tp-root .tp-page-title,
.tp-root .tp-section__title,
.tp-root .tp-value,
.tp-root .tp-link,
.tp-root .tp-top__brand { color: var(--pms-heading); }
.tp-root .tp-link[aria-current="page"] { background: var(--pms-accent-soft); color: var(--pms-accent); }
.tp-root .tp-top input { color: var(--pms-text); }
.tp-root .tp-card,
.tp-root .tp-content .ts-section,
.tp-root .tp-content .ts-intro { background: var(--pms-surface); color: var(--pms-text); }
.tp-root .tp-page-sub,
.tp-root .tp-section__sub,
.tp-root .tp-label,
.tp-root .tp-empty__text { color: var(--pms-muted); }

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
 
 .dl-topbar, .dl-rail { background: var(--pms-rail); border-color: var(--pms-border); }
.dl-brand__name { color: var(--pms-heading); }
.dl-iconbtn { background: var(--pms-surface); color: var(--pms-text); border-color: var(--pms-border); }
.sb { color: var(--pms-text); }
.sb .sb-org__label, .sb .sb-nav__label { color: var(--pms-muted); }
.sb .sb-org__name, .sb .sb-link { color: var(--pms-text) !important; }
.sb .sb-org__email, .sb .sb-link svg { color: var(--pms-muted) !important; }
.sb .sb-link:hover { background: var(--pms-glass-strong); color: var(--pms-heading) !important; }
.sb .sb-link--active { background: var(--pms-accent-soft); color: var(--pms-accent) !important; }
.sb .sb-link--active svg { color: var(--pms-accent) !important; }
.sb .sb-org { border-color: var(--pms-border); }
.sb .sb-foot { border-color: var(--pms-border); }
 
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

