import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowRight, BadgeCheck, Check, CheckCircle2, CircleHelp,
  Clock3, CreditCard, Crown, ExternalLink, FileCheck2, LockKeyhole,
  RefreshCw, ShieldCheck, Sparkles, WalletCards, XCircle, Zap
} from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { apiRequest } from "../../services/api";
import { formatMoney } from "../../services/format";

type Plan = {
  code: string;
  name: string;
  price_model: "flat" | "unit_type";
  base_rate: number | null;
  unit_rates?: Record<string, number>;
  description: string;
  features: string[];
};
type Subscription = {
  id: number;
  plan_code: string;
  status: string;
  monthly_amount: string | number;
  billable_units: number;
  current_period_ends_at: string | null;
  unit_mix?: Record<string, number>;
  pricing_overrides?: Record<string, number>;
};
type Payment = {
  id: number;
  amount: string | number;
  reference: string | null;
  status: string;
  created_at: string;
};
type Payload = {
  plans: Plan[];
  subscription: Subscription | null;
  quote: { billable_units: number; monthly_amount: number } | null;
  till_number: string | null;
  payment_setup_ready: boolean;
  payments: Payment[];
  features?: string[];
};

const UNIT_TYPES = [
  "Bedsitter", "Studio", "1 bedroom", "2 bedroom", "3 bedroom", "4 bedroom",
  "5 bedroom", "6 bedroom", "7 bedroom", "8 bedroom", "9 bedroom", "10 bedroom",
  "11 bedroom", "12 bedroom", "13 bedroom", "14 bedroom", "15 bedroom",
  "16 bedroom", "17 bedroom", "18 bedroom", "19 bedroom", "20 bedroom",
  "20+ bedroom", "Commercial / other"
];
const DEFAULT_MIX = Object.fromEntries(UNIT_TYPES.map((type) => [type, 0])) as Record<string, number>;

const styles = [
".bs-page{--bs-ink:#172033;--bs-muted:#58677d;--bs-line:#dce3ec;--bs-paper:#fff;--bs-soft:#f5f7fb;--bs-brand:#4338ca;--bs-brand2:#312e81;color:var(--bs-ink);background:linear-gradient(180deg,#f8faff 0%,#fff 36rem);min-height:100%;padding:clamp(16px,3vw,34px);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:normal;}",
".bs-page *{box-sizing:border-box}.bs-shell{max-width:1200px;margin:0 auto;display:grid;gap:26px}.bs-page button,.bs-page input{font:inherit}.bs-page button:focus-visible,.bs-page input:focus-visible,.bs-page a:focus-visible{outline:3px solid #818cf8;outline-offset:3px}.bs-page button{cursor:pointer}.bs-page button:disabled{cursor:not-allowed;opacity:.58}.bs-muted{color:var(--bs-muted)}",
".bs-hero{position:relative;overflow:hidden;border-radius:26px;padding:clamp(24px,4vw,42px);color:#fff;background:radial-gradient(ellipse at 85% 0%,rgba(167,139,250,.42),transparent 42%),linear-gradient(125deg,#171a3a 0%,#302d78 55%,#4f46a5 100%);box-shadow:0 18px 50px rgba(49,46,129,.17)}.bs-hero:after{content:'';position:absolute;width:240px;height:240px;border:1px solid rgba(255,255,255,.12);border-radius:50%;right:-68px;bottom:-130px;box-shadow:0 0 0 28px rgba(255,255,255,.035),0 0 0 56px rgba(255,255,255,.025)}.bs-hero-content{position:relative;z-index:1;max-width:820px}.bs-eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;color:#ddd6fe;margin:0 0 14px}.bs-hero h1{font-size:clamp(29px,4vw,44px);line-height:1.08;letter-spacing:-.04em;margin:0 0 14px;color:#fff;font-weight:850}.bs-hero p{font-size:clamp(15px,1.5vw,17px);line-height:1.7;max-width:740px;color:#e6e8ff;margin:0}.bs-trust-row{display:flex;gap:10px 18px;flex-wrap:wrap;margin-top:24px;color:#f5f3ff;font-size:13px;font-weight:650}.bs-trust-row span{display:inline-flex;align-items:center;gap:7px}.bs-trust-row svg{color:#c4b5fd}",
".bs-section-head{display:flex;justify-content:space-between;align-items:flex-end;gap:14px;flex-wrap:wrap}.bs-section-head h2{font-size:clamp(22px,2.5vw,28px);letter-spacing:-.03em;margin:0 0 7px;color:#172033;font-weight:800}.bs-section-head p{margin:0;line-height:1.65;font-size:14px;color:#58677d;max-width:720px}.bs-refresh{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 13px;border:1px solid #d8dfeb;border-radius:12px;background:#fff;color:#27334b;font-size:13px;font-weight:750}.bs-alert{display:flex;gap:10px;align-items:flex-start;border:1px solid #fecaca;background:#fff1f2;color:#9f1239;padding:13px 15px;border-radius:14px;line-height:1.55;font-size:14px}.bs-notice{display:flex;gap:10px;align-items:flex-start;border:1px solid #bbf7d0;background:#f0fdf4;color:#166534;padding:13px 15px;border-radius:14px;line-height:1.55;font-size:14px}",
".bs-current{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center;border:1px solid #c7d2fe;background:linear-gradient(115deg,#eef2ff,#fff 72%);padding:20px 22px;border-radius:18px}.bs-current-label{font-size:11px;text-transform:uppercase;letter-spacing:.1em;font-weight:850;color:#4338ca;margin:0 0 6px}.bs-current h3{font-size:21px;margin:0 0 7px;color:#1e1b4b}.bs-current p{margin:0;color:#4b5871;line-height:1.6;font-size:14px}.bs-status{display:inline-flex;align-items:center;gap:7px;padding:8px 11px;border-radius:999px;background:#dcfce7;color:#166534;font-size:12px;font-weight:850;text-transform:capitalize;white-space:nowrap}.bs-status.pending_payment,.bs-status.pending_verification,.bs-status.past_due{background:#fef3c7;color:#92400e}.bs-status.rejected,.bs-status.expired{background:#ffe4e6;color:#9f1239}",
".bs-estimator{border:1px solid #dfe5ee;border-radius:20px;padding:clamp(18px,3vw,26px);background:#fff;box-shadow:0 8px 28px rgba(22,34,59,.035)}.bs-estimator-head{display:flex;gap:12px;align-items:flex-start;margin-bottom:18px}.bs-icon-box{width:42px;height:42px;flex:0 0 42px;display:grid;place-items:center;border-radius:13px;background:#eef2ff;color:#4338ca}.bs-estimator h3{font-size:18px;margin:0 0 5px;color:#172033}.bs-estimator p{font-size:13px;line-height:1.65;color:#58677d;margin:0}.bs-mix{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,145px),1fr));gap:12px}.bs-field{display:grid;gap:7px;color:#334155;font-size:12px;font-weight:750}.bs-field input{width:100%;min-width:0;border:1px solid #cbd5e1;border-radius:10px;padding:11px 12px;background:#fff;color:#172033;font-size:15px;min-height:43px}.bs-field input:focus{border-color:#6366f1}.bs-estimator-foot{display:flex;gap:8px;align-items:flex-start;margin-top:15px;padding:12px 13px;border-radius:12px;background:#f8fafc;color:#475569;font-size:12px;line-height:1.55}.bs-total{display:flex;justify-content:space-between;gap:14px;align-items:center;flex-wrap:wrap;margin-top:18px;padding-top:17px;border-top:1px solid #e2e8f0}.bs-total strong{font-size:13px;color:#334155}.bs-total span{font-size:13px;color:#64748b}.bs-total .bs-total-number{font-size:21px;font-weight:850;color:#312e81}",
".bs-plans{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;align-items:stretch}.bs-plan{position:relative;display:flex;flex-direction:column;min-width:0;background:#fff;border:1px solid #dfe5ee;border-radius:20px;padding:22px;box-shadow:0 8px 28px rgba(22,34,59,.035);transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}.bs-plan:hover{transform:translateY(-3px);box-shadow:0 16px 35px rgba(22,34,59,.09)}.bs-plan.featured{border:2px solid #635bdb;padding:21px;background:linear-gradient(180deg,#f5f3ff 0%,#fff 42%);box-shadow:0 14px 36px rgba(79,70,229,.12)}.bs-plan.selected{outline:3px solid #c7d2fe;outline-offset:2px}.bs-popular{position:absolute;top:-12px;right:17px;background:#4338ca;color:#fff;border-radius:999px;padding:6px 10px;font-size:10px;font-weight:900;letter-spacing:.07em;text-transform:uppercase;box-shadow:0 5px 12px rgba(67,56,202,.25)}.bs-plan-top{display:flex;align-items:center;gap:10px;margin-bottom:14px}.bs-plan-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:13px;background:#f1f5f9;color:#334155}.bs-plan.featured .bs-plan-icon{background:#e0e7ff;color:#4338ca}.bs-plan h3{font-size:22px;line-height:1.2;color:#172033;margin:0;font-weight:850;letter-spacing:-.025em}.bs-plan-subtitle{min-height:44px;font-size:13px;line-height:1.6;color:#58677d;margin:0 0 18px}.bs-price{display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:6px}.bs-price strong{font-size:clamp(25px,2.6vw,32px);line-height:1.1;letter-spacing:-.045em;color:#172033;font-weight:900}.bs-price span{font-size:12px;color:#64748b;font-weight:650}.bs-rate-note{font-size:12px;line-height:1.55;color:#58677d;min-height:38px;margin:0 0 18px}.bs-plan-divider{height:1px;background:#e2e8f0;margin:0 0 16px}.bs-plan h4{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#64748b;margin:0 0 12px;font-weight:850}.bs-features{display:grid;gap:12px;list-style:none;margin:0 0 22px;padding:0}.bs-features li{display:flex;gap:9px;align-items:flex-start;color:#334155;font-size:13px;line-height:1.5}.bs-features svg{color:#059669;flex:0 0 16px;margin-top:2px}.bs-plan-actions{margin-top:auto;display:grid;gap:9px}.bs-choose{width:100%;display:flex;align-items:center;justify-content:center;gap:9px;min-height:47px;border:1px solid #4338ca!important;border-radius:12px;background:#4338ca!important;color:#fff!important;padding:12px 14px;font-weight:850;font-size:14px}.bs-plan:not(.featured) .bs-choose{background:#fff!important;color:#3730a3!important;border-color:#c7d2fe!important}.bs-plan .bs-choose:disabled{background:#e2e8f0!important;color:#64748b!important;border-color:#e2e8f0!important}.bs-plan-caption{text-align:center;font-size:11px;line-height:1.5;color:#64748b;margin:0}",
".bs-compare{overflow:hidden;border:1px solid #dfe5ee;border-radius:18px;background:#fff}.bs-compare-head{padding:21px 22px 16px}.bs-compare-head h3{margin:0 0 6px;font-size:20px;color:#172033}.bs-compare-head p{margin:0;font-size:13px;line-height:1.6;color:#58677d}.bs-table-wrap{overflow-x:auto}.bs-table{border-collapse:collapse;width:100%;min-width:650px;font-size:13px}.bs-table th,.bs-table td{padding:13px 17px;text-align:left;border-top:1px solid #e8edf3;vertical-align:top}.bs-table thead th{background:#f8fafc;color:#475569;font-size:11px;letter-spacing:.07em;text-transform:uppercase}.bs-table tbody th{font-weight:750;color:#334155;width:34%}.bs-table td{color:#475569}.bs-yes{display:inline-flex;gap:6px;align-items:center;color:#047857;font-weight:750}.bs-no{color:#94a3b8}",
".bs-payment{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(280px,.9fr);gap:18px;align-items:start}.bs-panel{border:1px solid #dfe5ee;background:#fff;border-radius:20px;padding:clamp(18px,3vw,25px);min-width:0}.bs-panel h3{font-size:20px;line-height:1.3;color:#172033;margin:0 0 8px}.bs-panel-intro{font-size:13px;color:#58677d;line-height:1.7;margin:0 0 18px}.bs-steps{display:grid;gap:16px;list-style:none;padding:0;margin:0}.bs-step{display:grid;grid-template-columns:32px minmax(0,1fr);gap:11px;align-items:start}.bs-step-num{display:grid;place-items:center;width:30px;height:30px;border-radius:10px;background:#eef2ff;color:#4338ca;font-size:12px;font-weight:900}.bs-step strong{display:block;color:#26334a;font-size:13px;margin:2px 0 4px}.bs-step p{margin:0;color:#64748b;font-size:12px;line-height:1.6}.bs-till-card{background:linear-gradient(145deg,#f5f3ff,#eef2ff);border:1px solid #c7d2fe;border-radius:16px;padding:18px;margin:0 0 16px}.bs-till-label{display:flex;gap:8px;align-items:center;font-size:12px;color:#4338ca;font-weight:850;margin:0 0 10px}.bs-till-number{font-size:clamp(24px,3vw,31px);font-weight:900;letter-spacing:.04em;color:#1e1b4b;overflow-wrap:anywhere;margin:0 0 6px}.bs-till-note{font-size:12px;color:#4b5871;line-height:1.55;margin:0}.bs-pending-setup{display:flex;gap:10px;align-items:flex-start;padding:14px;border-radius:13px;background:#fffbeb;border:1px solid #fde68a;color:#92400e;font-size:13px;line-height:1.6}.bs-pending-setup strong{display:block;margin-bottom:4px}.bs-pay-form{display:grid;gap:13px}.bs-submit{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:46px;border-radius:12px;border:0;background:#4338ca;color:#fff;font-size:14px;font-weight:850;padding:12px 15px}.bs-smallprint{font-size:11px;line-height:1.6;color:#64748b;margin:12px 0 0}.bs-history{border:1px solid #dfe5ee;border-radius:18px;overflow:hidden;background:#fff}.bs-history-head{padding:19px 21px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}.bs-history-head h3{margin:0;font-size:18px;color:#172033}.bs-history-head p{margin:4px 0 0;color:#64748b;font-size:12px}.bs-history table{width:100%;min-width:540px;border-collapse:collapse;font-size:12px}.bs-history th,.bs-history td{text-align:left;padding:12px 16px;border-top:1px solid #e8edf3}.bs-history th{background:#f8fafc;color:#64748b;text-transform:uppercase;letter-spacing:.06em;font-size:10px}.bs-history td{color:#334155}.bs-payment-status{display:inline-flex;padding:5px 8px;border-radius:999px;background:#f1f5f9;color:#475569;font-size:10px;font-weight:850;text-transform:capitalize;white-space:nowrap}.bs-payment-status.confirmed{background:#dcfce7;color:#166534}.bs-payment-status.pending_verification{background:#fef3c7;color:#92400e}.bs-payment-status.rejected{background:#ffe4e6;color:#9f1239}",
".bs-separation{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.bs-separation-card{display:flex;gap:12px;align-items:flex-start;border:1px solid #dfe5ee;border-radius:16px;background:#fff;padding:17px}.bs-separation-card h4{margin:0 0 5px;color:#25324a;font-size:14px}.bs-separation-card p{margin:0;color:#58677d;font-size:12px;line-height:1.65}.bs-separation-card a{display:inline-flex;align-items:center;gap:5px;margin-top:9px;color:#4338ca;font-size:12px;font-weight:800;text-decoration:none}.bs-faq{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.bs-faq-item{padding:17px;border:1px solid #e2e8f0;border-radius:15px;background:#fff}.bs-faq-item h4{display:flex;gap:8px;align-items:flex-start;color:#27334b;font-size:13px;line-height:1.45;margin:0 0 7px}.bs-faq-item p{font-size:12px;line-height:1.65;color:#58677d;margin:0}.bs-footer-note{display:flex;gap:9px;align-items:flex-start;color:#64748b;font-size:12px;line-height:1.65;padding:0 2px}.bs-footer-note svg{flex:0 0 17px;margin-top:1px}",
"@media(max-width:980px){.bs-plans{grid-template-columns:1fr 1fr}.bs-plan:last-child{grid-column:1/-1}.bs-payment{grid-template-columns:1fr}}@media(max-width:650px){.bs-plans,.bs-faq,.bs-separation{grid-template-columns:1fr}.bs-plan:last-child{grid-column:auto}.bs-current{grid-template-columns:1fr}.bs-current .bs-status{justify-self:start}.bs-hero{border-radius:20px}.bs-trust-row{display:grid;gap:10px}.bs-plan-subtitle,.bs-rate-note{min-height:0}.bs-total{align-items:flex-start;flex-direction:column;gap:5px}}@media(prefers-reduced-motion:reduce){.bs-plan{transition:none}.bs-plan:hover{transform:none}}"
].join("\n");

function readCanManage(): boolean {
  try {
    const raw = localStorage.getItem("user") ?? sessionStorage.getItem("user");
    const role = raw ? (JSON.parse(raw) as { role?: string }).role : "";
    return role === "admin" || role === "owner";
  } catch {
    return false;
  }
}
function statusLabel(status: string): string {
  return status.replaceAll("_", " ");
}
function premiumRate(type: string): number {
  const normalized = type.toLowerCase();
  if (normalized.includes("bedsitter") || normalized === "studio") return 100;
  if (normalized.includes("commercial")) return 150;
  if (normalized.includes("20+ bedroom")) return 200;
  const bedrooms = Number.parseInt(normalized, 10);
  if (!Number.isFinite(bedrooms)) return 150;
  return bedrooms === 1 ? 150 : 200;
}

export default function PlatformSubscriptionPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyPlan, setBusyPlan] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [unitMix, setUnitMix] = useState<Record<string, number>>(DEFAULT_MIX);
  const canManage = useMemo(readCanManage, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest("/platform-subscription/status") as Payload;
      setData(result);
      if (result.subscription?.unit_mix) {
        setUnitMix((current) => ({ ...DEFAULT_MIX, ...current, ...result.subscription?.unit_mix }));
      }
      if (result.quote) setAmount(String(result.quote.monthly_amount));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not load your subscription details. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const estimatedUnits = useMemo(
    () => Object.values(unitMix).reduce((sum, count) => sum + Math.max(0, Number(count) || 0), 0),
    [unitMix]
  );
  const estimates = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const plan of data?.plans ?? []) {
      totals[plan.code] = Object.entries(unitMix).reduce((sum, [type, rawCount]) => {
        const count = Math.max(0, Number(rawCount) || 0);
        const override = data?.subscription?.pricing_overrides?.[type];
        const rate = typeof override === "number" ? override : plan.code === "premium" ? (plan.unit_rates?.[type] ?? premiumRate(type)) : (plan.base_rate ?? (plan.code === "basic" ? 100 : 125));
        return sum + count * rate;
      }, 0);
    }
    return totals;
  }, [data?.plans, unitMix]);

  const currentPlan = data?.plans.find((plan) => plan.code === data.subscription?.plan_code);
  const hasActiveSubscription = data?.subscription?.status === "active";
  const canChoosePlan = !hasActiveSubscription && estimatedUnits > 0 && canManage;

  async function choosePlan(planCode: string) {
    setBusyPlan(planCode);
    setError("");
    setNotice("");
    try {
      const result = await apiRequest("/platform-subscription/select", {
        method: "POST",
        body: JSON.stringify({ plan_code: planCode, unit_mix: unitMix })
      }) as { message?: string };
      setNotice(result.message ?? "Your plan has been saved. Continue to payment below.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not select this plan. Please try again.");
    } finally {
      setBusyPlan("");
    }
  }

  async function submitReference(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSubmittingPayment(true);
    try {
      const result = await apiRequest("/platform-subscription/payment-reference", {
        method: "POST",
        body: JSON.stringify({ reference: reference.trim(), amount: Number(amount) })
      }) as { message?: string };
      setNotice(result.message ?? "Your receipt reference has been submitted for verification.");
      setReference("");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not submit your payment reference.");
    } finally {
      setSubmittingPayment(false);
    }
  }

  if (loading && !data) {
    return <DashboardLayout><main className="bs-page"><style>{styles}</style><div className="bs-shell"><section className="bs-hero"><p className="bs-eyebrow">MARSWebz · Platform billing</p><h1>Find the right plan for your properties.</h1><p>Loading your plan options, current subscription and payment setup…</p></section><p className="bs-muted">Connecting securely to your billing details…</p></div></main></DashboardLayout>;
  }

  const planIcon = (code: string) => code === "premium" ? <Crown size={21} /> : code === "standard" ? <Zap size={21} /> : <WalletCards size={21} />;

  return <DashboardLayout>
    <main className="bs-page">
      <style>{styles}</style>
      <div className="bs-shell">
        <section className="bs-hero">
          <div className="bs-hero-content">
            <p className="bs-eyebrow"><Sparkles size={15} /> MARSWebz · Plans that grow with your portfolio</p>
            <h1>More clarity for you.<br />A better experience for your tenants.</h1>
            <p>Choose the tools your property business needs today, with a clear monthly fee per unit. Compare what each plan includes, estimate your cost before committing, and submit your M-Pesa Till receipt for verification—all in one place.</p>
            <div className="bs-trust-row">
              <span><ShieldCheck size={16} /> Transparent monthly pricing</span>
              <span><LockKeyhole size={16} /> Secure, organization-level billing</span>
              <span><FileCheck2 size={16} /> Receipt reviewed before activation</span>
            </div>
          </div>
        </section>

        {error && <div className="bs-alert" role="alert"><XCircle size={18} /> <div><strong>We couldn't complete that step.</strong><br />{error}</div></div>}
        {notice && <div className="bs-notice" role="status"><CheckCircle2 size={18} /> <div>{notice}</div></div>}

        {data?.subscription && <section className="bs-current" aria-label="Current subscription status">
          <div>
            <p className="bs-current-label">Your subscription</p>
            <h3>{currentPlan?.name ?? data.subscription.plan_code} plan</h3>
            <p>{data.subscription.billable_units} billable units · {formatMoney(data.quote?.monthly_amount ?? Number(data.subscription.monthly_amount), "KES")} per month at the current unit count.</p>
            {data.subscription.current_period_ends_at && <p style={{ marginTop: 6 }}>Next period end: {new Date(data.subscription.current_period_ends_at).toLocaleDateString()}</p>}
          </div>
          <span className={"bs-status " + data.subscription.status}>{data.subscription.status === "active" ? <BadgeCheck size={15} /> : <Clock3 size={15} />}{statusLabel(data.subscription.status)}</span>
        </section>}

        <section className="bs-shell" style={{ gap: 16 }}>
          <div className="bs-section-head">
            <div><h2>Choose the right plan</h2><p>Every plan is billed monthly per unit. Start with the level of service that fits your workflow, then compare the details below.</p></div>
            <button className="bs-refresh" type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> {loading ? "Refreshing…" : "Refresh details"}</button>
          </div>

          <section className="bs-estimator" aria-labelledby="bs-estimator-title">
            <div className="bs-estimator-head">
              <div className="bs-icon-box"><CreditCard size={21} /></div>
              <div><h3 id="bs-estimator-title">Estimate your monthly cost</h3><p>Enter how many units you expect to manage. This is an estimate for comparing plans; your actual fee is based on the units recorded for your organization.</p></div>
            </div>
            <div className="bs-mix">
              {UNIT_TYPES.map((type) => <label className="bs-field" key={type}>{type}
                <input type="number" inputMode="numeric" min="0" step="1" value={unitMix[type] ?? 0}
                  onChange={(event) => setUnitMix((current) => ({ ...current, [type]: Math.min(100000, Math.max(0, Number.parseInt(event.target.value, 10) || 0)) }))}
                  aria-label={"Number of " + type + " units"} />
              </label>)}
            </div>
            <div className="bs-estimator-foot"><CircleHelp size={16} /><span>Premium rates: bedsitter/studio KES 100; 1-bedroom KES 150; 2-bedroom and larger, including 20+, KES 200 per unit. Basic and Standard have flat unit rates. Any negotiated rate set for your organization takes precedence on the final quote.</span></div>
            <div className="bs-total"><strong>{estimatedUnits.toLocaleString()} estimated units</strong><div><span>Monthly estimate for each plan</span></div></div>
          </section>

          <div className="bs-plans">
            {(data?.plans ?? []).map((plan) => {
              const selected = data?.subscription?.plan_code === plan.code;
              const featured = plan.code === "premium";
              const estimate = estimates[plan.code] ?? 0;
              const premiumRates = Object.values(plan.unit_rates ?? { studio: 100, oneBedroom: 150, twoBedroom: 200 });
              const headlinePrice = plan.price_model === "flat" ? "KES " + (plan.base_rate ?? 0) : "KES " + Math.min(...premiumRates) + "–" + Math.max(...premiumRates);
              const priceSuffix = "per unit / month";
              const caption = plan.code === "basic" ? "Simple, dependable payment matching." : plan.code === "standard" ? "More ways for tenants to pay you." : "A fuller digital experience for your properties.";
              const planFeatures = plan.features.filter((feature) => !feature.toLowerCase().startsWith("no "));
              return <article key={plan.code} className={"bs-plan" + (featured ? " featured" : "") + (selected ? " selected" : "")}>
                {featured && <span className="bs-popular">Full experience</span>}
                <div className="bs-plan-top"><span className="bs-plan-icon">{planIcon(plan.code)}</span><div><h3>{plan.name}</h3><span style={{ display: "block", fontSize: 11, color: "#64748b", marginTop: 4 }}>{caption}</span></div></div>
                <p className="bs-plan-subtitle">{plan.description}</p>
                <div className="bs-price"><strong>{headlinePrice}</strong><span>{priceSuffix}</span></div>
                <p className="bs-rate-note">{plan.code === "premium" ? "Final price depends on unit type and any negotiated organization rate." : plan.code === "basic" ? "A predictable rate for the core recordkeeping and matching workflow." : "A predictable rate with shareable tenant payment links included."}</p>
                <div className="bs-plan-divider" />
                <h4>Included in this plan</h4>
                <ul className="bs-features">{planFeatures.map((feature) => <li key={feature}><CheckCircle2 size={16} /> <span>{feature}</span></li>)}</ul>
                <div className="bs-plan-actions">
                  <div style={{ borderRadius: 12, background: featured ? "#ede9fe" : "#f8fafc", padding: "12px 13px", marginBottom: 3 }}>
                    <span style={{ display: "block", fontSize: 11, color: "#64748b", marginBottom: 4 }}>Your estimate · {estimatedUnits} units</span>
                    <strong style={{ display: "block", color: "#1e1b4b", fontSize: 20 }}>{formatMoney(estimate, "KES")}<span style={{ fontSize: 11, fontWeight: 650, color: "#64748b" }}> / month</span></strong>
                  </div>
                  <button className="bs-choose" type="button" disabled={!canChoosePlan || !!busyPlan || selected}
                    onClick={() => void choosePlan(plan.code)}>
                    {busyPlan === plan.code ? "Saving your selection…" : selected ? <><Check size={17} /> {hasActiveSubscription ? "Your active plan" : "Selected plan"}</> : hasActiveSubscription ? "Contact support to change" : !canManage ? "Owner / admin only" : estimatedUnits < 1 ? "Add your unit count above" : <>Choose {plan.name} <ArrowRight size={16} /></>}
                  </button>
                  <p className="bs-plan-caption">{selected ? "Your selection is saved." : "No payment is taken when you select a plan."}</p>
                </div>
              </article>;
            })}
          </div>
        </section>

        <section className="bs-compare">
          <div className="bs-compare-head"><h3>Compare plans at a glance</h3><p>Understand what changes as your portfolio needs grow. Feature availability is supplied by your account's plan catalogue.</p></div>
          <div className="bs-table-wrap"><table className="bs-table">
            <thead><tr><th>Capability</th>{(data?.plans ?? []).map((plan) => <th key={plan.code}>{plan.name}</th>)}</tr></thead>
            <tbody>
              {[
                { label: "Monthly rate", values: (data?.plans ?? []).map((plan) => plan.price_model === "flat" ? "KES " + (plan.base_rate ?? 0) + " per unit" : "KES " + Math.min(...Object.values(plan.unit_rates ?? { studio: 100, oneBedroom: 150, twoBedroom: 200 })) + "–" + Math.max(...Object.values(plan.unit_rates ?? { studio: 100, oneBedroom: 150, twoBedroom: 200 })) + " by unit type") },
                { label: "Payment matching to property records", values: ["Included", "Included", "Included"] },
                { label: "Shareable tenant payment links", values: ["—", "Included", "Included"] },
                { label: "Tenant portal and self-service", values: ["—", "—", "Included"] },
                { label: "Full payment ledger and reconciliation", values: ["—", "—", "Included"] },
                { label: "Maintenance requests and tenant notifications", values: ["—", "—", "Included"] },
                { label: "Expanded management workflows", values: ["—", "—", "Included"] }
              ].map((row) => <tr key={row.label}><th scope="row">{row.label}</th>{(data?.plans ?? []).map((plan, index) => <td key={plan.code}>{row.values[index] === "—" ? <span className="bs-no">Not included</span> : <span className="bs-yes"><Check size={14} /> {row.values[index]}</span>}</td>)}</tr>)}
            </tbody>
          </table></div>
        </section>

        <section className="bs-shell" style={{ gap: 14 }}>
          <div className="bs-section-head"><div><h2>Payment & activation</h2><p>When you're ready, select a plan, pay to the platform's M-Pesa Till, and submit the receipt reference. Access activates after our platform team verifies the payment.</p></div></div>
          {!data?.subscription ? <div className="bs-pending-setup"><Clock3 size={19} /><div><strong>Choose a plan to continue</strong>Select the plan that suits your organization above. The payment instructions will appear here after your selection is saved.</div></div> :
            <div className="bs-payment">
              <section className="bs-panel">
                <h3>How to pay by M-Pesa Till</h3>
                <p className="bs-panel-intro">Use these steps to pay your platform subscription. This is a payment to MARSWebz for PMS access—not a rent payment to your property business.</p>
                {data.payment_setup_ready && data.till_number ? <>
                  <div className="bs-till-card"><p className="bs-till-label"><WalletCards size={16} /> MARSWebz platform Till number</p><p className="bs-till-number">{data.till_number}</p><p className="bs-till-note">Pay the monthly amount shown on your selected plan. Keep your M-Pesa confirmation message so you can submit its receipt code below.</p></div>
                  <ol className="bs-steps">
                    <li className="bs-step"><span className="bs-step-num">1</span><div><strong>Open M-Pesa on your phone</strong><p>Choose Lipa na M-Pesa, then Buy Goods and Services (Till).</p></div></li>
                    <li className="bs-step"><span className="bs-step-num">2</span><div><strong>Enter the platform Till and amount</strong><p>Use the MARSWebz platform Till shown above and pay the monthly total for your selected plan.</p></div></li>
                    <li className="bs-step"><span className="bs-step-num">3</span><div><strong>Submit your receipt reference</strong><p>Enter the M-Pesa confirmation code and amount below. The platform team reviews the payment before activation.</p></div></li>
                  </ol>
                </> : <div className="bs-pending-setup"><Clock3 size={19} /><div><strong>Platform Till details are not configured yet</strong>The platform team still needs to configure its receiving Till number. Your selected plan is saved, but do not send money to an unverified number. Payment submission will become available when the official Till is configured.</div></div>}
              </section>
              <section className="bs-panel">
                <h3>Submit payment reference</h3>
                <p className="bs-panel-intro">After making the payment, submit the details exactly as shown in your M-Pesa message. Your subscription stays pending until verification.</p>
                {data.payment_setup_ready ? <form className="bs-pay-form" onSubmit={(event) => void submitReference(event)}>
                  <label className="bs-field">M-Pesa receipt code
                    <input required value={reference} onChange={(event) => setReference(event.target.value.toUpperCase())} placeholder="e.g. QWE123ABC" autoComplete="off" maxLength={120} />
                  </label>
                  <label className="bs-field">Amount paid (KES)
                    <input required type="number" min={Number(data.quote?.monthly_amount ?? data.subscription.monthly_amount)} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
                  </label>
                  <button className="bs-submit" type="submit" disabled={submittingPayment || !canManage}>{submittingPayment ? "Submitting for review…" : <>Submit for verification <ArrowRight size={16} /></>}</button>
                  <p className="bs-smallprint"><LockKeyhole size={12} style={{ display: "inline", verticalAlign: "middle" }} /> Only submit a genuine receipt reference for a completed payment. Never share your M-Pesa PIN or one-time password.</p>
                </form> : <div className="bs-pending-setup"><Clock3 size={18} /><div><strong>Waiting for official payment details</strong>You can review your selection while the platform receiving Till is being configured.</div></div>}
              </section>
            </div>
          }
        </section>

        {(data?.payments?.length ?? 0) > 0 && <section className="bs-history">
          <div className="bs-history-head"><div><h3>Subscription payment history</h3><p>Recent receipt references and their verification status.</p></div><button className="bs-refresh" type="button" onClick={() => void load()}><RefreshCw size={14} /> Refresh history</button></div>
          <div className="bs-table-wrap"><table><thead><tr><th>Date</th><th>Receipt reference</th><th>Amount</th><th>Status</th></tr></thead><tbody>
            {data?.payments.map((payment) => <tr key={payment.id}><td>{new Date(payment.created_at).toLocaleDateString()}</td><td>{payment.reference ?? "—"}</td><td>{formatMoney(Number(payment.amount), "KES")}</td><td><span className={"bs-payment-status " + payment.status}>{statusLabel(payment.status)}</span></td></tr>)}
          </tbody></table></div>
        </section>}

        <section className="bs-shell" style={{ gap: 14 }}>
          <div className="bs-section-head"><div><h2>Keep platform billing separate from rent collection</h2><p>There are two different payment setups in your property business. This page is only for your organization's PMS subscription.</p></div></div>
          <div className="bs-separation">
            <article className="bs-separation-card"><span className="bs-icon-box"><CreditCard size={20} /></span><div><h4>Your PMS subscription</h4><p>Paid to the MARSWebz platform Till. The receipt reference is reviewed by our team, and access is activated after confirmation.</p></div></article>
            <article className="bs-separation-card"><span className="bs-icon-box"><WalletCards size={20} /></span><div><h4>Your tenants' rent and charges</h4><p>Configure your organization's own Till, PayBill, bank or supported collection destination in Payment Settings. Tenant rent goes to your configured destination, not to the platform subscription Till.</p><a href="/manager/settings">Open organization settings <ExternalLink size={13} /></a></div></article>
          </div>
        </section>

        <section className="bs-shell" style={{ gap: 14 }}>
          <div className="bs-section-head"><div><h2>Questions, answered</h2><p>Clear expectations before you choose.</p></div></div>
          <div className="bs-faq">
            <article className="bs-faq-item"><h4><CircleHelp size={16} /> When does my subscription become active?</h4><p>After you select a plan, pay to the official platform Till and submit the receipt code, our platform team verifies the payment. Your subscription activates after confirmation.</p></article>
            <article className="bs-faq-item"><h4><CircleHelp size={16} /> Does a tenant need to pay this subscription?</h4><p>No. The organization/property owner pays the platform subscription. Tenants do not pay MARSWebz for access to a property manager's account.</p></article>
            <article className="bs-faq-item"><h4><CircleHelp size={16} /> How is my monthly fee calculated?</h4><p>Basic is KES 100 per unit and Standard is KES 125 per unit. Premium is KES 100 for bedsitters/studios, KES 150 for one-bedroom units, and KES 200 for every unit with two or more bedrooms, including 20+. Negotiated organization rates may apply.</p></article>
            <article className="bs-faq-item"><h4><CircleHelp size={16} /> Can I change a plan after activating it?</h4><p>To avoid unexpected billing changes, an active plan cannot currently be switched from this screen. Contact platform support to discuss a plan change or a negotiated quote.</p></article>
          </div>
        </section>

        <p className="bs-footer-note"><ShieldCheck size={17} /> Your subscription details and payment status are fetched from the PMS backend. Plan selection is saved to your organization; submitting a receipt does not activate access on its own. We do not ask for your M-Pesa PIN or hold your tenants' rent funds.</p>
      </div>
    </main>
  </DashboardLayout>;
}
