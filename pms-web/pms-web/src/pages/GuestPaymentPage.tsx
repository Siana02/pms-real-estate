import { useEffect, useState } from "react";
import { AlertCircle, Building2, CheckCircle2, LoaderCircle, ShieldCheck, Smartphone } from "lucide-react";
import { useParams } from "react-router-dom";
import { API_BASE } from "../services/api";

type GuestPaymentData = {
  organization: string;
  property: string;
  address: string;
  unit: string;
  monthly_rent: number;
  currency: string;
  tenant_name: string;
  lease_start: string | null;
  lease_end: string | null;
  payment_destinations: { id: number; label: string; method: string }[];
};

const money = (amount: number, currency: string) => new Intl.NumberFormat("en-KE", { style: "currency", currency: currency || "KES", maximumFractionDigits: 0 }).format(amount);

export default function GuestPaymentPage() {
  const { token = "" } = useParams();
  const [data, setData] = useState<GuestPaymentData | null>(null);
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/guest-payments/${encodeURIComponent(token)}`, { headers: { Accept: "application/json" } })
      .then(async response => { const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.message || "This payment link is no longer active."); return body; })
      .then(body => { if (!cancelled) { setData(body.data); if (body.data?.payment_destinations?.length) setDestinationId(String(body.data.payment_destinations[0].id)); setAmount(String(Math.round(Number(body.data?.monthly_rent || 0)))); } })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : "Could not open this payment link."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  async function pay(event: React.FormEvent) {
    event.preventDefault(); setError(""); setStatus("");
    const parsedAmount = Number(amount);
    if (!Number.isInteger(parsedAmount) || parsedAmount < 1 || parsedAmount > 250000) { setError("Enter a whole-number amount between KES 1 and KES 250,000."); return; }
    if (!phone.trim()) { setError("Enter the M-PESA phone number to receive the payment prompt."); return; }
    if (!destinationId) { setError("M-PESA STK Push is not available for this property yet. Contact the property manager."); return; }
    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/guest-payments/${encodeURIComponent(token)}/stk-push`, {
        method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parsedAmount, phone: phone.trim(), payment_destination_id: Number(destinationId) }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "Could not start the M-PESA payment.");
      setStatus(body.message || "M-PESA prompt sent. Complete it on your phone.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not start the payment."); }
    finally { setSubmitting(false); }
  }

  return <main style={{ minHeight:"100vh", background:"linear-gradient(145deg,#f4f8fc,#eef4f7)", padding:"clamp(1rem,4vw,3rem)", display:"grid", placeItems:"center", color:"#18344b", fontFamily:"Inter,system-ui,sans-serif" }}>
    <section style={{ width:"min(100%,32rem)", background:"#fff", border:"1px solid #dce5eb", borderRadius:"1.3rem", overflow:"hidden", boxShadow:"0 22px 60px rgba(31,64,87,.10)" }}>
      <header style={{ padding:"1.35rem 1.5rem", background:"#173b59", color:"#fff" }}>
        <div style={{ display:"flex", alignItems:"center", gap:".65rem", fontSize:".78rem", opacity:.88 }}><Building2 size={18}/><span>{data?.organization || "Secure rent payment"}</span></div>
        <h1 style={{ margin:".85rem 0 .3rem", fontSize:"1.65rem", letterSpacing:"-.035em" }}>Pay rent securely</h1>
        <p style={{ margin:0, opacity:.82, fontSize:".9rem" }}>No account or sign-in required.</p>
      </header>
      <div style={{ padding:"1.5rem", display:"grid", gap:"1rem" }}>
        {loading ? <p><LoaderCircle size={18} style={{ verticalAlign:"middle" }}/> Opening your secure payment link…</p> :
          error && !data ? <div role="alert" style={{ color:"#a33434", lineHeight:1.5 }}><AlertCircle size={19} style={{ verticalAlign:"middle" }}/> {error}</div> :
          data && <>
            <div style={{ padding:"1rem", border:"1px solid #e0e8ee", borderRadius:".8rem", background:"#f9fbfc" }}>
              <p style={{ margin:"0 0 .3rem", color:"#718096", fontSize:".72rem", textTransform:"uppercase", letterSpacing:".12em" }}>Tenancy details</p>
              <strong style={{ display:"block", fontSize:"1.05rem" }}>{data.property} · Unit {data.unit}</strong>
              {data.address && <p style={{ margin:".3rem 0 0", color:"#64748b", fontSize:".83rem" }}>{data.address}</p>}
              <p style={{ margin:".75rem 0 0", color:"#64748b", fontSize:".83rem" }}>Tenant: {data.tenant_name}</p>
              <p style={{ margin:".2rem 0 0", fontSize:".9rem" }}>Monthly rent <strong>{money(data.monthly_rent, data.currency)}</strong></p>
            </div>
            {data.payment_destinations.length === 0 ? <div style={{ color:"#8a4b19", background:"#fff8ec", padding:"1rem", borderRadius:".7rem", fontSize:".88rem", lineHeight:1.5 }}>Online M-PESA prompt payments are not currently enabled for this property. Please contact your property manager for payment instructions.</div> :
              <form onSubmit={pay} style={{ display:"grid", gap:".9rem" }}>
                <label style={{ display:"grid", gap:".4rem", fontSize:".85rem", fontWeight:600 }}>Payment destination
                  <select value={destinationId} onChange={e => setDestinationId(e.target.value)} style={{ padding:".75rem", border:"1px solid #d3dfe7", borderRadius:".6rem", font: "inherit", background:"#fff" }}>
                    {data.payment_destinations.map(destination => <option key={destination.id} value={destination.id}>{destination.label}</option>)}
                  </select>
                </label>
                <label style={{ display:"grid", gap:".4rem", fontSize:".85rem", fontWeight:600 }}>Amount (KES)
                  <input required inputMode="numeric" type="number" min="1" max="250000" step="1" value={amount} onChange={e => setAmount(e.target.value)} style={{ padding:".75rem", border:"1px solid #d3dfe7", borderRadius:".6rem", font: "inherit" }} />
                </label>
                <label style={{ display:"grid", gap:".4rem", fontSize:".85rem", fontWeight:600 }}>M-PESA phone number
                  <input required autoComplete="tel" inputMode="tel" placeholder="07XX XXX XXX" value={phone} onChange={e => setPhone(e.target.value)} style={{ padding:".75rem", border:"1px solid #d3dfe7", borderRadius:".6rem", font: "inherit" }} />
                </label>
                <button type="submit" disabled={submitting} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:".5rem", padding:".85rem 1rem", border:0, borderRadius:".7rem", background:"#16834a", color:"#fff", font:"inherit", fontWeight:700, cursor:submitting?"wait":"pointer", opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? <LoaderCircle size={18}/> : <Smartphone size={18}/>} {submitting ? "Sending prompt…" : "Send M-PESA prompt"}
                </button>
              </form>}
            {error && <div role="alert" style={{ color:"#a33434", fontSize:".85rem" }}><AlertCircle size={16} style={{ verticalAlign:"middle" }}/> {error}</div>}
            {status && <div role="status" style={{ display:"flex", gap:".55rem", alignItems:"flex-start", color:"#24663b", background:"#f0faf3", border:"1px solid #c7e8d0", padding:".85rem", borderRadius:".7rem", fontSize:".88rem", lineHeight:1.5 }}><CheckCircle2 size={18} style={{ flex:"none" }}/>{status}</div>}
          </>}
        <div style={{ borderTop:"1px solid #e7edf1", paddingTop:".9rem", display:"flex", gap:".5rem", alignItems:"flex-start", color:"#718096", fontSize:".75rem", lineHeight:1.55 }}><ShieldCheck size={17} style={{ flex:"none" }}/><span>This private link is for this tenancy only. Keep it to yourself. It stops working when the lease ends or is terminated. Payment is confirmed by Safaricom; never share your M-PESA PIN.</span></div>
      </div>
    </section>
  </main>;
}
