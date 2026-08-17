import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  FileText,
  RefreshCw,
  Search,
} from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { apiRequest } from "../../services/api";
import { managerStyles } from "../../styles/managerUI";
import {
  asNumber,
  asString,
  daysBetween,
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
/*  TYPES & PARSING                                                     */
/* ------------------------------------------------------------------ */
 
interface LeaseRecord {
  id: number;
  tenant: { id: number; name: string } | null;
  property: { id: number; name: string } | null;
  unit: { id: number; unit_number: string } | null;
  start_date: string | null;
  end_date: string | null;
  monthly_rent: number;
  deposit_amount: number;
  balance: number;
  status: string;
  notes: string | null;
}
 
type LeaseView = LeaseRecord & { computed: "active" | "expiring" | "expired" };
 
const EXPIRING_WINDOW_DAYS = 60;
 
function parseLeases(payload: unknown): LeaseRecord[] {
  return rows(payload).map((record) => {
    const unit = toRecord(record.unit);
    const unitNumber = asString(unit.unit_number);
 
    return {
      id: asNumber(record.id),
      tenant: namedRef(record.tenant, "name"),
      property: namedRef(record.property, "name"),
      unit: unitNumber
        ? { id: asNumber(unit.id), unit_number: unitNumber }
        : null,
      start_date: asString(record.start_date) || null,
      end_date: asString(record.end_date) || null,
      monthly_rent: asNumber(record.monthly_rent),
      deposit_amount: asNumber(record.deposit_amount),
      balance: asNumber(record.balance),
      status: asString(record.status) || "active",
      notes: asString(record.notes) || null,
    };
  });
}
 
function classify(lease: LeaseRecord): LeaseView["computed"] {
  const remaining = daysBetween(lease.end_date);
 
  if (lease.status === "expired" || lease.status === "terminated") {
    return "expired";
  }
  if (remaining !== null && remaining < 0) return "expired";
  if (remaining !== null && remaining <= EXPIRING_WINDOW_DAYS) return "expiring";
 
  return "active";
}
 
function badgeClass(view: LeaseView["computed"]): string {
  if (view === "active") return "mg-badge mg-badge--ok";
  if (view === "expiring") return "mg-badge mg-badge--warn";
  return "mg-badge mg-badge--danger";
}
 
const FILTERS: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "expiring", label: "Expiring soon" },
  { id: "expired", label: "Expired" },
];
 
/* ------------------------------------------------------------------ */
/*  PAGE                                                                */
/* ------------------------------------------------------------------ */
 
function ManagerLeasesPage() {
  const currency = useMemo(readCurrency, []);
 
  const [leases, setLeases] = useState<LeaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
 
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
 
    try {
      const payload = await apiRequest("/leases");
      setLeases(parseLeases(payload));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load leases.");
    } finally {
      setLoading(false);
    }
  }, []);
 
  useEffect(() => {
    void load();
  }, [load]);
 
  const views: LeaseView[] = useMemo(
    () => leases.map((lease) => ({ ...lease, computed: classify(lease) })),
    [leases]
  );
 
  const counts = useMemo(
    () => ({
      all: views.length,
      active: views.filter((lease) => lease.computed === "active").length,
      expiring: views.filter((lease) => lease.computed === "expiring").length,
      expired: views.filter((lease) => lease.computed === "expired").length,
    }),
    [views]
  );
 
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
 
    return views.filter((lease) => {
      if (filter !== "all" && lease.computed !== filter) return false;
      if (!needle) return true;
 
      return [
        lease.tenant?.name ?? "",
        lease.property?.name ?? "",
        lease.unit?.unit_number ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [views, filter, query]);
 
  const totals = useMemo(() => {
    const active = views.filter((lease) => lease.computed !== "expired");
 
    return {
      contracted: active.reduce((sum, lease) => sum + lease.monthly_rent, 0),
      deposits: active.reduce((sum, lease) => sum + lease.deposit_amount, 0),
      arrears: views.reduce((sum, lease) => sum + Math.max(lease.balance, 0), 0),
    };
  }, [views]);
 
  return (
    <DashboardLayout>
      <div className="mg-root">
        <style>{managerStyles}</style>
 
        <div className="mg-shell">
          <header className="mg-header">
            <div>
              <span className="mg-eyebrow">
                <FileText />
                Agreements
              </span>
              <h1 className="mg-title">Leases</h1>
              <p className="mg-subtitle">
                Who is contracted to pay what, until when. Leases inside{" "}
                {EXPIRING_WINDOW_DAYS} days of their end date are flagged so a
                renewal conversation happens before the unit goes empty.
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
 
          <section className="mg-stats" aria-label="Lease summary">
            <article className="mg-stat">
              <p className="mg-stat__label">Active leases</p>
              <p className="mg-stat__value">{formatNumber(counts.active)}</p>
            </article>
            <article className="mg-stat">
              <p className="mg-stat__label">Expiring soon</p>
              <p className="mg-stat__value">{formatNumber(counts.expiring)}</p>
              <p className="mg-stat__hint mg-stat__hint--warn">
                Within {EXPIRING_WINDOW_DAYS} days
              </p>
            </article>
            <article className="mg-stat">
              <p className="mg-stat__label">Contracted rent</p>
              <p className="mg-stat__value">
                {formatMoney(totals.contracted, currency)}
              </p>
              <p className="mg-stat__hint">Per month</p>
            </article>
            <article className="mg-stat">
              <p className="mg-stat__label">Deposits held</p>
              <p className="mg-stat__value">
                {formatMoney(totals.deposits, currency)}
              </p>
            </article>
            <article className="mg-stat">
              <p className="mg-stat__label">Outstanding</p>
              <p className="mg-stat__value">
                {formatMoney(totals.arrears, currency)}
              </p>
              <p className="mg-stat__hint mg-stat__hint--warn">Tenant arrears</p>
            </article>
          </section>
 
          <div className="mg-toolbar">
            <div className="mg-search">
              <Search />
              <label className="mg-label" htmlFor="ls-search" hidden>
                Search leases
              </label>
              <input
                id="ls-search"
                className="mg-input"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by tenant, property or unit…"
              />
            </div>
 
            <div className="mg-chips" role="group" aria-label="Filter leases">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`mg-chip${item.id === filter ? " mg-chip--on" : ""}`}
                  onClick={() => setFilter(item.id)}
                  aria-pressed={item.id === filter}
                >
                  {item.label}
                  <span className="mg-chip__count">
                    {counts[item.id as keyof typeof counts]}
                  </span>
                </button>
              ))}
            </div>
          </div>
 
          <section className="mg-panel">
            <div className="mg-panel__head">
              <h2 className="mg-panel__title">
                <CalendarClock />
                Lease register
              </h2>
              <span className="mg-panel__meta">
                {visible.length} of {views.length}
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
                <FileText />
                <p className="mg-empty__title">
                  {views.length === 0 ? "No leases yet" : "No leases match"}
                </p>
                <p className="mg-empty__text">
                  {views.length === 0
                    ? "Place a tenant in a unit to create the first lease and start tracking rent."
                    : "Try another tenant, property or status filter."}
                </p>
              </div>
            ) : (
              <div className="mg-tablewrap">
                <table className="mg-table">
                  <thead>
                    <tr>
                      <th scope="col">Tenant</th>
                      <th scope="col">Unit</th>
                      <th scope="col">Term</th>
                      <th scope="col" className="mg-num">
                        Rent
                      </th>
                      <th scope="col" className="mg-num">
                        Deposit
                      </th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((lease) => (
                      <tr key={lease.id}>
                        <td data-label="Tenant">
                          <div className="mg-person">
                            <span className="mg-avatar" aria-hidden="true">
                              {initials(lease.tenant?.name ?? "")}
                            </span>
                            <div>
                              <span className="mg-strong">
                                {lease.tenant?.name ?? "Unassigned"}
                              </span>
                              {lease.balance > 0 && (
                                <span className="mg-sub">
                                  {formatMoney(lease.balance, currency)}{" "}
                                  outstanding
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td data-label="Unit">
                          <span className="mg-strong">
                            {lease.unit?.unit_number ?? "—"}
                          </span>
                          <span className="mg-sub">
                            {lease.property?.name ?? "No property"}
                          </span>
                        </td>
                        <td data-label="Term" className="mg-nowrap">
                          {formatDate(lease.start_date)} →{" "}
                          {formatDate(lease.end_date)}
                          <span className="mg-sub">
                            Ends {relativeDays(lease.end_date)}
                          </span>
                        </td>
                        <td data-label="Rent" className="mg-num">
                          {formatMoney(lease.monthly_rent, currency)}
                        </td>
                        <td data-label="Deposit" className="mg-num">
                          {formatMoney(lease.deposit_amount, currency)}
                        </td>
                        <td data-label="Status">
                          <span className={badgeClass(lease.computed)}>
                            {lease.computed === "expiring"
                              ? "Expiring soon"
                              : titleCase(lease.computed)}
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
      </div>
    </DashboardLayout>
  );
}
 
export default ManagerLeasesPage;
