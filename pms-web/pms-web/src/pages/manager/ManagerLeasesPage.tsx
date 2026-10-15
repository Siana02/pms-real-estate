import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  FileSignature,
  FileText,
  RefreshCw,
  Search,
  Wallet,
  X,
} from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { apiRequest } from "../../services/api";
import {
  asBoolean,
  asNumber,
  asString,
  daysBetween,
  formatDate,
  formatMoney,
  formatNumber,
  initials,
  namedRef,
  readCurrency,
  relativeDays,
  rows,
  titleCase,
  toRecord,
} from "../../services/format";

/* ------------------------------------------------------------------ */
/*  TYPES & PARSING                                                     */
/* ------------------------------------------------------------------ */

interface DepositRecord {
  amount_required: number;
  amount_paid: number;
  payment_date: string | null;
  status: string | null;
  tenant_marked_paid_at: string | null;
}

interface LeaseRecord {
  id: number;
  tenant: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    national_id: string | null;
    employer_name: string | null;
    employer_phone: string | null;
    next_of_kin_name: string | null;
    next_of_kin_phone: string | null;
  } | null;
  property: { id: number; name: string } | null;
  unit: {
    id: number;
    unit_number: string;
    standard_rent: number;
    standard_deposit: number;
  } | null;
  start_date: string | null;
  end_date: string | null;
  requested_move_in_date: string | null;
  requested_move_out_date: string | null;
  monthly_rent: number;
  deposit_amount: number;
  balance: number;
  status: string;
  notes: string | null;
  manager_terms: string | null;
  tenant_terms: string | null;
  manager_signature: string | null;
  tenant_signature: string | null;
  manager_signed_at: string | null;
  tenant_signed_at: string | null;
  manager_copy_physical_signed_on: string | null;
  manager_copy_physical_confirmed_at: string | null;
  manager_physical_confirmed_by: string | null;
  tenant_copy_physical_signed_on: string | null;
  tenant_copy_physical_confirmed_at: string | null;
  tenant_physical_confirmed_by: string | null;
  physical_signing_notes: string | null;
  agreement_finalized: boolean;
  deposit: DepositRecord | null;
}

type LeaseView = LeaseRecord & {
  computed: "upcoming" | "active" | "notice" | "expiring" | "expired";
};

type LeaseFilter = "all" | LeaseView["computed"] | "pending";

const EXPIRING_WINDOW_DAYS = 60;

const leaseStyles = `
.ls-root {
  --ls-ink: #172b3a;
  --ls-ink-soft: #31495a;
  --ls-muted: #687b88;
  --ls-faint: #8b9ba5;
  --ls-border: #e3e9e9;
  --ls-border-strong: #d3dfdc;
  --ls-paper: #ffffff;
  --ls-canvas: #f5f7f4;
  --ls-surface: #fbfcfa;
  --ls-green: #1c5b4d;
  --ls-green-dark: #123f36;
  --ls-green-soft: #e8f2ee;
  --ls-gold: #b38b52;
  --ls-gold-soft: #f7f0e5;
  --ls-red: #a63f43;
  --ls-red-soft: #fbebeb;
  color: var(--ls-ink);
  width: 100%;
  min-width: 0;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  line-height: 1.5;
  animation: ls-enter .42s cubic-bezier(.2,.75,.25,1) both;
}
.ls-root, .ls-root *, .ls-root *::before, .ls-root *::after { box-sizing: border-box; }
.ls-root button, .ls-root input, .ls-root textarea { font: inherit; }
.ls-root button { -webkit-tap-highlight-color: transparent; }
.ls-root .ls-shell { width: min(100%, 1560px); margin: 0 auto; padding: clamp(1rem, 2.3vw, 2.1rem); min-width: 0; }
.ls-root .mg-header {
  display:flex; align-items:flex-end; justify-content:space-between; gap:1.5rem;
  padding: clamp(1.25rem, 3vw, 2.25rem); margin-bottom:1.25rem;
  border:1px solid #e0e8e3; border-radius:24px;
  background: radial-gradient(ellipse at 95% 0%, #e5efe9 0%, transparent 42%), linear-gradient(135deg,#fff 0%,#f8faf7 100%);
  box-shadow:0 14px 42px #173b2c0a; min-width:0;
}
.ls-root .mg-eyebrow {
  display:inline-flex; align-items:center; gap:.5rem; margin-bottom:.7rem;
  color:var(--ls-green); font-size:.7rem; line-height:1.3; font-weight:800;
  letter-spacing:.16em; text-transform:uppercase;
}
.ls-root .mg-eyebrow svg { width:1rem; height:1rem; }
.ls-root .mg-title { margin:0; color:var(--ls-ink); font-family:Georgia,"Times New Roman",serif; font-size:clamp(2.15rem,4vw,3.45rem); line-height:1.04; letter-spacing:-.045em; font-weight:500; overflow-wrap:anywhere; }
.ls-root .mg-subtitle { max-width:56rem; margin:.8rem 0 0; color:var(--ls-muted); font-size:clamp(.88rem,1.15vw,1rem); line-height:1.75; overflow-wrap:anywhere; }
.ls-root .mg-actions { display:flex; align-items:center; flex-wrap:wrap; gap:.6rem; flex:0 0 auto; }
.ls-root .mg-btn, .ls-root .mg-button {
  display:inline-flex; align-items:center; justify-content:center; gap:.5rem; min-height:43px; max-width:100%;
  padding:.68rem .95rem; border:1px solid var(--ls-border-strong); border-radius:12px;
  color:var(--ls-ink-soft); background:#fff; font-size:.84rem; line-height:1.3; font-weight:750;
  text-decoration:none; cursor:pointer; white-space:normal; overflow-wrap:anywhere;
  transition:transform .2s ease, box-shadow .2s ease, border-color .2s ease, background .2s ease, color .2s ease;
}
.ls-root .mg-btn svg, .ls-root .mg-button svg { width:1rem; height:1rem; flex:0 0 auto; }
.ls-root .mg-btn:hover:not(:disabled), .ls-root .mg-button:hover:not(:disabled) { transform:translateY(-2px); border-color:#a6c2b6; box-shadow:0 8px 18px #173b2c12; }
.ls-root .mg-btn:focus-visible, .ls-root .mg-button:focus-visible, .ls-root .mg-chip:focus-visible { outline:3px solid #bdd8cc; outline-offset:3px; }
.ls-root .mg-btn:disabled, .ls-root .mg-button:disabled { opacity:.58; cursor:not-allowed; transform:none; }
.ls-root .mg-btn--primary, .ls-root .mg-button--primary { background:var(--ls-green); border-color:var(--ls-green); color:#fff; }
.ls-root .mg-btn--primary:hover:not(:disabled), .ls-root .mg-button--primary:hover:not(:disabled) { background:var(--ls-green-dark); border-color:var(--ls-green-dark); box-shadow:0 9px 20px #1c5b4d2b; }
.ls-root .mg-btn--subtle { background:#ffffffb8; border-color:#dfe7e3; color:var(--ls-ink-soft); }
.ls-root .mg-btn--sm { min-height:36px; padding:.48rem .68rem; border-radius:10px; font-size:.77rem; }
.ls-root .mg-alert { display:flex; align-items:flex-start; gap:.7rem; padding:.9rem 1rem; margin:0 0 1.1rem; border:1px solid #f0c9c7; border-radius:14px; color:#873337; background:#fff5f4; font-size:.88rem; overflow-wrap:anywhere; }
.ls-root .mg-alert svg { width:1.1rem; height:1.1rem; flex:0 0 auto; margin-top:.1rem; }
.ls-root .mg-alert--ok { color:#205944; background:#edf7f1; border-color:#cce6d7; }
.ls-root .mg-stats { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:.85rem; margin:0 0 1.35rem; }
.ls-root .mg-stat { min-width:0; padding:1.05rem 1.1rem; border:1px solid var(--ls-border); border-radius:18px; background:var(--ls-paper); box-shadow:0 5px 18px #1c3a2c06; transition:transform .22s ease, border-color .22s ease, box-shadow .22s ease; }
.ls-root .mg-stat:hover { transform:translateY(-3px); border-color:#c7d9d0; box-shadow:0 13px 28px #1c3a2c0d; }
.ls-root .mg-stat__label { margin:0; color:var(--ls-muted); font-size:.68rem; line-height:1.45; font-weight:800; letter-spacing:.1em; text-transform:uppercase; overflow-wrap:anywhere; }
.ls-root .mg-stat__value { margin:.45rem 0 0; color:var(--ls-ink); font-family:Georgia,"Times New Roman",serif; font-size:clamp(1.25rem,1.65vw,1.9rem); line-height:1.15; letter-spacing:-.025em; font-variant-numeric:tabular-nums; overflow-wrap:anywhere; }
.ls-root .mg-stat__hint { margin:.5rem 0 0; color:var(--ls-muted); font-size:.75rem; line-height:1.45; overflow-wrap:anywhere; }
.ls-root .mg-stat__hint--warn { color:#8d6733; }
.ls-root .mg-toolbar { display:flex; align-items:flex-end; justify-content:space-between; gap:1rem; flex-wrap:wrap; margin-bottom:1.15rem; padding:1rem; border:1px solid var(--ls-border); border-radius:18px; background:#fbfcfa; }
.ls-root .ls-toolbar-field { flex:1 1 18rem; min-width:0; }
.ls-root .mg-label { display:block; margin:0 0 .45rem; color:var(--ls-ink-soft); font-size:.77rem; font-weight:800; }
.ls-root .ls-search { position:relative; min-width:0; }
.ls-root .ls-search svg { position:absolute; top:50%; left:.9rem; width:1rem; height:1rem; transform:translateY(-50%); color:var(--ls-faint); pointer-events:none; }
.ls-root .ls-search .mg-input { padding-left:2.55rem; }
.ls-root .mg-input, .ls-root .mg-textarea {
  display:block; width:100%; min-width:0; max-width:100%; padding:.75rem .85rem;
  border:1px solid #d8e2df; border-radius:11px; background:#fff; color:var(--ls-ink);
  font-size:.88rem; line-height:1.5; box-shadow:inset 0 1px 1px #173b2c04;
  transition:border-color .18s ease, box-shadow .18s ease;
}
.ls-root .mg-input::placeholder, .ls-root .mg-textarea::placeholder { color:#97a5ad; }
.ls-root .mg-input:focus, .ls-root .mg-textarea:focus { outline:none; border-color:#76a895; box-shadow:0 0 0 3px #dfeee7; }
.ls-root .mg-textarea { min-height:8rem; resize:vertical; overflow-wrap:anywhere; white-space:pre-wrap; }
.ls-root .mg-chips { display:flex; align-items:center; flex-wrap:wrap; gap:.45rem; max-width:100%; }
.ls-root .mg-chip { display:inline-flex; align-items:center; justify-content:center; gap:.45rem; min-height:37px; max-width:100%; padding:.45rem .7rem; border:1px solid transparent; border-radius:999px; background:transparent; color:var(--ls-muted); font-size:.77rem; font-weight:750; cursor:pointer; transition:background .2s ease,color .2s ease,border-color .2s ease,transform .2s ease; }
.ls-root .mg-chip:hover { color:var(--ls-green); background:#edf4f0; }
.ls-root .mg-chip--on { color:#fff; background:var(--ls-green); border-color:var(--ls-green); box-shadow:0 4px 12px #1c5b4d1c; }
.ls-root .mg-chip--on:hover { color:#fff; background:var(--ls-green-dark); }
.ls-root .mg-chip__count { display:inline-grid; place-items:center; min-width:1.45rem; height:1.45rem; padding:0 .3rem; border-radius:999px; background:#eaf0ed; color:var(--ls-ink-soft); font-size:.69rem; font-variant-numeric:tabular-nums; }
.ls-root .mg-chip--on .mg-chip__count { background:#ffffff26; color:#fff; }
.ls-root .mg-panel { min-width:0; overflow:hidden; border:1px solid var(--ls-border); border-radius:22px; background:var(--ls-paper); box-shadow:0 12px 34px #183c2e08; }
.ls-root .mg-panel__head { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:.8rem; padding:1.15rem 1.3rem; border-bottom:1px solid #e9eeeb; background:linear-gradient(110deg,#fbfcfa,#fff); }
.ls-root .mg-panel__title { display:flex; align-items:center; gap:.65rem; margin:0; color:var(--ls-ink); font-size:1.02rem; line-height:1.35; font-weight:800; letter-spacing:-.015em; }
.ls-root .mg-panel__title svg { width:1.1rem; height:1.1rem; color:var(--ls-green); }
.ls-root .mg-panel__meta { color:var(--ls-muted); font-size:.78rem; font-weight:700; font-variant-numeric:tabular-nums; }
.ls-root .mg-panel__body { padding:1.2rem; min-width:0; }
.ls-root .mg-tablewrap { width:100%; min-width:0; overflow-x:auto; overscroll-behavior-x:contain; }
.ls-root .mg-table { width:100%; border-collapse:separate; border-spacing:0; table-layout:fixed; color:var(--ls-ink-soft); font-size:.81rem; }
.ls-root .mg-table th { padding:.9rem .75rem; background:#f5f8f5; color:#647770; border-bottom:1px solid #e0e8e3; text-align:left; font-size:.66rem; line-height:1.4; font-weight:850; letter-spacing:.09em; text-transform:uppercase; }
.ls-root .mg-table td { padding:.95rem .75rem; vertical-align:top; border-bottom:1px solid #edf1ee; min-width:0; overflow-wrap:anywhere; word-break:normal; }
.ls-root .mg-table tbody tr { transition:background .2s ease; }
.ls-root .mg-table tbody tr:hover { background:#f8fbf8; }
.ls-root .mg-table tbody tr:last-child td { border-bottom:0; }
.ls-root .mg-table th:nth-child(1) { width:19%; }
.ls-root .mg-table th:nth-child(2) { width:12%; }
.ls-root .mg-table th:nth-child(3) { width:15%; }
.ls-root .mg-table th:nth-child(4) { width:10%; }
.ls-root .mg-table th:nth-child(5) { width:15%; }
.ls-root .mg-table th:nth-child(6) { width:13%; }
.ls-root .mg-table th:nth-child(7) { width:16%; }
.ls-root .mg-num { text-align:right; font-variant-numeric:tabular-nums; white-space:normal; }
.ls-root .mg-nowrap { white-space:normal; }
.ls-root .mg-person { display:flex; align-items:flex-start; gap:.65rem; min-width:0; }
.ls-root .mg-person > div { min-width:0; }
.ls-root .mg-avatar { display:grid; place-items:center; flex:0 0 2.35rem; width:2.35rem; height:2.35rem; border:1px solid #d5e5dc; border-radius:14px; background:linear-gradient(145deg,#eaf3ed,#dceae1); color:var(--ls-green); font-size:.73rem; font-weight:850; }
.ls-root .mg-strong { display:block; color:var(--ls-ink); font-size:.82rem; line-height:1.45; font-weight:800; overflow-wrap:anywhere; }
.ls-root .mg-sub { display:block; margin-top:.28rem; color:var(--ls-muted); font-size:.72rem; line-height:1.5; overflow-wrap:anywhere; word-break:break-word; }
.ls-root .mg-badge { display:inline-flex; align-items:center; justify-content:center; width:max-content; max-width:100%; padding:.34rem .55rem; border:1px solid #dbe5df; border-radius:999px; background:#f2f6f3; color:#50675d; font-size:.66rem; line-height:1.35; font-weight:800; overflow-wrap:anywhere; white-space:normal; }
.ls-root .mg-badge--ok { background:#eaf5ee; border-color:#cce6d6; color:#246446; }
.ls-root .mg-badge--warn { background:var(--ls-gold-soft); border-color:#ead9b9; color:#855f2b; }
.ls-root .mg-badge--danger { background:var(--ls-red-soft); border-color:#efcccc; color:var(--ls-red); }
.ls-root .mg-empty { display:flex; flex-direction:column; align-items:center; text-align:center; padding:clamp(2.5rem,7vw,5rem) 1.25rem; }
.ls-root .mg-empty > svg { width:2rem; height:2rem; margin-bottom:1rem; color:var(--ls-green); }
.ls-root .mg-empty__title { margin:0; color:var(--ls-ink); font-family:Georgia,"Times New Roman",serif; font-size:1.55rem; }
.ls-root .mg-empty__text { max-width:28rem; margin:.5rem 0 0; color:var(--ls-muted); font-size:.88rem; line-height:1.7; overflow-wrap:anywhere; }
.ls-root .mg-skeleton { display:block; border-radius:10px; background:linear-gradient(90deg,#edf1ed 20%,#f8faf7 40%,#edf1ed 60%); background-size:200% 100%; animation:ls-shimmer 1.35s linear infinite; }
.ls-root .mg-drawer { position:fixed; z-index:1100; inset:0; display:flex; justify-content:flex-end; background:#10282066; backdrop-filter:blur(5px); animation:ls-fade .22s ease both; }
.ls-root .mg-drawer__panel { display:flex; flex-direction:column; width:min(760px,100%); height:100%; max-height:100dvh; overflow:hidden; background:#fbfcfa; border-left:1px solid #d7e2dc; box-shadow:-24px 0 70px #10282025; animation:ls-slide-in .32s cubic-bezier(.2,.8,.2,1) both; }
.ls-root .mg-drawer__head { flex:0 0 auto; padding:1.3rem clamp(1rem,3vw,1.8rem); border-bottom:1px solid var(--ls-border); background:radial-gradient(ellipse at 100% 0%,#e7f0e9,transparent 55%),#fff; }
.ls-root .mg-drawer__title { margin:.2rem 0 0; color:var(--ls-ink); font-family:Georgia,"Times New Roman",serif; font-size:clamp(1.4rem,3vw,2rem); font-weight:500; line-height:1.2; letter-spacing:-.025em; overflow-wrap:anywhere; }
.ls-root .mg-drawer__sub { margin:.45rem 0 0; color:var(--ls-muted); font-size:.82rem; line-height:1.5; overflow-wrap:anywhere; }
.ls-root .mg-drawer__body { flex:1 1 auto; min-height:0; overflow-y:auto; padding:clamp(1rem,3vw,1.8rem); overscroll-behavior:contain; }
.ls-root .mg-drawer__foot { flex:0 0 auto; display:flex; justify-content:flex-end; flex-wrap:wrap; gap:.6rem; padding:1rem clamp(1rem,3vw,1.8rem); border-top:1px solid var(--ls-border); background:#fff; }
.ls-root .mg-field { display:grid; gap:.4rem; min-width:0; }
.ls-root .mg-hint { color:var(--ls-muted); font-size:.75rem; line-height:1.55; overflow-wrap:anywhere; }
.ls-root .mg-iconbtn { display:inline-grid; place-items:center; width:2.4rem; height:2.4rem; border:1px solid var(--ls-border); border-radius:10px; background:#fff; color:var(--ls-ink-soft); cursor:pointer; }
.ls-root .mg-iconbtn:hover { border-color:#a6c2b6; background:#f0f6f2; }
.ls-root .mg-iconbtn svg { width:1rem; height:1rem; }
.ls-root .mg-num { font-variant-numeric:tabular-nums; }
.ls-root .mg-stat__value, .ls-root .mg-panel__meta { font-variant-numeric:tabular-nums; }
.ls-root .mg-root { width:100%; min-width:0; }
.ls-root .ls-page-intro { max-width:48rem; }
.ls-root .ls-table-primary { display:flex; flex-direction:column; gap:.2rem; }
.ls-root .ls-table-secondary { color:var(--ls-muted); font-size:.75rem; line-height:1.4; }
.ls-root .ls-drawer-kicker { display:inline-flex; align-items:center; gap:.375rem; margin-bottom:.375rem; color:#6c8176; font-size:.67rem; font-weight:800; letter-spacing:.14em; text-transform:uppercase; }
.ls-root .ls-drawer-kicker svg { width:.875rem; height:.875rem; }
.ls-root .ls-section-head { display:flex; flex-wrap:wrap; align-items:flex-start; justify-content:space-between; gap:.75rem; padding-bottom:.2rem; }
.ls-root .ls-toolbar-field { flex:1 1 18rem; min-width:0; }
.ls-root .ls-search { position:relative; min-width:0; }
.ls-root .ls-search svg { position:absolute; top:50%; left:.875rem; width:1rem; height:1rem; transform:translateY(-50%); color:var(--ls-faint); pointer-events:none; }
.ls-root .ls-search .mg-input { padding-left:2.5rem; }
.ls-root .ls-deposit-meta, .ls-root .ls-agreement-meta { display:flex; flex-direction:column; gap:.25rem; min-width:0; align-items:flex-start; }
.ls-root .ls-inline-actions { display:flex; flex-wrap:wrap; gap:.5rem; align-items:center; justify-content:flex-end; min-width:0; }
.ls-root .ls-callout { display:flex; flex-direction:column; align-items:flex-start; gap:.6rem; margin-top:.65rem; padding:.8rem; border-radius:13px; border:1px solid #ead9b9; background:#fbf5e9; min-width:0; }
.ls-root .ls-callout__title { margin:0; font-size:.79rem; font-weight:800; color:#75582f; }
.ls-root .ls-callout__text { margin:.25rem 0 0; font-size:.74rem; line-height:1.55; color:#7d6c54; }
.ls-root .ls-summary-grid, .ls-root .ls-copy-grid { display:grid; grid-template-columns:minmax(0,1fr); gap:.9rem; }
.ls-root .ls-summary-card, .ls-root .ls-copy-card { display:flex; flex-direction:column; gap:.75rem; padding:1rem; border-radius:16px; border:1px solid var(--ls-border); background:#fff; min-width:0; }
.ls-root .ls-summary-card__label, .ls-root .ls-copy-card__eyebrow { margin:0; font-size:.67rem; font-weight:800; text-transform:uppercase; letter-spacing:.13em; color:var(--ls-muted); }
.ls-root .ls-summary-card__value { margin:0; font-size:1rem; font-weight:750; color:var(--ls-ink); overflow-wrap:anywhere; }
.ls-root .ls-summary-card__hint, .ls-root .ls-copy-card__hint { margin:0; font-size:.75rem; line-height:1.55; color:var(--ls-muted); overflow-wrap:anywhere; }
.ls-root .ls-summary-card__stack, .ls-root .ls-copy-card__stack, .ls-root .ls-form-grid { display:grid; grid-template-columns:minmax(0,1fr); gap:.875rem; min-width:0; }
.ls-root .ls-copy-card__head { display:flex; flex-wrap:wrap; align-items:flex-start; justify-content:space-between; gap:.75rem; }
.ls-root .ls-copy-card__title { margin:.125rem 0 0; font-size:1rem; font-weight:800; color:var(--ls-ink); overflow-wrap:anywhere; }
.ls-root .ls-copy-card__status, .ls-root .ls-helper-row { display:flex; flex-wrap:wrap; gap:.5rem; align-items:center; min-width:0; }
.ls-root .ls-copy-card .mg-textarea { min-height:11rem; overflow-wrap:anywhere; white-space:pre-wrap; }
.ls-root .ls-copy-card .mg-textarea[readonly] { background:#f7f9f6; }
.ls-root .ls-sign-row { display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap; padding:.9rem 1rem; border:1px solid var(--ls-border); border-radius:15px; background:#f7faf7; }
.ls-root .ls-sign-copy { display:flex; align-items:flex-start; gap:.7rem; min-width:0; }
.ls-root .ls-sign-copy__icon { display:grid; place-items:center; flex:0 0 2.1rem; width:2.1rem; height:2.1rem; border-radius:.7rem; background:var(--ls-green); color:#fff; }
.ls-root .ls-sign-copy__icon svg { width:.9rem; height:.9rem; }
.ls-root .ls-sign-copy strong { display:block; color:var(--ls-ink); font-size:.8rem; }
.ls-root .ls-sign-copy span { display:block; margin-top:.18rem; color:var(--ls-muted); font-size:.73rem; line-height:1.5; overflow-wrap:anywhere; }
.ls-root .ls-sign-controls { display:flex; align-items:flex-end; gap:.6rem; flex-wrap:wrap; min-width:0; }
.ls-root .ls-sign-controls .mg-field { min-width:min(8rem,100%); }
.ls-root .ls-status-line { margin:0; font-size:.82rem; line-height:1.55; color:var(--ls-muted); overflow-wrap:anywhere; }
.ls-root .ls-status-line strong { color:var(--ls-ink); }
.ls-root .ls-overflow { overflow-wrap:anywhere; white-space:pre-wrap; }
.ls-root .mg-spin { animation:ls-spin 1s linear infinite; }
@keyframes ls-enter { from { opacity:0; } to { opacity:1; } }
@keyframes ls-fade { from { opacity:0; } to { opacity:1; } }
@keyframes ls-slide-in { from { opacity:.8; transform:translateX(24px); } to { opacity:1; transform:translateX(0); } }
@keyframes ls-shimmer { to { background-position:-200% 0; } }
@keyframes ls-spin { to { transform:rotate(360deg); } }
@media (min-width:720px) {
  .ls-root .ls-summary-grid, .ls-root .ls-copy-grid, .ls-root .ls-form-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .ls-root .ls-sign-row { display:grid; grid-template-columns:minmax(0,1fr) auto; }
}
@media (max-width:1280px) {
  .ls-root .mg-stats { grid-template-columns:repeat(3,minmax(0,1fr)); }
  .ls-root .mg-table { min-width:950px; }
}
@media (max-width:900px) {
  .ls-root .ls-shell { padding:1rem; }
  .ls-root .mg-header { align-items:flex-start; flex-direction:column; gap:1.1rem; border-radius:20px; }
  .ls-root .mg-actions { width:100%; justify-content:flex-start; }
  .ls-root .mg-toolbar { align-items:stretch; flex-direction:column; }
  .ls-root .mg-chips { width:100%; }
  .ls-root .mg-table { min-width:0; table-layout:auto; }
  .ls-root .mg-table thead { display:none; }
  .ls-root .mg-table, .ls-root .mg-table tbody { display:block; width:100%; }
  .ls-root .mg-table tbody { padding:.6rem; }
  .ls-root .mg-table tbody tr { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:0; margin:0 0 .8rem; border:1px solid var(--ls-border); border-radius:16px; overflow:hidden; background:#fff; box-shadow:0 4px 14px #173b2c06; }
  .ls-root .mg-table tbody tr:hover { background:#fbfdfb; border-color:#cbdcd2; }
  .ls-root .mg-table tbody tr:last-child { margin-bottom:0; }
  .ls-root .mg-table td { display:flex; flex-direction:column; align-items:flex-start; min-width:0; padding:.8rem; border-bottom:1px solid #edf1ee; font-size:.81rem; }
  .ls-root .mg-table td::before { content:attr(data-label); margin-bottom:.38rem; color:#7a8d83; font-size:.63rem; line-height:1.3; font-weight:850; letter-spacing:.1em; text-transform:uppercase; }
  .ls-root .mg-table td:nth-child(1) { grid-column:1/-1; background:#f7faf7; }
  .ls-root .mg-table td:nth-child(4) { text-align:left; align-items:flex-start; }
  .ls-root .mg-table td:nth-child(7) { grid-column:1/-1; border-bottom:0; }
  .ls-root .mg-table td:nth-child(7) .ls-inline-actions { justify-content:flex-start; }
  .ls-root .mg-num { text-align:left; }
}
@media (max-width:560px) {
  .ls-root .ls-shell { padding:.7rem; }
  .ls-root .mg-header { padding:1.15rem; border-radius:17px; }
  .ls-root .mg-title { font-size:2.2rem; }
  .ls-root .mg-subtitle { font-size:.86rem; line-height:1.65; }
  .ls-root .mg-stats { grid-template-columns:repeat(2,minmax(0,1fr)); gap:.55rem; }
  .ls-root .mg-stat { padding:.8rem; border-radius:14px; }
  .ls-root .mg-stat__label { font-size:.61rem; letter-spacing:.07em; }
  .ls-root .mg-stat__value { font-size:1.3rem; }
  .ls-root .mg-stat__hint { font-size:.69rem; }
  .ls-root .mg-toolbar { padding:.75rem; border-radius:15px; }
  .ls-root .mg-chips { gap:.25rem; }
  .ls-root .mg-chip { font-size:.7rem; padding:.4rem .55rem; }
  .ls-root .mg-panel { border-radius:16px; }
  .ls-root .mg-panel__head { padding:.95rem; }
  .ls-root .mg-table tbody { padding:.45rem; }
  .ls-root .mg-table tbody tr { grid-template-columns:minmax(0,1fr); }
  .ls-root .mg-table td, .ls-root .mg-table td:nth-child(1), .ls-root .mg-table td:nth-child(7) { grid-column:1; padding:.72rem; }
  .ls-root .mg-table td:nth-child(1) { background:#f7faf7; }
  .ls-root .mg-table td:nth-child(7) { border-bottom:0; }
  .ls-root .mg-drawer__panel { width:100%; border-left:0; }
  .ls-root .mg-drawer__head { padding:1rem; }
  .ls-root .mg-drawer__body { padding:.85rem; }
  .ls-root .mg-drawer__foot { padding:.8rem; }
  .ls-root .mg-drawer__foot .mg-btn { flex:1 1 100%; }
  .ls-root .ls-callout .mg-btn { width:100%; }
  .ls-root .ls-inline-actions { justify-content:flex-start; }
}
@media (prefers-reduced-motion:reduce) {
  .ls-root, .ls-root *, .ls-root *::before, .ls-root *::after { animation-duration:.01ms !important; animation-iteration-count:1 !important; scroll-behavior:auto !important; transition-duration:.01ms !important; }
}
.ls-root .ls-physical-panel { margin-top:1rem; padding:clamp(1rem,2.4vw,1.5rem); border:1px solid #dbe4ef; border-radius:18px; background:#f8fafc; min-width:0; }
.ls-root .ls-physical-panel__title { margin:.2rem 0 0; color:var(--ls-ink); font-family:Georgia,"Times New Roman",serif; font-size:clamp(1.25rem,2.2vw,1.6rem); font-weight:500; line-height:1.25; }
.ls-root .ls-physical-panel__intro { margin:.5rem 0 1rem; max-width:48rem; color:var(--ls-muted); font-size:.82rem; line-height:1.65; }
.ls-root .ls-physical-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.8rem; }
.ls-root .ls-physical-copy { min-width:0; padding:1rem; border:1px solid var(--ls-border); border-radius:14px; background:#fff; }
.ls-root .ls-physical-copy strong { display:block; color:var(--ls-ink); font-size:.88rem; line-height:1.45; }
.ls-root .ls-physical-copy p { margin:.35rem 0 .75rem; color:var(--ls-muted); font-size:.76rem; line-height:1.55; overflow-wrap:anywhere; }
.ls-root .ls-physical-meta { margin:.55rem 0 0; color:#246446; font-size:.76rem; line-height:1.55; overflow-wrap:anywhere; }
.ls-root .ls-physical-actions { display:flex; justify-content:flex-end; margin-top:.9rem; }
@media(max-width:720px) { .ls-root .ls-physical-grid { grid-template-columns:minmax(0,1fr); } .ls-root .ls-physical-actions .mg-btn { width:100%; } }
.ls-root .ls-signature-panel {
  margin-top: 1.15rem; padding: clamp(1rem, 2.4vw, 1.5rem);
  border: 1px solid #dce7e0; border-radius: 20px;
  background: radial-gradient(ellipse at 100% 0%, #e9f2ec 0%, transparent 42%), #fff;
  box-shadow: 0 10px 30px #183c2e07; min-width: 0;
}
.ls-root .ls-signature-panel__head { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; flex-wrap:wrap; margin-bottom:1.1rem; }
.ls-root .ls-signature-panel__title { margin:.25rem 0 0; color:var(--ls-ink); font-family:Georgia,"Times New Roman",serif; font-size:clamp(1.35rem,2.4vw,1.8rem); font-weight:500; line-height:1.2; letter-spacing:-.025em; }
.ls-root .ls-signature-panel__intro { margin:.45rem 0 0; max-width:45rem; color:var(--ls-muted); font-size:.82rem; line-height:1.65; }
.ls-root .ls-signature-steps { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.75rem; }
.ls-root .ls-signature-step { display:grid; grid-template-columns:2.35rem minmax(0,1fr); align-items:start; gap:.75rem; padding:1rem; border:1px solid var(--ls-border); border-radius:15px; background:#fff; min-width:0; }
.ls-root .ls-signature-step__icon { display:grid; place-items:center; width:2.2rem; height:2.2rem; border:1px solid #dce5df; border-radius:12px; color:#6b7f75; background:#f5f8f5; font-size:.82rem; font-weight:850; }
.ls-root .ls-signature-step__icon svg { width:1.05rem; height:1.05rem; }
.ls-root .ls-signature-step--complete { border-color:#cde3d5; background:#f5faf6; }
.ls-root .ls-signature-step--complete .ls-signature-step__icon { border-color:#c4e0ce; background:#e3f2e8; color:#246446; }
.ls-root .ls-signature-step__content { min-width:0; }
.ls-root .ls-signature-step__content strong { display:block; color:var(--ls-ink); font-size:.85rem; line-height:1.4; }
.ls-root .ls-signature-step__content p { margin:.3rem 0 0; color:var(--ls-muted); font-size:.76rem; line-height:1.6; overflow-wrap:anywhere; }
.ls-root .ls-signature-step > .mg-badge { grid-column:2; justify-self:start; }
.ls-root .ls-signature-action { display:flex; align-items:center; justify-content:space-between; gap:1.2rem; flex-wrap:wrap; margin-top:.85rem; padding:1rem; border:1px solid #d9e5dd; border-radius:16px; background:#f7faf7; min-width:0; }
.ls-root .ls-signature-action__copy { display:flex; align-items:flex-start; gap:.7rem; flex:1 1 17rem; min-width:0; }
.ls-root .ls-signature-action__copy strong { display:block; color:var(--ls-ink); font-size:.86rem; }
.ls-root .ls-signature-action__copy p { margin:.3rem 0 0; color:var(--ls-muted); font-size:.76rem; line-height:1.6; overflow-wrap:anywhere; }
.ls-root .ls-signature-action .ls-sign-controls { justify-content:flex-end; align-items:flex-end; }
.ls-root .ls-signature-action .ls-sign-controls .mg-field { width:min(11rem,100%); }
.ls-root .ls-signature-action .mg-btn { min-height:44px; }
.ls-root .ls-signature-locked { display:flex; align-items:flex-start; gap:.7rem; margin-top:.85rem; padding:.95rem 1rem; border:1px solid #c8e2d1; border-radius:14px; color:#245d43; background:#edf7f0; font-size:.8rem; line-height:1.6; }
.ls-root .ls-signature-locked svg { width:1.1rem; height:1.1rem; flex:0 0 auto; margin-top:.15rem; }
.ls-root .ls-signature-locked strong { display:block; margin-bottom:.1rem; }
@media (max-width:720px) {
  .ls-root .ls-signature-steps { grid-template-columns:minmax(0,1fr); }
  .ls-root .ls-signature-panel { border-radius:16px; }
  .ls-root .ls-signature-action { align-items:stretch; }
  .ls-root .ls-signature-action .ls-sign-controls { width:100%; align-items:stretch; }
  .ls-root .ls-signature-action .ls-sign-controls .mg-field { width:100%; flex:1 1 100%; }
  .ls-root .ls-signature-action .mg-btn { width:100%; }
}

`;

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseLeaseRecord(record: Record<string, unknown>): LeaseRecord {
  const tenantRecord = toRecord(record.tenant);
  const unit = toRecord(record.unit);
  const depositRecord = toRecord(record.deposit);
  const managerPhysicalVerifier = toRecord(record.manager_physical_confirmed_by);
  const tenantPhysicalVerifier = toRecord(record.tenant_physical_confirmed_by);
  const unitNumber = asString(unit.unit_number);
  const hasDeposit =
    Object.keys(depositRecord).length > 0 || asNumber(record.deposit_amount) > 0;

  return {
    id: asNumber(record.id),
    tenant: Object.keys(tenantRecord).length > 0
      ? {
          id: asNumber(tenantRecord.id),
          name:
            asString(tenantRecord.name) ||
            [asString(tenantRecord.first_name), asString(tenantRecord.last_name)]
              .filter(Boolean)
              .join(" ")
              .trim() ||
            "Unnamed tenant",
          email: asString(tenantRecord.email) || null,
          phone: asString(tenantRecord.phone) || null,
          national_id: asString(tenantRecord.national_id) || null,
          employer_name: asString(tenantRecord.employer_name) || null,
          employer_phone: asString(tenantRecord.employer_phone) || null,
          next_of_kin_name: asString(tenantRecord.next_of_kin_name) || null,
          next_of_kin_phone: asString(tenantRecord.next_of_kin_phone) || null,
        }
      : null,
    property: namedRef(record.property, "name"),
    unit: unitNumber
      ? {
          id: asNumber(unit.id),
          unit_number: unitNumber,
          standard_rent: asNumber(unit.monthly_rent),
          standard_deposit: asNumber(unit.deposit_amount),
        }
      : null,
    start_date: asString(record.start_date) || null,
    end_date: asString(record.end_date) || null,
    requested_move_in_date: asString(record.requested_move_in_date) || null,
    requested_move_out_date: asString(record.requested_move_out_date) || null,
    monthly_rent: asNumber(record.monthly_rent),
    deposit_amount:
      depositRecord.amount_required !== undefined
        ? asNumber(depositRecord.amount_required)
        : asNumber(record.deposit_amount),
    balance: asNumber(record.balance),
    status: asString(record.status) || "active",
    notes: asString(record.notes) || null,
    manager_terms: asString(record.manager_terms) || null,
    tenant_terms: asString(record.tenant_terms) || null,
    manager_signature: asString(record.manager_signature) || null,
    tenant_signature: asString(record.tenant_signature) || null,
    manager_signed_at: asString(record.manager_signed_at) || null,
    tenant_signed_at: asString(record.tenant_signed_at) || null,
    manager_copy_physical_signed_on: asString(record.manager_copy_physical_signed_on) || null,
    manager_copy_physical_confirmed_at: asString(record.manager_copy_physical_confirmed_at) || null,
    manager_physical_confirmed_by: asString(managerPhysicalVerifier.name) || asString(record.manager_physical_confirmed_by) || null,
    tenant_copy_physical_signed_on: asString(record.tenant_copy_physical_signed_on) || null,
    tenant_copy_physical_confirmed_at: asString(record.tenant_copy_physical_confirmed_at) || null,
    tenant_physical_confirmed_by: asString(tenantPhysicalVerifier.name) || asString(record.tenant_physical_confirmed_by) || null,
    physical_signing_notes: asString(record.physical_signing_notes) || null,
    agreement_finalized: asBoolean(record.agreement_finalized),
    deposit: hasDeposit
      ? {
          amount_required:
            depositRecord.amount_required !== undefined
              ? asNumber(depositRecord.amount_required)
              : asNumber(record.deposit_amount),
          amount_paid: asNumber(depositRecord.amount_paid),
          payment_date: asString(depositRecord.payment_date) || null,
          status: asString(depositRecord.status) || null,
          tenant_marked_paid_at:
            asString(depositRecord.tenant_marked_paid_at) || null,
        }
      : null,
  };
}

function parseLeases(payload: unknown): LeaseRecord[] {
  const parsed = rows(payload);
  if (parsed.length > 0) return parsed.map(parseLeaseRecord);

  // Keep the register resilient if an API response is wrapped as
  // { leases: [...] } by a proxy/versioned endpoint.
  const wrapped = toRecord(payload).leases;
  return Array.isArray(wrapped)
    ? wrapped.map(toRecord).map(parseLeaseRecord)
    : [];
}

function parseLeaseUpdate(payload: unknown): LeaseRecord | null {
  const outer = toRecord(payload);
  const record = toRecord(outer.lease ?? payload);
  if (Object.keys(record).length === 0) return null;
  return parseLeaseRecord(record);
}

function classify(lease: LeaseRecord): LeaseView["computed"] {
  const today = new Date().toISOString().slice(0, 10);
  const startDate = lease.start_date?.slice(0, 10) ?? null;
  const endDate = lease.end_date?.slice(0, 10) ?? null;

  if (lease.status === "pending") return "upcoming";
  if (lease.status === "ended" || lease.status === "terminated") {
    return "expired";
  }
  if (startDate && startDate > today) return "upcoming";
  if (lease.status === "notice") return "notice";
  if (endDate && endDate < today) return "expired";

  const remaining = daysBetween(lease.end_date);

  if (remaining !== null && remaining < 0) return "expired";
  if (remaining !== null && remaining <= EXPIRING_WINDOW_DAYS) return "expiring";

  return "active";
}

function badgeClass(view: LeaseView["computed"]): string {
  if (view === "active") return "mg-badge mg-badge--ok";
  if (view !== "expired") return "mg-badge mg-badge--warn";
  return "mg-badge mg-badge--danger";
}

function depositRequired(lease: LeaseRecord): number {
  return lease.deposit?.amount_required ?? lease.deposit_amount;
}

function depositPaid(lease: LeaseRecord): number {
  return lease.deposit?.amount_paid ?? 0;
}

function depositStatus(lease: LeaseRecord): string {
  return lease.deposit?.status ?? (depositRequired(lease) > 0 ? "unpaid" : "not_required");
}

function hasPendingDepositConfirmation(lease: LeaseRecord): boolean {
  return Boolean(
    lease.deposit?.tenant_marked_paid_at && depositStatus(lease) !== "paid"
  );
}

function agreementState(lease: LeaseRecord): {
  badgeClass: string;
  label: string;
  detail: string;
} {
  if (lease.agreement_finalized) {
    return {
      badgeClass: "mg-badge mg-badge--ok",
      label: "Agreement fully executed",
      detail: "Both copies have been signed.",
    };
  }

  const pending: string[] = [];
  if (!lease.manager_signed_at && !lease.manager_copy_physical_confirmed_at) pending.push("manager copy");
  if (!lease.tenant_signed_at && !lease.tenant_copy_physical_confirmed_at) pending.push("tenant copy");

  return {
    badgeClass: "mg-badge mg-badge--warn",
    label: "Awaiting signatures",
    detail: `Pending ${pending.join(" and ")}.`,
  };
}

const FILTERS: { id: LeaseFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending review" },
  { id: "upcoming", label: "Upcoming" },
  { id: "active", label: "Active" },
  { id: "notice", label: "Notice" },
  { id: "expiring", label: "Expiring soon" },
  { id: "expired", label: "Expired" },
];

/* ------------------------------------------------------------------ */
/*  PAGE                                                                */
/* ------------------------------------------------------------------ */

function ManagerLeasesPage() {
  const currency = useMemo(readCurrency, []);
  const [params, setParams] = useSearchParams();

  const [leases, setLeases] = useState<LeaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LeaseFilter>("all");
  const [managerTermsDraft, setManagerTermsDraft] = useState("");
  const [tenantTermsDraft, setTenantTermsDraft] = useState("");
  const [managerInitials, setManagerInitials] = useState("");
  const [managerStartDate, setManagerStartDate] = useState("");
  const [managerEndDate, setManagerEndDate] = useState("");
  const [managerRentDraft, setManagerRentDraft] = useState("0");
  const [managerDepositRequiredDraft, setManagerDepositRequiredDraft] = useState("0");
  const [tenantPhoneDraft, setTenantPhoneDraft] = useState("");
  const [tenantNationalIdDraft, setTenantNationalIdDraft] = useState("");
  const [tenantEmployerDraft, setTenantEmployerDraft] = useState("");
  const [tenantEmployerPhoneDraft, setTenantEmployerPhoneDraft] = useState("");
  const [tenantNextOfKinDraft, setTenantNextOfKinDraft] = useState("");
  const [tenantNextOfKinPhoneDraft, setTenantNextOfKinPhoneDraft] = useState("");
  const [savingTenantDetails, setSavingTenantDetails] = useState(false);
  const [depositAmountDraft, setDepositAmountDraft] = useState("0");
  const [depositDateDraft, setDepositDateDraft] = useState(todayDate());
  const [drawerError, setDrawerError] = useState("");
  const [drawerNotice, setDrawerNotice] = useState("");
  const [savingTerms, setSavingTerms] = useState(false);
  const [signingManager, setSigningManager] = useState(false);
  const [physicalManagerSignedOnDraft, setPhysicalManagerSignedOnDraft] = useState("");
  const [physicalTenantSignedOnDraft, setPhysicalTenantSignedOnDraft] = useState("");
  const [physicalSigningNotesDraft, setPhysicalSigningNotesDraft] = useState("");
  const [savingPhysicalSignatures, setSavingPhysicalSignatures] = useState(false);
  const [savingDeposit, setSavingDeposit] = useState(false);
  const [confirmingLeaseId, setConfirmingLeaseId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const payload = await apiRequest("/leases");
      setLeases(parseLeases(payload));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load leases.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const views: LeaseView[] = useMemo(
    () => leases.map((lease) => ({ ...lease, computed: classify(lease) })),
    [leases]
  );

  const selectedLeaseId = Number(params.get("lease") ?? "") || null;
  const selectedLease = useMemo(
    () => views.find((lease) => lease.id === selectedLeaseId) ?? null,
    [selectedLeaseId, views]
  );

  useEffect(() => {
    if (!selectedLeaseId) return;

    const interval = window.setInterval(async () => {
      try {
        const payload = await apiRequest("/leases");
        const fresh = parseLeases(payload);
        const freshSelected = fresh.find((lease) => lease.id === selectedLeaseId);
        if (!freshSelected) return;

        setLeases((current) =>
          current.map((lease) =>
            lease.id === selectedLeaseId
              ? {
                  ...freshSelected,
                }
              : lease
          )
        );
      } catch {
        // Keep the drawer usable if a background refresh temporarily fails.
      }
    }, 10000);

    return () => window.clearInterval(interval);
  }, [selectedLeaseId]);

  useEffect(() => {
    if (!selectedLease) return;

    setManagerTermsDraft(selectedLease.manager_terms ?? "");
    setTenantTermsDraft(selectedLease.tenant_terms ?? "");
    setManagerInitials("");
    setPhysicalManagerSignedOnDraft(selectedLease.manager_copy_physical_signed_on?.slice(0, 10) ?? "");
    setPhysicalTenantSignedOnDraft(selectedLease.tenant_copy_physical_signed_on?.slice(0, 10) ?? "");
    setPhysicalSigningNotesDraft(selectedLease.physical_signing_notes ?? "");
    setManagerStartDate(
      selectedLease.start_date?.slice(0, 10) ??
        selectedLease.requested_move_in_date?.slice(0, 10) ??
        ""
    );
    setManagerEndDate(
      selectedLease.end_date?.slice(0, 10) ??
        selectedLease.requested_move_out_date?.slice(0, 10) ??
        ""
    );
    setManagerRentDraft(String(selectedLease.monthly_rent));
    setManagerDepositRequiredDraft(String(depositRequired(selectedLease)));
    setTenantPhoneDraft(selectedLease.tenant?.phone ?? "");
    setTenantNationalIdDraft(selectedLease.tenant?.national_id ?? "");
    setTenantEmployerDraft(selectedLease.tenant?.employer_name ?? "");
    setTenantEmployerPhoneDraft(selectedLease.tenant?.employer_phone ?? "");
    setTenantNextOfKinDraft(selectedLease.tenant?.next_of_kin_name ?? "");
    setTenantNextOfKinPhoneDraft(selectedLease.tenant?.next_of_kin_phone ?? "");
    setDepositAmountDraft(String(depositPaid(selectedLease)));
    setDepositDateDraft(
      selectedLease.deposit?.payment_date?.slice(0, 10) ?? todayDate()
    );
    setDrawerError("");
  }, [
    selectedLease,
    selectedLeaseId,
    selectedLease?.deposit?.payment_date,
    selectedLease?.manager_terms,
    selectedLease?.tenant_terms,
  ]);

  const counts = useMemo(
    () => ({
      all: views.length,
      pending: views.filter((lease) => lease.status === "pending").length,
      upcoming: views.filter((lease) => lease.computed === "upcoming" && lease.status !== "pending").length,
      active: views.filter((lease) => lease.computed === "active").length,
      notice: views.filter((lease) => lease.computed === "notice").length,
      expiring: views.filter((lease) => lease.computed === "expiring").length,
      expired: views.filter((lease) => lease.computed === "expired").length,
    }),
    [views]
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return views.filter((lease) => {
      if (filter !== "all" && (filter === "pending" ? lease.status !== "pending" : lease.computed !== filter)) return false;
      if (!needle) return true;

      return [
        lease.tenant?.name ?? "",
        lease.tenant?.email ?? "",
        lease.tenant?.phone ?? "",
        lease.tenant?.national_id ?? "",
        lease.property?.name ?? "",
        lease.unit?.unit_number ?? "",
        lease.status ?? "",
        lease.computed ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [views, filter, query]);

  const totals = useMemo(() => {
    const active = views.filter((lease) => lease.computed !== "expired");

    return {
      contracted: active
        .filter((lease) => lease.computed !== "upcoming")
        .reduce((sum, lease) => sum + lease.monthly_rent, 0),
      deposits: active.reduce((sum, lease) => sum + depositRequired(lease), 0),
      arrears: views.reduce((sum, lease) => sum + Math.max(lease.balance, 0), 0),
    };
  }, [views]);

  const agreementSummary = selectedLease ? agreementState(selectedLease) : null;
  const managerSideSigned = selectedLease ? Boolean(selectedLease.manager_signed_at || selectedLease.manager_copy_physical_confirmed_at) : false;
  const tenantSideSigned = selectedLease ? Boolean(selectedLease.tenant_signed_at || selectedLease.tenant_copy_physical_confirmed_at) : false;
  const managerTermsChanged = selectedLease
    ? managerTermsDraft !== (selectedLease.manager_terms ?? "")
    : false;
  const depositAmountNumber = Number(depositAmountDraft);
  const depositValid =
    selectedLease !== null &&
    depositAmountDraft.trim().length > 0 &&
    Number.isFinite(depositAmountNumber) &&
    depositAmountNumber >= 0 &&
    depositAmountNumber <= depositRequired(selectedLease) &&
    depositDateDraft.length > 0;

  function openLease(leaseId: number) {
    const next = new URLSearchParams(params);
    next.set("lease", String(leaseId));
    setParams(next, { replace: true });
  }

  function closeLease() {
    const next = new URLSearchParams(params);
    next.delete("lease");
    setParams(next, { replace: true });
  }

  function syncLease(updatedLease: LeaseRecord) {
    setLeases((current) =>
      current.map((lease) => (lease.id === updatedLease.id ? updatedLease : lease))
    );
  }

  async function patchLease(
    leaseId: number,
    body: Record<string, unknown>,
    notice: string
  ) {
    const payload = await apiRequest(`/leases/${leaseId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    const updatedLease = parseLeaseUpdate(payload);
    if (updatedLease) syncLease(updatedLease);
    setDrawerNotice(notice);
    setDrawerError("");
    await load();
    return updatedLease;
  }

  async function confirmDepositReceipt(lease: LeaseRecord) {
    const required = depositRequired(lease);
    if (required <= 0) return;

    setConfirmingLeaseId(lease.id);
    if (selectedLeaseId === lease.id) {
      setDrawerNotice("");
      setDrawerError("");
    }

    try {
      const payload = await apiRequest(`/leases/${lease.id}/deposit`, {
        method: "PATCH",
        body: JSON.stringify({
          amount_paid: required,
          payment_date: todayDate(),
        }),
      });
      const updated = parseLeaseUpdate(payload);
      if (updated) syncLease(updated);
      await load();
      setDrawerNotice("Deposit marked as fully received.");

      if (updated && selectedLeaseId === lease.id) {
        setDepositAmountDraft(String(depositPaid(updated)));
        setDepositDateDraft(updated.deposit?.payment_date?.slice(0, 10) ?? todayDate());
      }
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Could not confirm the deposit yet.";
      if (selectedLeaseId === lease.id) setDrawerError(message);
      else setError(message);
    } finally {
      setConfirmingLeaseId(null);
    }
  }

  async function saveTenantDetails() {
    if (!selectedLease?.tenant || savingTenantDetails) return;

    setSavingTenantDetails(true);
    setDrawerError("");
    setDrawerNotice("");

    try {
      const response = await apiRequest(`/tenants/${selectedLease.tenant.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          phone: tenantPhoneDraft.trim(),
          national_id: tenantNationalIdDraft.trim() || null,
          employer_name: tenantEmployerDraft.trim() || null,
          employer_phone: tenantEmployerPhoneDraft.trim() || null,
          next_of_kin_name: tenantNextOfKinDraft.trim() || null,
          next_of_kin_phone: tenantNextOfKinPhoneDraft.trim() || null,
        }),
      });

      const tenant = toRecord(toRecord(response).tenant);
      const freshPayload = await apiRequest("/leases");
      const fresh = parseLeases(freshPayload).find((lease) => lease.id === selectedLease.id);

      if (fresh) {
        syncLease(fresh);
        setTenantPhoneDraft(fresh.tenant?.phone ?? "");
        setTenantNationalIdDraft(fresh.tenant?.national_id ?? "");
        setTenantEmployerDraft(fresh.tenant?.employer_name ?? "");
        setTenantEmployerPhoneDraft(fresh.tenant?.employer_phone ?? "");
        setTenantNextOfKinDraft(fresh.tenant?.next_of_kin_name ?? "");
        setTenantNextOfKinPhoneDraft(fresh.tenant?.next_of_kin_phone ?? "");
      } else if (Object.keys(tenant).length > 0) {
        setDrawerNotice("Tenant details saved.");
      }

      setDrawerNotice("Tenant details saved. The unsigned agreement copies have been updated.");
    } catch (cause) {
      setDrawerError(
        cause instanceof Error ? cause.message : "Could not save the tenant details right now."
      );
    } finally {
      setSavingTenantDetails(false);
    }
  }

  async function saveAgreementTerms() {
    if (!selectedLease || savingTerms) return;

    const body: Record<string, unknown> = {};
    if (managerTermsChanged) body.manager_terms = managerTermsDraft;
    if (selectedLease && managerStartDate !== (selectedLease.start_date?.slice(0, 10) ?? "")) {
      body.start_date = managerStartDate || null;
    }
    if (selectedLease && managerEndDate !== (selectedLease.end_date?.slice(0, 10) ?? "")) {
      body.end_date = managerEndDate || null;
    }
    if (selectedLease && Number(managerRentDraft) !== selectedLease.monthly_rent) {
      body.monthly_rent = Number(managerRentDraft);
    }
    if (selectedLease && Number(managerDepositRequiredDraft) !== depositRequired(selectedLease)) {
      body.deposit_amount = Number(managerDepositRequiredDraft);
    }
    if (Object.keys(body).length === 0) {
      setDrawerNotice("No agreement text changes to save.");
      setDrawerError("");
      return;
    }

    setSavingTerms(true);
    setDrawerError("");
    setDrawerNotice("");

    try {
      const updated = await patchLease(
        selectedLease.id,
        body,
        "Agreement text saved. Any edited copy now needs to be re-signed."
      );
      if (updated) {
        setManagerTermsDraft(updated.manager_terms ?? "");
        setTenantTermsDraft(updated.tenant_terms ?? "");
        setManagerStartDate(updated.start_date?.slice(0, 10) ?? "");
        setManagerEndDate(updated.end_date?.slice(0, 10) ?? "");
        setManagerRentDraft(String(updated.monthly_rent));
        setManagerDepositRequiredDraft(String(depositRequired(updated)));
      }
    } catch (cause) {
      setDrawerError(
        cause instanceof Error
          ? cause.message
          : "Could not save the agreement text right now."
      );
    } finally {
      setSavingTerms(false);
    }
  }

  async function signManagerCopy() {
    if (!selectedLease || signingManager) return;
    const signature = managerInitials.trim().toUpperCase();
    if (!signature) {
      setDrawerError("Enter your initials before signing.");
      setDrawerNotice("");
      return;
    }

    setSigningManager(true);
    setDrawerError("");
    setDrawerNotice("");

    try {
      const updated = await patchLease(
        selectedLease.id,
        { manager_signature: signature },
        "Manager copy signed."
      );
      if (updated) setManagerInitials("");
    } catch (cause) {
      setDrawerError(
        cause instanceof Error ? cause.message : "Could not sign the agreement yet."
      );
    } finally {
      setSigningManager(false);
    }
  }

  async function recordPhysicalSignatures() {
    if (!selectedLease || savingPhysicalSignatures) return;
    const managerDate = physicalManagerSignedOnDraft.trim();
    const tenantDate = physicalTenantSignedOnDraft.trim();
    const managerAlreadyConfirmed = Boolean(selectedLease.manager_copy_physical_confirmed_at);
    const tenantAlreadyConfirmed = Boolean(selectedLease.tenant_copy_physical_confirmed_at);
    if ((!managerDate || managerAlreadyConfirmed) && (!tenantDate || tenantAlreadyConfirmed) &&
        physicalSigningNotesDraft.trim() === (selectedLease.physical_signing_notes ?? "")) {
      setDrawerNotice("No new physical signature details to save.");
      setDrawerError("");
      return;
    }

    setSavingPhysicalSignatures(true);
    setDrawerError("");
    setDrawerNotice("");
    try {
      const payload = await apiRequest(`/leases/${selectedLease.id}/physical-signatures`, {
        method: "PATCH",
        body: JSON.stringify({
          manager_copy_signed_on: managerDate || null,
          tenant_copy_signed_on: tenantDate || null,
          physical_signing_notes: physicalSigningNotesDraft.trim() || null,
        }),
      });
      const updated = parseLeaseUpdate(payload);
      if (updated) {
        syncLease(updated);
        setPhysicalManagerSignedOnDraft(updated.manager_copy_physical_signed_on?.slice(0, 10) ?? "");
        setPhysicalTenantSignedOnDraft(updated.tenant_copy_physical_signed_on?.slice(0, 10) ?? "");
        setPhysicalSigningNotesDraft(updated.physical_signing_notes ?? "");
      }
      setDrawerNotice("Physical signature records saved. The system records who verified each copy and when; no digital signature was created.");
      await load();
    } catch (cause) {
      setDrawerError(cause instanceof Error ? cause.message : "Could not record the physical signatures.");
    } finally {
      setSavingPhysicalSignatures(false);
    }
  }

  async function recordDepositPayment() {
    if (!selectedLease || savingDeposit || !depositValid) return;

    setSavingDeposit(true);
    setDrawerError("");
    setDrawerNotice("");

    try {
      const payload = await apiRequest(`/leases/${selectedLease.id}/deposit`, {
        method: "PATCH",
        body: JSON.stringify({
          amount_paid: depositAmountNumber,
          payment_date: depositDateDraft,
        }),
      });
      const updated = parseLeaseUpdate(payload);
      if (updated) syncLease(updated);
      await load();
      if (updated) {
        setDepositAmountDraft(String(depositPaid(updated)));
        setDepositDateDraft(updated.deposit?.payment_date?.slice(0, 10) ?? depositDateDraft);
      }
    } catch (cause) {
      setDrawerError(
        cause instanceof Error
          ? cause.message
          : "Could not record the deposit payment right now."
      );
    } finally {
      setSavingDeposit(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="ls-root">
        <style>{leaseStyles}</style>

        <div className="ls-shell">
          <header className="mg-header">
            <div>
              <span className="mg-eyebrow">
                <FileText />
                Agreements
              </span>
              <h1 className="mg-title">Leases</h1>
              <p className="mg-subtitle">
                Review each agreement, confirm deposit receipts and keep both the
                manager and tenant copies signed before a lease is treated as fully
                executed.
              </p>
            </div>

            <div className="mg-actions">
              <button
                type="button"
                className="mg-btn mg-btn--subtle"
                onClick={() => void load()}
                disabled={loading}
              >
                <RefreshCw className={loading ? "mg-spin" : undefined} />
                Refresh
              </button>
            </div>
          </header>

          {error && (
            <div className="mg-alert" role="alert">
              <AlertCircle />
              <span>{error}</span>
            </div>
          )}

          <section className="mg-stats" aria-label="Lease summary">
            <article className="mg-stat">
              <p className="mg-stat__label">Needs review</p>
              <p className="mg-stat__value">{formatNumber(views.filter((lease) => lease.status === "pending").length)}</p>
              <p className="mg-stat__hint mg-stat__hint--warn">Tenant reservations</p>
            </article>
            <article className="mg-stat">
              <p className="mg-stat__label">Active leases</p>
              <p className="mg-stat__value">{formatNumber(counts.active)}</p>
            </article>
            <article className="mg-stat">
              <p className="mg-stat__label">Expiring soon</p>
              <p className="mg-stat__value">{formatNumber(counts.expiring)}</p>
              <p className="mg-stat__hint mg-stat__hint--warn">
                Within {EXPIRING_WINDOW_DAYS} days
              </p>
            </article>
            <article className="mg-stat">
              <p className="mg-stat__label">Contracted rent</p>
              <p className="mg-stat__value">
                {formatMoney(totals.contracted, currency)}
              </p>
              <p className="mg-stat__hint">Per month</p>
            </article>
            <article className="mg-stat">
              <p className="mg-stat__label">Deposits required</p>
              <p className="mg-stat__value">
                {formatMoney(totals.deposits, currency)}
              </p>
            </article>
            <article className="mg-stat">
              <p className="mg-stat__label">Outstanding</p>
              <p className="mg-stat__value">
                {formatMoney(totals.arrears, currency)}
              </p>
              <p className="mg-stat__hint mg-stat__hint--warn">Tenant arrears</p>
            </article>
          </section>

          <div className="mg-toolbar">
            <div className="ls-toolbar-field">
              <label className="mg-label" htmlFor="ls-search">
                Search leases
              </label>
              <div className="ls-search">
                <Search />
                <input
                  id="ls-search"
                  className="mg-input"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search tenant, phone, email, property or unit…"
                />
              </div>
            </div>

            <div className="mg-chips" role="group" aria-label="Filter leases">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`mg-chip${item.id === filter ? " mg-chip--on" : ""}`}
                  onClick={() => setFilter(item.id)}
                  aria-pressed={item.id === filter}
                >
                  {item.label}
                  <span className="mg-chip__count">
                    {counts[item.id as keyof typeof counts]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <section className="mg-panel">
            <div className="mg-panel__head">
              <h2 className="mg-panel__title">
                <CalendarClock />
                Lease register
              </h2>
              <span className="mg-panel__meta">
                {visible.length} of {views.length}
              </span>
            </div>

            {loading ? (
              <div className="mg-panel__body">
                {[0, 1, 2, 3].map((key) => (
                  <span
                    key={key}
                    className="mg-skeleton"
                    style={{ height: "2.25rem", marginBottom: "0.625rem" }}
                  />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <div className="mg-empty">
                <FileText />
                <p className="mg-empty__title">
                  {views.length === 0 ? "No leases yet" : "No leases match"}
                </p>
                <p className="mg-empty__text">
                  {views.length === 0
                    ? "Place a tenant in a unit to create the first lease and start tracking rent."
                    : "Try another tenant, property or status filter."}
                </p>
              </div>
            ) : (
              <div className="mg-tablewrap">
                <table className="mg-table">
                  <thead>
                    <tr>
                      <th scope="col">Tenant</th>
                      <th scope="col">Unit</th>
                      <th scope="col">Term</th>
                      <th scope="col" className="mg-num">
                        Rent
                      </th>
                      <th scope="col">Deposit</th>
                      <th scope="col">Agreement</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((lease) => {
                      const agreement = agreementState(lease);
                      const required = depositRequired(lease);
                      const paid = depositPaid(lease);

                      return (
                        <tr key={lease.id}>
                          <td data-label="Tenant">
                            <div className="mg-person">
                              <span className="mg-avatar" aria-hidden="true">
                                {initials(lease.tenant?.name ?? "")}
                              </span>
                              <div>
                                <span className="mg-strong">
                                  {lease.tenant?.name ?? "⚠ Tenant not linked"}
                                </span>
                                {lease.tenant?.phone || lease.tenant?.email ? (
                                  <span className="mg-sub">
                                    {[lease.tenant.phone, lease.tenant.email].filter(Boolean).join(" · ")}
                                  </span>
                                ) : (
                                  <span className="mg-sub">Contact details not provided</span>
                                )}
                                {lease.balance > 0 && (
                                  <span className="mg-sub">
                                    {formatMoney(lease.balance, currency)} outstanding
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td data-label="Unit">
                            <span className="mg-strong">
                              {lease.unit?.unit_number ?? "—"}
                            </span>
                            <span className="mg-sub">
                              {lease.property?.name ?? "No property"}
                            </span>
                            <span className="mg-sub">
                              {lease.unit ? "Unit assigned" : "Unit not linked"}
                            </span>
                          </td>
                          <td data-label="Term" className="mg-nowrap">
                            {lease.start_date ? formatDate(lease.start_date) : formatDate(lease.requested_move_in_date)}
                            {" → "}
                            {lease.end_date ? formatDate(lease.end_date) : formatDate(lease.requested_move_out_date)}
                            <span className="mg-sub">
                              {lease.start_date ? ("Ends " + relativeDays(lease.end_date)) : "Tenant-requested dates · awaiting manager confirmation"}
                            </span>
                          </td>
                          <td data-label="Rent" className="mg-num">
                            {formatMoney(lease.monthly_rent, currency)}
                          </td>
                          <td data-label="Deposit">
                            <div className="ls-deposit-meta">
                              <span className="mg-strong">
                                {formatMoney(required, currency)} required
                              </span>
                              <span className="mg-sub">
                                {titleCase(depositStatus(lease))} · Received{" "}
                                {formatMoney(paid, currency)}
                              </span>
                            </div>
                            {hasPendingDepositConfirmation(lease) && (
                              <div className="ls-callout">
                                <div>
                                  <p className="ls-callout__title">
                                    Tenant says they&apos;ve paid
                                  </p>
                                  <p className="ls-callout__text">
                                    Mark it received once the funds arrive.
                                  </p>
                                </div>
                                <div className="ls-inline-actions">
                                  <button
                                    type="button"
                                    className="mg-btn mg-btn--primary mg-btn--sm"
                                    onClick={() => void confirmDepositReceipt(lease)}
                                    disabled={confirmingLeaseId === lease.id}
                                  >
                                    <Wallet />
                                    {confirmingLeaseId === lease.id
                                      ? "Confirming…"
                                      : "Confirm receipt"}
                                  </button>
                                </div>
                              </div>
                            )}
                          </td>
                          <td data-label="Agreement">
                            <div className="ls-agreement-meta">
                              <span className={agreement.badgeClass}>
                                {agreement.label}
                              </span>
                              <span className="mg-sub">{agreement.detail}</span>
                            </div>
                          </td>
                          <td data-label="Status">
                            <div className="ls-inline-actions">
                              <span className={badgeClass(lease.computed)}>
                                {lease.status === "pending"
                                  ? (lease.tenant ? "Reserved / pending" : "Pending assignment")
                                  : lease.computed === "expiring"
                                    ? "Expiring soon"
                                    : titleCase(lease.computed)}
                              </span>
                              <button
                                type="button"
                                className="mg-btn mg-btn--subtle mg-btn--sm"
                                onClick={() => openLease(lease.id)}
                              >
                                <FileSignature />
                                Open panel
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {selectedLease && agreementSummary && (
          <div
            className="mg-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lease-agreement-title"
            onClick={(event) => {
              if (event.target === event.currentTarget) closeLease();
            }}
          >
            <div className="mg-drawer__panel">
              <div className="mg-drawer__head">
                <div>
                  <span className="ls-drawer-kicker">
                    <FileText />
                    Lease record #{selectedLease.id}
                  </span>
                  <h2 className="mg-drawer__title" id="lease-agreement-title">
                    {selectedLease.tenant?.name ?? "⚠ Tenant not linked"} · {selectedLease.unit?.unit_number ?? "—"}
                  </h2>
                  <p className="mg-drawer__sub">
                    {selectedLease.property?.name ?? "No property"} · Unit {selectedLease.unit?.unit_number ?? "—"}
                  </p>
                </div>
                <button
                  type="button"
                  className="mg-iconbtn"
                  onClick={closeLease}
                  aria-label="Close lease panel"
                >
                  <X />
                </button>
              </div>

              <div className="mg-drawer__body">
                {drawerError && (
                  <div className="mg-alert" role="alert">
                    <AlertCircle />
                    <span>{drawerError}</span>
                  </div>
                )}

                {drawerNotice && (
                  <div className="mg-alert mg-alert--ok" role="status">
                    <CheckCircle2 />
                    <span>{drawerNotice}</span>
                  </div>
                )}

                <section className="ls-summary-card" aria-label="Lease assignment">
                  <div className="ls-section-head">
                    <div>
                      <p className="ls-summary-card__label">Assignment &amp; occupancy</p>
                      <p className="ls-summary-card__hint">
                        A tenant can be assigned/reserved before their official start date. The previous tenant can remain active until their end date.
                      </p>
                    </div>
                  </div>
                  <div className="ls-form-grid">
                    <div>
                      <p className="ls-summary-card__label">Tenant</p>
                      <p className="ls-summary-card__value">{selectedLease.tenant?.name ?? "Unassigned"}</p>
                    </div>
                    <div>
                      <p className="ls-summary-card__label">Property</p>
                      <p className="ls-summary-card__value">{selectedLease.property?.name ?? "—"}</p>
                    </div>
                    <div>
                      <p className="ls-summary-card__label">Unit</p>
                      <p className="ls-summary-card__value">{selectedLease.unit?.unit_number ?? "—"}</p>
                    </div>
                    <div>
                      <p className="ls-summary-card__label">Lease status</p>
                      <p className="ls-summary-card__value">
                        {selectedLease.status === "pending"
                          ? "Reserved / pending"
                          : titleCase(selectedLease.status)}
                      </p>
                    </div>
                    <div>
                      <p className="ls-summary-card__label">Official lease start</p>
                      <p className="ls-summary-card__value">
                        {selectedLease.start_date ? formatDate(selectedLease.start_date) : "Not confirmed"}
                      </p>
                    </div>
                    <div>
                      <p className="ls-summary-card__label">Official lease end</p>
                      <p className="ls-summary-card__value">
                        {selectedLease.end_date ? formatDate(selectedLease.end_date) : "Open-ended"}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="ls-summary-card" aria-label="Tenant details">
                  <div className="ls-section-head">
                    <div>
                      <p className="ls-summary-card__label">Tenant details</p>
                      <p className="ls-summary-card__hint">
                        These are the tenant's profile details. They are separate from the editable lease terms and are used to generate the agreement.
                      </p>
                    </div>
                  </div>
                  {selectedLease.tenant ? (
                    <>
                      <div className="ls-form-grid">
                        <div>
                          <label className="mg-label" htmlFor="lease-tenant-phone">Phone</label>
                          <input id="lease-tenant-phone" className="mg-input" value={tenantPhoneDraft} onChange={(e) => setTenantPhoneDraft(e.target.value)} disabled={Boolean(selectedLease.tenant_signed_at || selectedLease.manager_signed_at)} />
                        </div>
                        <div>
                          <label className="mg-label" htmlFor="lease-tenant-id">National ID</label>
                          <input id="lease-tenant-id" className="mg-input" value={tenantNationalIdDraft} onChange={(e) => setTenantNationalIdDraft(e.target.value)} placeholder="Not provided" disabled={Boolean(selectedLease.tenant_signed_at || selectedLease.manager_signed_at)} />
                        </div>
                        <div>
                          <label className="mg-label" htmlFor="lease-tenant-employer">Employer</label>
                          <input id="lease-tenant-employer" className="mg-input" value={tenantEmployerDraft} onChange={(e) => setTenantEmployerDraft(e.target.value)} placeholder="Not provided" disabled={Boolean(selectedLease.tenant_signed_at || selectedLease.manager_signed_at)} />
                        </div>
                        <div>
                          <label className="mg-label" htmlFor="lease-tenant-employer-phone">Employer phone</label>
                          <input id="lease-tenant-employer-phone" className="mg-input" value={tenantEmployerPhoneDraft} onChange={(e) => setTenantEmployerPhoneDraft(e.target.value)} placeholder="Not provided" disabled={Boolean(selectedLease.tenant_signed_at || selectedLease.manager_signed_at)} />
                        </div>
                        <div>
                          <label className="mg-label" htmlFor="lease-tenant-next-of-kin">Next of kin</label>
                          <input id="lease-tenant-next-of-kin" className="mg-input" value={tenantNextOfKinDraft} onChange={(e) => setTenantNextOfKinDraft(e.target.value)} placeholder="Not provided" disabled={Boolean(selectedLease.tenant_signed_at || selectedLease.manager_signed_at)} />
                        </div>
                        <div>
                          <label className="mg-label" htmlFor="lease-tenant-next-of-kin-phone">Next of kin phone</label>
                          <input id="lease-tenant-next-of-kin-phone" className="mg-input" value={tenantNextOfKinPhoneDraft} onChange={(e) => setTenantNextOfKinPhoneDraft(e.target.value)} placeholder="Not provided" disabled={Boolean(selectedLease.tenant_signed_at || selectedLease.manager_signed_at)} />
                        </div>
                      </div>
                      <div className="ls-inline-actions" style={{ marginTop: "0.75rem" }}>
                        <button className="mg-button mg-button--primary" type="button" onClick={() => void saveTenantDetails()} disabled={savingTenantDetails || Boolean(selectedLease.tenant_signed_at || selectedLease.manager_signed_at)}>
                          {savingTenantDetails ? "Saving…" : "Save tenant details"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="ls-summary-card__hint">No tenant is assigned to this lease.</p>
                  )}
                </section>

                <section className="ls-summary-grid" aria-label="Lease agreement summary">
                  <article className="ls-summary-card">
                    <p className="ls-summary-card__label">Execution status</p>
                    <div className="ls-summary-card__stack">
                      <span className={agreementSummary.badgeClass}>{agreementSummary.label}</span>
                      <p className="ls-summary-card__hint">{agreementSummary.detail}</p>
                      <p className="ls-status-line">
                        <strong>Flow:</strong> the manager and tenant each review their own editable copy.
                        The lease is only officially binding once both copies are signed.
                      </p>
                    </div>
                  </article>

                  <article className="ls-summary-card">
                    <p className="ls-summary-card__label">Deposit tracking</p>
                    <div className="ls-summary-card__stack">
                      <p className="ls-summary-card__value">
                        {formatMoney(depositPaid(selectedLease), currency)} / {formatMoney(depositRequired(selectedLease), currency)}
                      </p>
                      <p className="ls-summary-card__hint">
                        {titleCase(depositStatus(selectedLease))}
                        {selectedLease.deposit?.payment_date
                          ? ` · last recorded ${formatDate(selectedLease.deposit.payment_date)}`
                          : ""}
                      </p>
                      {selectedLease.deposit?.tenant_marked_paid_at && (
                        <span className="mg-badge mg-badge--warn">
                          Tenant claimed payment on {formatDate(selectedLease.deposit.tenant_marked_paid_at)}
                        </span>
                      )}
                    </div>
                  </article>
                </section>

                <section className="ls-summary-card">
                  <div className="ls-section-head">
                    <div>
                      <p className="ls-summary-card__label">Official lease details</p>
                      <p className="ls-summary-card__hint">
                        These manager-controlled values become the official lease record.
                      </p>
                    </div>
                  </div>
                  <div className="ls-form-grid">
                    <div className="mg-field">
                      <label className="mg-label" htmlFor="manager-start-date">Official start date</label>
                      <input id="manager-start-date" className="mg-input" type="date" value={managerStartDate} onChange={(e) => setManagerStartDate(e.target.value)} disabled={Boolean(selectedLease.manager_signed_at)} />
                      <p className="mg-hint">Tenant requested {formatDate(selectedLease.requested_move_in_date)}.</p>
                    </div>
                    <div className="mg-field">
                      <label className="mg-label" htmlFor="manager-end-date">Official end date</label>
                      <input id="manager-end-date" className="mg-input" type="date" value={managerEndDate} onChange={(e) => setManagerEndDate(e.target.value)} disabled={Boolean(selectedLease.manager_signed_at)} />
                      <p className="mg-hint">Tenant requested {formatDate(selectedLease.requested_move_out_date)}.</p>
                    </div>
                    <div className="mg-field">
                      <label className="mg-label" htmlFor="manager-rent">Agreed monthly rent</label>
                      <input id="manager-rent" className="mg-input" type="number" min="0" step="0.01" value={managerRentDraft} onChange={(e) => setManagerRentDraft(e.target.value)} disabled={Boolean(selectedLease.manager_signed_at)} />
                      <p className="mg-hint">Unit standard: {formatMoney(selectedLease.unit?.standard_rent ?? 0, currency)}. Change this only for the agreed price on this lease.</p>
                    </div>
                    <div className="mg-field">
                      <label className="mg-label" htmlFor="manager-deposit-required">Agreed security deposit</label>
                      <input id="manager-deposit-required" className="mg-input" type="number" min="0" step="0.01" value={managerDepositRequiredDraft} onChange={(e) => setManagerDepositRequiredDraft(e.target.value)} disabled={Boolean(selectedLease.manager_signed_at)} />
                      <p className="mg-hint">Unit standard: {formatMoney(selectedLease.unit?.standard_deposit ?? 0, currency)}. This agreed amount is used by the lease's deposit record.</p>
                    </div>
                  </div>
                </section>

                <section className="ls-summary-card">
                  <div className="ls-section-head">
                    <div>
                      <p className="ls-summary-card__label">Deposit payments</p>
                      <p className="ls-summary-card__hint">
                        Record the total amount you have confirmed receiving so far.
                      </p>
                    </div>
                    {hasPendingDepositConfirmation(selectedLease) && (
                      <button
                        type="button"
                        className="mg-btn mg-btn--primary mg-btn--sm"
                        onClick={() => void confirmDepositReceipt(selectedLease)}
                        disabled={confirmingLeaseId === selectedLease.id}
                      >
                        <Wallet />
                        {confirmingLeaseId === selectedLease.id
                          ? "Confirming…"
                          : "Tenant says they've paid — Confirm receipt"}
                      </button>
                    )}
                  </div>

                  <div className="ls-form-grid">
                    <div className="mg-field">
                      <label className="mg-label" htmlFor="lease-deposit-amount">
                        Confirmed paid amount
                      </label>
                      <input
                        id="lease-deposit-amount"
                        className="mg-input"
                        type="number"
                        min="0"
                        max={depositRequired(selectedLease)}
                        step="0.01"
                        value={depositAmountDraft}
                        onChange={(event) => setDepositAmountDraft(event.target.value)}
                      />
                      <p className="mg-hint">
                        Required deposit {formatMoney(depositRequired(selectedLease), currency)}.
                      </p>
                    </div>

                    <div className="mg-field">
                      <label className="mg-label" htmlFor="lease-deposit-date">
                        Payment date
                      </label>
                      <input
                        id="lease-deposit-date"
                        className="mg-input"
                        type="date"
                        value={depositDateDraft}
                        onChange={(event) => setDepositDateDraft(event.target.value)}
                      />
                      <p className="mg-hint">
                        Use the date the manager is recording this payment for.
                      </p>
                    </div>
                  </div>

                  <div className="ls-helper-row">
                    <button
                      type="button"
                      className="mg-btn mg-btn--subtle mg-btn--sm"
                      onClick={() =>
                        setDepositAmountDraft(String(depositRequired(selectedLease)))
                      }
                    >
                      Fill full amount
                    </button>
                    <button
                      type="button"
                      className="mg-btn mg-btn--primary mg-btn--sm"
                      onClick={() => void recordDepositPayment()}
                      disabled={!depositValid || savingDeposit}
                    >
                      <Wallet />
                      {savingDeposit ? "Saving…" : "Record deposit payment"}
                    </button>
                  </div>
                </section>

                <section className="ls-copy-grid">
                  <article className="ls-copy-card">
                    <div className="ls-copy-card__head">
                      <div>
                        <p className="ls-copy-card__eyebrow">Manager&apos;s copy</p>
                        <h3 className="ls-copy-card__title">Agreement draft</h3>
                      </div>
                      <div className="ls-copy-card__status">
                        <span
                          className={
                            selectedLease.manager_signed_at
                              ? "mg-badge mg-badge--ok"
                              : "mg-badge mg-badge--warn"
                          }
                        >
                          {selectedLease.manager_signed_at
                            ? `Signed by ${selectedLease.manager_signature ?? "manager"}`
                            : "Not yet signed"}
                        </span>
                      </div>
                    </div>

                    <div className="mg-field">
                      <label className="mg-label" htmlFor="lease-manager-terms">
                        Manager&apos;s copy
                      </label>
                      <textarea
                        id="lease-manager-terms"
                        className="mg-textarea"
                        value={managerTermsDraft}
                        onChange={(event) => setManagerTermsDraft(event.target.value)}
                        disabled={Boolean(selectedLease.manager_signed_at || selectedLease.manager_copy_physical_confirmed_at || selectedLease.tenant_copy_physical_confirmed_at)}
                        placeholder="Agreement terms visible to the manager…"
                      />
                      <p className="ls-copy-card__hint">
                        {selectedLease.manager_signed_at
                          ? "The manager signature has locked this lease."
                          : "Editing manager-controlled details before signing may require the tenant to review and sign the new version."}
                      </p>
                    </div>
                  </article>

                  <article className="ls-copy-card">
                    <div className="ls-copy-card__head">
                      <div>
                        <p className="ls-copy-card__eyebrow">Tenant&apos;s copy</p>
                        <h3 className="ls-copy-card__title">Tenant&apos;s agreement copy</h3>
                      </div>
                      <div className="ls-copy-card__status">
                        <span
                          className={
                            selectedLease.tenant_signed_at
                              ? "mg-badge mg-badge--ok"
                              : "mg-badge mg-badge--warn"
                          }
                        >
                          {selectedLease.tenant_signed_at
                            ? `Signed by ${selectedLease.tenant_signature ?? "tenant"}`
                            : "Not yet signed"}
                        </span>
                      </div>
                    </div>

                    <div className="mg-field">
                      <label className="mg-label" htmlFor="lease-tenant-terms">
                        Tenant&apos;s copy
                      </label>
                      <textarea
                        id="lease-tenant-terms"
                        className="mg-textarea"
                        value={tenantTermsDraft}
                        readOnly
                        placeholder="Agreement terms visible to the tenant…"
                      />
                      <p className="ls-copy-card__hint">
                        This is the tenant side of the canonical agreement. The tenant owns these terms and signs them; manager edits to authoritative lease details trigger a fresh tenant review.
                      </p>
                    </div>


                  </article>
                </section>

                <section className="ls-signature-panel" aria-labelledby="lease-signature-heading">
                  <div className="ls-signature-panel__head">
                    <div>
                      <p className="ls-copy-card__eyebrow">Final step</p>
                      <h3 id="lease-signature-heading" className="ls-signature-panel__title">Lease signatures</h3>
                      <p className="ls-signature-panel__intro">
                        Both parties must sign the current agreement. Once the manager signs, the lease is locked.
                      </p>
                    </div>
                    <span className={selectedLease.agreement_finalized ? "mg-badge mg-badge--ok" : tenantSideSigned ? "mg-badge mg-badge--warn" : "mg-badge"}>
                      {selectedLease.agreement_finalized ? "Agreement fully executed" : tenantSideSigned ? "Manager copy needed" : managerSideSigned ? "Tenant copy needed" : "Awaiting signatures"}
                    </span>
                  </div>

                  <div className="ls-signature-steps">
                    <div className={tenantSideSigned ? "ls-signature-step ls-signature-step--complete" : "ls-signature-step"}>
                      <span className="ls-signature-step__icon">{tenantSideSigned ? <CheckCircle2 /> : <span>1</span>}</span>
                      <div className="ls-signature-step__content">
                        <strong>Tenant signature</strong>
                        <p>{selectedLease.tenant_signed_at
                          ? "Digitally signed by " + (selectedLease.tenant_signature ?? "tenant") + " on " + formatDate(selectedLease.tenant_signed_at) + "."
                          : selectedLease.tenant_copy_physical_confirmed_at
                            ? "Physical tenant copy signed on " + (selectedLease.tenant_copy_physical_signed_on ?? "date not recorded") + "; confirmed by " + (selectedLease.tenant_physical_confirmed_by ?? "manager") + " on " + formatDate(selectedLease.tenant_copy_physical_confirmed_at) + "."
                            : "The tenant has not signed this agreement version yet."}</p>
                      </div>
                      <span className={tenantSideSigned ? "mg-badge mg-badge--ok" : "mg-badge mg-badge--warn"}>
                        {tenantSideSigned ? "Complete" : "Pending"}
                      </span>
                    </div>
                    <div className={managerSideSigned ? "ls-signature-step ls-signature-step--complete" : "ls-signature-step"}>
                      <span className="ls-signature-step__icon">{managerSideSigned ? <CheckCircle2 /> : <span>2</span>}</span>
                      <div className="ls-signature-step__content">
                        <strong>Manager signature</strong>
                        <p>{selectedLease.manager_signed_at
                          ? "Digitally signed by " + (selectedLease.manager_signature ?? "manager") + " on " + formatDate(selectedLease.manager_signed_at) + ". The agreement is locked."
                          : selectedLease.manager_copy_physical_confirmed_at
                            ? "Physical manager copy signed on " + (selectedLease.manager_copy_physical_signed_on ?? "date not recorded") + "; confirmed by " + (selectedLease.manager_physical_confirmed_by ?? "manager") + " on " + formatDate(selectedLease.manager_copy_physical_confirmed_at) + "."
                            : tenantSideSigned
                              ? "The tenant has signed. You can sign digitally or confirm the manager's printed copy in the physical-signing section below."
                              : "Available after the tenant signs the current agreement."}</p>
                      </div>
                      <span className={managerSideSigned ? "mg-badge mg-badge--ok" : "mg-badge mg-badge--warn"}>
                        {managerSideSigned ? "Complete" : "Pending"}
                      </span>
                    </div>
                  </div>

                  {!selectedLease.manager_signed_at && !selectedLease.manager_copy_physical_confirmed_at && !selectedLease.tenant_copy_physical_confirmed_at && (
                    <div className="ls-signature-action">
                      <div className="ls-signature-action__copy">
                        <span className="ls-sign-copy__icon"><FileSignature /></span>
                        <div>
                          <strong>{selectedLease.tenant_signed_at ? "Complete the agreement" : "Waiting for the tenant"}</strong>
                          <p>{selectedLease.tenant_signed_at
                            ? "Confirm the tenant's signed copy above is correct. Signing locks this agreement and prevents further edits."
                            : "You can prepare the manager's copy, but final signing stays disabled until the tenant signs."}</p>
                        </div>
                      </div>
                      <div className="ls-sign-controls">
                        <div className="mg-field">
                          <label className="mg-label" htmlFor="lease-manager-signature">Your initials</label>
                          <input
                            id="lease-manager-signature"
                            className="mg-input"
                            maxLength={20}
                            value={managerInitials}
                            onChange={(event) => setManagerInitials(event.target.value.toUpperCase())}
                            placeholder="e.g. JM"
                            aria-label="Manager initials"
                            disabled={!selectedLease.tenant_signed_at || signingManager}
                            autoComplete="off"
                          />
                          <span className="mg-hint">Use the initials you intend to sign with.</span>
                        </div>
                        <button
                          type="button"
                          className="mg-btn mg-btn--primary"
                          onClick={() => void signManagerCopy()}
                          disabled={managerInitials.trim().length === 0 || signingManager || !selectedLease.tenant_signed_at}
                        >
                          <FileSignature />
                          {signingManager ? "Signing…" : "Sign & lock lease"}
                        </button>
                      </div>
                    </div>
                  )}
                  {(selectedLease.manager_signed_at || selectedLease.agreement_finalized) && (
                    <div className="ls-signature-locked" role="status">
                      <CheckCircle2 />
                      <span><strong>This agreement is fully executed.</strong> The recorded digital and/or physical signing evidence is shown above. The agreement terms are locked.</span>
                    </div>
                  )}
                </section>

                <section className="ls-physical-panel" aria-labelledby="lease-physical-signatures-heading">
                  <p className="ls-copy-card__eyebrow">Offline signing</p>
                  <h3 id="lease-physical-signatures-heading" className="ls-physical-panel__title">Confirm physically signed copies</h3>
                  <p className="ls-physical-panel__intro">
                    Use this when the tenant does not use the portal and both parties sign printed copies. Enter the actual date on each copy. Saving records the manager who verified it and the time of confirmation; it does not create or imitate a digital signature. Once a physical copy is confirmed, agreement terms are locked.
                  </p>
                  <div className="ls-physical-grid">
                    <div className="ls-physical-copy">
                      <strong>Manager / landlord copy</strong>
                      <p>{selectedLease.manager_copy_physical_confirmed_at
                        ? "This physical copy has already been confirmed."
                        : "Enter the date the manager's or landlord's printed copy was signed."}</p>
                      <div className="mg-field">
                        <label className="mg-label" htmlFor="lease-manager-physical-date">Date physically signed</label>
                        <input id="lease-manager-physical-date" className="mg-input" type="date" max={todayDate()} value={physicalManagerSignedOnDraft} onChange={(event) => setPhysicalManagerSignedOnDraft(event.target.value)} disabled={Boolean(selectedLease.manager_copy_physical_confirmed_at)} />
                      </div>
                      {selectedLease.manager_copy_physical_confirmed_at && <p className="ls-physical-meta">Verified by {selectedLease.manager_physical_confirmed_by ?? "manager"} on {formatDate(selectedLease.manager_copy_physical_confirmed_at)}.</p>}
                    </div>
                    <div className="ls-physical-copy">
                      <strong>Tenant copy</strong>
                      <p>{selectedLease.tenant_copy_physical_confirmed_at
                        ? "This physical copy has already been confirmed."
                        : "Enter the date the tenant's printed copy was signed."}</p>
                      <div className="mg-field">
                        <label className="mg-label" htmlFor="lease-tenant-physical-date">Date physically signed</label>
                        <input id="lease-tenant-physical-date" className="mg-input" type="date" max={todayDate()} value={physicalTenantSignedOnDraft} onChange={(event) => setPhysicalTenantSignedOnDraft(event.target.value)} disabled={Boolean(selectedLease.tenant_copy_physical_confirmed_at)} />
                      </div>
                      {selectedLease.tenant_copy_physical_confirmed_at && <p className="ls-physical-meta">Verified by {selectedLease.tenant_physical_confirmed_by ?? "manager"} on {formatDate(selectedLease.tenant_copy_physical_confirmed_at)}.</p>}
                    </div>
                  </div>
                  <div className="mg-field" style={{ marginTop: ".9rem" }}>
                    <label className="mg-label" htmlFor="lease-physical-notes">Verification notes (optional)</label>
                    <textarea id="lease-physical-notes" className="mg-textarea" value={physicalSigningNotesDraft} onChange={(event) => setPhysicalSigningNotesDraft(event.target.value)} maxLength={2000} disabled={Boolean(selectedLease.agreement_finalized)} placeholder="e.g. Both printed copies checked in person at the property office." />
                    <span className="mg-hint">Do not upload or enter sensitive identity documents here. Keep the signed paper copies securely filed.</span>
                  </div>
                  <div className="ls-physical-actions">
                    <button type="button" className="mg-btn mg-btn--primary" onClick={() => void recordPhysicalSignatures()} disabled={savingPhysicalSignatures || ((Boolean(selectedLease.manager_copy_physical_confirmed_at) || !physicalManagerSignedOnDraft) && (Boolean(selectedLease.tenant_copy_physical_confirmed_at) || !physicalTenantSignedOnDraft) && physicalSigningNotesDraft.trim() === (selectedLease.physical_signing_notes ?? ""))}>
                      <FileSignature />
                      {savingPhysicalSignatures ? "Saving confirmations…" : "Record physical signatures"}
                    </button>
                  </div>
                </section>
              </div>

              <div className="mg-drawer__foot">
                <button type="button" className="mg-btn mg-btn--subtle" onClick={closeLease}>
                  Close
                </button>
                <button
                  type="button"
                  className="mg-btn mg-btn--primary"
                  onClick={() => void saveAgreementTerms()}
                  disabled={savingTerms || Boolean(selectedLease.manager_signed_at || selectedLease.manager_copy_physical_confirmed_at || selectedLease.tenant_copy_physical_confirmed_at) || (!managerTermsChanged && managerStartDate === (selectedLease.start_date?.slice(0, 10) ?? "") && managerEndDate === (selectedLease.end_date?.slice(0, 10) ?? "") && Number(managerRentDraft) === selectedLease.monthly_rent && Number(managerDepositRequiredDraft) === depositRequired(selectedLease))}
                >
                  {savingTerms ? "Saving…" : "Save agreement text"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default ManagerLeasesPage;
