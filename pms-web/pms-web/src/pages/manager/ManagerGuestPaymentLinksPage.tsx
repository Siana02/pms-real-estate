import { useCallback, useEffect, useState } from "react";
import { Check, Copy, LoaderCircle, Mail, RefreshCw, ShieldCheck, Wallet } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { apiRequest } from "../../services/api";
import { managerStyles } from "../../styles/managerUI";
import { formatMoney } from "../../services/format";

type GuestLink = {
  lease_id: number;
  tenant_name: string;
  tenant_email: string | null;
  property_name: string | null;
  unit_number: string | null;
  monthly_rent: number;
  start_date: string | null;
  end_date: string | null;
  link_created: boolean;
  guest_url: string | null;
  email_sent_to: string | null;
  last_emailed_at: string | null;
};

const styles = `
.gpl-page { min-height:100vh; padding:clamp(1rem,3vw,2rem); background:#f4f7fb; color:#172b3f; }
.gpl-wrap { max-width:78rem; margin:0 auto; display:grid; gap:1rem; }
.gpl-hero,.gpl-card { border:1px solid #dbe4ee; border-radius:1rem; background:#fff; padding:1.25rem; box-shadow:0 8px 24px rgba(20,45,70,.045); }
.gpl-hero { display:flex; gap:1rem; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; }
.gpl-kicker { margin:0 0 .35rem; color:var(--pms-muted,#718096); font-size:.72rem; font-weight:700; letter-spacing:.12em; text-transform:uppercase; }
.gpl-title { margin:0; color:#142b42 !important; font-size:clamp(1.65rem,3.2vw,2.25rem); line-height:1.2; font-weight:800; letter-spacing:-.035em; }
.gpl-copy { max-width:52rem; margin:.55rem 0 0; color:#526579 !important; line-height:1.65; font-size:.92rem; }
.gpl-note { display:flex; gap:.65rem; align-items:flex-start; padding:.85rem 1rem; border-radius:.75rem; background:#eff6ff; color:#1e4d7a; font-size:.83rem; line-height:1.5; }
.gpl-note svg { width:1.1rem; flex:none; margin-top:.1rem; }
.gpl-toolbar { display:flex; align-items:flex-start; justify-content:space-between; gap:.75rem; flex-wrap:wrap; padding:.25rem 0; }
.gpl-toolbar strong { display:block; color:#142b42 !important; font-size:1.25rem; line-height:1.35; font-weight:800; }
.gpl-toolbar .gpl-copy { margin-top:.35rem; }
.gpl-btn { display:inline-flex; align-items:center; justify-content:center; gap:.45rem; border:1px solid #d4dce4; border-radius:.65rem; padding:.62rem .8rem; background:#fff; color:#263e54; font:inherit; font-size:.82rem; font-weight:650; cursor:pointer; }
.gpl-btn:disabled { opacity:.55; cursor:not-allowed; }
.gpl-btn--primary { background:#183c5b; border-color:#183c5b; color:white; }
.gpl-btn svg { width:1rem; height:1rem; }
.gpl-list { display:grid; gap:.75rem; }
.gpl-row { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:1.25rem; align-items:center; border:1px solid #dbe4ee; border-radius:.9rem; background:#fff; padding:1.25rem; box-shadow:0 5px 18px rgba(20,45,70,.04); }
.gpl-row__title { margin:0; color:#172b3f !important; font-size:1.05rem; line-height:1.35; font-weight:750; }
.gpl-row__meta { display:flex; flex-wrap:wrap; gap:.4rem .85rem; margin-top:.5rem; color:#526579 !important; font-size:.82rem; line-height:1.55; }
.gpl-row__status { display:flex; align-items:center; gap:.35rem; margin-top:.55rem; color:#426d55; font-size:.75rem; }
.gpl-row__status svg { width:.9rem; height:.9rem; }
.gpl-row__actions { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:.45rem; }
.gpl-email { width:100%; max-width:21rem; margin-top:.7rem; padding:.6rem .7rem; border:1px solid #d8e0e7; border-radius:.55rem; color:inherit; background:#fff; font:inherit; font-size:.85rem; }
.gpl-error { padding:.75rem .9rem; border:1px solid #f1c8c8; border-radius:.7rem; background:#fff5f5; color:#9a3333; font-size:.85rem; }
.gpl-success { padding:.75rem .9rem; border:1px solid #9ed9b1; border-radius:.7rem; background:#effaf2; color:#205c35; font-size:.85rem; line-height:1.5; }
.gpl-row__feedback { grid-column:1 / -1; display:flex; align-items:flex-start; gap:.55rem; margin-top:.15rem; padding:.75rem .85rem; border:1px solid #9ed9b1; border-radius:.7rem; background:#effaf2; color:#205c35; font-size:.82rem; line-height:1.5; }
.gpl-row__feedback svg { width:1rem; height:1rem; flex:none; margin-top:.1rem; }
@media(max-width:700px) { .gpl-row { grid-template-columns:1fr; } .gpl-row__actions { justify-content:flex-start; } }
`;

export default function ManagerGuestPaymentLinksPage() {
  const [items, setItems] = useState<GuestLink[]>([]);
  const [emails, setEmails] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [messageLeaseId, setMessageLeaseId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiRequest("/guest-payment-links") as { data?: GuestLink[] };
      const data = Array.isArray(response.data) ? response.data : [];
      setItems(data);
      setEmails(current => {
        const next = { ...current };
        data.forEach(item => { if (next[item.lease_id] === undefined) next[item.lease_id] = item.tenant_email ?? ""; });
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load current tenancies.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function createLink(item: GuestLink) {
    setBusy(item.lease_id); setError(""); setMessage(""); setMessageLeaseId(item.lease_id);
    try {
      const response = await apiRequest("/guest-payment-links", {
        method: "POST",
        body: JSON.stringify({ lease_id: item.lease_id, email: emails[item.lease_id] || item.tenant_email || "", send_email: true }),
      }) as { message?: string; guest_url?: string; email_sent?: boolean; email_error?: string };
      if (response.guest_url) {
        await navigator.clipboard.writeText(response.guest_url).catch(() => undefined);
        setMessage(response.email_sent
          ? `Payment link emailed to ${emails[item.lease_id] || item.tenant_email}. The link was also copied if clipboard access is available.`
          : (response.email_error || "Payment link is ready. Copy it below and share it privately."));
      } else setMessage(response.message || "Payment link created.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the payment link.");
    } finally { setBusy(null); }
  }

  async function copyLink(url: string, leaseId: number) {
    setError("");
    setMessageLeaseId(leaseId);
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Link copied. You can paste it into WhatsApp or another private conversation.");
    } catch {
      setMessage("Clipboard access was blocked. Select the URL field above and copy it manually.");
    }
  }

  async function resendEmail(item: GuestLink) {
    await createLink(item);
  }

  return <DashboardLayout><style>{managerStyles}</style><style>{styles}</style>
    <main className="gpl-page"><div className="gpl-wrap">
      <header className="gpl-hero">
        <div><p className="gpl-kicker">Tenant payment access</p><h1 className="gpl-title">Tenant payment links</h1>
          <p className="gpl-copy">Give tenants a way to pay without creating an account or signing in. Each link is tied to one lease, property and unit; it stays usable during that tenancy and stops working when the lease ends or is terminated.</p>
        </div>
        <button className="gpl-btn" onClick={() => void load()} disabled={loading}><RefreshCw /> Refresh</button>
      </header>
      <div className="gpl-note"><ShieldCheck /><span>Links are long, private access tokens. Email is the default delivery method; you can also copy the same link and share it privately on WhatsApp. SMS delivery is not enabled.</span></div>
      {error && <div className="gpl-error" role="alert">{error}</div>}
      <div className="gpl-toolbar"><div><strong>Current tenancies</strong><p className="gpl-copy">Create or resend a tenant's secure payment link. Links are reused for the same lease, so refreshing this page will not invalidate a tenant's saved link.</p></div></div>
      {loading ? <div className="gpl-card"><LoaderCircle /> Loading tenancies…</div> :
        items.length === 0 ? <div className="gpl-card">No current tenancies are available for guest payment links.</div> :
        <div className="gpl-list">{items.map(item => <article className="gpl-row" key={item.lease_id}>
          <div><h2 className="gpl-row__title">{item.tenant_name}</h2>
            <div className="gpl-row__meta"><span>{item.property_name || "Property"}</span><span>Unit {item.unit_number || "—"}</span><span>Rent {formatMoney(item.monthly_rent, "KES")}</span><span>Lease #{item.lease_id}</span></div>
            <input className="gpl-email" type="email" aria-label={`Email for ${item.tenant_name}`} placeholder="Tenant email address" value={emails[item.lease_id] ?? ""} onChange={e => setEmails(prev => ({ ...prev, [item.lease_id]: e.target.value }))} />
            {item.link_created && <div className="gpl-row__status"><Check /> Link already active for this tenancy</div>}
            {item.email_sent_to && <div className="gpl-row__meta">Last emailed to {item.email_sent_to}{item.last_emailed_at ? ` · ${new Date(item.last_emailed_at).toLocaleString()}` : ""}</div>}
            {item.guest_url && <input className="gpl-email" aria-label="Guest payment URL" readOnly value={item.guest_url} onFocus={e => e.currentTarget.select()} />}
          </div>
          <div className="gpl-row__actions">
            {item.guest_url && <button className="gpl-btn" onClick={() => void copyLink(item.guest_url!, item.lease_id)}><Copy /> Copy link</button>}
            <button className="gpl-btn gpl-btn--primary" disabled={busy === item.lease_id} onClick={() => void (item.link_created ? resendEmail(item) : createLink(item))}>
              {busy === item.lease_id ? <LoaderCircle /> : item.link_created ? <Mail /> : <Wallet />}
              {busy === item.lease_id ? "Working…" : item.link_created ? "Email / resend" : "Create & email link"}
            </button>
            {message && messageLeaseId === item.lease_id && <div className="gpl-row__feedback" role="status"><Check /> <span>{message}</span></div>}
          </div>
        </article>)}</div>}
      <p className="gpl-copy">Only leases that are currently active are listed. A new tenancy gets its own link; links from a previous lease cannot be used for the new tenant.</p>
    </div></main>
  </DashboardLayout>;
}
