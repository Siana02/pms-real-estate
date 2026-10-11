import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, BadgeCheck, Building2, Check, CheckCircle2, CircleHelp, Clock3, CreditCard, Crown, Info, LockKeyhole, RefreshCw, ShieldCheck, Sparkles, Wallet, X } from "lucide-react";
import type { FormEvent } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { apiRequest } from "../../services/api";
import { formatMoney } from "../../services/format";

type Plan = { code: string; name: string; price_model: "flat" | "unit_type"; base_rate: number | null; description: string; features: string[] };
type Subscription = { id: number; plan_code: string; status: string; monthly_amount: string | number; billable_units: number; current_period_ends_at: string | null };
type Payment = { id: number; amount: string | number; reference: string | null; status: string; created_at: string };
type Payload = { plans: Plan[]; subscription: Subscription | null; quote: { billable_units: number; monthly_amount: number } | null; till_number: string | null; payment_setup_ready: boolean; payments: Payment[] };

const UNIT_TYPES = ["Bedsitter", "Studio", "1 bedroom", "2 bedroom", "3 bedroom", "4 bedroom", "5 bedroom", "6 bedroom", "7 bedroom", "8 bedroom", "9 bedroom", "10 bedroom", "11 bedroom", "12 bedroom", "13 bedroom", "14 bedroom", "15 bedroom", "16 bedroom", "17 bedroom", "18 bedroom", "19 bedroom", "20 bedroom", "20+ bedroom", "Commercial / other"];
const EMPTY_MIX = Object.fromEntries(UNIT_TYPES.map((type) => [type, 0])) as Record<string, number>;

function rateFor(plan: string, type: string): number {
  const unit = type.toLowerCase();
  if (plan === "basic") return 100;
  if (plan === "standard") return 125;
  if (unit.includes("bedsitter") || unit === "studio") return 100;
  if (unit.includes("commercial")) return 150;
  if (unit.includes("20+ bedroom")) return 200;
  const bedrooms = Number.parseInt(unit, 10);
  return Number.isFinite(bedrooms) ? bedrooms === 1 ? 150 : 200 : 150;
}
function estimate(plan: string, mix: Record<string, number>): number {
  return Object.entries(mix).reduce((sum, [type, count]) => sum + count * rateFor(plan, type), 0);
}
function prettyStatus(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const pageStyles = `
.sub-page,.sub-page *{box-sizing:border-box}.sub-page{--ink:#172b3f;--muted:#526779;--line:#dce5eb;--blue:#245c83;--blue-dark:#173e5b;color:var(--ink)!important;background:#f7f9fb!important;min-height:100%;padding:clamp(15px,3vw,34px);font-family:Inter,"Segoe UI",Arial,sans-serif}.sub-page h1,.sub-page h2,.sub-page h3,.sub-page h4{color:var(--ink)!important;opacity:1!important;visibility:visible!important}.sub-page p,.sub-page li,.sub-page label,.sub-page span,.sub-page strong{opacity:1;visibility:visible}.sub-shell{max-width:1240px;margin:0 auto}.sub-eyebrow{display:flex;align-items:center;gap:7px;color:var(--blue)!important;font-size:12px;font-weight:850;letter-spacing:.1em;text-transform:uppercase;margin:0 0 12px}.sub-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;flex-wrap:wrap;margin-bottom:26px}.sub-heading h1{font-size:clamp(30px,4vw,44px);line-height:1.08;letter-spacing:-.045em;margin:0 0 12px;font-weight:850}.sub-lead{font-size:15px;line-height:1.75;color:var(--muted)!important;max-width:760px;margin:0}.sub-button{display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:11px;padding:11px 15px;font-weight:800;font-size:13px;line-height:1.3;cursor:pointer;border:1px solid transparent;text-decoration:none}.sub-button:disabled{cursor:not-allowed;opacity:.55}.sub-primary{background:var(--blue)!important;color:#fff!important;border-color:var(--blue)!important}.sub-primary:hover:not(:disabled){background:var(--blue-dark)!important}.sub-quiet{background:#fff!important;color:var(--ink)!important;border-color:var(--line)!important}.sub-card{background:#fff!important;border:1px solid var(--line)!important;border-radius:18px;padding:clamp(17px,2.4vw,25px);box-shadow:0 5px 20px rgba(26,49,67,.035)}.sub-alert{display:flex;align-items:flex-start;gap:10px;padding:13px;border-radius:11px;background:#fff7e8!important;border:1px solid #f2dfb5!important;color:#754b0e!important;font-size:12px;line-height:1.6;margin-bottom:15px}.sub-alert svg{flex:none}.sub-error{background:#fff0f0!important;border-color:#f3c7c7!important;color:#8b2727!important}.sub-success{background:#eaf7f0!important;border-color:#c5e7d4!important;color:#166342!important}.sub-status{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center;margin-bottom:22px;border-left:4px solid var(--blue)!important}.sub-status h2{font-size:21px;margin:0 0 7px;font-weight:850}.sub-muted{color:var(--muted)!important;line-height:1.65}.sub-pill{display:inline-flex;align-items:center;gap:7px;padding:8px 11px;border-radius:999px;background:#eaf7f0!important;color:#166342!important;font-size:12px;font-weight:850;white-space:nowrap}.sub-section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;flex-wrap:wrap;margin:28px 0 14px}.sub-section-head h2{font-size:24px;letter-spacing:-.025em;margin:0 0 5px;font-weight:850}.sub-section-head p{margin:0;font-size:14px;color:var(--muted)!important;line-height:1.6}.sub-estimate-top{display:flex;align-items:flex-start;justify-content:space-between;gap:15px;flex-wrap:wrap;margin-bottom:18px}.sub-estimate-top h3{font-size:18px;margin:0 0 5px;font-weight:850}.sub-total{border-radius:13px;background:#eef5fa!important;border:1px solid #d6e6f0;padding:11px 14px;min-width:150px}.sub-total span{display:block;font-size:11px;color:var(--muted)!important;font-weight:800;margin-bottom:3px}.sub-total strong{font-size:22px;color:var(--blue-dark)!important;font-weight:900}.sub-unit-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.sub-unit-field,.sub-field{display:grid;gap:7px;min-width:0;font-size:12px;font-weight:800;color:var(--ink)!important}.sub-unit-field input,.sub-input{width:100%;min-width:0;padding:11px 12px;border:1px solid #cbd8e1!important;border-radius:9px;background:#fff!important;color:#172b3f!important;font:inherit;font-size:14px;box-shadow:none!important}.sub-unit-field input:focus,.sub-input:focus{outline:3px solid rgba(36,92,131,.16);border-color:var(--blue)!important}.sub-note{display:flex;gap:9px;align-items:flex-start;margin:13px 0 0;font-size:12px;line-height:1.65;color:var(--muted)!important}.sub-note svg{flex:none}.sub-plan-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;align-items:stretch}.sub-plan{display:flex;flex-direction:column;position:relative;min-width:0;background:#fff!important;border:1px solid var(--line)!important;border-radius:18px;padding:23px;box-shadow:0 5px 20px rgba(26,49,67,.035)}.sub-featured{border:2px solid var(--blue)!important;box-shadow:0 12px 32px rgba(36,92,131,.12)}.sub-ribbon{position:absolute;top:-12px;left:20px;display:inline-flex;align-items:center;gap:6px;background:var(--blue)!important;color:#fff!important;border-radius:999px;padding:6px 10px;font-size:10px;font-weight:850;text-transform:uppercase}.sub-plan-top{display:flex;align-items:center;gap:10px;margin:2px 0 13px}.sub-plan-icon{display:grid;place-items:center;flex:none;width:39px;height:39px;border-radius:12px;background:#edf4f8!important;color:var(--blue)!important}.sub-plan-top h3{font-size:20px;margin:0;font-weight:900}.sub-blurb{font-size:13px;line-height:1.65;color:var(--muted)!important;min-height:63px;margin:0 0 17px}.sub-price{font-size:29px;line-height:1.1;letter-spacing:-.04em;font-weight:900;color:var(--ink)!important;margin:0 0 5px}.sub-price-caption{font-size:12px;color:var(--muted)!important;margin:0 0 16px;line-height:1.5}.sub-plan-estimate{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px;border-radius:11px;background:#f4f7fa!important;border:1px solid #e5ebef;margin-bottom:18px}.sub-plan-estimate span{font-size:11px;color:var(--muted)!important;line-height:1.45}.sub-plan-estimate strong{font-size:15px;white-space:nowrap;color:var(--ink)!important}.sub-feature-title{font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:900;color:#526779!important;margin:0 0 11px}.sub-features{list-style:none;padding:0;margin:0 0 22px;display:grid;gap:11px}.sub-features li{display:flex;align-items:flex-start;gap:9px;color:#31495b!important;font-size:13px;line-height:1.5}.sub-features svg{flex:none;color:#167553!important;margin-top:1px}.sub-plan-footer{margin-top:auto}.sub-payment-grid{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:17px;margin-top:26px}.sub-payment-card h2{font-size:21px;margin:0 0 8px;font-weight:900}.sub-step{display:flex;gap:12px;margin-top:16px}.sub-step-num{display:grid;place-items:center;flex:none;width:27px;height:27px;border-radius:50%;background:#e8f1f7!important;color:var(--blue)!important;font-size:12px;font-weight:900}.sub-step h3{font-size:13px;margin:0 0 4px;font-weight:850}.sub-step p{font-size:12px;line-height:1.6;color:var(--muted)!important;margin:0}.sub-till{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#edf5fa!important;border:1px solid #d8e7f0;border-radius:12px;padding:14px;margin:16px 0}.sub-till small{display:block;color:var(--muted)!important;font-size:11px;font-weight:800;margin-bottom:4px}.sub-till strong{font-size:20px;letter-spacing:.02em;color:var(--blue-dark)!important;overflow-wrap:anywhere}.sub-form{display:grid;gap:13px;margin-top:16px}.sub-history-wrap{overflow-x:auto}.sub-history{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px}.sub-history th{text-align:left;color:var(--muted)!important;font-size:10px;text-transform:uppercase;letter-spacing:.06em;background:#f4f7fa!important}.sub-history th,.sub-history td{padding:11px 9px;border-bottom:1px solid #e6edf1!important;vertical-align:top}.sub-history td{color:#31495b!important}.sub-payment-status{display:inline-flex;border-radius:999px;padding:5px 8px;font-size:10px;font-weight:850;background:#eef2f5!important;color:#405567!important}.sub-faq-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px;margin-top:14px}.sub-faq{padding:17px;border-radius:14px;border:1px solid var(--line)!important;background:#fff!important}.sub-faq h3{display:flex;gap:8px;align-items:center;font-size:13px;margin:0 0 8px;font-weight:900}.sub-faq p{font-size:12px;line-height:1.7;color:var(--muted)!important;margin:0}.sub-empty{padding:18px;border:1px dashed #cbd8e1;border-radius:12px;color:var(--muted)!important;font-size:13px;line-height:1.6}.sub-bottom-note{margin:20px 0 0;padding:15px 16px;border-radius:12px;background:#edf2f5!important;color:#526779!important;font-size:12px;line-height:1.7}.sub-desktop-break{display:block}
@media(max-width:1000px){.sub-plan-grid{grid-template-columns:1fr 1fr}.sub-unit-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.sub-payment-grid{grid-template-columns:1fr}.sub-faq-grid{grid-template-columns:1fr 1fr}}
@media(max-width:620px){.sub-page{padding:14px}.sub-plan-grid,.sub-faq-grid{grid-template-columns:1fr}.sub-unit-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.sub-status{grid-template-columns:1fr}.sub-plan{padding:19px}.sub-price{font-size:27px}.sub-desktop-break{display:none}}
`;

export default function PlatformSubscriptionPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyPlan, setBusyPlan] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [unitMix, setUnitMix] = useState<Record<string, number>>(EMPTY_MIX);
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await apiRequest("/platform-subscription/status") as Payload;
      setData(result);
      if (result.quote) setAmount(String(result.quote.monthly_amount));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not load subscription details. Please retry.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const canManage = useMemo(() => {
    try {
      const raw = localStorage.getItem("user") ?? sessionStorage.getItem("user");
      const role = raw ? (JSON.parse(raw) as { role?: string }).role : "";
      return role === "admin" || role === "owner";
    } catch { return false; }
  }, []);
  const unitCount = Object.values(unitMix).reduce((sum, count) => sum + count, 0);
  const active = data?.subscription?.status === "active" && !!data.subscription.current_period_ends_at && new Date(data.subscription.current_period_ends_at).getTime() > Date.now();
  const currentPlan = data?.plans.find((plan) => plan.code === data.subscription?.plan_code);
  const premiumRates = "Bedsitter/studio KES 100 · 1 bedroom KES 150 · 2–20+ bedrooms KES 200 per unit/month";

  async function choosePlan(planCode: string) {
    setBusyPlan(planCode); setError(""); setNotice("");
    try {
      const result = await apiRequest("/platform-subscription/select", { method: "POST", body: JSON.stringify({ plan_code: planCode, unit_mix: unitMix }) }) as { message?: string };
      setNotice(result.message ?? "Plan selected. Continue to payment below.");
      await load();
      document.getElementById("subscription-payment")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not select this plan. Please try again.");
    } finally { setBusyPlan(""); }
  }

  async function submitReference(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingPayment) return;
    setSubmittingPayment(true); setError(""); setNotice("");
    try {
      const result = await apiRequest("/platform-subscription/payment-reference", { method: "POST", body: JSON.stringify({ reference: reference.trim(), amount: Number(amount) }) }) as { message?: string };
      setNotice(result.message ?? "Payment reference submitted for verification.");
      setReference("");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not submit the payment reference.");
    } finally { setSubmittingPayment(false); }
  }

  if (loading && !data) return <DashboardLayout><div className="sub-page"><style>{pageStyles}</style><div className="sub-shell"><div className="sub-card"><p className="sub-muted">Loading plans, prices and subscription status…</p></div></div></div></DashboardLayout>;

  return <DashboardLayout>
    <div className="sub-page"><style>{pageStyles}</style><main className="sub-shell">
      <header className="sub-heading">
        <div><p className="sub-eyebrow"><ShieldCheck size={15}/> Simple, transparent platform pricing</p><h1>Choose the right plan<br className="sub-desktop-break"/> for your property business.</h1><p className="sub-lead">Spend less time chasing records and reconciling rent. Compare what each plan unlocks, estimate your monthly subscription from your portfolio, and submit your M-Pesa payment reference when you’re ready.</p></div>
        <button className="sub-button sub-quiet" type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={15}/>{loading ? "Refreshing…" : "Refresh details"}</button>
      </header>

      {error && <div className="sub-alert sub-error" role="alert"><X size={17}/><div><strong>We couldn’t complete that action.</strong><br/>{error}</div></div>}
      {notice && <div className="sub-alert sub-success" role="status"><CheckCircle2 size={17}/><div>{notice}</div></div>}

      {data?.subscription && <section className="sub-card sub-status" aria-label="Current subscription status"><div><p className="sub-eyebrow" style={{marginBottom:8}}>Your subscription</p><h2>{currentPlan?.name ?? prettyStatus(data.subscription.plan_code)} plan</h2><p className="sub-muted" style={{margin:0,fontSize:13}}>{data.subscription.billable_units} billable units · {formatMoney(data.quote?.monthly_amount ?? Number(data.subscription.monthly_amount),"KES")} estimated per month{data.subscription.current_period_ends_at ? " · Period ends " + new Date(data.subscription.current_period_ends_at).toLocaleDateString() : ""}</p></div><span className="sub-pill" style={active ? undefined : {background:"#fff4dc",color:"#81540d"}}><BadgeCheck size={15}/>{prettyStatus(data.subscription.status)}</span></section>}

      <div className="sub-section-head"><div><h2>Find your fit</h2><p>All plans are billed monthly per unit. Choose based on how your team manages tenants and payments.</p></div></div>
      <section className="sub-card" aria-labelledby="portfolio-estimate-heading">
        <div className="sub-estimate-top"><div><h3 id="portfolio-estimate-heading"><Building2 size={17} style={{verticalAlign:"text-bottom",marginRight:7}}/>Estimate your portfolio</h3><p className="sub-muted" style={{fontSize:12,margin:0}}>Enter the number of units you expect to manage. This is an initial estimate; the subscription API uses actual recorded units and any negotiated rates for the final quote.</p></div><div className="sub-total"><span>Expected units</span><strong>{unitCount.toLocaleString()}</strong></div></div>
        <div className="sub-unit-grid">{UNIT_TYPES.map((type) => <label className="sub-unit-field" key={type}>{type}<input type="number" min="0" max="100000" step="1" value={unitMix[type]} aria-label={"Expected number of " + type + " units"} onChange={(event) => setUnitMix((current) => ({...current,[type]:Math.min(100000,Math.max(0,Math.floor(Number(event.target.value)||0)))}))}/></label>)}</div>
        <p className="sub-note"><Info size={15}/>Premium pricing: {premiumRates}. Organization-specific negotiated rates, when set by the platform team, take precedence. Commercial/other units are estimated at KES 150 until confirmed in your quote.</p>
      </section>

      <section className="sub-plan-grid" aria-label="Available subscription plans" style={{marginTop:17}}>
        {(data?.plans ?? []).map((plan) => {
          const selected = data?.subscription?.plan_code === plan.code;
          const featured = plan.code === "premium";
          const planEstimate = estimate(plan.code, unitMix);
          const Icon = featured ? Crown : plan.code === "standard" ? Wallet : Building2;
          const price = plan.price_model === "unit_type" ? "KES 100–200" : "KES " + Number(plan.base_rate ?? 0).toLocaleString();
          return <article className={"sub-plan" + (featured ? " sub-featured" : "")} key={plan.code}>
            {featured && <span className="sub-ribbon"><Sparkles size={12}/>Most complete</span>}
            <div className="sub-plan-top"><span className="sub-plan-icon"><Icon size={20}/></span><h3>{plan.name}</h3></div>
            <p className="sub-blurb">{plan.description}</p><p className="sub-price">{price}</p><p className="sub-price-caption">{plan.price_model === "unit_type" ? "per unit / month · varies by unit type" : "per unit / month · predictable flat rate"}</p>
            <div className="sub-plan-estimate"><span>Estimated monthly cost<br/>for {unitCount} {unitCount === 1 ? "unit" : "units"}</span><strong>{formatMoney(planEstimate,"KES")}</strong></div>
            {featured && <p className="sub-note" style={{marginTop:-5,marginBottom:15}}><CheckCircle2 size={15}/>For owners who want tenant self-service and a fuller operations toolkit.</p>}
            <p className="sub-feature-title">Included in this plan</p><ul className="sub-features">{plan.features.map((feature) => <li key={feature}><Check size={16}/><span>{feature}</span></li>)}</ul>
            {featured && <p className="sub-note" style={{marginTop:-5,marginBottom:15}}><Info size={15}/>{premiumRates}. Negotiated rates take precedence.</p>}
            <div className="sub-plan-footer">{selected ? <button className="sub-button sub-quiet" type="button" disabled style={{width:"100%"}}><CheckCircle2 size={16}/>{active ? "Your current plan" : "Currently selected"}</button> : <button className="sub-button sub-primary" type="button" disabled={!canManage || !!busyPlan || !!active || unitCount < 1} onClick={() => void choosePlan(plan.code)} style={{width:"100%"}}>{busyPlan === plan.code ? "Saving selection…" : data?.subscription ? "Choose " + plan.name : "Select " + plan.name}<ArrowRight size={15}/></button>}
            {active && selected && <p className="sub-muted" style={{fontSize:11,margin:"9px 0 0"}}>To change an active plan, contact platform support before renewal.</p>}</div>
          </article>;
        })}
      </section>
      {!canManage && <p className="sub-note"><LockKeyhole size={15}/>Only your organization owner or primary administrator can select a plan or submit payment details. You can still compare plans here.</p>}

      <section className="sub-payment-grid" id="subscription-payment">
        <article className="sub-card sub-payment-card">
          <p className="sub-eyebrow"><Wallet size={15}/>Secure payment process</p><h2>Pay your platform subscription</h2><p className="sub-muted" style={{fontSize:13,margin:"0 0 10px"}}>This payment goes to the PMS platform operator via our platform M-Pesa Till. It is separate from rent collected for your properties.</p>
          <div className="sub-step"><span className="sub-step-num">1</span><div><h3>Choose a plan</h3><p>Compare features and select the monthly plan that suits your portfolio. Add your estimated unit mix for an initial quote.</p></div></div>
          <div className="sub-step"><span className="sub-step-num">2</span><div><h3>Pay via M-Pesa Till</h3><p>Use the official platform Till shown here. Enter the subscription amount and keep your M-Pesa receipt code.</p></div></div>
          <div className="sub-step"><span className="sub-step-num">3</span><div><h3>Submit your receipt reference</h3><p>Enter the receipt code and amount paid. A platform administrator verifies the payment before activating access.</p></div></div>
          {data?.payment_setup_ready ? <div className="sub-till"><div><small>Official platform M-Pesa Till</small><strong>{data.till_number}</strong></div><ShieldCheck size={23} color="#245c83"/></div> : <div className="sub-alert"><Clock3 size={17}/><div><strong>Official payment details are being configured.</strong><br/>The platform Till number has not been added yet, so payment submission is not available. Compare plans now, but please wait for the official Till details before sending money.</div></div>}
          <p className="sub-note"><LockKeyhole size={15}/>Never send this subscription payment to a landlord’s rent Till or an individual account. We will never ask for your M-Pesa PIN or one-time password.</p>
        </article>

        <article className="sub-card sub-payment-card">
          <p className="sub-eyebrow"><CreditCard size={15}/>Payment confirmation</p><h2>Submit M-Pesa reference</h2>
          {!data?.subscription ? <div className="sub-empty">Select a subscription plan first. Your selected plan and estimated monthly amount will appear here.</div> : !data.payment_setup_ready ? <div className="sub-empty">The payment form will become available once the official platform Till is configured.</div> : <>
            <p className="sub-muted" style={{fontSize:12,margin:"0 0 14px"}}>Current plan: <strong>{currentPlan?.name ?? data.subscription.plan_code}</strong>. Minimum payment for this quote: <strong>{formatMoney(data.quote?.monthly_amount ?? Number(data.subscription.monthly_amount),"KES")}</strong>.</p>
            <form className="sub-form" onSubmit={(event) => void submitReference(event)}>
              <label className="sub-field">M-Pesa receipt code<input className="sub-input" required maxLength={120} value={reference} onChange={(event) => setReference(event.target.value.toUpperCase())} placeholder="e.g. QWE123ABC" autoComplete="off"/></label>
              <label className="sub-field">Amount paid (KES)<input className="sub-input" required type="number" min={data.quote?.monthly_amount ?? Number(data.subscription.monthly_amount)} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)}/></label>
              <button className="sub-button sub-primary" type="submit" disabled={!canManage || submittingPayment || !reference.trim() || Number(amount) < (data.quote?.monthly_amount ?? Number(data.subscription.monthly_amount))}>{submittingPayment ? "Submitting reference…" : "Submit for verification"}<ArrowRight size={15}/></button>
            </form>
            <p className="sub-note"><Info size={15}/>Submitting a reference does not instantly activate the plan. The status updates after payment review.</p>
          </>}
          <h3 style={{margin:"23px 0 0",fontSize:15,fontWeight:900}}>Recent payment references</h3>
          {(data?.payments?.length ?? 0) === 0 ? <p className="sub-muted" style={{fontSize:12,margin:"9px 0 0"}}>No subscription payments submitted yet.</p> : <div className="sub-history-wrap"><table className="sub-history"><thead><tr><th>Date</th><th>Receipt</th><th>Amount</th><th>Status</th></tr></thead><tbody>{data!.payments.map((payment) => <tr key={payment.id}><td>{new Date(payment.created_at).toLocaleDateString()}</td><td>{payment.reference ?? "—"}</td><td>{formatMoney(Number(payment.amount),"KES")}</td><td><span className="sub-payment-status">{prettyStatus(payment.status)}</span></td></tr>)}</tbody></table></div>}
        </article>
      </section>

      <section><div className="sub-section-head"><div><h2>Good to know</h2><p>Clear expectations before you subscribe.</p></div></div><div className="sub-faq-grid">
        <article className="sub-faq"><h3><CircleHelp size={16}/>Is this rent collection?</h3><p>No. This is the monthly fee your organization pays to use the PMS platform. Rent and tenant payments go to the payment destination your organization configures.</p></article>
        <article className="sub-faq"><h3><ShieldCheck size={16}/>When is access activated?</h3><p>After you submit the M-Pesa receipt reference, a platform administrator verifies it. Access activates only after the payment is confirmed.</p></article>
        <article className="sub-faq"><h3><Sparkles size={16}/>Can I change plans?</h3><p>You can compare options at any time. If a subscription is active, contact platform support to change plans or request organization-specific unit rates.</p></article>
      </div></section>
      <p className="sub-bottom-note"><strong>Transparent billing:</strong> the page estimate helps you compare options; the subscription API remains the source for the current plan, recorded billable units, monthly quote, payment setup and payment history. Tenants do not pay this platform subscription. Maintenance/repair costs are handled by the landlord or tenant and are not subscription charges.</p>
    </main></div>
  </DashboardLayout>;
}
