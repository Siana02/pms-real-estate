import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import TenantDashboardLayout from "../../layouts/TenantDashboardLayout";
import { apiRequest } from "../../services/api";
import {
  ArrowRight,
  BedDouble,
  Building2,
  CalendarClock,
  CheckCircle2,
  FileText,
  Home,
  Mail,
  MapPin,
  Phone,
  Ruler,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
 
/* ------------------------------------------------------------------ */
/*  STYLES — vanilla CSS                                               */
/* ------------------------------------------------------------------ */
 
const styles = `
.mh-unit-identity strong,.mh-specs strong,.mh-lease-grid>div>strong,.mh-lease-grid>div:nth-child(2)>strong,.mh-lease-grid>div:nth-child(3)>strong{white-space:nowrap}.mh-lease-grid{grid-template-columns:1fr 1fr 2fr 1.5fr}.mh-specs>div{padding:8px 16px}.mh-financials strong{display:flex;flex-direction:column;gap:.15rem;line-height:1.4;white-space:nowrap}.mh-financials strong>span{display:block}.mh-panel__head h2{color:#0f172a}.mh-specs>div{background:linear-gradient(135deg,#f8fbff 0%,#eff6ff 100%);border-color:#dbeafe}.mh-specs strong{color:#1e40af}.mh-status--wait{color:#8a5a00;background:linear-gradient(105deg,#fff7df 0%,#f7edcf 100%);box-shadow:inset 0 0 0 1px rgba(180,128,24,.16),0 0 18px -12px rgba(180,128,24,.58)}.mh-action{background:linear-gradient(105deg,#fff 0%,#f8fbff 55%,#eff6ff 100%);color:#2563eb}.mh-action>svg{color:#2563eb}.mh-action:hover,.mh-action:focus-visible{background:linear-gradient(105deg,#fff 0%,#f1f7ff 55%,#e0edff 100%);color:#1d4ed8}\n.mh-page .tp-page-head { justify-content:center; text-align:center; margin-bottom:1.9rem; }
.mh-page .tp-page-head__content { width:100%; display:flex; justify-content:center; }
.mh-page .tp-page-head__copy { width:100%; display:flex; flex-direction:column; align-items:center; }
.mh-page .tp-page-title { color:#102a43 !important; font-size:clamp(2rem,4vw,2.75rem); font-weight:800; letter-spacing:-.055em; line-height:1.05; }
.mh-page .tp-page-sub { max-width:42rem; margin:.65rem auto 0; color:#526b85 !important; font-family:"Segoe Print","Bradley Hand","Comic Sans MS",cursive; font-size:clamp(.95rem,1.6vw,1.08rem); font-weight:500; line-height:1.45; white-space:nowrap; overflow:hidden; width:fit-content; max-width:100%; border-right:1px solid #8aa7c4; animation:mh-type-in 1.25s steps(70,end) .18s both, mh-caret .8s steps(1,end) .18s 2; }
@keyframes mh-type-in { from { max-width:0; } to { max-width:42rem; } }
@keyframes mh-caret { 50% { border-color:transparent; } }

.mh-panel__head h2{white-space:nowrap}.mh-unit-identity strong{white-space:nowrap}.mh-specs{min-width:0}.mh-specs>div{min-width:0;padding:8px 16px}.mh-specs strong{white-space:nowrap;line-height:1.35}.mh-lease-grid{min-width:0}.mh-lease-grid>div{min-width:0}.mh-lease-grid>div>strong{line-height:1.4;overflow-wrap:normal}.mh-lease-grid>div:nth-child(2)>strong,.mh-lease-grid>div:nth-child(3)>strong{white-space:nowrap}.mh-financials strong{line-height:1.4;white-space:normal}.mh-financials em{margin:0 .35rem}.mh-unit-kicker,.mh-specs span,.mh-lease-grid>div>span{color:#7f8c96;font-size:.61rem;font-weight:700;letter-spacing:.115em}.mh-specs strong,.mh-lease-grid>div>strong{color:#0f172a}.mh-financials{min-width:0}.mh-panel__head h2{color:#0f172a}.mh-panel__head svg{color:#2563eb}.mh-specs>div{background:linear-gradient(135deg,#f8fbff 0%,#f0f7ff 100%);border-color:#dbeafe}.mh-specs>div:hover{background:linear-gradient(135deg,#f8fbff 0%,#e8f2ff 100%);border-color:#bfdbfe;box-shadow:0 12px 26px -20px rgba(37,99,235,.42)}.mh-specs strong{color:#1e40af}.mh-action{background:linear-gradient(105deg,#fff 0%,#f8fbff 58%,#eff6ff 100%);border-color:#dbeafe}.mh-action--alt{background:linear-gradient(105deg,#fff 0%,#f8fafc 52%,#eff6ff 100%)}.mh-action:hover,.mh-action:focus-visible{background:linear-gradient(105deg,#fff 0%,#f1f7ff 58%,#e0edff 100%);border-color:#bfdbfe;color:#1d4ed8;box-shadow:0 12px 28px -20px rgba(37,99,235,.5)}.mh-action__icon{background:#eff6ff;color:#2563eb}.mh-status--wait{color:#0f172a;background:linear-gradient(105deg,#eff6ff 0%,#f8fafc 58%,#f3ead7 100%);box-shadow:inset 0 0 0 1px rgba(37,99,235,.12),0 0 18px -12px rgba(37,99,235,.45)}.mh-status--muted{color:#0f172a;background:linear-gradient(105deg,#eff6ff 0%,#f8fafc 100%);box-shadow:inset 0 0 0 1px rgba(37,99,235,.08)}.mh-status--good{color:#0f172a;background:linear-gradient(105deg,#eff6ff 0%,#f8fafc 100%);box-shadow:inset 0 0 0 1px rgba(37,99,235,.1)}.mh-panel__head{display:flex;align-items:center;gap:.8rem;padding-bottom:1rem;border-bottom:1px solid #e6edf2}.mh-panel__head svg{width:1.05rem;height:1.05rem;color:#456a87;stroke-width:1.7}.mh-panel__head h2{margin:0;color:#263746;font-size:1.1rem;font-weight:600;letter-spacing:-.02em}.mh-unit-editorial,.mh-lease-editorial{display:flex;flex-direction:column;gap:1.15rem;padding-top:1.25rem}.mh-unit-identity{display:flex;flex-direction:column;gap:.28rem}.mh-unit-kicker,.mh-specs span,.mh-lease-grid span{color:#87939a;font-size:.65rem;font-weight:700;letter-spacing:.11em;text-transform:uppercase}.mh-unit-identity strong{color:#263746;font-size:1rem;font-weight:600}.mh-unit-identity strong span{color:#a2b1ba;margin:0 .25rem}.mh-specs{display:grid;grid-template-columns:repeat(3,1fr);gap:.7rem}.mh-specs>div{padding:.8rem .85rem;border:1px solid #e8eef2;border-radius:.75rem;background:linear-gradient(145deg,#fbfdff,#f6fafb);transition:background 180ms ease,box-shadow 180ms ease,transform 180ms ease}.mh-specs>div:hover{background:#fff;box-shadow:0 10px 24px -20px rgba(37,99,235,.35);transform:translateY(-1px)}.mh-specs strong{display:block;margin-top:.3rem;color:#263746;font-size:.88rem;font-weight:600}.mh-address{display:flex;align-items:center;gap:.45rem;padding-top:.9rem;border-top:1px solid #edf1f3;color:#87939a;font-size:.78rem}.mh-address svg{width:.9rem;height:.9rem;color:#6d8da4}.mh-lease-grid{display:grid;grid-template-columns:1fr 1.15fr 1.35fr 1.55fr;gap:1rem}.mh-lease-grid>div{min-width:0}.mh-lease-grid>div>strong{display:block;margin-top:.4rem;color:#263746;font-size:.84rem;font-weight:700;line-height:1.45}.mh-status{display:inline-flex;align-items:center;padding:.28rem .6rem;border-radius:999px;font-size:.67rem;font-weight:700;letter-spacing:.02em}.mh-status--wait{color:#9a6708;background:#fff6dc;box-shadow:inset 0 0 0 1px rgba(180,128,24,.14),0 0 16px -12px rgba(180,128,24,.55);animation:mh-status-glow 3s ease-in-out infinite}.mh-status--good{color:#19734a;background:#eaf8f0}.mh-status--muted{color:#6d777c;background:#f0f3f4}@keyframes mh-status-glow{50%{box-shadow:inset 0 0 0 1px rgba(180,128,24,.2),0 0 18px -10px rgba(180,128,24,.7)}}.mh-financials strong{font-size:.78rem}.mh-financials em{font-style:normal;color:#b0bac0;margin:0 .4rem}.mh-actions{display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-top:.3rem;padding:.6rem;border:1px solid #e7ecef;border-radius:.9rem;background:#f5f7f8}.mh-action{display:flex;align-items:center;gap:.65rem;min-height:3rem;padding:.65rem .75rem;border:1px solid #e0e7eb;border-radius:.65rem;background:linear-gradient(145deg,#fff,#f8fafb);color:#365a73;text-decoration:none;font-size:.76rem;font-weight:600;transition:background 180ms ease,transform 180ms ease,box-shadow 180ms ease}.mh-action--alt{background:linear-gradient(145deg,#f9fcff,#f2f7fa)}.mh-action:hover,.mh-action:focus-visible{background:#fff;transform:translateY(-1px);box-shadow:0 10px 24px -20px rgba(37,99,235,.45)}.mh-action>svg{width:.95rem;height:.95rem;margin-left:auto;transition:transform 180ms ease}.mh-action:hover>svg,.mh-action:focus-visible>svg{transform:translateX(4px)}.mh-action__icon{display:inline-flex;align-items:center;justify-content:center;width:1.8rem;height:1.8rem;border-radius:.5rem;background:#eef5f9;color:#537791}.mh-action__icon svg{width:.9rem;height:.9rem}\n.mh-stack {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}
 
.mh-hero {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
  padding: 1.5rem;
  border-radius: var(--tp-r-lg);
  border: 1px solid #c7dbff;
  background: linear-gradient(180deg, #f5f9ff, var(--tp-surface) 65%);
}
 
.mh-hero__id {
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
}
 
.mh-hero__mark {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: var(--tp-r-md);
  background: var(--tp-blue);
  color: #fff;
}
 
.mh-hero__mark svg { width: 1.375rem; height: 1.375rem; }
 
.mh-hero__name {
  margin: 0;
  font-size: 1.375rem;
  font-weight: 700;
  letter-spacing: -0.025em;
}
 
.mh-hero__where {
  display: flex;
  align-items: flex-start;
  gap: 0.375rem;
  margin: 0.375rem 0 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--tp-muted);
}
 
.mh-hero__where svg { width: 0.9375rem; height: 0.9375rem; flex: none; margin-top: 0.125rem; }
 
.mh-hero__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
}
 
.mh-facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin: 0;
  padding-top: 1.25rem;
  border-top: 1px solid var(--tp-line-soft);
}
 
.mh-facts dt { margin: 0; }
.mh-facts dd {
  margin: 0.25rem 0 0;
  font-size: 1.0625rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}
 
.mh-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}
 
.mh-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
}
 
.mh-panel__head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
 
.mh-panel__head svg { width: 1rem; height: 1rem; color: var(--tp-muted); }
.mh-panel__head h2 { margin: 0; font-size: 0.9375rem; font-weight: 600; }
 
.mh-rows {
  display: flex;
  flex-direction: column;
  margin: 0;
}
 
.mh-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.6875rem 0;
  border-top: 1px solid var(--tp-line-soft);
  font-size: 0.875rem;
}
 
.mh-row:first-child { border-top: none; padding-top: 0; }
.mh-row dt { margin: 0; color: var(--tp-muted); }
.mh-row dd { margin: 0; font-weight: 600; text-align: right; overflow-wrap: anywhere; }
 
.mh-contact {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem;
  border-radius: var(--tp-r-md);
  background: var(--tp-surface-sunken);
}
 
.mh-contact__name { margin: 0; font-size: 0.9375rem; font-weight: 600; }
.mh-contact__role { margin: 0.125rem 0 0; font-size: 0.8125rem; color: var(--tp-muted); }
 
.mh-contact__links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
 
.mh-amenities {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
 
.mh-amenity {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.6875rem;
  border-radius: var(--tp-r-sm);
  border: 1px solid var(--tp-line);
  background: var(--tp-surface);
  font-size: 0.8125rem;
  color: var(--tp-ink-soft);
}
 
.mh-amenity svg { width: 0.875rem; height: 0.875rem; color: var(--tp-blue); }
 
.mh-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.625rem;
  margin-top: auto;
}
 
.mh-skeleton { height: 12rem; }
 
@media (min-width: 640px) {
  .mh-facts { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
 
@media (min-width: 1024px) {
  .mh-hero { grid-template-columns: minmax(0, 1fr); padding: 1.75rem; }
  .mh-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

/* premium My Home refinement */
.mh-hero{position:relative;gap:1.5rem;padding:1.5rem;overflow:hidden;border-color:#dce7ef;border-radius:1.35rem;background:radial-gradient(circle at 12% 10%,rgba(100,164,211,.2),transparent 30%),linear-gradient(135deg,#f7fbff 0%,#ffffff 48%,#eef7f7 100%);box-shadow:0 12px 34px -28px rgba(16,42,67,.4);transition:transform 220ms cubic-bezier(.22,1,.36,1),box-shadow 240ms ease,border-color 220ms ease}
.mh-hero:hover{transform:translateY(-4px) scale(1.008);border-color:#c9ddea;box-shadow:0 22px 46px -28px rgba(37,99,235,.28),0 0 26px -18px rgba(92,160,205,.4)}.mh-hero__top{display:flex;align-items:flex-start;justify-content:space-between;gap:1.25rem}.mh-hero__mark{width:3rem;height:3rem;border:1px solid #d7e4ec;border-radius:1rem;background:linear-gradient(145deg,#f1f7fb,#fff);color:#527a99}.mh-hero__id > div{text-align:center}.mh-hero__where{justify-content:center}.mh-hero__tags{justify-content:center}.mh-hero__name{color:#102a43;font-family:Georgia,"Times New Roman",serif;font-size:clamp(1.45rem,2.5vw,1.85rem);letter-spacing:-.035em}.mh-hero__where{color:#7a8994;font-size:.78rem}.mh-hero__tags{gap:.4rem;margin-top:.65rem}.mh-hero__tags .tp-pill{padding:.3rem .62rem;font-size:.67rem}.mh-hero__tags .tp-pill::before{width:.36rem;height:.36rem}
.mh-hero__assistance{display:inline-flex;align-items:center;justify-content:center;gap:.45rem;flex:none;min-height:2.3rem;padding:0 .8rem;border:1px solid #b9cede;border-radius:.7rem;background:rgba(255,255,255,.72);color:#456a87;font-size:.7rem;font-weight:700;letter-spacing:.025em;text-decoration:none;transition:transform 180ms ease,box-shadow 220ms ease,border-color 180ms ease,color 180ms ease,background 180ms ease}.mh-hero__assistance svg{width:.9rem;height:.9rem}.mh-hero__assistance:hover{border-color:#8eb3cf;background:#fff;color:#245c83;transform:translateY(-1px);box-shadow:0 10px 22px -16px rgba(37,99,235,.4)}
.mh-facts{grid-template-columns:repeat(4,minmax(0,1fr));gap:.5rem;padding-top:1.2rem;border-top:1px solid #e8eef3}.mh-facts>div{position:relative;margin:0;padding:.8rem .75rem;border:1px solid transparent;border-radius:.8rem;transition:background 180ms ease,border-color 180ms ease,box-shadow 220ms ease,transform 180ms ease}.mh-facts>div:hover{border-color:#e1ebf2;background:rgba(239,246,251,.58);box-shadow:0 10px 22px -22px rgba(16,42,67,.45);transform:translateY(-1px)}.mh-facts dt{color:#8a99a4;font-size:.61rem;font-weight:700;letter-spacing:.105em;text-transform:uppercase}.mh-facts dd{margin-top:.38rem;color:#243747;font-size:1.08rem;font-weight:720}.mh-facts dd.mh-fact__soft{color:#81909a;font-family:Georgia,"Times New Roman",serif;font-size:.88rem;font-style:italic;font-weight:400;letter-spacing:0}
@media(max-width:760px){.mh-specs,.mh-lease-grid,.mh-actions{grid-template-columns:1fr}.mh-page .tp-page-sub{white-space:normal;overflow:visible;width:auto;max-width:36rem;border-right:0;animation:none}.mh-hero__top{flex-direction:column}.mh-hero__assistance{align-self:flex-start}.mh-facts{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:520px){.mh-hero{padding:1.15rem}.mh-facts{gap:.35rem}.mh-facts>div{padding:.7rem .6rem}.mh-facts dd{font-size:.96rem}}@media(prefers-reduced-motion:reduce){.mh-page .tp-page-sub{animation:none;border-right:0}.mh-facts>div,.mh-hero,.mh-hero__assistance{transition:none}}

.mh-panel__head h2{color:#0F172A!important;white-space:nowrap!important}.mh-specs>div{padding:8px 16px!important;background:linear-gradient(135deg,#F8FBFF 0%,#EFF6FF 100%)!important;border-color:#DBEAFE!important}.mh-specs strong{color:#1E40AF!important;white-space:nowrap!important}.mh-unit-identity strong{white-space:nowrap!important}.mh-lease-grid{grid-template-columns:1fr 1fr 2fr 1.5fr!important}.mh-lease-grid>div>strong{white-space:nowrap!important;line-height:1.4!important}.mh-financials strong{display:flex!important;flex-direction:column!important;gap:.15rem!important;white-space:nowrap!important;line-height:1.4!important}.mh-status--wait{color:#8A5A00!important;background:linear-gradient(105deg,#FFF7DF 0%,#F7EDCF 100%)!important}.mh-action{background:linear-gradient(105deg,#FFF 0%,#F8FBFF 55%,#EFF6FF 100%)!important;color:#2563EB!important}.mh-action>svg{color:#2563EB!important}.mh-action:hover,.mh-action:focus-visible{background:linear-gradient(105deg,#FFF 0%,#F1F7FF 55%,#E0EDFF 100%)!important;color:#1D4ED8!important}

/* Final card layout normalization */
.mh-grid{align-items:stretch!important}
.mh-panel{min-width:0!important;overflow:visible!important}
.mh-panel__head{min-width:0!important;flex-shrink:0!important}
.mh-panel__head h2{min-width:0!important}
.mh-unit-editorial,.mh-lease-editorial{min-width:0!important;width:100%!important}
.mh-unit-identity{min-width:0!important}
.mh-unit-identity strong{display:block!important;overflow:hidden!important;text-overflow:ellipsis!important}
.mh-specs{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;width:100%!important}
.mh-specs>div{min-width:0!important;overflow:hidden!important}
.mh-specs strong{display:block!important;overflow:hidden!important;text-overflow:ellipsis!important}
.mh-address{min-width:0!important}
.mh-address span{min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
.mh-lease-grid{display:grid!important;grid-template-columns:minmax(0,.85fr) minmax(0,1fr) minmax(0,2fr) minmax(0,1.35fr)!important;gap:1.25rem!important;width:100%!important}
.mh-lease-grid>div{min-width:0!important;max-width:100%!important}
.mh-lease-grid>div>strong{display:block!important;min-width:0!important;max-width:100%!important}
.mh-lease-grid>div:nth-child(3)>strong{white-space:normal!important}
.mh-financials strong{display:flex!important;flex-direction:column!important;align-items:flex-start!important;gap:.25rem!important;white-space:normal!important}
.mh-financials strong>span{display:block!important;white-space:nowrap!important}
.mh-actions{width:100%!important;min-width:0!important}
.mh-action{min-width:0!important}
.mh-action>span:not(.mh-action__icon){min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
@media(max-width:1050px){
  .mh-grid{grid-template-columns:1fr!important}
  .mh-lease-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
}
@media(max-width:640px){
  .mh-specs,.mh-lease-grid,.mh-actions{grid-template-columns:1fr!important}
}

/* Stable two-card editorial layout */
.mh-grid{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:1.25rem!important;align-items:stretch!important}
.mh-panel{display:flex!important;flex-direction:column!important;min-width:0!important;width:100%!important;box-sizing:border-box!important;overflow:hidden!important}
.mh-panel__head{display:flex!important;align-items:center!important;gap:.8rem!important;flex:none!important;padding-bottom:1rem!important;border-bottom:1px solid #e5edf3!important}
.mh-panel__head h2{margin:0!important;color:#0F172A!important;font-size:1.1rem!important;font-weight:700!important;white-space:nowrap!important}
.mh-panel__head svg{flex:none!important;color:#2563EB!important}
.mh-unit-editorial,.mh-lease-editorial{width:100%!important;min-width:0!important;box-sizing:border-box!important;padding-top:1.25rem!important}
.mh-unit-identity strong{display:block!important;color:#0F172A!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
.mh-specs{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:.75rem!important;width:100%!important;min-width:0!important}
.mh-specs>div{box-sizing:border-box!important;min-width:0!important;width:100%!important;padding:10px 16px!important;border:1px solid #DBEAFE!important;border-radius:.75rem!important;background:linear-gradient(135deg,#F8FBFF,#EFF6FF)!important;overflow:hidden!important}
.mh-specs span{display:block!important;white-space:nowrap!important}
.mh-specs strong{display:block!important;margin-top:.35rem!important;color:#1E40AF!important;font-size:.84rem!important;line-height:1.3!important;white-space:nowrap!important}
.mh-address{width:100%!important;box-sizing:border-box!important;min-width:0!important}
.mh-address span{min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
.mh-lease-grid{display:grid!important;grid-template-columns:minmax(0,.8fr) minmax(0,1fr) minmax(0,2fr) minmax(0,1.35fr)!important;gap:1rem!important;width:100%!important;min-width:0!important}
.mh-lease-grid>div{min-width:0!important;width:100%!important}
.mh-lease-grid>div>span:first-child{display:block!important;white-space:nowrap!important;color:#7F8C96!important;font-size:.61rem!important;font-weight:700!important;letter-spacing:.11em!important}
.mh-lease-grid>div>strong{display:block!important;max-width:100%!important;margin-top:.4rem!important;color:#0F172A!important;font-size:.82rem!important;line-height:1.4!important}
.mh-lease-grid>div:nth-child(2)>strong,.mh-lease-grid>div:nth-child(3)>strong{white-space:nowrap!important}
.mh-financials strong{display:flex!important;flex-direction:column!important;align-items:flex-start!important;gap:.2rem!important;white-space:nowrap!important}
.mh-financials strong>span{display:block!important;white-space:nowrap!important}
.mh-actions{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:.6rem!important;width:100%!important;box-sizing:border-box!important}
.mh-action{display:flex!important;align-items:center!important;min-width:0!important;width:100%!important;box-sizing:border-box!important}
.mh-action>span:not(.mh-action__icon){min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
@media(max-width:1100px){.mh-grid{grid-template-columns:1fr!important}}
@media(max-width:700px){.mh-specs,.mh-lease-grid,.mh-actions{grid-template-columns:1fr!important}.mh-lease-grid>div:nth-child(3)>strong{white-space:normal!important}}

/* Stacked editorial card layout */
.mh-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:1.25rem!important}
.mh-panel{display:flex!important;flex-direction:column!important;min-width:0!important;box-sizing:border-box!important;overflow:hidden!important}
.mh-panel__head{flex:none!important;display:flex!important;align-items:center!important;gap:.8rem!important;padding-bottom:1rem!important;border-bottom:1px solid #e5edf3!important}
.mh-panel__head h2{margin:0!important;color:#0F172A!important;font-size:1.1rem!important;font-weight:700!important;white-space:nowrap!important}
.mh-panel__head svg{flex:none!important;color:#2563EB!important}
.mh-unit-rows,.mh-lease-rows{display:flex!important;flex-direction:column!important;width:100%!important;padding-top:.45rem!important}
.mh-detail-row{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:2rem!important;min-width:0!important;padding:.82rem 0!important;border-bottom:1px solid #edf2f5!important}
.mh-detail-row:last-child{border-bottom:0!important}
.mh-detail-row>span:first-child{flex:0 0 auto!important;color:#7F8C96!important;font-size:.67rem!important;font-weight:700!important;letter-spacing:.1em!important;text-transform:uppercase!important}
.mh-detail-row>strong{margin-left:auto!important;min-width:0!important;color:#0F172A!important;font-size:.84rem!important;font-weight:600!important;text-align:right!important;white-space:nowrap!important}
.mh-detail-row .mh-status{white-space:nowrap!important}
.mh-address{margin-top:.45rem!important;padding-top:.9rem!important;border-top:1px solid #e8eef2!important}
.mh-address span{white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
.mh-financials-split{display:grid!important;grid-template-columns:1fr 1fr!important;gap:1rem!important;margin-top:1rem!important;padding:1rem 0!important;border-top:1px solid #e8eef2!important;border-bottom:1px solid #e8eef2!important}
.mh-financials-split>div{min-width:0!important}
.mh-financials-split>div+div{padding-left:1rem!important;border-left:1px solid #e5edf3!important}
.mh-financials-split span{display:block!important;color:#7F8C96!important;font-size:.64rem!important;font-weight:700!important;letter-spacing:.1em!important;text-transform:uppercase!important}
.mh-financials-split strong{display:block!important;margin-top:.35rem!important;color:#0F172A!important;font-size:1rem!important;font-weight:700!important;white-space:nowrap!important}
.mh-actions{display:flex!important;flex-direction:column!important;gap:.55rem!important;width:100%!important;margin-top:auto!important;padding-top:1rem!important}
.mh-action{display:flex!important;align-items:center!important;gap:.7rem!important;width:100%!important;min-width:0!important;box-sizing:border-box!important;padding:.72rem .8rem!important}
.mh-action>span:not(.mh-action__icon){min-width:0!important;overflow:visible!important;white-space:nowrap!important}
.mh-action>svg{margin-left:auto!important;flex:none!important}
@media(max-width:1100px){.mh-grid{grid-template-columns:1fr!important}}
@media(max-width:600px){.mh-financials-split{grid-template-columns:1fr!important}.mh-financials-split>div+div{padding-left:0!important;border-left:0!important;border-top:1px solid #e5edf3!important;padding-top:.8rem!important}.mh-detail-row{gap:1rem!important}.mh-detail-row>strong{white-space:normal!important}}
`;
 
/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */
 
type LeaseStatus = "active" | "ended" | "terminated";
 
interface TenantHome {
  property_name: string | null;
  property_type: string | null;
  unit_number: string | null;
  unit_type: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  bedrooms: number | string | null;
  bathrooms: number | string | null;
  size_sqm: number | string | null;
  amenities: string[] | null;
  manager_name: string | null;
  manager_phone: string | null;
  manager_email: string | null;
}
 
interface TenantLease {
  status: LeaseStatus | null;
  start_date: string | null;
  end_date: string | null;
  monthly_rent: number | string | null;
  deposit_amount: number | string | null;
  notes: string | null;
}
 
interface Overview {
  home: TenantHome | null;
  lease: TenantLease | null;
}
 
/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */
 
function readStored(key: string): string | null {
  return localStorage.getItem(key) ?? sessionStorage.getItem(key);
}
 
function readCurrency(): string {
  const raw = readStored("organization");
  if (!raw) return "KSh";
 
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      const value = (parsed as Record<string, unknown>).currency;
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  } catch {
    /* fall through to the default */
  }
 
  return "KSh";
}
 
function toNumber(value: number | string | null | undefined): number {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : 0;
}
 
function money(value: number | string | null | undefined, currency: string) {
  return `${currency} ${new Intl.NumberFormat("en-KE", {
    maximumFractionDigits: 0,
  }).format(Math.round(toNumber(value)))}`;
}
 
function longDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
 
function asOverview(payload: unknown): Overview {
  const empty: Overview = { home: null, lease: null };
  if (!payload || typeof payload !== "object") return empty;
 
  const record = payload as Record<string, unknown>;
  const source =
    record.data && typeof record.data === "object"
      ? (record.data as Record<string, unknown>)
      : record;
 
  return {
    home: (source.home as TenantHome | undefined) ?? null,
    lease: (source.lease as TenantLease | undefined) ?? null,
  };
}
 
/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */
 
function MyHomePage() {
  const currency = useMemo(readCurrency, []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState<Overview>({
    home: null,
    lease: null,
  });
 
  const load = useCallback(async () => {
    try {
      const response = await apiRequest("/tenant/overview");
      setOverview(asOverview(response));
      setError("");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "We couldn't load your home details."
      );
    } finally {
      setLoading(false);
    }
  }, []);
 
  useEffect(() => {
    void load();
  }, [load]);
 
  const home = overview.home;
  const lease = overview.lease;
  const amenities = home?.amenities ?? [];
 
  const address =
    [home?.address, home?.city, home?.country].filter(Boolean).join(", ") ||
    "Address not on file";
 
  return (
    <TenantDashboardLayout
      pageClassName="mh-page"
      title="My home"
      subtitle="Everything you need regarding your space, lease agreements, and care requests."

    >
      <style>{styles}</style>
 
      <div className="mh-stack">
        {error && (
          <p className="tp-card" role="status">
            {error}
          </p>
        )}
 
        {loading ? (
          <span className="tp-skeleton mh-skeleton" />
        ) : (
          <section className="mh-hero" aria-label="Your unit">
            <div className="mh-hero__top">
              <div className="mh-hero__id">
              <span className="mh-hero__mark" aria-hidden="true">
                <Home />
              </span>
              <div>
                <h2 className="mh-hero__name">
                  {home?.property_name ?? "Your home"}
                </h2>
                <p className="mh-hero__where">
                  <MapPin />
                  {address}
                </p>
                <div className="mh-hero__tags">
                  {home?.unit_number && (
                    <span className="tp-pill tp-pill--info">
                      Unit {home.unit_number}
                    </span>
                  )}
                  <span
                    className={`tp-pill ${
                      lease?.status === "active"
                        ? "tp-pill--good"
                        : lease?.status === "ended" || lease?.status === "terminated"
                          ? "tp-pill--mute"
                          : "tp-pill--wait"
                    }`}
                  >
                    {lease?.status === "active"
                      ? "Lease active"
                      : lease?.status === "ended" || lease?.status === "terminated"
                        ? "Lease ended"
                        : "Pending active lease"}
                  </span>
                  {home?.unit_type && (
                    <span className="tp-pill tp-pill--mute">
                      {home.unit_type}
                    </span>
                  )}
                </div>
              </div>
              </div>
              <Link
                to="/tenant/maintenance?action=new"
                className="mh-hero__assistance"
              >
                <Wrench />
                Request Assistance
              </Link>
            </div>
 
            <dl className="mh-facts">
              <div>
                <dt>Monthly rent</dt>
                <dd className="tp-money">{money(lease?.monthly_rent, currency)}</dd>
              </div>
              <div>
                <dt>Deposit held</dt>
                <dd className="tp-money">{money(lease?.deposit_amount, currency)}</dd>
              </div>
              <div>
                <dt>Lease ends</dt>
                <dd className="mh-fact__soft">{lease?.end_date ? longDate(lease.end_date) : "Flexible / Monthly"}</dd>
              </div>
              <div>
                <dt>Bedrooms</dt>
                <dd className="mh-fact__soft">{home?.bedrooms ? String(home.bedrooms) : "Studio Layout"}</dd>
              </div>
            </dl>
          </section>
        )}
 
        <div className="mh-grid">
          <article className="tp-card mh-panel">
            <div className="mh-panel__head"><Building2 /><h2>Unit details</h2></div>
            <div className="mh-unit-rows">
              <div className="mh-detail-row"><span>Property &amp; unit</span><strong>{home?.property_type ?? "Residential"} • {home?.unit_type ?? "Bedsitter"}</strong></div>
              <div className="mh-detail-row"><span>Bedrooms</span><strong>{home?.bedrooms ? String(home.bedrooms) : "Studio Layout"}</strong></div>
              <div className="mh-detail-row"><span>Bathrooms</span><strong>{home?.bathrooms ? `${String(home.bathrooms)} Bath` : "Private"}</strong></div>
              <div className="mh-detail-row"><span>Floor area</span><strong>{home?.size_sqm ? `${String(home.size_sqm)} m²` : "Standard"}</strong></div>
            </div>
            <div className="mh-address"><MapPin /><span>{address || "Address not provided"}</span></div>
            {amenities.length > 0 && (
              <div className="mh-amenities-wrap">
                <p className="tp-label">Amenities</p>
                <ul className="mh-amenities">{amenities.map((amenity) => <li className="mh-amenity" key={amenity}><Sparkles />{amenity}</li>)}</ul>
              </div>
            )}
          </article>

          <article className="tp-card mh-panel">
            <div className="mh-panel__head"><FileText /><h2>Lease summary</h2></div>
            <div className="mh-lease-rows">
              <div className="mh-detail-row"><span>Status</span><strong><span className={`mh-status ${
                lease?.status === "active" ? "mh-status--good" :
                lease?.status === "ended" || lease?.status === "terminated" ? "mh-status--muted" : "mh-status--wait"
              }`}>{lease?.status === "active" ? "Active" : lease?.status === "ended" || lease?.status === "terminated" ? "Inactive" : "Pending Active"}</span></strong></div>
              <div className="mh-detail-row"><span>Start date</span><strong>{longDate(lease?.start_date)}</strong></div>
              <div className="mh-detail-row"><span>End date</span><strong>{lease?.end_date ? longDate(lease.end_date) : "Flexible / Month-to-Month"}</strong></div>
            </div>
            <div className="mh-financials-split">
              <div><span>Rent</span><strong>{money(lease?.monthly_rent, currency)}</strong></div>
              <div><span>Deposit</span><strong>{money(lease?.deposit_amount, currency)}</strong></div>
            </div>
            {lease?.notes && <p className="tp-section__sub" style={{ lineHeight: 1.6 }}>{lease.notes}</p>}
            <div className="mh-actions">
              <Link to="/tenant/lease" className="mh-action"><span className="mh-action__icon"><FileText /></span><span>View Full Lease Agreement</span><ArrowRight /></Link>
              <Link to="/tenant/payments" className="mh-action mh-action--alt"><span className="mh-action__icon"><CalendarClock /></span><span>View Scheduled Payments</span><ArrowRight /></Link>
            </div>
          </article>
        </div>

        <section className="tp-section" aria-label="Property management">
          <div className="tp-section__head">
            <div>
              <h2 className="tp-section__title">Who looks after this home</h2>
              <p className="tp-section__sub">
                Reach your manager directly for anything urgent.
              </p>
            </div>
          </div>
 
          <div className="tp-card mh-panel">
            <div className="mh-contact">
              <span className="tp-avatar" aria-hidden="true">
                <ShieldCheck style={{ width: "1rem", height: "1rem" }} />
              </span>
              <div>
                <p className="mh-contact__name">
                  {home?.manager_name ?? "Property management"}
                </p>
                <p className="mh-contact__role">
                  Manages {home?.property_name ?? "your building"}
                </p>
              </div>
            </div>
 
            <div className="mh-contact__links">
              {home?.manager_phone && (
                <a
                  className="tp-btn tp-btn--quiet"
                  href={`tel:${home.manager_phone}`}
                >
                  <Phone />
                  {home.manager_phone}
                </a>
              )}
              {home?.manager_email && (
                <a
                  className="tp-btn tp-btn--quiet"
                  href={`mailto:${home.manager_email}`}
                >
                  <Mail />
                  {home.manager_email}
                </a>
              )}
              <Link
                to="/tenant/maintenance?action=new"
                className="tp-btn tp-btn--quiet"
              >
                <Wrench />
                Request Assistance
              </Link>
            </div>
 
            <p className="tp-section__sub">
              <CheckCircle2
                aria-hidden="true"
                style={{
                  width: "0.875rem",
                  height: "0.875rem",
                  verticalAlign: "-2px",
                  marginRight: "0.375rem",
                  color: "var(--tp-green)",
                }}
              />
              Maintenance requests are logged and tracked — you&apos;ll see every
              status change in your portal.
            </p>
          </div>
        </section>
 
        {!loading && !home && (
          <div className="tp-card tp-empty">
            <span className="tp-empty__icon">
              <BedDouble />
            </span>
            <h3 className="tp-empty__title">No unit linked yet</h3>
            <p className="tp-empty__text">
              Once your property manager assigns you to a unit and activates
              your lease, everything about your home will appear here.
            </p>
          </div>
        )}
 
        <p className="tp-section__sub">
          <Ruler
            aria-hidden="true"
            style={{
              width: "0.875rem",
              height: "0.875rem",
              verticalAlign: "-2px",
              marginRight: "0.375rem",
            }}
          />
          Details are maintained by your property manager. Spot something wrong?
          Let them know.
        </p>
      </div>
    </TenantDashboardLayout>
  );
}
 
export default MyHomePage;
 