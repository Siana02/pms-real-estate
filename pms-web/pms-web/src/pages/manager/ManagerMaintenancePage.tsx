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
 
/* ------------------------------------------------------------------ */
/*  PAGE STYLES                                                        */
/* ------------------------------------------------------------------ */
 
const pageStyles = `
.mt-detail { display: flex; flex-direction: column; gap: 0.75rem; }
 
.mt-detail__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 0.625rem;
  border-bottom: 1px solid var(--pms-border-soft);
  font-size: 0.875rem;
}
 
.mt-detail__key { color: var(--pms-muted); }
.mt-detail__value { font-weight: 600; color: var(--pms-heading); text-align: right; }
 
.mt-desc {
  margin: 0;
  padding: 0.875rem 1rem;
  border-radius: var(--mg-radius-sm);
  border: 1px solid var(--pms-border-soft);
  background: var(--pms-glass);
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--pms-text);
}
`;
 
/* ------------------------------------------------------------------ */
/*  TYPES & PARSING                                                     */
/* ------------------------------------------------------------------ */
 
interface RequestRecord {
  id: number;
  title: string;
  description: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  estimated_cost: number;
  actual_cost: number;
  reported_date: string | null;
  completed_date: string | null;
  property: { id: number; name: string } | null;
  unit: { id: number; unit_number: string } | null;
  tenant: { id: number; name: string; phone: string | null } | null;
}
 
const STATUS_FILTERS: { id: string; label: string }[] = [
  { id: "needs_action", label: "Needs action" },
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "in_progress", label: "In progress" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];
 
const PRIORITIES = ["all", "urgent", "high", "medium", "low"];
 
const PRIORITY_WEIGHT: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};
 
function parseRequests(payload: unknown): RequestRecord[] {
  return rows(payload).map((record) => {
    const unit = toRecord(record.unit);
    const unitNumber = asString(unit.unit_number);
    const tenant = toRecord(record.tenant);
    const tenantName =
      asString(tenant.name) ||
      [asString(tenant.first_name), asString(tenant.last_name)]
        .filter(Boolean)
        .join(" ");
 
    return {
      id: asNumber(record.id),
      title: asString(record.title) || "Maintenance request",
      description: asString(record.description),
      priority: asString(record.priority) || "medium",
      status: asString(record.status) || "open",
      assigned_to: asString(record.assigned_to) || null,
      estimated_cost: asNumber(record.estimated_cost),
      actual_cost: asNumber(record.actual_cost),
      reported_date: asString(record.reported_date) || null,
      completed_date: asString(record.completed_date) || null,
      property: namedRef(record.property, "name"),
      unit: unitNumber ? { id: asNumber(unit.id), unit_number: unitNumber } : null,
      tenant: tenantName
        ? {
            id: asNumber(tenant.id),
            name: tenantName,
            phone: asString(tenant.phone) || null,
          }
        : null,
    };
  });
}
 
function isActive(request: RequestRecord): boolean {
  return request.status === "open" || request.status === "in_progress";
}
 
function priorityBadge(priority: string): string {
  if (priority === "urgent") return "mg-badge mg-badge--danger";
  if (priority === "high") return "mg-badge mg-badge--warn";
  if (priority === "low") return "mg-badge";
  return "mg-badge mg-badge--info";
}
 
function statusBadge(status: string): string {
  if (status === "completed") return "mg-badge mg-badge--ok";
  if (status === "in_progress") return "mg-badge mg-badge--info";
  if (status === "cancelled") return "mg-badge";
  return "mg-badge mg-badge--warn";
}
 
/* ------------------------------------------------------------------ */
/*  REQUEST DRAWER                                                      */
/* ------------------------------------------------------------------ */
 
interface RequestDrawerProps {
  request: RequestRecord;
  currency: string;
  onClose: () => void;
  onUpdated: () => void;
}
 
function RequestDrawer({
  request,
  currency,
  onClose,
  onUpdated,
}: RequestDrawerProps) {
  const [status, setStatus] = useState(request.status);
  const [assignedTo, setAssignedTo] = useState(request.assigned_to ?? "");
  const [actualCost, setActualCost] = useState(
    request.actual_cost > 0 ? String(request.actual_cost) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
 
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
 
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
 
  async function handleSave() {
    if (saving) return;
 
    setSaving(true);
    setError("");
 
    try {
      await apiRequest(`/maintenance-requests/${request.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          assigned_to: assignedTo.trim() || null,
          actual_cost: actualCost ? Number(actualCost) : null,
        }),
      });
 
      onUpdated();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not update the request."
      );
    } finally {
      setSaving(false);
    }
  }
 
  return (
    <div
      className="mg-drawer"
      role="dialog"
      aria-modal="true"
      aria-label={request.title}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="mg-drawer__panel">
        <div className="mg-drawer__head">
          <div>
            <h2 className="mg-drawer__title">{request.title}</h2>
            <p className="mg-drawer__sub">
              {request.property?.name ?? "Unknown property"} ·{" "}
              {request.unit?.unit_number ?? "No unit"} · reported{" "}
              {relativeDays(request.reported_date)}
            </p>
          </div>
          <button
            type="button"
            className="mg-iconbtn"
            onClick={onClose}
            aria-label="Close"
          >
            <X />
          </button>
        </div>
 
        <div className="mg-drawer__body">
          {error && (
            <div className="mg-alert" role="alert">
              <AlertCircle />
              <span>{error}</span>
            </div>
          )}
 
          <p className="mt-desc">
            {request.description || "No further detail was provided."}
          </p>
 
          <div className="mt-detail">
            <div className="mt-detail__row">
              <span className="mt-detail__key">Tenant</span>
              <span className="mt-detail__value">
                {request.tenant?.name ?? "—"}
              </span>
            </div>
            <div className="mt-detail__row">
              <span className="mt-detail__key">Phone</span>
              <span className="mt-detail__value">
                {request.tenant?.phone ? (
                  <a href={`tel:${request.tenant.phone}`}>
                    {request.tenant.phone}
                  </a>
                ) : (
                  "—"
                )}
              </span>
            </div>
            <div className="mt-detail__row">
              <span className="mt-detail__key">Priority</span>
              <span className="mt-detail__value">
                {titleCase(request.priority)}
              </span>
            </div>
            <div className="mt-detail__row">
              <span className="mt-detail__key">Reported</span>
              <span className="mt-detail__value">
                {formatDate(request.reported_date)}
              </span>
            </div>
            <div className="mt-detail__row">
              <span className="mt-detail__key">Estimated cost</span>
              <span className="mt-detail__value">
                {formatMoney(request.estimated_cost, currency)}
              </span>
            </div>
          </div>
 
          <div className="mg-field">
            <label className="mg-label" htmlFor="mt-status">
              Status
            </label>
            <select
              id="mt-status"
              className="mg-select"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
 
          <div className="mg-field">
            <label className="mg-label" htmlFor="mt-assigned">
              Assigned to
            </label>
            <input
              id="mt-assigned"
              className="mg-input"
              value={assignedTo}
              onChange={(event) => setAssignedTo(event.target.value)}
              placeholder="Vendor, caretaker or technician"
            />
          </div>
 
          <div className="mg-field">
            <label className="mg-label" htmlFor="mt-cost">
              Actual cost
            </label>
            <input
              id="mt-cost"
              className="mg-input"
              type="number"
              min="0"
              value={actualCost}
              onChange={(event) => setActualCost(event.target.value)}
              placeholder="What it finally cost"
            />
            <p className="mg-hint">
              Recorded costs feed the maintenance spend on your expenses report.
            </p>
          </div>
        </div>
 
        <div className="mg-drawer__foot">
          <button type="button" className="mg-btn mg-btn--subtle" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="mg-btn mg-btn--primary"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            <CheckCircle2 />
            {saving ? "Saving…" : "Save update"}
          </button>
        </div>
      </div>
    </div>
  );
}
 
/* ------------------------------------------------------------------ */
/*  PAGE                                                                */
/* ------------------------------------------------------------------ */
 
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
    setLoading(true);
    setError("");
 
    try {
      const payload = await apiRequest("/maintenance-requests");
      setRequests(parseRequests(payload));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load maintenance requests."
      );
    } finally {
      setLoading(false);
    }
  }, []);
 
  useEffect(() => {
    void load();
  }, [load]);
 
  const counts = useMemo(
    () => ({
      all: requests.length,
      needs_action: requests.filter(isActive).length,
      open: requests.filter((request) => request.status === "open").length,
      in_progress: requests.filter((request) => request.status === "in_progress")
        .length,
      completed: requests.filter((request) => request.status === "completed")
        .length,
      cancelled: requests.filter((request) => request.status === "cancelled")
        .length,
    }),
    [requests]
  );
 
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
 
    return requests
      .filter((request) => {
        if (status === "needs_action" && !isActive(request)) return false;
        if (status !== "all" && status !== "needs_action" && request.status !== status) {
          return false;
        }
        if (priority !== "all" && request.priority !== priority) return false;
        if (!needle) return true;
 
        return [
          request.title,
          request.description,
          request.tenant?.name ?? "",
          request.property?.name ?? "",
          request.unit?.unit_number ?? "",
          request.assigned_to ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .sort((a, b) => {
        const byPriority =
          (PRIORITY_WEIGHT[a.priority] ?? 9) - (PRIORITY_WEIGHT[b.priority] ?? 9);
        if (byPriority !== 0) return byPriority;
        return (a.reported_date ?? "") < (b.reported_date ?? "") ? 1 : -1;
      });
  }, [requests, status, priority, query]);
 
  const totals = useMemo(() => {
    const active = requests.filter(isActive);
 
    return {
      urgent: active.filter((request) => request.priority === "urgent").length,
      unassigned: active.filter((request) => !request.assigned_to).length,
      committed: active.reduce(
        (sum, request) => sum + (request.actual_cost || request.estimated_cost),
        0
      ),
      spent: requests
        .filter((request) => request.status === "completed")
        .reduce((sum, request) => sum + request.actual_cost, 0),
    };
  }, [requests]);
 
  return (
    <DashboardLayout>
      <div className="mg-root">
        <style>{managerStyles}</style>
        <style>{pageStyles}</style>
 
        <div className="mg-shell">
          <header className="mg-header">
            <div>
              <span className="mg-eyebrow">
                <Wrench />
                Operations
              </span>
              <h1 className="mg-title">Maintenance</h1>
              <p className="mg-subtitle">
                Live requests from tenants across every property and unit, sorted
                by urgency. Open one to assign a vendor, record the cost and move
                it along.
              </p>
            </div>
 
            <div className="mg-actions">
              <button
                type="button"
                className="mg-btn mg-btn--subtle"
                onClick={() => void load()}
                disabled={loading}
              >
                <RefreshCw className={loading ? "mg-spin" : undefined} />
                Refresh
              </button>
            </div>
          </header>
 
          {error && (
            <div className="mg-alert" role="alert">
              <AlertCircle />
              <span>{error}</span>
            </div>
          )}
 
          <section className="mg-stats" aria-label="Maintenance summary">
            <article className="mg-stat">
              <p className="mg-stat__label">Needs action</p>
              <p className="mg-stat__value">
                {formatNumber(counts.needs_action)}
              </p>
              <p className="mg-stat__hint">Open or in progress</p>
            </article>
            <article className="mg-stat">
              <p className="mg-stat__label">Urgent</p>
              <p className="mg-stat__value">{formatNumber(totals.urgent)}</p>
              <p className="mg-stat__hint mg-stat__hint--warn">Same-day issues</p>
            </article>
            <article className="mg-stat">
              <p className="mg-stat__label">Unassigned</p>
              <p className="mg-stat__value">{formatNumber(totals.unassigned)}</p>
            </article>
            <article className="mg-stat">
              <p className="mg-stat__label">Committed cost</p>
              <p className="mg-stat__value">
                {formatMoney(totals.committed, currency)}
              </p>
              <p className="mg-stat__hint">Estimated on active work</p>
            </article>
            <article className="mg-stat">
              <p className="mg-stat__label">Completed spend</p>
              <p className="mg-stat__value">{formatMoney(totals.spent, currency)}</p>
            </article>
          </section>
 
          <div className="mg-toolbar">
            <div className="mg-search">
              <Search />
              <label className="mg-label" htmlFor="mt-search" hidden>
                Search requests
              </label>
              <input
                id="mt-search"
                className="mg-input"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by issue, tenant, property or vendor…"
              />
            </div>
 
            <div className="mg-chips" role="group" aria-label="Filter by status">
              {STATUS_FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`mg-chip${item.id === status ? " mg-chip--on" : ""}`}
                  onClick={() => setStatus(item.id)}
                  aria-pressed={item.id === status}
                >
                  {item.label}
                  <span className="mg-chip__count">
                    {counts[item.id as keyof typeof counts]}
                  </span>
                </button>
              ))}
            </div>
          </div>
 
          <div className="mg-chips" role="group" aria-label="Filter by priority">
            {PRIORITIES.map((value) => (
              <button
                key={value}
                type="button"
                className={`mg-chip${value === priority ? " mg-chip--on" : ""}`}
                onClick={() => setPriority(value)}
                aria-pressed={value === priority}
              >
                {value === "all" ? "Any priority" : titleCase(value)}
              </button>
            ))}
          </div>
 
          <section className="mg-panel">
            <div className="mg-panel__head">
              <h2 className="mg-panel__title">
                <Building2 />
                Requests
              </h2>
              <span className="mg-panel__meta">
                {visible.length} of {requests.length}
              </span>
            </div>
 
            {loading ? (
              <div className="mg-panel__body">
                {[0, 1, 2, 3].map((key) => (
                  <span
                    key={key}
                    className="mg-skeleton"
                    style={{ height: "2.25rem", marginBottom: "0.625rem" }}
                  />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <div className="mg-empty">
                <Wrench />
                <p className="mg-empty__title">
                  {requests.length === 0
                    ? "No maintenance requests"
                    : "Nothing needs attention here"}
                </p>
                <p className="mg-empty__text">
                  {requests.length === 0
                    ? "Requests submitted by tenants from their portal land here with their property and unit already attached."
                    : "Change the status or priority filter to see other requests."}
                </p>
              </div>
            ) : (
              <div className="mg-tablewrap">
                <table className="mg-table">
                  <thead>
                    <tr>
                      <th scope="col">Issue</th>
                      <th scope="col">Tenant</th>
                      <th scope="col">Location</th>
                      <th scope="col">Reported</th>
                      <th scope="col">Assigned</th>
                      <th scope="col" className="mg-num">
                        Cost
                      </th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((request) => (
                      <tr key={request.id}>
                        <td data-label="Issue">
                          <button
                            type="button"
                            className="mg-rowlink"
                            onClick={() => setSelected(request)}
                          >
                            {request.title}
                          </button>
                          <span className="mg-sub">
                            <span className={priorityBadge(request.priority)}>
                              {titleCase(request.priority)}
                            </span>
                          </span>
                        </td>
                        <td data-label="Tenant">
                          <div className="mg-person">
                            <span className="mg-avatar" aria-hidden="true">
                              {initials(request.tenant?.name ?? "")}
                            </span>
                            <div>
                              <span className="mg-strong">
                                {request.tenant?.name ?? "Unknown"}
                              </span>
                              {request.tenant?.phone && (
                                <span className="mg-sub">
                                  <Phone
                                    style={{
                                      width: "0.75rem",
                                      height: "0.75rem",
                                      verticalAlign: "-0.125rem",
                                      marginRight: "0.25rem",
                                    }}
                                  />
                                  {request.tenant.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td data-label="Location">
                          <span className="mg-strong">
                            {request.unit?.unit_number ?? "—"}
                          </span>
                          <span className="mg-sub">
                            {request.property?.name ?? "No property"}
                          </span>
                        </td>
                        <td data-label="Reported" className="mg-nowrap">
                          {formatDate(request.reported_date)}
                          <span className="mg-sub">
                            {relativeDays(request.reported_date)}
                          </span>
                        </td>
                        <td data-label="Assigned">
                          {request.assigned_to ?? (
                            <span className="mg-badge mg-badge--warn">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td data-label="Cost" className="mg-num">
                          {formatMoney(
                            request.actual_cost || request.estimated_cost,
                            currency
                          )}
                          {request.actual_cost === 0 &&
                            request.estimated_cost > 0 && (
                              <span className="mg-sub">estimated</span>
                            )}
                        </td>
                        <td data-label="Status">
                          <span className={statusBadge(request.status)}>
                            {titleCase(request.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
 
        {selected && (
          <RequestDrawer
            request={selected}
            currency={currency}
            onClose={() => setSelected(null)}
            onUpdated={() => {
              setSelected(null);
              void load();
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
 
export default ManagerMaintenancePage;