import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, RefreshCw, Save } from "lucide-react";
import { apiRequest } from "../../services/api";

type SupportTicket = {
  id: number; requester_name: string; requester_email: string | null; requester_role: string | null;
  category: string; subject: string; message: string; page_url: string | null; status: string;
  priority: string; email_status: string; email_sent_at: string | null; admin_notes: string | null;
  created_at: string; organization?: { name?: string; email?: string } | null;
};
const inboxStyles = `
.dsi-page { min-height:100vh; padding:clamp(1rem,3vw,2rem); background:#f4f7fb; color:#172033; font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; }
.dsi-page *, .dsi-page *::before, .dsi-page *::after { box-sizing:border-box; }
.dsi-shell { max-width:1250px; margin:0 auto; }
.dsi-head { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; flex-wrap:wrap; margin-bottom:1.3rem; }
.dsi-head h1 { margin:0; font-size:clamp(1.6rem,3vw,2.3rem); color:#142744; }
.dsi-head p { margin:.5rem 0 0; color:#526177; line-height:1.6; }
.dsi-button { display:inline-flex; align-items:center; justify-content:center; gap:.45rem; border:1px solid #cbd5e1; border-radius:10px; padding:.65rem .85rem; background:#fff; color:#1e3a5f; font:inherit; font-weight:750; cursor:pointer; }
.dsi-button--primary { background:#183b67; border-color:#183b67; color:#fff; }
.dsi-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(300px,.8fr); gap:1rem; align-items:start; }
.dsi-list { display:grid; gap:.7rem; }
.dsi-ticket { width:100%; text-align:left; padding:1rem; border:1px solid #dbe3ee; border-radius:14px; background:#fff; color:#172033; cursor:pointer; }
.dsi-ticket--selected { border-color:#315f91; box-shadow:0 0 0 2px #dbeafe; }
.dsi-ticket strong { display:block; line-height:1.45; margin-bottom:.45rem; }
.dsi-meta { color:#526177; font-size:.8rem; line-height:1.6; }
.dsi-card { min-width:0; padding:1.2rem; border:1px solid #dbe3ee; border-radius:16px; background:#fff; }
.dsi-card h2 { margin:0 0 .8rem; font-size:1.15rem; color:#18304f; }
.dsi-label { display:block; margin:.9rem 0 .4rem; font-size:.82rem; font-weight:800; color:#34445b; }
.dsi-input { width:100%; min-width:0; padding:.7rem .8rem; border:1px solid #cbd5e1; border-radius:10px; color:#172033; background:#fff; font:inherit; line-height:1.5; }
.dsi-input:focus { outline:3px solid #dbeafe; border-color:#2563eb; }
.dsi-message { white-space:pre-wrap; overflow-wrap:anywhere; line-height:1.7; color:#2b3b52; }
.dsi-alert { padding:.8rem; border-radius:10px; background:#fff0f0; color:#842029; line-height:1.5; margin-bottom:1rem; }
.dsi-pill { display:inline-block; padding:.15rem .5rem; border-radius:999px; background:#e9f1fb; color:#234a78; font-size:.73rem; font-weight:850; }
@media(max-width:900px) { .dsi-grid { grid-template-columns:1fr; } }
`;

function record(value: unknown): Record<string, unknown> { return value && typeof value === "object" ? value as Record<string, unknown> : {}; }
function str(value: unknown): string { return typeof value === "string" ? value : ""; }
function num(value: unknown): number { return typeof value === "number" ? value : Number(value ?? 0); }
function ticketFrom(value: unknown): SupportTicket {
  const row = record(value);
  const org = record(row.organization);
  return {
    id: num(row.id), requester_name: str(row.requester_name), requester_email: str(row.requester_email) || null,
    requester_role: str(row.requester_role) || null, category: str(row.category), subject: str(row.subject),
    message: str(row.message), page_url: str(row.page_url) || null, status: str(row.status), priority: str(row.priority),
    email_status: str(row.email_status), email_sent_at: str(row.email_sent_at) || null, admin_notes: str(row.admin_notes) || null,
    created_at: str(row.created_at), organization: { name: str(org.name), email: str(org.email) },
  };
}
export default function DeveloperSupportInboxPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("open");
  const [status, setStatus] = useState("open");
  const [priority, setPriority] = useState("normal");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const selected = tickets.find((ticket) => ticket.id === selectedId) ?? null;

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = statusFilter === "all" ? "" : `?status=${encodeURIComponent(statusFilter)}`;
      const payload = record(await apiRequest(`/platform-admin/developer-support-requests${params}`));
      const data = Array.isArray(payload.data) ? payload.data.map(ticketFrom) : [];
      setTickets(data);
      setSelectedId((current) => data.some((ticket) => ticket.id === current) ? current : data[0]?.id ?? null);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load the developer support queue."); }
    finally { setLoading(false); }
  }, [statusFilter]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (selected) { setStatus(selected.status); setPriority(selected.priority); setNotes(selected.admin_notes ?? ""); } }, [selectedId, selected?.status, selected?.priority, selected?.admin_notes]);

  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true); setError(""); setMessage("");
    try {
      await apiRequest(`/platform-admin/developer-support-requests/${selected.id}`, { method: "PATCH", body: JSON.stringify({ status, priority, admin_notes: notes }) });
      setMessage(`Ticket #${selected.id} updated.`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update ticket."); }
    finally { setSaving(false); }
  }

  return <main className="dsi-page"><style>{inboxStyles}</style><div className="dsi-shell">
    <header className="dsi-head"><div><h1>Developer support inbox</h1><p>Review submitted requests, check notification status and track issues reported by tenants and property teams.</p></div><button className="dsi-button" onClick={() => void load()} disabled={loading}><RefreshCw size={16}/>{loading ? "Refreshing…" : "Refresh queue"}</button></header>
    {error && <div className="dsi-alert" role="alert"><AlertCircle size={18}/> {error}</div>}
    {message && <div className="dsi-alert" style={{ background:"#eefbf2",color:"#14532d" }} role="status"><CheckCircle2 size={18}/> {message}</div>}
    <div className="dsi-grid">
      <section><div style={{ display:"flex", gap:".65rem", alignItems:"center", marginBottom:".8rem", flexWrap:"wrap" }}><label htmlFor="dsi-filter" className="dsi-meta">Show tickets</label><select id="dsi-filter" className="dsi-input" style={{ width:"auto" }} value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)}><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option><option value="all">All statuses</option></select></div>
        {loading ? <div className="dsi-card">Loading support requests…</div> : tickets.length === 0 ? <div className="dsi-card">No tickets match this filter.</div> : <div className="dsi-list">{tickets.map((ticket) => <button type="button" key={ticket.id} onClick={()=>setSelectedId(ticket.id)} className={`dsi-ticket ${ticket.id===selectedId?"dsi-ticket--selected":""}`}><strong>#{ticket.id} · {ticket.subject}</strong><div className="dsi-meta">{ticket.requester_name} · {ticket.organization?.name || "No organization"}<br/>{new Date(ticket.created_at).toLocaleString()}</div><div style={{ display:"flex",gap:".4rem",flexWrap:"wrap",marginTop:".6rem" }}><span className="dsi-pill">{ticket.status.replaceAll("_"," ")}</span><span className="dsi-pill">{ticket.priority}</span><span className="dsi-pill">Email: {ticket.email_status}</span></div></button>)}</div>}
      </section>
      <section className="dsi-card">{selected ? <>
        <h2>Ticket #{selected.id}</h2><div className="dsi-meta">{selected.requester_name} · {selected.requester_email || "No email"} · {selected.requester_role || "Unknown role"}<br/>Organization: {selected.organization?.name || "Not linked"}<br/>Category: {selected.category.replaceAll("_"," ")} · Submitted {new Date(selected.created_at).toLocaleString()}<br/>Notification: {selected.email_status}{selected.email_sent_at ? ` at ${new Date(selected.email_sent_at).toLocaleString()}` : ""}</div>
        <h3 style={{ margin:"1.2rem 0 .5rem",fontSize:"1rem" }}>{selected.subject}</h3><p className="dsi-message">{selected.message}</p>{selected.page_url && <p className="dsi-meta">Reported page: {selected.page_url}</p>}
        <form onSubmit={(event)=>void update(event)}><label className="dsi-label" htmlFor="dsi-status">Status</label><select id="dsi-status" className="dsi-input" value={status} onChange={(e)=>setStatus(e.target.value)}><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select>
          <label className="dsi-label" htmlFor="dsi-priority">Priority</label><select id="dsi-priority" className="dsi-input" value={priority} onChange={(e)=>setPriority(e.target.value)}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select>
          <label className="dsi-label" htmlFor="dsi-notes">Internal notes</label><textarea id="dsi-notes" className="dsi-input" rows={4} value={notes} onChange={(e)=>setNotes(e.target.value)} maxLength={5000} placeholder="Internal investigation notes…"/>
          <button type="submit" className="dsi-button dsi-button--primary" style={{ marginTop:"1rem",width:"100%" }} disabled={saving}><Save size={16}/>{saving?"Saving…":"Save ticket update"}</button>
        </form>
      </> : <><h2>Select a ticket</h2><p className="dsi-meta">Choose a support request from the queue to review its details.</p></>}</section>
    </div>
  </div></main>;
}
