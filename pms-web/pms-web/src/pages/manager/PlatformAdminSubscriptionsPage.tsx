import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, ShieldAlert, XCircle } from "lucide-react";
import { apiRequest } from "../../services/api";
import { formatMoney } from "../../services/format";

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
      const payload = await apiRequest("/platform-subscription/admin/payments") as {data?: Payment[]};
      setPayments(payload.data ?? []);
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

  if (!isPlatformAdmin) return <main style={{maxWidth:620,margin:"12vh auto",padding:24,fontFamily:"system-ui",color:"#f8fafc",background:"#0b1220",borderRadius:18}}><ShieldAlert size={28}/><h1>Platform administrator access required</h1><p>This queue is only available to the platform's authorized billing administrators.</p></main>;

  return <main style={{minHeight:"100vh",background:"#070d18",color:"#f8fafc",padding:"clamp(18px,4vw,40px)",fontFamily:"system-ui"}}>
    <div style={{maxWidth:1100,margin:"0 auto"}}>
      <header style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,flexWrap:"wrap",marginBottom:24}}>
        <div><p style={{margin:"0 0 8px",fontSize:12,fontWeight:800,letterSpacing:".12em",textTransform:"uppercase",color:"#93c5fd"}}>Platform operations</p><h1 style={{fontSize:"clamp(1.8rem,4vw,2.5rem)",margin:"0 0 8px",letterSpacing:"-.04em"}}>Subscription payment review</h1><p style={{margin:0,color:"#aab7ca",lineHeight:1.6}}>Verify receipts paid to the platform Till. Approval activates or renews the organization subscription; rejection leaves it locked.</p></div>
        <button type="button" onClick={()=>void load()} style={{display:"inline-flex",alignItems:"center",gap:8,padding:"10px 14px",borderRadius:10,border:"1px solid #334155",background:"transparent",color:"#f8fafc",fontWeight:800}}><RefreshCw size={16}/> Refresh</button>
      </header>
      {error && <div role="alert" style={{padding:13,borderRadius:10,background:"rgba(248,113,113,.1)",color:"#fca5a5",marginBottom:14}}>{error}</div>}
      {notice && <div role="status" style={{padding:13,borderRadius:10,background:"rgba(74,222,128,.1)",color:"#86efac",marginBottom:14}}>{notice}</div>}
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
