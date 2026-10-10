import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import TenantDashboardLayout from "../../layouts/TenantDashboardLayout";
import { apiRequest } from "../../services/api";
import { AlertTriangle, CheckCircle2, Clock, Plus, Wrench, X } from "lucide-react";

interface MaintenanceRequest {
  id: number; title: string; description: string; priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "completed" | "cancelled"; assigned_to: string | null;
  scheduled_date: string | null; scheduled_time: string | null; tenant_availability: "pending" | "confirmed" | "unavailable" | null;
  estimated_cost: number | null; cost_responsibility: "tenant" | "landlord" | null; reported_date: string | null;
  completed_date: string | null; updated_at: string | null; notes: string | null;
}

const statusLabel = (status: MaintenanceRequest["status"]) => ({ open: "Received", in_progress: "In progress", completed: "Resolved", cancelled: "Closed" }[status]);
const money = (value: number | null) => value == null ? "Not estimated yet" : `KES ${Number(value).toLocaleString("en-KE", { maximumFractionDigits: 2 })}`;
const dateLabel = (value: string | null) => value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function TenantMaintenancePageV2() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<MaintenanceRequest | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ title: "", description: "", category: "plumbing", priority: "medium" });

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const payload = await apiRequest("/tenant/maintenance-requests");
      const data = payload && typeof payload === "object" && "data" in payload ? (payload as { data: MaintenanceRequest[] }).data : [];
      setRequests(Array.isArray(data) ? data : []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load maintenance requests."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function submit(event: FormEvent) {
    event.preventDefault(); if (saving) return;
    setSaving(true); setError("");
    try {
      const response = await apiRequest("/tenant/maintenance-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const created = response && typeof response === "object" && "data" in response ? (response as { data: MaintenanceRequest }).data : null;
      if (created) setRequests((current) => [created, ...current]);
      setForm({ title: "", description: "", category: "plumbing", priority: "medium" }); setShowForm(false);
      setNotice("Request submitted successfully. Your property manager has been notified.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not submit your request."); }
    finally { setSaving(false); }
  }

  async function confirmAvailability(request: MaintenanceRequest, availability: "confirmed" | "unavailable") {
    try {
      const response = await apiRequest(`/tenant/maintenance-requests/${request.id}/availability`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ availability }) });
      const updated = response && typeof response === "object" && "data" in response ? (response as { data: MaintenanceRequest }).data : null;
      if (updated) { setRequests((current) => current.map((item) => item.id === updated.id ? updated : item)); setSelected(updated); }
      setNotice(availability === "confirmed" ? "Your maintenance visit is confirmed." : "Your property manager has been told you are unavailable at that time.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update your availability."); }
  }

  const openCount = requests.filter((item) => item.status === "open").length;
  const progressCount = requests.filter((item) => item.status === "in_progress").length;
  const resolvedCount = requests.filter((item) => item.status === "completed").length;

  return (
    <TenantDashboardLayout title="Maintenance" subtitle="Report a problem and follow it through to resolution.">
      <style>{`.tm2{display:flex;flex-direction:column;gap:1.5rem}.tm2-head{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start}.tm2-title{margin:0;font-size:1.75rem;font-weight:700;letter-spacing:-.035em}.tm2-sub{margin:.35rem 0 0;color:var(--tp-muted)}.tm2-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem}.tm2-stat{padding:1rem;border:1px solid var(--tp-line);border-radius:1rem;background:var(--tp-surface)}.tm2-stat span{font-size:.72rem;color:var(--tp-faint);text-transform:uppercase;letter-spacing:.08em}.tm2-stat strong{display:block;margin-top:.3rem;font-size:1.5rem}.tm2-list{border:1px solid var(--tp-line);border-radius:1.1rem;background:var(--tp-surface);overflow:hidden}.tm2-row{width:100%;display:flex;align-items:center;gap:.8rem;padding:1rem;border:0;border-top:1px solid var(--tp-line-soft);background:transparent;text-align:left}.tm2-row:first-child{border-top:0}.tm2-row:hover{background:#fafbfd}.tm2-icon{width:2.3rem;height:2.3rem;display:grid;place-items:center;border-radius:.75rem;background:var(--tp-surface-sunken);color:var(--tp-blue)}.tm2-row-main{min-width:0;flex:1}.tm2-row-title{font-weight:650}.tm2-row-meta{font-size:.78rem;color:var(--tp-muted);margin-top:.2rem}.tm2-pill{display:inline-flex;padding:.25rem .55rem;border-radius:999px;font-size:.7rem;font-weight:700;background:var(--tp-blue-pale);color:var(--tp-blue-dark)}.tm2-panel{position:fixed;inset:0;z-index:70;display:flex;align-items:flex-end;justify-content:center;background:rgba(15,23,42,.42);padding:1rem}.tm2-card{width:100%;max-width:36rem;max-height:92vh;overflow:auto;border-radius:1.2rem;background:var(--tp-surface);padding:1.2rem;box-shadow:var(--tp-shadow-pop)}.tm2-card-head{display:flex;justify-content:space-between;gap:1rem}.tm2-card h2{margin:0;font-size:1.15rem}.tm2-field{display:flex;flex-direction:column;gap:.35rem;margin-top:1rem}.tm2-field label{font-size:.8rem;font-weight:650}.tm2-field input,.tm2-field textarea,.tm2-field select{border:1px solid var(--tp-line);border-radius:.7rem;padding:.65rem;background:var(--tp-surface);outline:none}.tm2-field textarea{min-height:7rem;resize:vertical}.tm2-choices{display:grid;grid-template-columns:repeat(4,1fr);gap:.45rem}.tm2-choice{border:1px solid var(--tp-line);border-radius:.7rem;padding:.6rem;background:var(--tp-surface);font-weight:600}.tm2-choice.on{border-color:var(--tp-blue);background:var(--tp-blue-pale);color:var(--tp-blue-dark)}.tm2-foot{display:flex;gap:.6rem;margin-top:1.2rem}.tm2-foot .tp-btn{flex:1;justify-content:center}.tm2-facts{display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-top:1.2rem}.tm2-fact{padding:.75rem;border-radius:.8rem;background:var(--tp-surface-sunken)}.tm2-fact small{display:block;color:var(--tp-faint);font-size:.7rem}.tm2-fact strong{display:block;margin-top:.2rem;font-size:.85rem}.tm2-note{margin-top:1rem;padding:.75rem;border-radius:.8rem;background:var(--tp-blue-pale);color:var(--tp-blue-dark);font-size:.8rem}.tm2-alert{padding:.75rem;border-radius:.8rem;background:var(--tp-red-pale);color:var(--tp-red);font-size:.8rem}.tm2-success{padding:.75rem;border-radius:.8rem;background:var(--tp-green-pale);color:var(--tp-green);font-size:.8rem}@media(max-width:640px){.tm2-stats{grid-template-columns:1fr 1fr}.tm2-choices{grid-template-columns:1fr 1fr}.tm2-facts{grid-template-columns:1fr}.tm2-head{flex-direction:column}.tm2-panel{padding:.5rem}}`}</style>
      <div className="tm2">
        <header className="tm2-head"><div><h1 className="tm2-title">Maintenance</h1><p className="tm2-sub">Report a problem and follow it through to resolution.</p></div><button type="button" className="tp-btn tp-btn--primary" onClick={() => { setShowForm(true); setNotice(""); }}><Plus />Submit request</button></header>
        {notice && <div className="tm2-success"><CheckCircle2 size={16} style={{ verticalAlign: "-3px", marginRight: 6 }} />{notice}</div>}
        {error && <div className="tm2-alert"><AlertTriangle size={16} style={{ verticalAlign: "-3px", marginRight: 6 }} />{error}</div>}
        <div className="tm2-stats"><div className="tm2-stat"><span>Received</span><strong>{openCount}</strong></div><div className="tm2-stat"><span>In progress</span><strong>{progressCount}</strong></div><div className="tm2-stat"><span>Resolved</span><strong>{resolvedCount}</strong></div></div>
        <section className="tm2-list" aria-label="Maintenance history">
          {loading ? <div style={{ padding: "1.25rem" }}>Loading your requests…</div> : requests.length === 0 ? <div style={{ padding: "2rem", textAlign: "center" }}><Wrench size={30} /><p style={{ fontWeight: 700 }}>Nothing needs fixing</p><p className="tm2-sub">When something in your unit breaks, submit a request here. Your manager already receives the property and unit automatically.</p></div> : requests.map((request) => <button key={request.id} type="button" className="tm2-row" onClick={() => setSelected(request)}><span className="tm2-icon"><Wrench size={17} /></span><span className="tm2-row-main"><span className="tm2-row-title">{request.title}</span><span className="tm2-row-meta">Reported {dateLabel(request.reported_date)}{request.scheduled_date ? ` · Visit ${dateLabel(request.scheduled_date)}` : ""}</span></span><span className="tm2-pill">{statusLabel(request.status)}</span></button>)}
        </section>
      </div>

      {showForm && <div className="tm2-panel"><form className="tm2-card" onSubmit={submit}><div className="tm2-card-head"><div><h2>Submit a request</h2><p className="tm2-sub">Your property manager sees this immediately.</p></div><button type="button" className="tp-icon-btn" onClick={() => setShowForm(false)} aria-label="Close"><X /></button></div><div className="tm2-field"><label htmlFor="tm-title">What's wrong?</label><input id="tm-title" required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Kitchen sink is leaking" /></div><div className="tm2-field"><label>Category</label><div className="tm2-choices">{["plumbing","electrical","appliance","other"].map((value) => <button key={value} type="button" className={`tm2-choice${form.category === value ? " on" : ""}`} onClick={() => setForm({ ...form, category: value })}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div></div><div className="tm2-field"><label>How urgent is it?</label><select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option value="low">Low</option><option value="medium">Normal</option><option value="high">High</option><option value="urgent">Emergency</option></select><small>Emergency is for anything unsafe — flooding, gas, or no power.</small></div><div className="tm2-field"><label htmlFor="tm-desc">Describe the problem</label><textarea id="tm-desc" required minLength={10} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="When did it start, what have you tried, is it getting worse?" /></div><div className="tm2-foot"><button type="button" className="tp-btn tp-btn--secondary" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="tp-btn tp-btn--primary" disabled={saving}>{saving ? "Submitting…" : "Submit request"}</button></div></form></div>}

      {selected && <div className="tm2-panel"><div className="tm2-card"><div className="tm2-card-head"><div><h2>{selected.title}</h2><p className="tm2-sub">{statusLabel(selected.status)} · Reported {dateLabel(selected.reported_date)}</p></div><button type="button" className="tp-icon-btn" onClick={() => setSelected(null)} aria-label="Close"><X /></button></div><p style={{ lineHeight: 1.6, marginTop: "1.2rem" }}>{selected.description}</p><div className="tm2-facts"><div className="tm2-fact"><small>Priority</small><strong>{selected.priority}</strong></div><div className="tm2-fact"><small>Assigned to</small><strong>{selected.assigned_to || "Not assigned yet"}</strong></div><div className="tm2-fact"><small>Estimated cost</small><strong>{money(selected.estimated_cost)}</strong></div><div className="tm2-fact"><small>Cost responsibility</small><strong>{selected.cost_responsibility ? selected.cost_responsibility === "tenant" ? "Tenant" : "Landlord" : "Not decided"}</strong></div></div>{selected.scheduled_date && selected.status !== "completed" && <div className="tm2-note"><Clock size={15} style={{ verticalAlign: "-3px", marginRight: 5 }} />Maintenance visit: <strong>{dateLabel(selected.scheduled_date)}{selected.scheduled_time ? ` at ${selected.scheduled_time.slice(0,5)}` : ""}</strong>{selected.tenant_availability === "pending" && <div className="tm2-foot"><button type="button" className="tp-btn tp-btn--primary" onClick={() => void confirmAvailability(selected, "confirmed")}>I'll be available</button><button type="button" className="tp-btn tp-btn--secondary" onClick={() => void confirmAvailability(selected, "unavailable")}>I can't make it</button></div>}{selected.tenant_availability === "confirmed" && <p style={{ marginBottom: 0 }}>You confirmed you will be available.</p>}{selected.tenant_availability === "unavailable" && <p style={{ marginBottom: 0 }}>You marked this time as unavailable. Your manager has been notified.</p>}</div>}{selected.notes && <div className="tm2-note">Manager note: {selected.notes}</div>}<div className="tm2-foot"><button type="button" className="tp-btn tp-btn--secondary" onClick={() => setSelected(null)}>Close</button></div></div></div>}
    </TenantDashboardLayout>
  );
}
