import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Check, CreditCard, RefreshCw, ShieldAlert, Sparkles } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { apiRequest } from "../../services/api";
import { formatMoney } from "../../services/format";

type Plan = { code: string; name: string; price_model: "flat" | "unit_type"; base_rate: number | null; description: string; features: string[] };
type Subscription = { id: number; plan_code: string; status: string; monthly_amount: string | number; billable_units: number; current_period_ends_at: string | null };
type Payment = { id: number; amount: string | number; reference: string | null; status: string; created_at: string };
type Payload = { plans: Plan[]; subscription: Subscription | null; quote: { billable_units: number; monthly_amount: number } | null; till_number: string | null; payment_setup_ready: boolean; payments: Payment[] };

export default function PlatformSubscriptionPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyPlan, setBusyPlan] = useState("");
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
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load subscription details."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const canManage = (() => { try { const raw = localStorage.getItem("user") ?? sessionStorage.getItem("user"); const role = raw ? (JSON.parse(raw) as {role?: string}).role : ""; return role === "admin" || role === "owner"; } catch { return false; } })();
  async function choosePlan(planCode: string) {
    setBusyPlan(planCode); setError(""); setNotice("");
    try { const result = await apiRequest("/platform-subscription/select", { method: "POST", body: JSON.stringify({plan_code: planCode}) }) as {message?: string}; setNotice(result.message ?? "Plan selected."); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not select this plan."); }
    finally { setBusyPlan(""); }
  }
  async function submitReference() {
    setError(""); setNotice("");
    try { const result = await apiRequest("/platform-subscription/payment-reference", {method:"POST", body:JSON.stringify({reference:reference.trim(),amount:Number(amount)})}) as {message?:string}; setNotice(result.message ?? "Payment reference submitted."); setReference(""); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not submit payment reference."); }
  }
  if (loading && !data) return <DashboardLayout><main style={{padding:24}}><p>Loading subscription and pricing…</p></main></DashboardLayout>;
  const currentPlan = data?.plans.find((plan) => plan.code === data.subscription?.plan_code);
  return <DashboardLayout><main style={{maxWidth:1180,margin:"0 auto",padding:"clamp(18px,3vw,32px)",color:"var(--pms-text,#f8fafc)"}}>
    <header style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,flexWrap:"wrap",marginBottom:24}}>
      <div><p style={{margin:"0 0 8px",fontSize:12,fontWeight:800,letterSpacing:".12em",textTransform:"uppercase",color:"var(--pms-accent,#8ab4ff)"}}>Platform billing</p><h1 style={{margin:"0 0 10px",fontSize:"clamp(1.8rem,4vw,2.6rem)",letterSpacing:"-.04em"}}>Choose your subscription</h1><p style={{maxWidth:720,color:"var(--pms-muted,#aab7ca)",lineHeight:1.6,margin:0}}>This monthly fee pays for your organization’s PMS access. It is separate from rent and tenant payments, which go directly to your own configured payment destination.</p></div>
      <button type="button" onClick={() => void load()} style={{display:"inline-flex",alignItems:"center",gap:8,padding:"10px 14px",borderRadius:12,border:"1px solid var(--pms-border,rgba(255,255,255,.15))",background:"transparent",color:"inherit",fontWeight:700}}><RefreshCw size={16}/> Refresh</button>
    </header>
    {error && <div role="alert" style={{padding:14,borderRadius:12,background:"rgba(248,113,113,.1)",border:"1px solid rgba(248,113,113,.35)",marginBottom:16,color:"#fca5a5"}}>{error}</div>}
    {notice && <div role="status" style={{padding:14,borderRadius:12,background:"rgba(74,222,128,.09)",border:"1px solid rgba(74,222,128,.3)",marginBottom:16,color:"#86efac"}}>{notice}</div>}
    {data?.subscription && <section style={{padding:20,border:"1px solid var(--pms-border,rgba(255,255,255,.14))",borderRadius:18,background:"var(--pms-surface,rgba(255,255,255,.035))",marginBottom:24}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap",alignItems:"center"}}><div><p style={{margin:"0 0 6px",color:"var(--pms-muted,#aab7ca)",fontSize:13}}>Current selection</p><h2 style={{margin:"0 0 6px",fontSize:22}}>{currentPlan?.name ?? data.subscription.plan_code} plan</h2><p style={{margin:0,color:"var(--pms-muted,#aab7ca)"}}>{data.subscription.billable_units} billable units · {formatMoney(data.quote?.monthly_amount ?? Number(data.subscription.monthly_amount), "KES")} estimated per month</p></div><span style={{display:"inline-flex",alignItems:"center",gap:7,borderRadius:999,padding:"7px 12px",fontSize:12,fontWeight:800,background:data.subscription.status==="active"?"rgba(74,222,128,.12)":"rgba(251,191,36,.12)",color:data.subscription.status==="active"?"#86efac":"#fcd34d"}}>{data.subscription.status==="active"?<BadgeCheck size={15}/>:<ShieldAlert size={15}/>} {data.subscription.status.replaceAll("_"," ")}</span></div>
      {data.subscription.current_period_ends_at && <p style={{margin:"12px 0 0",fontSize:13,color:"var(--pms-muted,#aab7ca)"}}>Current period ends {new Date(data.subscription.current_period_ends_at).toLocaleDateString()}</p>}
    </section>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,290px),1fr))",gap:16,alignItems:"stretch"}}>
      {(data?.plans ?? []).map((plan) => {
        const selected = data?.subscription?.plan_code === plan.code;
        const price = plan.price_model === "unit_type" ? "From KES 100 / unit" : "KES " + plan.base_rate + " / unit / month";
        return <article key={plan.code} style={{display:"flex",flexDirection:"column",padding:22,borderRadius:20,border:selected?"1px solid var(--pms-accent,#8ab4ff)":"1px solid var(--pms-border,rgba(255,255,255,.14))",background:selected?"rgba(59,130,246,.08)":"var(--pms-surface,rgba(255,255,255,.025))",minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>{plan.code==="premium"?<Sparkles size={18}/>:<CreditCard size={18}/>}<h2 style={{fontSize:21,margin:0}}>{plan.name}</h2>{plan.code==="premium"&&<span style={{fontSize:10,fontWeight:900,padding:"4px 7px",borderRadius:999,background:"rgba(139,92,246,.16)",color:"#c4b5fd"}}>FULL ACCESS</span>}</div>
          <p style={{fontSize:25,fontWeight:850,letterSpacing:"-.04em",margin:"0 0 8px"}}>{price}</p><p style={{fontSize:13,lineHeight:1.6,color:"var(--pms-muted,#aab7ca)",minHeight:58,margin:"0 0 16px"}}>{plan.description}</p>
          {plan.code==="premium" && <div style={{fontSize:12,color:"var(--pms-muted,#aab7ca)",padding:"10px 12px",borderRadius:10,background:"rgba(255,255,255,.04)",marginBottom:14}}>Bedsitter/studio: KES 100 · 1 bedroom: KES 150 · 2 bedroom: KES 200 · 3 bedroom: KES 250 · 4 bedroom: KES 300. Larger units add KES 50 per bedroom beyond two. Negotiated rates can be configured by the platform team.</div>}
          <ul style={{listStyle:"none",padding:0,margin:"0 0 22px",display:"grid",gap:10}}>{plan.features.map(feature=><li key={feature} style={{display:"flex",gap:9,fontSize:13,lineHeight:1.45}}><Check size={16} style={{flexShrink:0,color:"#86efac",marginTop:1}}/>{feature}</li>)}</ul>
          <div style={{marginTop:"auto"}}>{selected?<button type="button" disabled style={{width:"100%",padding:12,borderRadius:12,border:"1px solid var(--pms-border,rgba(255,255,255,.14))",background:"transparent",color:"var(--pms-muted,#aab7ca)",fontWeight:800}}>{data?.subscription?.status==="active"?"Current plan":"Selected plan"}</button>:<button type="button" disabled={!canManage||!!busyPlan||data?.subscription?.status==="active"} onClick={()=>void choosePlan(plan.code)} style={{width:"100%",padding:12,borderRadius:12,border:0,background:"var(--pms-accent,#3b82f6)",color:"#fff",fontWeight:850,opacity:(!canManage||!!busyPlan||data?.subscription?.status==="active")?0.55:1}}>{busyPlan===plan.code?"Saving…":data?.subscription?"Choose this plan":"Select plan"}</button>}</div>
        </article>;
      })}
    </div>
    {data?.subscription && <section style={{marginTop:24,padding:22,borderRadius:18,border:"1px solid var(--pms-border,rgba(255,255,255,.14))"}}>
      <h2 style={{margin:"0 0 8px",fontSize:20}}>Monthly payment</h2><p style={{color:"var(--pms-muted,#aab7ca)",fontSize:13,lineHeight:1.6,margin:"0 0 16px"}}>Payments go to the platform’s own M-Pesa Till—not your organization’s rent collection Till. A submitted reference is reviewed before subscription access is activated or renewed.</p>
      {!data.payment_setup_ready?<div style={{display:"flex",gap:10,alignItems:"flex-start",padding:14,borderRadius:12,background:"rgba(251,191,36,.08)",color:"#fcd34d"}}><ShieldAlert size={18}/><div><strong>Platform Till setup is pending.</strong><p style={{margin:"5px 0 0",fontSize:13,color:"var(--pms-muted,#aab7ca)"}}>Your plan can be selected now. Property and unit onboarding remains locked until payment is confirmed and the subscription is active.</p></div></div>:<form onSubmit={(event)=>{event.preventDefault();void submitReference();}} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,200px),1fr))",gap:12,alignItems:"end"}}>
        <label style={{display:"grid",gap:7,fontSize:12,fontWeight:750}}>M-Pesa receipt/reference<input required value={reference} onChange={event=>setReference(event.target.value)} placeholder="e.g. QWE123ABC" style={{width:"100%",padding:12,borderRadius:10,border:"1px solid var(--pms-border,rgba(255,255,255,.2))",background:"var(--pms-input,rgba(255,255,255,.05))",color:"inherit"}}/></label>
        <label style={{display:"grid",gap:7,fontSize:12,fontWeight:750}}>Amount paid (KES)<input required type="number" min={data.quote?.monthly_amount ?? 1} step="0.01" value={amount} onChange={event=>setAmount(event.target.value)} style={{width:"100%",padding:12,borderRadius:10,border:"1px solid var(--pms-border,rgba(255,255,255,.2))",background:"var(--pms-input,rgba(255,255,255,.05))",color:"inherit"}}/></label>
        <button type="submit" style={{padding:12,borderRadius:10,border:0,background:"var(--pms-accent,#3b82f6)",color:"#fff",fontWeight:800}}>Submit for verification</button>
      </form>}
      {(data.payments?.length ?? 0)>0 && <div style={{marginTop:20,overflowX:"auto"}}><h3 style={{fontSize:15}}>Recent subscription payment references</h3><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr><th style={{textAlign:"left",padding:9}}>Date</th><th style={{textAlign:"left",padding:9}}>Reference</th><th style={{textAlign:"right",padding:9}}>Amount</th><th style={{textAlign:"left",padding:9}}>Status</th></tr></thead><tbody>{data.payments.map(payment=><tr key={payment.id}><td style={{padding:9,borderTop:"1px solid var(--pms-border,rgba(255,255,255,.1))"}}>{new Date(payment.created_at).toLocaleDateString()}</td><td style={{padding:9,borderTop:"1px solid var(--pms-border,rgba(255,255,255,.1))"}}>{payment.reference ?? "—"}</td><td style={{padding:9,borderTop:"1px solid var(--pms-border,rgba(255,255,255,.1))",textAlign:"right"}}>{formatMoney(Number(payment.amount),"KES")}</td><td style={{padding:9,borderTop:"1px solid var(--pms-border,rgba(255,255,255,.1))"}}>{payment.status.replaceAll("_"," ")}</td></tr>)}</tbody></table></div>}
    </section>}
    <p style={{fontSize:12,color:"var(--pms-muted,#aab7ca)",lineHeight:1.6,marginTop:18}}>Tenants never pay this platform subscription. Their rent, deposits and other tenancy charges are paid directly to the payment destination configured by their property owner or manager. The PMS records and matches payment information; it does not hold rent funds.</p>
  </main></DashboardLayout>;
}
