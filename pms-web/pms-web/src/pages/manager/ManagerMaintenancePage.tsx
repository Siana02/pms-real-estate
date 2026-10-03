import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Phone,
  RefreshCw,
  Search,
  Wrench,
  X,
} from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { apiRequest } from "../../services/api";
import { managerStyles } from "../../styles/managerUI";
import {
  asNumber,
  asString,
  formatDate,
  formatMoney,
  formatNumber,
  initials,
  namedRef,
  readCurrency,
  relativeDays,
  rows,
  titleCase,
  toRecord,
} from "../../services/format";

const pageStyles = `
.mt-detail { display:flex; flex-direction:column; gap:.75rem; }
.mt-detail__row { display:flex; align-items:baseline; justify-content:space-between; gap:1rem; padding-bottom:.625rem; border-bottom:1px solid var(--pms-border-soft); font-size:.875rem; }
.mt-detail__key { color:var(--pms-muted); }
.mt-detail__value { font-weight:600; color:var(--pms-heading); text-align:right; }
.mt-desc { margin:0; padding:.875rem 1rem; border-radius:var(--mg-radius-sm); border:1px solid var(--pms-border-soft); background:var(--pms-glass); font-size:.875rem; line-height:1.6; color:var(--pms-text); }
.mt-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.875rem; }
.mt-span-2 { grid-column:span 2; }
@media (max-width:700px) { .mt-grid { grid-template-columns:1fr; } .mt-span-2 { grid-column:auto; } }
`;

interface RequestRecord {
  id: number;
  title: string;
  description: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  tenant_availability: string | null;
  estimated_cost: number;
  cost_responsibility: string | null;
  reported_date: string | null;
  completed_date: string | null;
  notes: string | null;
  property: { id: number; name: string } | null;
  unit: { id: number; unit_number: string } | null;
  tenant: { id: number; name: string; phone: string | null } | null;
}

const STATUS_FILTERS = [
  { id: "needs_action", label: "Needs action" },
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "in_progress", label: "In progress" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];
const PRIORITIES = ["all", "urgent", "high", "medium", "low"];
const PRIORITY_WEIGHT: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

function parseRequests(payload: unknown): RequestRecord[] {
  return rows(payload).map((record) => {
    const unit = toRecord(record.unit);
    const tenant = toRecord(record.tenant);
    const tenantName = asString(tenant.name) || [asString(tenant.first_name), asString(tenant.last_name)].filter(Boolean).join(" ");
    return {
      id: asNumber(record.id),
      title: asString(record.title) || "Maintenance request",
      description: asString(record.description),
      priority: asString(record.priority) || "medium",
      status: asString(record.status) || "open",
      assigned_to: asString(record.assigned_to) || null,
      scheduled_date: asString(record.scheduled_date) || null,
      scheduled_time: asString(record.scheduled_time) || null,
      tenant_availability: asString(record.tenant_availability) || null,
      estimated_cost: asNumber(record.estimated_cost),
      cost_responsibility: asString(record.cost_responsibility) || null,
      reported_date: asString(record.reported_date) || null,
      completed_date: asString(record.completed_date) || null,
      notes: asString(record.notes) || null,
      property: namedRef(record.property, "name"),
      unit: asString(unit.unit_number) ? { id: asNumber(unit.id), unit_number: asString(unit.unit_number) } : null,
      tenant: tenantName ? { id: asNumber(tenant.id), name: tenantName, phone: asString(tenant.phone) || null } : null,
    };
  });
}

function isActive(request: RequestRecord) { return request.status === "open" || request.status === "in_progress"; }
function priorityBadge(priority: string) { return priority === "urgent" ? "mg-badge mg-badge--danger" : priority === "high" ? "mg-badge mg-badge--warn" : priority === "low" ? "mg-badge" : "mg-badge mg-badge--info"; }
function statusBadge(status: string) { return status === "completed" ? "mg-badge mg-badge--ok" : status === "in_progress" ? "mg-badge mg-badge--info" : status === "cancelled" ? "mg-badge" : "mg-badge mg-badge--warn"; }

function RequestDrawer({ request, currency, onClose, onUpdated }: { request: RequestRecord; currency: string; onClose: () => void; onUpdated: () => void }) {
  const [status, setStatus] = useState(request.status);
  const [assignedTo, setAssignedTo] = useState(request.assigned_to ?? "");
  const [scheduledDate, setScheduledDate] = useState(request.scheduled_date ?? "");
  const [scheduledTime, setScheduledTime] = useState(request.scheduled_time?.slice(0, 5) ?? "");
  const [estimatedCost, setEstimatedCost] = useState(request.estimated_cost > 0 ? String(request.estimated_cost) : "");
  const [responsibility, setResponsibility] = useState(request.cost_responsibility ?? "");
  const [notes, setNotes] = useState(request.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function handleSave() {
    if (saving) return;
    setSaving(true); setError("");
    try {
      await apiRequest(`/maintenance-requests/${request.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          assigned_to: assignedTo.trim() || null,
          scheduled_date: scheduledDate || null,
          scheduled_time: scheduledDate && scheduledTime ? scheduledTime : null,
          estimated_cost: estimatedCost ? Number(estimatedCost) : null,
          cost_responsibility: responsibility || null,
          notes: notes.trim() || null,
        }),
      });
      onUpdated();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update the request.");
    } finally { setSaving(false); }
  }

  const scheduledLabel = scheduledDate
    ? `${formatDate(scheduledDate)}${scheduledTime ? ` at ${scheduledTime}` : ""}`
    : "Not scheduled";

  return (
    <div className="mg-drawer" role="dialog" aria-modal="true" aria-label={request.title} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="mg-drawer__panel">
        <div className="mg-drawer__head">
          <div>
            <h2 className="mg-drawer__title">{request.title}</h2>
            <p className="mg-drawer__sub">{request.property?.name ?? "Unknown property"} · {request.unit?.unit_number ?? "No unit"} · reported {relativeDays(request.reported_date)}</p>
          </div>
          <button type="button" className="mg-iconbtn" onClick={onClose} aria-label="Close"><X /></button>
        </div>

        <div className="mg-drawer__body">
          {error && <div className="mg-alert" role="alert"><AlertCircle /><span>{error}</span></div>}
          <p className="mt-desc">{request.description || "No further detail was provided."}</p>

          <div className="mt-detail">
            <div className="mt-detail__row"><span className="mt-detail__key">Tenant</span><span className="mt-detail__value">{request.tenant?.name ?? "—"}</span></div>
            <div className="mt-detail__row"><span className="mt-detail__key">Phone</span><span className="mt-detail__value">{request.tenant?.phone ? <a href={`tel:${request.tenant.phone}`}>{request.tenant.phone}</a> : "—"}</span></div>
            <div className="mt-detail__row"><span className="mt-detail__key">Priority</span><span className="mt-detail__value">{titleCase(request.priority)}</span></div>
            <div className="mt-detail__row"><span className="mt-detail__key">Reported</span><span className="mt-detail__value">{formatDate(request.reported_date)}</span></div>
            <div className="mt-detail__row"><span className="mt-detail__key">Visit</span><span className="mt-detail__value">{scheduledLabel}</span></div>
            <div className="mt-detail__row"><span className="mt-detail__key">Tenant availability</span><span className="mt-detail__value">{request.tenant_availability ? titleCase(request.tenant_availability) : "Awaiting schedule"}</span></div>
            <div className="mt-detail__row"><span className="mt-detail__key">Estimated cost</span><span className="mt-detail__value">{formatMoney(request.estimated_cost, currency)}</span></div>
            <div className="mt-detail__row"><span className="mt-detail__key">Cost falls on</span><span className="mt-detail__value">{request.cost_responsibility ? titleCase(request.cost_responsibility) : "Not assigned"}</span></div>
          </div>

          <div className="mt-grid">
            <div className="mg-field"><label className="mg-label" htmlFor="mt-status">Status</label><select id="mt-status" className="mg-select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="open">Received</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>
            <div className="mg-field"><label className="mg-label" htmlFor="mt-assigned">Assigned to</label><input id="mt-assigned" className="mg-input" value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} placeholder="Caretaker, technician or vendor" /></div>
            <div className="mg-field"><label className="mg-label" htmlFor="mt-date">Fix date</label><input id="mt-date" className="mg-input" type="date" value={scheduledDate} onChange={(event) => setScheduledDate(event.target.value)} /></div>
            <div className="mg-field"><label className="mg-label" htmlFor="mt-time">Fix time <span className="mg-sub">optional</span></label><input id="mt-time" className="mg-input" type="time" value={scheduledTime} onChange={(event) => setScheduledTime(event.target.value)} disabled={!scheduledDate} /></div>
            <div className="mg-field"><label className="mg-label" htmlFor="mt-cost">Estimated cost</label><input id="mt-cost" className="mg-input" type="number" min="0" step="0.01" value={estimatedCost} onChange={(event) => setEstimatedCost(event.target.value)} placeholder="Expected repair cost" /></div>
            <div className="mg-field"><label className="mg-label" htmlFor="mt-responsibility">Cost falls on</label><select id="mt-responsibility" className="mg-select" value={responsibility} onChange={(event) => setResponsibility(event.target.value)}><option value="">Not decided</option><option value="tenant">Tenant</option><option value="landlord">Landlord</option></select></div>
            <div className="mg-field mt-span-2"><label className="mg-label" htmlFor="mt-notes">Manager notes</label><textarea id="mt-notes" className="mg-input" rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="What was inspected, agreed or needs to happen next?" /></div>
          </div>
          <p className="mg-hint">Scheduling a new date or changing the time resets the tenant availability response so they can confirm the new visit.</p>
        </div>

        <div className="mg-drawer__foot"><button type="button" className="mg-btn mg-btn--subtle" onClick={onClose}>Cancel</button><button type="button" className="mg-btn mg-btn--primary" onClick={() => void handleSave()} disabled={saving}><CheckCircle2 />{saving ? "Saving…" : "Save update"}</button></div>
      </div>
    </div>
  );
}

function ManagerMaintenancePage() {
  const currency = useMemo(readCurrency, []);
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("needs_action");
  const [priority, setPriority] = useState("all");
  const [selected, setSelected] = useState<RequestRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setRequests(parseRequests(await apiRequest("/maintenance-requests"))); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load maintenance requests."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => ({
    all: requests.length,
    needs_action: requests.filter(isActive).length,
    open: requests.filter((request) => request.status === "open").length,
    in_progress: requests.filter((request) => request.status === "in_progress").length,
    completed: requests.filter((request) => request.status === "completed").length,
    cancelled: requests.filter((request) => request.status === "cancelled").length,
  }), [requests]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return requests.filter((request) => {
      if (status === "needs_action" && !isActive(request)) return false;
      if (status !== "all" && status !== "needs_action" && request.status !== status) return false;
      if (priority !== "all" && request.priority !== priority) return false;
      if (!needle) return true;
      return [request.title, request.description, request.tenant?.name ?? "", request.property?.name ?? "", request.unit?.unit_number ?? "", request.assigned_to ?? ""].join(" ").toLowerCase().includes(needle);
    }).sort((a, b) => (PRIORITY_WEIGHT[a.priority] ?? 9) - (PRIORITY_WEIGHT[b.priority] ?? 9) || ((a.reported_date ?? "") < (b.reported_date ?? "") ? 1 : -1));
  }, [requests, status, priority, query]);

  const totals = useMemo(() => {
    const active = requests.filter(isActive);
    return {
      urgent: active.filter((request) => request.priority === "urgent").length,
      unassigned: active.filter((request) => !request.assigned_to).length,
      committed: active.reduce((sum, request) => sum + request.estimated_cost, 0),
      spent: requests.filter((request) => request.status === "completed").reduce((sum, request) => sum + request.estimated_cost, 0),
    };
  }, [requests]);

  return (
    <DashboardLayout>
      <div className="mg-root"><style>{managerStyles}</style><style>{pageStyles}</style>
        <div className="mg-shell">
          <header className="mg-header"><div><span className="mg-eyebrow"><Wrench />Operations</span><h1 className="mg-title">Maintenance</h1><p className="mg-subtitle">Live requests from tenants across every property and unit, sorted by urgency. Open one to assign someone, schedule the fix, record the estimated cost and move it along.</p></div><div className="mg-actions"><button type="button" className="mg-btn mg-btn--subtle" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? "mg-spin" : undefined} />Refresh</button></div></header>
          {error && <div className="mg-alert" role="alert"><AlertCircle /><span>{error}</span></div>}

          <section className="mg-stats" aria-label="Maintenance summary">
            <article className="mg-stat"><p className="mg-stat__label">Needs action</p><p className="mg-stat__value">{formatNumber(counts.needs_action)}</p><p className="mg-stat__hint">Open or in progress</p></article>
            <article className="mg-stat"><p className="mg-stat__label">Urgent</p><p className="mg-stat__value">{formatNumber(totals.urgent)}</p><p className="mg-stat__hint mg-stat__hint--warn">Priority from tenants</p></article>
            <article className="mg-stat"><p className="mg-stat__label">Unassigned</p><p className="mg-stat__value">{formatNumber(totals.unassigned)}</p></article>
            <article className="mg-stat"><p className="mg-stat__label">Committed cost</p><p className="mg-stat__value">{formatMoney(totals.committed, currency)}</p><p className="mg-stat__hint">Estimated on active work</p></article>
            <article className="mg-stat"><p className="mg-stat__label">Completed spend</p><p className="mg-stat__value">{formatMoney(totals.spent, currency)}</p><p className="mg-stat__hint">Based on recorded estimates</p></article>
          </section>

          <div className="mg-toolbar"><div className="mg-search"><Search /><label className="mg-label" htmlFor="mt-search" hidden>Search requests</label><input id="mt-search" className="mg-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by issue, tenant, property or vendor…" /></div><div className="mg-chips" role="group" aria-label="Filter by status">{STATUS_FILTERS.map((item) => <button key={item.id} type="button" className={`mg-chip${item.id === status ? " mg-chip--on" : ""}`} onClick={() => setStatus(item.id)} aria-pressed={item.id === status}>{item.label}<span className="mg-chip__count">{counts[item.id as keyof typeof counts]}</span></button>)}</div></div>
          <div className="mg-chips" role="group" aria-label="Filter by priority">{PRIORITIES.map((value) => <button key={value} type="button" className={`mg-chip${value === priority ? " mg-chip--on" : ""}`} onClick={() => setPriority(value)} aria-pressed={value === priority}>{value === "all" ? "Any priority" : titleCase(value)}</button>)}</div>

          <section className="mg-panel"><div className="mg-panel__head"><h2 className="mg-panel__title"><Building2 />Requests</h2><span className="mg-panel__meta">{visible.length} of {requests.length}</span></div>
            {loading ? <div className="mg-panel__body">{[0,1,2,3].map((key) => <span key={key} className="mg-skeleton" style={{ height: "2.25rem", marginBottom: ".625rem" }} />)}</div> : visible.length === 0 ? <div className="mg-empty"><Wrench /><p className="mg-empty__title">{requests.length === 0 ? "No maintenance requests" : "Nothing needs attention here"}</p><p className="mg-empty__text">{requests.length === 0 ? "Requests submitted by tenants from their portal land here with their property and unit already attached." : "Change the status or priority filter to see other requests."}</p></div> : <div className="mg-tablewrap"><table className="mg-table"><thead><tr><th>Issue</th><th>Tenant</th><th>Location</th><th>Reported</th><th>Assigned</th><th className="mg-num">Cost</th><th>Status</th></tr></thead><tbody>{visible.map((request) => <tr key={request.id}>
              <td data-label="Issue"><button type="button" className="mg-rowlink" onClick={() => setSelected(request)}>{request.title}</button><span className="mg-sub"><span className={priorityBadge(request.priority)}>{titleCase(request.priority)}</span></span></td>
              <td data-label="Tenant"><div className="mg-person"><span className="mg-avatar" aria-hidden="true">{initials(request.tenant?.name ?? "")}</span><div><span className="mg-strong">{request.tenant?.name ?? "Unknown"}</span>{request.tenant?.phone && <span className="mg-sub"><Phone style={{ width: ".75rem", height: ".75rem", verticalAlign: "-.125rem", marginRight: ".25rem" }} />{request.tenant.phone}</span>}</div></div></td>
              <td data-label="Location"><span className="mg-strong">{request.unit?.unit_number ?? "—"}</span><span className="mg-sub">{request.property?.name ?? "No property"}</span></td>
              <td data-label="Reported" className="mg-nowrap">{formatDate(request.reported_date)}<span className="mg-sub">{relativeDays(request.reported_date)}</span></td>
              <td data-label="Assigned">{request.assigned_to ?? <span className="mg-badge mg-badge--warn">Unassigned</span>}{request.scheduled_date && <span className="mg-sub">{formatDate(request.scheduled_date)}{request.tenant_availability === "confirmed" ? " · confirmed" : request.tenant_availability === "unavailable" ? " · unavailable" : " · awaiting tenant"}</span>}</td>
              <td data-label="Cost" className="mg-num">{formatMoney(request.estimated_cost, currency)}{request.cost_responsibility && <span className="mg-sub">{titleCase(request.cost_responsibility)}</span>}</td>
              <td data-label="Status"><span className={statusBadge(request.status)}>{request.status === "open" ? "Received" : titleCase(request.status)}</span></td>
            </tr>)}</tbody></table></div>}
          </section>
        </div>
        {selected && <RequestDrawer request={selected} currency={currency} onClose={() => setSelected(null)} onUpdated={() => { setSelected(null); void load(); }} />}
      </div>
    </DashboardLayout>
  );
}

export default ManagerMaintenancePage;
