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

interface RentPeriodAllocation {
  id: number;
  amount: number;
  rent_obligation: { id: number; period: string; due_date: string; amount_due: number } | null;
}

interface RentCreditRecord {
  id: number;
  amount: number;
  remaining_amount: number;
  status: string;
  allocations: RentPeriodAllocation[];
}

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
  rent_obligation: { id: number; period: string; due_date: string; amount_due: number } | null;
  allocations: RentPeriodAllocation[];
  rent_payment_credits: RentCreditRecord[];
}

const paymentsPageStyles = `
.payment-ledger-page{color:#172b3f}
.payment-ledger-page .mg-shell{max-width:1440px}
.payment-ledger-page .mg-header{align-items:flex-start;padding:0 0 1.2rem;border-bottom:1px solid #e1e8f0;margin-bottom:1.2rem;gap:1.5rem}
.payment-ledger-page .mg-eyebrow{font-weight:850;letter-spacing:.12em;color:#486b8b}
.payment-ledger-page .mg-title{font-size:clamp(1.9rem,3.4vw,2.65rem);line-height:1.1;letter-spacing:-.045em;color:#172d43}
.payment-ledger-page .mg-subtitle{max-width:60rem;color:#5e7184;font-size:.9rem;line-height:1.75}
.payment-ledger-page .mg-actions{gap:.65rem;flex-wrap:wrap}
.payment-ledger-page .mg-btn{min-height:42px;border-radius:11px;font-weight:750;transition:transform .15s ease,box-shadow .15s ease}
.payment-ledger-page .mg-btn--primary{background:#244f75;border-color:#244f75;box-shadow:0 4px 10px rgba(36,79,117,.12)}
.payment-ledger-page .mg-btn--primary:hover{transform:translateY(-1px);box-shadow:0 8px 16px rgba(36,79,117,.16)}
.payment-ledger-page .mg-btn--subtle,.payment-ledger-page .mg-btn--ghost{border-color:#d4dfe9;background:#fff;color:#304a61}
.payment-ledger-page .mg-stats{gap:.8rem;margin:1.1rem 0 1.4rem}
.payment-ledger-page .mg-stat{border:1px solid #dce5ee;border-radius:16px;background:linear-gradient(145deg,#fff,#f8fbfe);box-shadow:0 8px 24px rgba(25,48,75,.045);padding:1rem}
.payment-ledger-page .mg-stat__label{font-size:.74rem;font-weight:800;color:#65798d}
.payment-ledger-page .mg-stat__value{font-size:clamp(1.25rem,2.2vw,1.75rem);letter-spacing:-.035em;color:#1c3a55;font-variant-numeric:tabular-nums}
.payment-ledger-page .mg-stat__hint{font-size:.72rem;color:#7b8b9a;line-height:1.5}
.payment-ledger-page .mg-toolbar{display:flex;gap:.7rem;align-items:center;flex-wrap:wrap;padding:.85rem;border:1px solid #e0e8f0;border-radius:16px;background:#f7fafd;margin:1.1rem 0}
.payment-ledger-page .mg-search{flex:1 1 18rem;min-width:min(100%,15rem)}
.payment-ledger-page .mg-input,.payment-ledger-page .mg-select,.payment-ledger-page .mg-textarea{border:1px solid #cbd7e2;border-radius:11px;background:#fff;color:#1c344b;min-height:42px}
.payment-ledger-page .mg-input:focus,.payment-ledger-page .mg-select:focus,.payment-ledger-page .mg-textarea:focus{outline:3px solid #dcecff;border-color:#6592b7}
.payment-ledger-page .mg-chip{border-radius:999px;padding:.55rem .8rem;border-color:#d4dee8;background:#fff;color:#415a70;font-weight:750}
.payment-ledger-page .mg-chip--on{background:#234e73;border-color:#234e73;color:#fff}
.payment-ledger-page .mg-panel{border:1px solid #dce5ee;border-radius:18px;box-shadow:0 10px 28px rgba(25,48,75,.05);overflow:hidden;background:#fff}
.payment-ledger-page .mg-panel__head{background:#fbfdff;border-bottom:1px solid #e8eef4;padding:1rem 1.2rem}
.payment-ledger-page .mg-panel__title{font-size:1rem;color:#1d3850}
.payment-ledger-page .mg-table{border-collapse:separate;border-spacing:0}
.payment-ledger-page .mg-table thead th{background:#f6f9fc;color:#667b8f;font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;padding:.85rem .75rem;border-bottom:1px solid #dce5ee;white-space:nowrap}
.payment-ledger-page .mg-table tbody td{padding:.9rem .75rem;border-bottom:1px solid #edf1f5;vertical-align:top}
.payment-ledger-page .mg-table tbody tr:hover{background:#f8fbfe}
.payment-ledger-page .mg-strong{color:#213b52;line-height:1.45}
.payment-ledger-page .mg-sub{font-size:.73rem;line-height:1.55;color:#718296;overflow-wrap:anywhere}
.payment-ledger-page .mg-badge{font-size:.69rem;letter-spacing:.01em;padding:.32rem .55rem;border-radius:999px;white-space:normal}
.payment-ledger-page .pl-ledger .mg-badge--danger{background:#fff0ed;color:#a43d2c}
.payment-ledger-page .pl-ledger .mg-badge--warn{background:#fff7e6;color:#865b13}
.payment-ledger-page .pl-ledger .mg-badge--info{background:#edf6ff;color:#2e5f8a}
.payment-ledger-page .pl-ledger .mg-badge--ok{background:#e9f8ef;color:#216342}
.payment-ledger-page .mg-drawer__panel{border-radius:20px;border:1px solid #dce5ee;box-shadow:0 28px 90px rgba(7,24,42,.28)}
.payment-ledger-page .mg-drawer__head{background:#f8fbfe;border-bottom:1px solid #e6edf3}
.payment-ledger-page .mg-drawer__title{font-size:1.45rem;letter-spacing:-.03em}
.payment-ledger-page .pl-ledger__metric strong{font-variant-numeric:tabular-nums}
@media(max-width:680px){.payment-ledger-page .mg-shell{padding-inline:.2rem}.payment-ledger-page .mg-toolbar{padding:.65rem}.payment-ledger-page .mg-panel{border-radius:14px}.payment-ledger-page .mg-panel__head{padding:.9rem}.payment-ledger-page .mg-tablewrap{overflow-x:auto}.payment-ledger-page .mg-table{min-width:720px}.payment-ledger-page .mg-actions{width:100%}.payment-ledger-page .mg-actions .mg-btn{flex:1 1 auto}}
`;

interface RentLedgerRow {
  id: number; lease_id: number; tenant_id: number; tenant_name: string; property_name: string;
  unit_number: string; period: string; due_date: string; amount_due: number; amount_paid: number;
  balance: number; status: string;
  references: { reference: string | null; payment_date: string; amount_applied: number; source: string }[];
}
interface RentLedgerCredit {
  id: number; lease_id: number; tenant_name: string; property_name: string; unit_number: string;
  original_amount: number; remaining_amount: number; source_reference: string | null; source_payment_date: string | null;
}
function parseRentLedger(payload: unknown): { rows: RentLedgerRow[]; credits: RentLedgerCredit[] } {
  const root = toRecord(payload);
  return {
    rows: rows(root.data).map((record) => ({
      id: asNumber(record.id), lease_id: asNumber(record.lease_id), tenant_id: asNumber(record.tenant_id),
      tenant_name: asString(record.tenant_name) || "Unknown tenant", property_name: asString(record.property_name) || "Property",
      unit_number: asString(record.unit_number) || "—", period: asString(record.period), due_date: asString(record.due_date),
      amount_due: asNumber(record.amount_due), amount_paid: asNumber(record.amount_paid), balance: asNumber(record.balance),
      status: asString(record.status) || "due",
      references: rows(record.references).map((ref) => ({ reference: asString(ref.reference) || null, payment_date: asString(ref.payment_date), amount_applied: asNumber(ref.amount_applied), source: asString(ref.source) })),
    })),
    credits: rows(root.credits).map((record) => ({
      id: asNumber(record.id), lease_id: asNumber(record.lease_id), tenant_name: asString(record.tenant_name) || "Unknown tenant",
      property_name: asString(record.property_name) || "Property", unit_number: asString(record.unit_number) || "—",
      original_amount: asNumber(record.original_amount), remaining_amount: asNumber(record.remaining_amount),
      source_reference: asString(record.source_reference) || null, source_payment_date: asString(record.source_payment_date) || null,
    })),
  };
}
function rentStatusLabel(status: string) {
  return status === "paid" ? "Paid fully" : status === "partial_overdue" ? "Partially paid · overdue" : status === "partial" ? "Partially paid" : status === "overdue" ? "Overdue" : status === "due" ? "Due now" : "Upcoming";
}
function rentStatusClass(status: string) {
  return status === "paid" ? "ok" : status === "overdue" || status === "partial_overdue" ? "danger" : status === "partial" ? "info" : "warn";
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
    const lease = toRecord(record.lease);
    const tenantRecord = toRecord(record.tenant ?? lease.tenant);
    const propertyRecord = toRecord(record.property ?? lease.property);
    const unit = toRecord(record.unit ?? lease.unit);
    const unitNumber = asString(unit.unit_number);

    return {
      id: asNumber(record.id),
      lease_id: asNumber(record.lease_id),
      tenant: (() => { const tenant = tenantRecord; const name = asString(tenant.name) || [asString(tenant.first_name), asString(tenant.last_name)].filter(Boolean).join(" ") || asString(tenant.full_name) || asString(tenant.email); return tenant.id ? { id: asNumber(tenant.id), name } : null; })(),
      property: namedRef(propertyRecord, "name"),
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
      rent_obligation: (() => { const obligation = toRecord(record.rent_obligation); return obligation.id ? { id: asNumber(obligation.id), period: asString(obligation.period), due_date: asString(obligation.due_date), amount_due: asNumber(obligation.amount_due) } : null; })(),
      allocations: rows(record.allocations).map((allocation) => {
        const obligation = toRecord(allocation.rent_obligation);
        return { id: asNumber(allocation.id), amount: asNumber(allocation.amount), rent_obligation: obligation.id ? { id: asNumber(obligation.id), period: asString(obligation.period), due_date: asString(obligation.due_date), amount_due: asNumber(obligation.amount_due) } : null };
      }),
      rent_payment_credits: rows(record.rent_payment_credits).map((credit) => ({
        id: asNumber(credit.id),
        amount: asNumber(credit.amount),
        remaining_amount: asNumber(credit.remaining_amount),
        status: asString(credit.status),
        allocations: rows(credit.allocations).map((allocation) => {
          const obligation = toRecord(allocation.rent_obligation);
          return { id: asNumber(allocation.id), amount: asNumber(allocation.amount), rent_obligation: obligation.id ? { id: asNumber(obligation.id), period: asString(obligation.period), due_date: asString(obligation.due_date), amount_due: asNumber(obligation.amount_due) } : null };
        }),
      })),
    };
  });
}

function formatRentPeriod(period: string | null | undefined): string {
  if (!period) return "Rent period not recorded";
  const [year, month] = period.slice(0, 10).split("-").map(Number);
  if (!year || !month) return period;
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function parseLeaseOptions(payload: unknown): LeaseOption[] {
  return rows(payload)
    .filter((record) => {
      const status = asString(record.status).toLowerCase();
      return status !== "ended" && status !== "terminated";
    })
    .map((record) => {
      const tenant = toRecord(record.tenant ?? toRecord(record.lease).tenant);
      const property = toRecord(record.property ?? toRecord(record.lease).property);
      const unit = toRecord(record.unit ?? toRecord(record.lease).unit);
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
  const [ledgerRows, setLedgerRows] = useState<RentLedgerRow[]>([]);
  const [rentCredits, setRentCredits] = useState<RentLedgerCredit[]>([]);
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
      const [paymentsPayload, leasesPayload, ledgerPayload] = await Promise.all([
        apiRequest("/payments"),
        apiRequest("/leases"),
        apiRequest("/payments/rent-ledger"),
      ]);

      setPayments(parsePayments(paymentsPayload));
      setLeaseOptions(parseLeaseOptions(leasesPayload));
      const ledger = parseRentLedger(ledgerPayload);
      setLedgerRows(ledger.rows);
      setRentCredits(ledger.credits);
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

  const groupedRentLedger = useMemo(() => {
    const grouped = new Map<number, { leaseId: number; tenantName: string; propertyName: string; unitNumber: string; rows: RentLedgerRow[]; credits: RentLedgerCredit[] }>();
    ledgerRows.forEach((row) => {
      const group = grouped.get(row.lease_id) ?? { leaseId: row.lease_id, tenantName: row.tenant_name, propertyName: row.property_name, unitNumber: row.unit_number, rows: [], credits: [] };
      group.rows.push(row);
      grouped.set(row.lease_id, group);
    });
    rentCredits.forEach((credit) => {
      const group = grouped.get(credit.lease_id) ?? { leaseId: credit.lease_id, tenantName: credit.tenant_name, propertyName: credit.property_name, unitNumber: credit.unit_number, rows: [], credits: [] };
      group.credits.push(credit);
      grouped.set(credit.lease_id, group);
    });
    return [...grouped.values()].map((group) => ({
      ...group,
      rows: [...group.rows].sort((a, b) => b.period.localeCompare(a.period)),
      outstanding: group.rows.reduce((sum, row) => sum + row.balance, 0),
      creditRemaining: group.credits.reduce((sum, credit) => sum + credit.remaining_amount, 0),
    })).sort((a, b) => a.tenantName.localeCompare(b.tenantName));
  }, [ledgerRows, rentCredits]);

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
                are separated so your rent collection stays honest. Confirmed rent payments are allocated to the oldest outstanding months first; any remainder is shown as rent credit.
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

          <style>{`
            .pl-ledger{margin:1.4rem 0 1.6rem;display:grid;gap:.85rem}
            .pl-ledger__intro{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap}
            .pl-ledger__intro h2{margin:0;font-size:1.15rem;color:#172b3f;letter-spacing:-.02em}
            .pl-ledger__intro p{margin:.4rem 0 0;max-width:58rem;font-size:.86rem;line-height:1.65;color:#607286}
            .pl-ledger__lease{border:1px solid #dbe4ed;border-radius:16px;background:#fff;overflow:hidden}
            .pl-ledger__summary{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:1rem;align-items:center;padding:1rem 1.1rem;cursor:pointer;list-style:none}
            .pl-ledger__summary::-webkit-details-marker{display:none}
            .pl-ledger__name{font-weight:800;color:#1b344b;line-height:1.4}
            .pl-ledger__meta{font-size:.77rem;color:#66798c;margin-top:.2rem}
            .pl-ledger__metric{font-size:.73rem;color:#6b7c8d;white-space:nowrap}
            .pl-ledger__metric strong{display:block;font-size:.94rem;color:#1b344b;margin-top:.2rem}
            .pl-ledger__body{border-top:1px solid #edf1f5;padding:.7rem 1rem 1rem}
            .pl-ledger__table{width:100%;border-collapse:collapse;font-size:.82rem}
            .pl-ledger__table th{text-align:left;font-size:.7rem;text-transform:uppercase;letter-spacing:.06em;color:#6a7b8c;padding:.65rem .5rem;border-bottom:1px solid #e8edf2}
            .pl-ledger__table td{padding:.75rem .5rem;border-bottom:1px solid #f0f3f6;color:#334b60;vertical-align:top}
            .pl-ledger__table tr:last-child td{border-bottom:0}
            .pl-ledger__amount{font-weight:750;font-variant-numeric:tabular-nums;white-space:nowrap}
            .pl-ledger__refs{display:grid;gap:.2rem;color:#6b7c8c;font-size:.73rem;line-height:1.45}
            .pl-ledger__credit{display:flex;gap:.65rem;align-items:flex-start;padding:.8rem .9rem;margin-top:.7rem;border:1px solid #d7e8fa;border-radius:12px;background:#f4f9ff;color:#2a4d70;font-size:.82rem;line-height:1.55}
            .pl-ledger__empty{padding:1rem;border:1px dashed #cdd8e3;border-radius:14px;color:#6b7c8c;font-size:.85rem}
            @media(max-width:760px){.pl-ledger__summary{grid-template-columns:minmax(0,1fr) auto}.pl-ledger__metric:last-child{grid-column:1/-1}.pl-ledger__body{overflow-x:auto}.pl-ledger__table{min-width:620px}}
          `}</style>
          <section className="pl-ledger" aria-labelledby="pl-ledger-title">
            <div className="pl-ledger__intro"><div><h2 id="pl-ledger-title">Rent ledger by tenant and month</h2><p>Each row is one rent month. “Paid” includes direct payments and credit carried forward from earlier overpayments. Rent is considered overdue after its due date (usually the 5th), subject to any grace period on the lease.</p></div><span className="mg-badge mg-badge--info">{groupedRentLedger.length} leases</span></div>
            {loading ? <div className="pl-ledger__empty">Loading monthly rent ledger…</div> : groupedRentLedger.length === 0 ? <div className="pl-ledger__empty">No rent obligations have been generated yet. Refresh after the rent ledger has been generated for active leases.</div> : groupedRentLedger.map((group) => (
              <details className="pl-ledger__lease" key={group.leaseId}>
                <summary className="pl-ledger__summary">
                  <div><div className="pl-ledger__name">{group.tenantName}</div><div className="pl-ledger__meta">{group.propertyName} · Unit {group.unitNumber} · Lease #{group.leaseId}</div></div>
                  <div className="pl-ledger__metric">Outstanding<strong>{formatMoney(group.outstanding, currency)}</strong></div>
                  <div className="pl-ledger__metric">Future rent credit<strong>{formatMoney(group.creditRemaining, currency)}</strong></div>
                </summary>
                <div className="pl-ledger__body">
                  {group.rows.length === 0 ? <p className="pl-ledger__meta">No monthly obligations recorded for this lease yet.</p> : <table className="pl-ledger__table"><thead><tr><th>Rent month</th><th>Due date</th><th>Status</th><th>Rent due</th><th>Paid / credit applied</th><th>Balance</th><th>Receipt reference</th></tr></thead><tbody>
                    {group.rows.map((row) => <tr key={row.id}>
                      <td><strong>{formatRentPeriod(row.period)}</strong></td><td>{formatDate(row.due_date)}</td>
                      <td><span className={`mg-badge mg-badge--${rentStatusClass(row.status)}`}>{rentStatusLabel(row.status)}</span></td>
                      <td className="pl-ledger__amount">{formatMoney(row.amount_due, currency)}</td><td className="pl-ledger__amount">{formatMoney(row.amount_paid, currency)}</td><td className="pl-ledger__amount">{formatMoney(row.balance, currency)}</td>
                      <td><div className="pl-ledger__refs">{row.references.length ? row.references.map((reference, index) => <span key={`${row.id}-${index}`}>{reference.reference || "No receipt reference"} · {formatMoney(reference.amount_applied, currency)}{reference.source === "rent_credit" ? " (credit)" : ""}</span>) : <span>No receipt linked</span>}</div></td>
                    </tr>)}
                  </tbody></table>}
                  {group.credits.filter((credit) => credit.remaining_amount > 0).map((credit) => <div className="pl-ledger__credit" key={credit.id}><CheckCircle2 size={17}/><div><strong>{formatMoney(credit.remaining_amount, currency)} rent credit carried forward</strong><div>Original overpayment: {formatMoney(credit.original_amount, currency)}{credit.source_reference ? ` · Receipt ${credit.source_reference}` : ""}. This money will automatically reduce the next month’s rent when that month is added to the ledger.</div></div></div>)}
                </div>
              </details>
            ))}
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
                      <th scope="col">Rent month(s) covered</th>
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
                        <td data-label="Rent month(s) covered">
                          {payment.payment_type !== "rent" ? <span className="mg-sub">Not rent</span> : (() => {
                            const direct = payment.allocations.filter((allocation) => allocation.rent_obligation);
                            const creditAllocations = payment.rent_payment_credits.flatMap((credit) => credit.allocations.filter((allocation) => allocation.rent_obligation).map((allocation) => ({ ...allocation, creditId: credit.id })));
                            const hasLedgerAllocations = direct.length > 0 || creditAllocations.length > 0;
                            const legacyObligation = payment.status === "paid" && direct.length === 0 && creditAllocations.length === 0 ? payment.rent_obligation : null;
                            return <div style={{ minWidth: "12rem", display: "grid", gap: ".3rem" }}>
                              {direct.map((allocation) => <span key={`direct-${allocation.id}`} className="mg-sub">{formatRentPeriod(allocation.rent_obligation?.period)} · {formatMoney(allocation.amount, currency)}</span>)}
                              {creditAllocations.map((allocation) => <span key={`credit-${allocation.creditId}-${allocation.id}`} className="mg-sub">{formatRentPeriod(allocation.rent_obligation?.period)} · {formatMoney(allocation.amount, currency)} from excess</span>)}
                              {legacyObligation && <span className="mg-sub">Legacy month link: {formatRentPeriod(legacyObligation.period)} · explicit month-by-month allocation was not recorded</span>}
                              {!hasLedgerAllocations && !legacyObligation && <span className="mg-sub">{payment.status === "pending" ? "Not allocated until confirmed" : payment.status === "paid" ? "No rent allocation recorded" : "Not allocated"}</span>}
                              {payment.rent_payment_credits.filter((credit) => credit.remaining_amount > 0).map((credit) => <span key={`credit-remaining-${credit.id}`} className="mg-badge mg-badge--info">{formatMoney(credit.remaining_amount, currency)} rent credit carried forward</span>)}
                            </div>;
                          })()}
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
