/* ------------------------------------------------------------------ */
/*  MANAGER UI — shared vanilla CSS for every /manager/* page           */
/*                                                                      */
/*  Every colour is a `--pms-*` theme token (see src/theme/themes.ts),  */
/*  so the whole portal repaints when the manager picks another theme.  */
/*  Pages import this string and render <style>{managerStyles}</style>. */
/* ------------------------------------------------------------------ */
 
export const managerStyles = `
.mg-root {
  --mg-radius-sm: 0.75rem;
  --mg-radius-md: 1rem;
  --mg-radius-lg: 1.5rem;
 
  position: relative;
  min-height: 100%;
  padding: 1.5rem 1rem 3rem;
  background: var(--pms-bg, #030712);
  color: var(--pms-text, #f8fafc);
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Inter,
    Roboto, "Helvetica Neue", Arial, sans-serif;
  letter-spacing: -0.015em;
  -webkit-font-smoothing: antialiased;
}
 
.mg-root,
.mg-root * { box-sizing: border-box; }
 
.mg-root button {
  font-family: inherit;
  color: inherit;
  border: none;
  background: none;
  cursor: pointer;
}
 
.mg-root button:focus-visible,
.mg-root input:focus-visible,
.mg-root select:focus-visible,
.mg-root textarea:focus-visible,
.mg-root a:focus-visible {
  outline: 2px solid var(--pms-accent);
  outline-offset: 2px;
}
 
.mg-shell {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 82rem;
  margin: 0 auto;
}
 
/* ---------- header ---------- */
.mg-header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
 
.mg-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--pms-accent);
}
 
.mg-eyebrow svg { width: 0.875rem; height: 0.875rem; }
 
.mg-title {
  margin: 0.5rem 0 0;
  font-size: clamp(1.5rem, 4vw, 2rem);
  font-weight: 600;
  line-height: 1.15;
  color: var(--pms-heading);
}
 
.mg-subtitle {
  margin: 0.5rem 0 0;
  max-width: 46rem;
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--pms-muted);
}
 
.mg-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
 
/* ---------- buttons ---------- */
.mg-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 2.75rem;
  padding: 0 1.125rem;
  border-radius: var(--mg-radius-sm);
  border: 1px solid var(--pms-border);
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  transition: transform 0.2s ease, border-color 0.2s ease,
    background-color 0.2s ease, color 0.2s ease;
}
 
.mg-btn svg { width: 1rem; height: 1rem; flex: none; }
 
.mg-btn:disabled { opacity: 0.55; cursor: not-allowed; }
 
.mg-btn--ghost {
  color: var(--pms-text);
  background: var(--pms-glass);
}
 
.mg-btn--ghost:hover:not(:disabled) { border-color: var(--pms-accent); }
 
.mg-btn--primary {
border-color: transparent;
  color: #fff;
  background: linear-gradient(135deg, var(--pms-accent), var(--pms-accent-2));
  box-shadow: 0 18px 35px -22px var(--pms-accent);
}
 
.mg-btn--primary:hover:not(:disabled) { transform: translateY(-1px); }
 
.mg-btn--subtle {
  color: var(--pms-muted);
  border-color: transparent;
  background: transparent;
}
 
.mg-btn--subtle:hover:not(:disabled) {
  color: var(--pms-text);
  background: var(--pms-glass);
}
 
.mg-btn--sm { min-height: 2.25rem; padding: 0 0.75rem; font-size: 0.8125rem; }
 
.mg-iconbtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: var(--mg-radius-sm);
  border: 1px solid var(--pms-border-soft);
  background: var(--pms-glass);
  color: var(--pms-muted);
  transition: color 0.2s ease, border-color 0.2s ease;
}
 
.mg-iconbtn:hover { color: var(--pms-text); border-color: var(--pms-accent); }
.mg-iconbtn svg { width: 1rem; height: 1rem; }
 
/* ---------- alerts ---------- */
.mg-alert {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  padding: 0.875rem 1rem;
  border-radius: var(--mg-radius-sm);
  border: 1px solid var(--pms-danger);
  background: var(--pms-glass);
  font-size: 0.8125rem;
  color: var(--pms-danger);
}
 
.mg-alert svg { width: 1rem; height: 1rem; flex: none; margin-top: 0.0625rem; }
 
.mg-alert--ok {
  border-color: var(--pms-success);
  color: var(--pms-success);
}
 
/* ---------- stats ---------- */
.mg-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  gap: 1rem;
}
 
.mg-stat {
  padding: 1rem 1.125rem;
  border-radius: var(--mg-radius-md);
  border: 1px solid var(--pms-border-soft);
  background: var(--pms-surface);
  box-shadow: 0 18px 40px -32px rgba(0, 0, 0, 0.9);
}
 
.mg-stat__label {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--pms-muted);
}
 
.mg-stat__value {
  margin: 0.5rem 0 0;
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.15;
  color: var(--pms-heading);
  overflow-wrap: anywhere;
  font-variant-numeric: tabular-nums;
}
 
.mg-stat__hint {
  margin: 0.3125rem 0 0;
  font-size: 0.75rem;
  color: var(--pms-faint);
}
 
.mg-stat__hint--warn { color: var(--pms-warn); }
.mg-stat__hint--ok { color: var(--pms-success); }
 
/* ---------- toolbar & fields ---------- */
.mg-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}
 
.mg-search { position: relative; flex: 1 1 16rem; min-width: 0; }
 
.mg-search svg {
  position: absolute;
  top: 50%;
  left: 0.875rem;
  width: 1rem;
  height: 1rem;
  transform: translateY(-50%);
  color: var(--pms-faint);
  pointer-events: none;
}
 
.mg-search .mg-input { padding-left: 2.5rem; }
 
.mg-input,
.mg-select,
.mg-textarea {
  width: 100%;
  min-height: 2.75rem;
  padding: 0.6875rem 0.875rem;
  border-radius: var(--mg-radius-sm);
  border: 1px solid var(--pms-border);
  background: var(--pms-glass);
  font-family: inherit;
  font-size: 0.875rem;
  color: var(--pms-text);
}
 
.mg-input::placeholder,
.mg-textarea::placeholder { color: var(--pms-faint); }

/* Native dropdown menus need an explicit readable palette. Browser/OS
   defaults can otherwise inherit a dark theme and make option text
   disappear against the popup background. */
.mg-root select,
.mg-root select option,
.mg-root select optgroup {
  color-scheme: light;
}
.mg-root select option,
.mg-root select optgroup {
  background: #fff;
  color: #0f172a;
}
.mg-root select option:checked {
  background: #e8eef8;
  color: #0f172a;
}
 
.mg-textarea { min-height: 5.5rem; resize: vertical; line-height: 1.5; }
 
.mg-field { display: flex; flex-direction: column; gap: 0.375rem; min-width: 0; }
 
.mg-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--pms-muted);
}
 
.mg-hint { margin: 0; font-size: 0.75rem; color: var(--pms-faint); }
 
.mg-optional { font-weight: 400; color: var(--pms-faint); text-transform: none; letter-spacing: normal; }
 
.mg-grid2 { display: grid; grid-template-columns: 1fr; gap: 0.875rem; }
 
.mg-chips { display: flex; flex-wrap: wrap; gap: 0.375rem; }
 
.mg-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 2.25rem;
  padding: 0 0.75rem;
  border-radius: 999px;
  border: 1px solid var(--pms-border-soft);
  background: var(--pms-glass);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--pms-muted);
  transition: color 0.2s ease, border-color 0.2s ease;
}
 
.mg-chip:hover { color: var(--pms-text); }
 
.mg-chip--on {
  border-color: var(--pms-accent);
  color: var(--pms-heading);
  background: var(--pms-accent-soft);
}
 
.mg-chip__count { font-variant-numeric: tabular-nums; color: var(--pms-faint); }
.mg-chip--on .mg-chip__count { color: var(--pms-accent); }
 
/* ---------- panels ---------- */
.mg-panel {
  border-radius: var(--mg-radius-lg);
  border: 1px solid var(--pms-border-soft);
  background: var(--pms-surface);
  overflow: hidden;
}
 
.mg-panel__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--pms-border-soft);
}
 
.mg-panel__head-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}
 
.mg-panel__title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--pms-heading);
}
 
.mg-panel__title svg { width: 1rem; height: 1rem; color: var(--pms-accent); }
 
.mg-panel__meta {
  font-size: 0.75rem;
  color: var(--pms-faint);
  font-variant-numeric: tabular-nums;
}
 
.mg-panel__body { padding: 1.25rem; }
 
/* ---------- table ---------- */
.mg-tablewrap { width: 100%; overflow-x: auto; }
 
.mg-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}
 
.mg-table th {
  padding: 0.75rem 1.25rem;
  text-align: left;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  white-space: nowrap;
  color: var(--pms-faint);
  border-bottom: 1px solid var(--pms-border-soft);
  background: var(--pms-glass);
}
 
.mg-table td {
  padding: 0.875rem 1.25rem;
  vertical-align: middle;
  border-bottom: 1px solid var(--pms-border-soft);
  color: var(--pms-text);
}
 
.mg-table tbody tr:last-child td { border-bottom: none; }
.mg-table tbody tr:hover td { background: var(--pms-glass); }
 
.mg-table .mg-num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  }
 
.mg-strong { font-weight: 600; color: var(--pms-heading); }
.mg-sub { display: block; margin-top: 0.1875rem; font-size: 0.75rem; color: var(--pms-faint); }
.mg-nowrap { white-space: nowrap; }
 
.mg-rowlink {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-weight: 600;
  color: var(--pms-heading);
  text-align: left;
}
 
.mg-rowlink:hover { color: var(--pms-accent); }
 
.mg-person { display: flex; align-items: center; gap: 0.625rem; min-width: 0; }
 
.mg-avatar {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: var(--mg-radius-sm);
  border: 1px solid var(--pms-border);
  background: var(--pms-accent-soft);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--pms-accent);
}
 
/* ---------- badges ---------- */
.mg-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3125rem;
  padding: 0.1875rem 0.5rem;
  border-radius: 999px;
  border: 1px solid var(--pms-border-soft);
  background: var(--pms-glass);
  font-size: 0.6875rem;
  font-weight: 600;
  white-space: nowrap;
  color: var(--pms-muted);
}
 
.mg-badge svg { width: 0.75rem; height: 0.75rem; }
.mg-badge--ok { color: var(--pms-success); border-color: var(--pms-success); }
.mg-badge--warn { color: var(--pms-warn); border-color: var(--pms-warn); }
.mg-badge--danger { color: var(--pms-danger); border-color: var(--pms-danger); }
.mg-badge--info { color: var(--pms-accent); border-color: var(--pms-accent); }
 
/* ---------- progress ---------- */
.mg-progress {
  height: 0.375rem;
  border-radius: 999px;
  background: var(--pms-glass-strong);
  overflow: hidden;
}
 
.mg-progress__bar {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--pms-accent), var(--pms-accent-2));
}
 
/* ---------- states ---------- */
.mg-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 3rem 1.25rem;
  text-align: center;
}
 
.mg-empty svg { width: 1.75rem; height: 1.75rem; color: var(--pms-faint); }
 
.mg-empty__title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--pms-heading);
}
 
.mg-empty__text {
  margin: 0;
  max-width: 28rem;
  font-size: 0.8125rem;
  line-height: 1.6;
  color: var(--pms-muted);
}
 
.mg-skeleton {
  display: block;
  height: 0.75rem;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    var(--pms-glass) 25%,
    var(--pms-glass-strong) 37%,
    var(--pms-glass) 63%
  );
  background-size: 400% 100%;
  animation: mg-shimmer 1.4s ease infinite;
}
 
@keyframes mg-shimmer {
  from { background-position: 100% 50%; }
  to { background-position: 0 50%; }
}
 
.mg-spin { animation: mg-spin 0.9s linear infinite; }
 
@keyframes mg-spin { to { transform: rotate(360deg); } }
 
/* ---------- drawer ---------- */
.mg-drawer {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100dvh;
  overflow: hidden;
  z-index: 80;
  display: flex;
  justify-content: flex-end;
  background: rgba(2, 6, 16, 0.65);
  backdrop-filter: blur(2px);
  animation: mg-fade 0.2s ease-out;
}
 
@keyframes mg-fade { from { opacity: 0; } to { opacity: 1; } }
 
.mg-drawer__panel {
  display: flex;
  flex-direction: column;
  width: min(38rem, 100%);
  max-height: 100dvh;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border-left: 1px solid var(--pms-border);
  background: var(--pms-bg);
  box-shadow: var(--pms-shadow);
  animation: mg-slide 0.25s ease-out;
}
 
@keyframes mg-slide {
  from { transform: translateX(2rem); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
 
.mg-drawer__head {
  display: flex;
  flex: 0 0 auto;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem;
  border-bottom: 1px solid var(--pms-border-soft);
}
 
.mg-drawer__title {
  margin: 0;
  font-size: 1.0625rem;
  font-weight: 600;
  color: var(--pms-heading);
}
 
.mg-drawer__sub {
  margin: 0.25rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.55;
  color: var(--pms-muted);
}
 
.mg-drawer__body {
  flex: 1 1 0%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  padding: 1.25rem;
  overflow-y: scroll !important;
  overflow-x: hidden;
  overscroll-behavior-y: contain;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
  scrollbar-gutter: stable;
}
 
.mg-drawer__foot {
  display: flex;
  flex: 0 0 auto;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1.25rem;
  border-top: 1px solid var(--pms-border-soft);
}
 
.mg-section {
  margin: 0.5rem 0 0;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--pms-faint);
}
 
/* ---------- responsive table → cards ---------- */
@media (max-width: 899px) {
  .mg-table,
  .mg-table tbody,
  .mg-table tr,
  .mg-table td { display: block; width: 100%; }
 
  .mg-table thead { display: none; }
 
  .mg-table tr {
    padding: 0.875rem 1.125rem;
    border-bottom: 1px solid var(--pms-border-soft);
  }
 
  .mg-table tbody tr:hover td { background: transparent; }
 
  .mg-table td {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.3125rem 0;
    border-bottom: none;
    text-align: right;
  }
 
  .mg-table td::before {
    content: attr(data-label);
    flex: none;
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--pms-faint);
  }
 
  .mg-table td.mg-num { text-align: right; }
 
  .mg-table td[data-label=""] { justify-content: flex-start; text-align: left; }
  .mg-table td[data-label=""]::before { content: none; }
}
 
@media (min-width: 640px) {
  .mg-grid2 { grid-template-columns: 1fr 1fr; }
}
 
@media (min-width: 768px) {
  .mg-root { padding: 2rem 1.5rem 3.5rem; }
 
  .mg-header {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
  }
}
 
@media (prefers-reduced-motion: reduce) {
  .mg-root *,
  .mg-root *::before,
  .mg-drawer * {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}
`;

