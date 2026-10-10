import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, ShieldAlert, XCircle } from "lucide-react";
import { apiRequest } from "../../services/api";
import { formatMoney } from "../../services/format";

type Organization = { id: number; name: string; email: string | null; platform_subscription?: { plan_code: string; status: string; billable_units: number; monthly_amount: string | number; pricing_overrides?: Record<string, number> | null } | null };
type Payment = {
  id: number;
  amount: string | number;
  reference: string | null;
  status: string;
  created_at: string;
  organization?: { id: number; name: string; email: string | null } | null;
  subscription?: { plan_code: string; billable_units: number; monthly_amount: string | number; status: string } | null;
};

export default function PlatformAdminSubscriptionsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [pricingJson, setPricingJson] = useState("{}");
  const [savingPricing, setSavingPricing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const isPlatformAdmin = (() => {
    try {
      const raw = localStorage.getItem("user") ?? sessionStorage.getItem("user");
      return !!raw && (JSON.parse(raw) as {role?: string}).role === "platform_admin";
    } catch { return false; }
  })();

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [paymentPayload, organizationPayload] = await Promise.all([
        apiRequest("/platform-subscription/admin/payments") as Promise<{data?: Payment[]}>,
        apiRequest("/platform-subscription/admin/organizations") as Promise<{data?: Organization[]}>,
      ]);
      setPayments(paymentPayload.data ?? []);
      setOrganizations(organizationPayload.data ?? []);
      if (!organizationId && organizationPayload.data?.length) {
        const first = organizationPayload.data[0];
        setOrganizationId(String(first.id));
        setPricingJson(JSON.stringify(first.platform_subscription?.pricing_overrides ?? {}, null, 2));
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load pending subscription payments.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (isPlatformAdmin) void load(); else setLoading(false); }, [isPlatformAdmin, load]);

  async function review(payment: Payment, approved: boolean) {
    setBusyId(payment.id); setError(""); setNotice("");
    try {
      const result = await apiRequest("/platform-subscription/payments/" + payment.id + "/verify", {
        method: "POST",
        body: JSON.stringify({approved, notes: approved ? "M-Pesa receipt verified by platform administrator." : "Payment could not be verified."}),
      }) as {message?: string};
      setNotice(result.message ?? "Payment reviewed.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not review this payment.");
    } finally { setBusyId(null); }
  }

  async function savePricing() {
    if (!organizationId) return;
    setSavingPricing(true); setError(""); setNotice("");
    try {
      const parsed: unknown = JSON.parse(pricingJson);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Enter a JSON object mapping unit types to monthly KES rates.");
      const result = await apiRequest("/platform-subscription/organizations/" + organizationId + "/custom-pricing", {method:"PUT", body:JSON.stringify({pricing_overrides:parsed})}) as {message?:string};
      setNotice(result.message ?? "Negotiated rates saved.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save negotiated rates.");
    } finally { setSavingPricing(false); }
  }

  if (!isPlatformAdmin) return <main style={{maxWidth:620,margin:"12vh auto",padding:24,fontFamily:"system-ui",color:"#f8fafc",background:"#0b1220",borderRadius:18}}><ShieldAlert size={28}/><h1>Platform administrator access required</h1><p>This queue is only available to the platform's authorized billing administrators.</p></main>;

  return <main style={{minHeight:"100vh",background:"#070d18",color:"#f8fafc",padding:"clamp(18px,4vw,40px)",fontFamily:"system-ui"}}>
    <div style={{maxWidth:1100,margin:"0 auto"}}>
      <header style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,flexWrap:"wrap",marginBottom:24}}>
        <div><p style={{margin:"0 0 8px",fontSize:12,fontWeight:800,letterSpacing:".12em",textTransform:"uppercase",color:"#93c5fd"}}>Platform operations</p><h1 style={{fontSize:"clamp(1.8rem,4vw,2.5rem)",margin:"0 0 8px",letterSpacing:"-.04em"}}>Subscription payment review</h1><p style={{margin:0,color:"#aab7ca",lineHeight:1.6}}>Verify receipts paid to the platform Till. Approval activates or renews the organization subscription; rejection leaves it locked.</p></div>
        <button type="button" onClick={()=>void load()} style={{display:"inline-flex",alignItems:"center",gap:8,padding:"10px 14px",borderRadius:10,border:"1px solid #334155",background:"transparent",color:"#f8fafc",fontWeight:800}}><RefreshCw size={16}/> Refresh</button>
      </header>
      {error && <div role="alert" style={{padding:13,borderRadius:10,background:"rgba(248,113,113,.1)",color:"#fca5a5",marginBottom:14}}>{error}</div>}
      {notice && <div role="status" style={{padding:13,borderRadius:10,background:"rgba(74,222,128,.1)",color:"#86efac",marginBottom:14}}>{notice}</div>}
      <section style={{border:"1px solid #253247",borderRadius:16,padding:20,background:"#0c1524",marginBottom:20}}>
        <h2 style={{margin:"0 0 6px",fontSize:18}}>Negotiated unit pricing</h2>
        <p style={{margin:"0 0 14px",color:"#aab7ca",fontSize:13,lineHeight:1.6}}>For negotiated customer quotes, enter rates per exact unit type. Overrides apply to this organization and plan only. Rates are monthly KES per unit.</p>
        <div style={{display:"grid",gridTemplateColumns:"minmax(180px,1fr) minmax(240px,2fr)",gap:14}}>
          <label style={{display:"grid",alignContent:"start",gap:7,fontSize:12,fontWeight:800}}>Organization
            <select value={organizationId} onChange={event=>{setOrganizationId(event.target.value);const org=organizations.find(item=>String(item.id)===event.target.value);setPricingJson(JSON.stringify(org?.platform_subscription?.pricing_overrides ?? {},null,2));}} style={{padding:11,borderRadius:10,border:"1px solid #334155",background:"#111c2e",color:"#f8fafc"}}>
              <option value="">Choose organization</option>
              {organizations.map(org=><option key={org.id} value={org.id}>{org.name} — {org.platform_subscription?.plan_code ?? "no plan"}</option>)}
            </select>
            <span style={{fontSize:11,color:"#94a3b8",fontWeight:500}}>Only organizations with a selected subscription can have custom pricing.</span>
          </label>
          <label style={{display:"grid",gap:7,fontSize:12,fontWeight:800}}>Unit type rates (JSON)
            <textarea rows={5} value={pricingJson} onChange={event=>setPricingJson(event.target.value)} spellCheck={false} placeholder={'{"Bedsitter":50,"1 bedroom":80,"2 bedroom":100}'} style={{width:"100%",resize:"vertical",padding:12,borderRadius:10,border:"1px solid #334155",background:"#07101d",color:"#e2e8f0",fontFamily:"ui-monospace,monospace",fontSize:13}}/>
          </label>
        </div>
        <button type="button" disabled={!organizationId||savingPricing||!organizations.find(org=>String(org.id)===organizationId)?.platform_subscription} onClick={()=>void savePricing()} style={{marginTop:12,padding:"10px 14px",borderRadius:10,border:0,background:"#1d4ed8",color:"#fff",fontWeight:850,opacity:!organizationId||savingPricing?0.6:1}}>{savingPricing?"Saving rates…":"Save negotiated rates"}</button>
        <p style={{fontSize:11,color:"#94a3b8",margin:"10px 0 0"}}>Example: {"{"}"Bedsitter":50,"1 bedroom":80,"2 bedroom":100{"}"}. Omitted unit types keep the selected plan’s default rates.</p>
      </section>
      <section style={{border:"1px solid #253247",borderRadius:16,overflow:"hidden",background:"#0c1524"}}>
        {loading ? <p style={{padding:20,color:"#aab7ca"}}>Loading payment references…</p> : payments.length===0 ? <div style={{padding:30,textAlign:"center"}}><CheckCircle2 size={28} style={{color:"#86efac"}}/><h2 style={{margin:"10px 0 6px"}}>No pending payments</h2><p style={{margin:0,color:"#aab7ca"}}>New receipt references will appear here after organizations submit them.</p></div> : payments.map(payment=><article key={payment.id} style={{padding:20,borderBottom:"1px solid #253247",display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:16,alignItems:"center"}}>
          <div style={{minWidth:0}}>
            <h2 style={{margin:"0 0 6px",fontSize:17}}>{payment.organization?.name ?? "Organization #" + payment.organization?.id}</h2>
            <p style={{margin:"0 0 6px",color:"#aab7ca",fontSize:13}}>{payment.organization?.email ?? "No billing email"} · {payment.subscription?.plan_code ?? "Plan"} · {payment.subscription?.billable_units ?? 0} units</p>
            <p style={{margin:"0 0 6px",fontSize:14}}>Receipt: <strong>{payment.reference ?? "No reference"}</strong> · Amount paid: <strong>{formatMoney(Number(payment.amount),"KES")}</strong></p>
            <p style={{margin:0,fontSize:12,color:"#94a3b8"}}>Submitted {new Date(payment.created_at).toLocaleString()} · Quoted monthly fee {formatMoney(Number(payment.subscription?.monthly_amount ?? 0),"KES")}</p>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"flex-end"}}>
            <button type="button" disabled={busyId!==null} onClick={()=>void review(payment,true)} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"9px 12px",borderRadius:9,border:0,background:"#166534",color:"#dcfce7",fontWeight:800,opacity:busyId!==null?0.6:1}}><CheckCircle2 size={15}/>{busyId===payment.id?"Saving…":"Approve"}</button>
            <button type="button" disabled={busyId!==null} onClick={()=>void review(payment,false)} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"9px 12px",border:"1px solid #7f1d1d",borderRadius:9,background:"transparent",color:"#fca5a5",fontWeight:800,opacity:busyId!==null?0.6:1}}><XCircle size={15}/>Reject</button>
          </div>
        </article>)}
      </section>
      <p style={{fontSize:12,color:"#94a3b8",lineHeight:1.6,marginTop:16}}>This is a manual receipt-verification workflow while the platform Till and platform-owned Daraja collection integration are being configured. Do not approve a receipt without confirming it in the M-Pesa statement.</p>
    </div>
  </main>;
}
