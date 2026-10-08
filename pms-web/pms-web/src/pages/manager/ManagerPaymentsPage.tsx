import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  Plus,
  RefreshCw,
  Search,
  X,
  XCircle,
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
  rows,
  titleCase,
  toRecord,
} from "../../services/format";

interface PaymentRecord {
  id: number;
  lease_id: number;
  tenant: { id: number; name: string } | null;
  property: { id: number; name: string } | null;
  unit: { id: number; unit_number: string } | null;
  amount: number;
  payment_date: string | null;
  payment_method: string;
  payment_type: string;
  reference: string | null;
  notes: string | null;
  status: "paid" | "pending" | "failed" | "partial" | "overdue";
}

interface LeaseOption {
  id: number;
  label: string;
}

const TYPES = ["all", "rent", "deposit", "utility", "other"];
const STATUS_FILTERS = ["all", "pending", "paid", "failed"];

const RANGES: { id: string; label: string; days: number }[] = [
  { id: "30", label: "Last 30 days", days: 30 },
  { id: "90", label: "Last 90 days", days: 90 },
  { id: "365", label: "Last 12 months", days: 365 },
  { id: "all", label: "All time", days: 0 },
];

function parsePayments(payload: unknown): PaymentRecord[] {
  return rows(payload).map((record) => {
    const unit = toRecord(record.unit);
    const unitNumber = asString(unit.unit_number);

    return {
      id: asNumber(record.id),
      lease_id: asNumber(record.lease_id),
      tenant: (() => { const tenant = toRecord(record.tenant); const name = asString(tenant.name) || [asString(tenant.first_name), asString(tenant.last_name)].filter(Boolean).join(" ") || asString(tenant.full_name) || asString(tenant.email); return tenant.id ? { id: asNumber(tenant.id), name } : null; })(),
      property: namedRef(record.property, "name"),
      unit: unitNumber
        ? { id: asNumber(unit.id), unit_number: unitNumber }
        : null,
      amount: asNumber(record.amount),
      payment_date: asString(record.payment_date) || null,
      payment_method: asString(record.payment_method) || "other",
      payment_type: asString(record.payment_type) || "rent",
      reference: asString(record.reference) || null,
      notes: asString(record.notes) || null,
      status: (["paid", "pending", "failed", "partial", "overdue"].includes(asString(record.status)) ? asString(record.status) : "paid") as PaymentRecord["status"],
    };
  });
}

function parseLeaseOptions(payload: unknown): LeaseOption[] {
  return rows(payload)
    .filter((record) => {
      const status = asString(record.status).toLowerCase();
      return status !== "ended" && status !== "terminated";
    })
    .map((record) => {
      const tenant = toRecord(record.tenant);
      const property = toRecord(record.property);
      const unit = toRecord(record.unit);
      const tenantName = asString(tenant.name) || [asString(tenant.first_name), asString(tenant.last_name)].filter(Boolean).join(" ") || asString(tenant.full_name) || asString(tenant.email);
      const propertyName = asString(property.name);
      const unitNumber = asString(unit.unit_number);

      return {
        id: asNumber(record.id),
        label: [
          tenantName || `Lease #${asNumber(record.id)}`,
          unitNumber ? `· ${unitNumber}` : "",
          propertyName ? `· ${propertyName}` : "",
        ]
          .filter(Boolean)
          .join(" "),
      };
    })
    .filter((lease) => lease.id > 0);
}

/* ------------------------------------------------------------------ */
/*  RECORD PAYMENT DRAWER                                               */
/* ------------------------------------------------------------------ */

interface RecordDrawerProps {
  leases: LeaseOption[];
  onClose: () => void;
  onCreated: () => void;
}

function RecordPaymentDrawer({ leases, onClose, onCreated }: RecordDrawerProps) {
  const [leaseId, setLeaseId] = useState(
    leases.length > 0 ? String(leases[0].id) : ""
  );
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("mpesa");
  const [type, setType] = useState("rent");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const valid = leaseId.length > 0 && Number(amount) > 0 && date.length > 0;

  async function handleSubmit() {
    if (!valid || saving) return;

    setSaving(true);
    setError("");

    try {
      await apiRequest("/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lease_id: Number(leaseId),
          amount: Number(amount),
          payment_date: date,
          payment_method: method,
          payment_type: type,
          reference: reference.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      onCreated();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not record the payment."
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
      aria-label="Record a payment"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="mg-drawer__panel">
        <div className="mg-drawer__head">
          <div>
            <h2 className="mg-drawer__title">Record a payment</h2>
            <p className="mg-drawer__sub">
              A recorded payment is money already received — it settles against
              the tenant's lease immediately.
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

          <div className="mg-field">
            <label className="mg-label" htmlFor="pm-lease">
              Lease
            </label>
            <select
              id="pm-lease"
              className="mg-select"
              value={leaseId}
              onChange={(event) => setLeaseId(event.target.value)}
            >
              {leases.map((lease) => (
                <option key={lease.id} value={lease.id}>
                  {lease.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mg-grid2">
            <div className="mg-field">
              <label className="mg-label" htmlFor="pm-amount">
                Amount
              </label>
              <input
                id="pm-amount"
                className="mg-input"
                type="number"
                min="0"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="45000"
              />
            </div>

            <div className="mg-field">
              <label className="mg-label" htmlFor="pm-date">
                Payment date
              </label>
              <input
                id="pm-date"
                className="mg-input"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
          </div>

          <div className="mg-grid2">
            <div className="mg-field">
              <label className="mg-label" htmlFor="pm-method">
                Method
              </label>
              <select
                id="pm-method"
                className="mg-select"
                value={method}
                onChange={(event) => setMethod(event.target.value)}
              >
                <option value="mpesa">M-PESA</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="mg-field">
              <label className="mg-label" htmlFor="pm-type">
                Type
              </label>
              <select
                id="pm-type"
                className="mg-select"
                value={type}
                onChange={(event) => setType(event.target.value)}
              >
                <option value="rent">Rent</option>
                <option value="deposit">Deposit</option>
                <option value="utility">Utility</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="mg-field">
            <label className="mg-label" htmlFor="pm-ref">
              Reference
            </label>
            <input
              id="pm-ref"
              className="mg-input"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="M-PESA code, slip or receipt number"
            />
          </div>

          <div className="mg-field">
            <label className="mg-label" htmlFor="pm-notes">
              Notes
            </label>
            <textarea
              id="pm-notes"
              className="mg-textarea"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Anything worth remembering about this payment."
            />
          </div>
        </div>

        <div className="mg-drawer__foot">
          <button type="button" className="mg-btn mg-btn--subtle" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="mg-btn mg-btn--primary"
            onClick={() => void handleSubmit()}
            disabled={!valid || saving}
          >
            <Plus />
            {saving ? "Recording…" : "Record payment"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                                */
/* ------------------------------------------------------------------ */

function ManagerPaymentsPage() {
  const currency = useMemo(readCurrency, []);

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [leaseOptions, setLeaseOptions] = useState<LeaseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [range, setRange] = useState("90");
  const [statusFilter, setStatusFilter] = useState("all");
  const [drawer, setDrawer] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [paymentsPayload, leasesPayload] = await Promise.all([
        apiRequest("/payments"),
        apiRequest("/leases"),
      ]);

      setPayments(parsePayments(paymentsPayload));
      setLeaseOptions(parseLeaseOptions(leasesPayload));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not load payments."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const inRange = useCallback(
    (payment: PaymentRecord) => {
      const selected = RANGES.find((item) => item.id === range);
      if (!selected || selected.days === 0) return true;

      const age = daysBetween(payment.payment_date);
      return age === null || Math.abs(age) <= selected.days;
    },
    [range]
  );

  const scoped = useMemo(
    () => payments.filter(inRange),
    [payments, inRange]
  );

  const counts = useMemo(() => {
    const byType: Record<string, number> = { all: scoped.length };

    TYPES.slice(1).forEach((value) => {
      byType[value] = scoped.filter(
        (payment) => payment.payment_type === value
      ).length;
    });

    return byType;
  }, [scoped]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return scoped
      .filter((payment) => {
        if (type !== "all" && payment.payment_type !== type) return false;
        if (statusFilter !== "all" && payment.status !== statusFilter) return false;
        if (!needle) return true;

        return [
          payment.tenant?.name ?? "",
          payment.property?.name ?? "",
          payment.unit?.unit_number ?? "",
          payment.reference ?? "",
          payment.payment_method,
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .sort((a, b) => (a.payment_date ?? "") < (b.payment_date ?? "") ? 1 : -1);
  }, [scoped, type, query, statusFilter]);

  const totals = useMemo(() => {
    const confirmed = scoped.filter((payment) => payment.status === "paid");
    const collected = confirmed.reduce((sum, payment) => sum + payment.amount, 0);
    const rent = confirmed
      .filter((payment) => payment.payment_type === "rent")
      .reduce((sum, payment) => sum + payment.amount, 0);
    const deposits = confirmed
      .filter((payment) => payment.payment_type === "deposit")
      .reduce((sum, payment) => sum + payment.amount, 0);

    return {
      collected,
      rent,
      deposits,
      count: scoped.length,
      average: scoped.length > 0 ? Math.round(collected / scoped.length) : 0,
    };
  }, [scoped]);

  return (
    <DashboardLayout>
      <div className="mg-root">
        <style>{managerStyles}</style>

        <div className="mg-shell">
          <header className="mg-header">
            <div>
              <span className="mg-eyebrow">
                <Banknote />
                Money in
              </span>
              <h1 className="mg-title">Payments</h1>
              <p className="mg-subtitle">
                Every payment and tenant payment submission across your organization. Confirmed
                payments are separated from submissions awaiting verification — rent, deposits and utilities
                are separated so your rent collection stays honest.
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

              <button
                type="button"
                className="mg-btn mg-btn--primary"
                onClick={() => setDrawer(true)}
                disabled={leaseOptions.length === 0}
              >
                <Plus />
                Record payment
              </button>
            </div>
          </header>

          {error && (
            <div className="mg-alert" role="alert">
              <AlertCircle />
              <span>{error}</span>
            </div>
          )}

          <section className="mg-stats" aria-label="Collection summary">
            <article className="mg-stat">
              <p className="mg-stat__label">Collected</p>
              <p className="mg-stat__value">
                {formatMoney(totals.collected, currency)}
              </p>
              <p className="mg-stat__hint">
                {RANGES.find((item) => item.id === range)?.label}
              </p>
            </article>
            <article className="mg-stat">
              <p className="mg-stat__label">Rent</p>
              <p className="mg-stat__value">{formatMoney(totals.rent, currency)}</p>
            </article>
            <article className="mg-stat">
              <p className="mg-stat__label">Deposits</p>
              <p className="mg-stat__value">
                {formatMoney(totals.deposits, currency)}
              </p>
            </article>
            <article className="mg-stat">
              <p className="mg-stat__label">Payments</p>
              <p className="mg-stat__value">{formatNumber(totals.count)}</p>
            </article>
            <article className="mg-stat">
              <p className="mg-stat__label">Average</p>
              <p className="mg-stat__value">
                {formatMoney(totals.average, currency)}
              </p>
            </article>
          </section>

          <div className="mg-toolbar">
            <div className="mg-search">
              <Search />
              <label className="mg-label" htmlFor="pm-search" hidden>
                Search payments
              </label>
              <input
                id="pm-search"
                className="mg-input"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by tenant, unit, reference or method…"
              />
            </div>

            <div className="mg-field" style={{ flex: "0 0 12rem" }}>
              <label className="mg-label" htmlFor="pm-range" hidden>
                Period
              </label>
              <select
                id="pm-range"
                className="mg-select"
                value={range}
                onChange={(event) => setRange(event.target.value)}
              >
                {RANGES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mg-chips" role="group" aria-label="Filter by status">
              {STATUS_FILTERS.map((value) => (
                <button key={value} type="button" className={`mg-chip${value === statusFilter ? " mg-chip--on" : ""}`} onClick={() => setStatusFilter(value)} aria-pressed={value === statusFilter}>
                  {value === "all" ? "All status" : value === "pending" ? "Needs review" : value === "paid" ? "Confirmed" : "Rejected"}
                </button>
              ))}
            </div>

            <div className="mg-chips" role="group" aria-label="Filter by type">
              {TYPES.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`mg-chip${value === type ? " mg-chip--on" : ""}`}
                  onClick={() => setType(value)}
                  aria-pressed={value === type}
                >
                  {value === "all" ? "All" : titleCase(value)}
                  <span className="mg-chip__count">{counts[value] ?? 0}</span>
                </button>
              ))}
            </div>
          </div>

          <section className="mg-panel">
            <div className="mg-panel__head">
              <h2 className="mg-panel__title">
                <Banknote />
                Received payments
              </h2>
              <span className="mg-panel__meta">
                {visible.length} of {payments.length}
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
                <Banknote />
                <p className="mg-empty__title">
                  {payments.length === 0
                    ? "No payments recorded"
                    : "No payments match"}
                </p>
                <p className="mg-empty__text">
                  {payments.length === 0
                    ? "Record the first payment against a lease and it will appear here with its receipt reference."
                    : "Widen the period or clear the filters to see more payments."}
                </p>
              </div>
            ) : (
              <div className="mg-tablewrap">
                <table className="mg-table">
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Tenant</th>
                      <th scope="col">Unit</th>
                      <th scope="col">Method</th>
                      <th scope="col">Type</th>
                      <th scope="col" className="mg-num">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((payment) => (
                      <tr key={payment.id}>
                        <td data-label="Date" className="mg-nowrap">
                          {formatDate(payment.payment_date)}
                          {payment.reference && (
                            <span className="mg-sub">{payment.reference}</span>
                          )}
                        </td>
                        <td data-label="Tenant">
                          <div className="mg-person">
                            <span className="mg-avatar" aria-hidden="true">
                              {initials(payment.tenant?.name ?? "")}
                            </span>
                            <span className="mg-strong">
                              {payment.tenant?.name ?? "Unknown tenant"}
                            </span>
                          </div>
                        </td>
                        <td data-label="Unit">
                          <span className="mg-strong">
                            {payment.unit?.unit_number ?? "—"}
                          </span>
                          <span className="mg-sub">
                            {payment.property?.name ?? "No property"}
                          </span>
                        </td>
                                        <td data-label="Method">
                          {titleCase(payment.payment_method)}
                          {payment.status === "pending" && <span className="mg-sub">Awaiting verification</span>}
                        </td>
                        <td data-label="Type">
                          <span
                            className={
                              payment.payment_type === "rent"
                                ? "mg-badge mg-badge--ok"
                                : "mg-badge mg-badge--info"
                            }
                          >
                            {titleCase(payment.payment_type)}
                          </span>
                        </td>
                        <td data-label="Amount" className="mg-num">
                          <span className="mg-strong">
                            {formatMoney(payment.amount, currency)}
                          </span>
                          <span className={payment.status === "paid" ? "mg-badge mg-badge--ok" : payment.status === "pending" ? "mg-badge mg-badge--info" : "mg-badge"}>
                            {payment.status === "paid" ? "Confirmed" : payment.status === "pending" ? "Needs review" : "Rejected"}
                          </span>
                          {payment.status === "pending" && (
                            <div className="mg-actions" style={{ justifyContent: "flex-end", marginTop: ".4rem" }}>
                              <button type="button" className="mg-btn mg-btn--primary" onClick={async () => {
                                try { await apiRequest(`/payments/${payment.id}/verify`, { method: "POST" }); await load(); }
                                catch (cause) { setError(cause instanceof Error ? cause.message : "Could not confirm payment."); }
                              }}><CheckCircle2 /> Confirm</button>
                              <button type="button" className="mg-btn mg-btn--ghost" onClick={async () => {
                                try { await apiRequest(`/payments/${payment.id}/reject`, { method: "POST" }); await load(); }
                                catch (cause) { setError(cause instanceof Error ? cause.message : "Could not reject payment."); }
                              }}><XCircle /> Reject</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {drawer && (
          <RecordPaymentDrawer
            leases={leaseOptions}
            onClose={() => setDrawer(false)}
            onCreated={() => {
              setDrawer(false);
              void load();
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

export default ManagerPaymentsPage;
