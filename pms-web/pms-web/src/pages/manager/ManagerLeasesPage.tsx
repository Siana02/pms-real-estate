import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  FileSignature,
  FileText,
  RefreshCw,
  Search,
  Wallet,
  X,
} from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { apiRequest } from "../../services/api";
import { managerStyles } from "../../styles/managerUI";
import {
  asBoolean,
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

interface DepositRecord {
  amount_required: number;
  amount_paid: number;
  payment_date: string | null;
  status: string | null;
  tenant_marked_paid_at: string | null;
}

interface LeaseRecord {
  id: number;
  tenant: { id: number; name: string } | null;
  property: { id: number; name: string } | null;
  unit: { id: number; unit_number: string } | null;
  start_date: string | null;
  end_date: string | null;
  requested_move_in_date: string | null;
  requested_move_out_date: string | null;
  monthly_rent: number;
  deposit_amount: number;
  balance: number;
  status: string;
  notes: string | null;
  manager_terms: string | null;
  tenant_terms: string | null;
  manager_signature: string | null;
  tenant_signature: string | null;
  manager_signed_at: string | null;
  tenant_signed_at: string | null;
  agreement_finalized: boolean;
  deposit: DepositRecord | null;
}

type LeaseView = LeaseRecord & {
  computed: "upcoming" | "active" | "notice" | "expiring" | "expired";
};

type LeaseFilter = "all" | LeaseView["computed"] | "pending";

const EXPIRING_WINDOW_DAYS = 60;

const leaseStyles = `
.ls-toolbar-field {
  flex: 1 1 18rem;
  min-width: 0;
}

.ls-toolbar-field .mg-label {
  display: block;
  margin-bottom: 0.5rem;
}

.ls-search {
  position: relative;
}

.ls-search svg {
  position: absolute;
  top: 50%;
  left: 0.875rem;
  width: 1rem;
  height: 1rem;
  transform: translateY(-50%);
  color: var(--pms-faint);
  pointer-events: none;
}

.ls-search .mg-input {
  padding-left: 2.5rem;
}

.ls-deposit-meta,
.ls-agreement-meta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.ls-inline-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: flex-end;
}

.ls-callout {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.625rem;
  padding: 0.75rem;
  border-radius: var(--mg-radius-sm);
  border: 1px solid color-mix(in srgb, var(--pms-warn) 45%, transparent);
  background: color-mix(in srgb, var(--pms-warn) 12%, transparent);
}

.ls-callout__title {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--pms-heading);
}

.ls-callout__text {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.55;
  color: var(--pms-muted);
}

.ls-summary-grid,
.ls-copy-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.875rem;
}

.ls-summary-card,
.ls-copy-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: var(--mg-radius-md);
  border: 1px solid var(--pms-border-soft);
  background: var(--pms-glass);
  min-width: 0;
}

.ls-summary-card__label,
.ls-copy-card__eyebrow {
  margin: 0;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--pms-faint);
}

.ls-summary-card__value {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--pms-heading);
  overflow-wrap: anywhere;
}

.ls-summary-card__hint,
.ls-copy-card__hint {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.55;
  color: var(--pms-muted);
}

.ls-summary-card__stack,
.ls-copy-card__stack,
.ls-form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.875rem;
}

.ls-copy-card__head,
.ls-section-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.ls-copy-card__title {
  margin: 0.125rem 0 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--pms-heading);
}

.ls-copy-card__status,
.ls-helper-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.ls-copy-card .mg-textarea {
  min-height: 11rem;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.ls-copy-card .mg-textarea[readonly] {
  opacity: 0.9;
}

.ls-sign-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  align-items: end;
}

.ls-status-line {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.55;
  color: var(--pms-muted);
}

.ls-status-line strong {
  color: var(--pms-heading);
}

.ls-overflow {
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

@media (min-width: 720px) {
  .ls-summary-grid,
  .ls-copy-grid,
  .ls-form-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .ls-sign-row {
    grid-template-columns: minmax(0, 1fr) auto;
  }
}
`;

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseLeaseRecord(record: Record<string, unknown>): LeaseRecord {
  const unit = toRecord(record.unit);
  const depositRecord = toRecord(record.deposit);
  const unitNumber = asString(unit.unit_number);
  const hasDeposit =
    Object.keys(depositRecord).length > 0 || asNumber(record.deposit_amount) > 0;

  return {
    id: asNumber(record.id),
    tenant: namedRef(record.tenant, "name"),
    property: namedRef(record.property, "name"),
    unit: unitNumber
      ? { id: asNumber(unit.id), unit_number: unitNumber }
      : null,
    start_date: asString(record.start_date) || null,
    end_date: asString(record.end_date) || null,
    requested_move_in_date: asString(record.requested_move_in_date) || null,
    requested_move_out_date: asString(record.requested_move_out_date) || null,
    monthly_rent: asNumber(record.monthly_rent),
    deposit_amount:
      depositRecord.amount_required !== undefined
        ? asNumber(depositRecord.amount_required)
        : asNumber(record.deposit_amount),
    balance: asNumber(record.balance),
    status: asString(record.status) || "active",
    notes: asString(record.notes) || null,
    manager_terms: asString(record.manager_terms) || null,
    tenant_terms: asString(record.tenant_terms) || null,
    manager_signature: asString(record.manager_signature) || null,
    tenant_signature: asString(record.tenant_signature) || null,
    manager_signed_at: asString(record.manager_signed_at) || null,
    tenant_signed_at: asString(record.tenant_signed_at) || null,
    agreement_finalized: asBoolean(record.agreement_finalized),
    deposit: hasDeposit
      ? {
          amount_required:
            depositRecord.amount_required !== undefined
              ? asNumber(depositRecord.amount_required)
              : asNumber(record.deposit_amount),
          amount_paid: asNumber(depositRecord.amount_paid),
          payment_date: asString(depositRecord.payment_date) || null,
          status: asString(depositRecord.status) || null,
          tenant_marked_paid_at:
            asString(depositRecord.tenant_marked_paid_at) || null,
        }
      : null,
  };
}

function parseLeases(payload: unknown): LeaseRecord[] {
  return rows(payload).map(parseLeaseRecord);
}

function parseLeaseUpdate(payload: unknown): LeaseRecord | null {
  const outer = toRecord(payload);
  const record = toRecord(outer.lease ?? payload);
  if (Object.keys(record).length === 0) return null;
  return parseLeaseRecord(record);
}

function classify(lease: LeaseRecord): LeaseView["computed"] {
  const today = new Date().toISOString().slice(0, 10);
  const startDate = lease.start_date?.slice(0, 10) ?? null;
  const endDate = lease.end_date?.slice(0, 10) ?? null;

  if (lease.status === "pending") return "upcoming";
  if (lease.status === "ended" || lease.status === "terminated") {
    return "expired";
  }
  if (startDate && startDate > today) return "upcoming";
  if (lease.status === "notice") return "notice";
  if (endDate && endDate < today) return "expired";

  const remaining = daysBetween(lease.end_date);

  if (remaining !== null && remaining < 0) return "expired";
  if (remaining !== null && remaining <= EXPIRING_WINDOW_DAYS) return "expiring";

  return "active";
}

function badgeClass(view: LeaseView["computed"]): string {
  if (view === "active") return "mg-badge mg-badge--ok";
  if (view !== "expired") return "mg-badge mg-badge--warn";
  return "mg-badge mg-badge--danger";
}

function depositRequired(lease: LeaseRecord): number {
  return lease.deposit?.amount_required ?? lease.deposit_amount;
}

function depositPaid(lease: LeaseRecord): number {
  return lease.deposit?.amount_paid ?? 0;
}

function depositStatus(lease: LeaseRecord): string {
  return lease.deposit?.status ?? (depositRequired(lease) > 0 ? "unpaid" : "not_required");
}

function hasPendingDepositConfirmation(lease: LeaseRecord): boolean {
  return Boolean(
    lease.deposit?.tenant_marked_paid_at && depositStatus(lease) !== "paid"
  );
}

function agreementState(lease: LeaseRecord): {
  badgeClass: string;
  label: string;
  detail: string;
} {
  if (lease.agreement_finalized) {
    return {
      badgeClass: "mg-badge mg-badge--ok",
      label: "Agreement fully executed",
      detail: "Both copies have been signed.",
    };
  }

  const pending: string[] = [];
  if (!lease.manager_signed_at) pending.push("manager copy");
  if (!lease.tenant_signed_at) pending.push("tenant copy");

  return {
    badgeClass: "mg-badge mg-badge--warn",
    label: "Awaiting signatures",
    detail: `Pending ${pending.join(" and ")}.`,
  };
}

const FILTERS: { id: LeaseFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending review" },
  { id: "upcoming", label: "Upcoming" },
  { id: "active", label: "Active" },
  { id: "notice", label: "Notice" },
  { id: "expiring", label: "Expiring soon" },
  { id: "expired", label: "Expired" },
];

/* ------------------------------------------------------------------ */
/*  PAGE                                                                */
/* ------------------------------------------------------------------ */

function ManagerLeasesPage() {
  const currency = useMemo(readCurrency, []);
  const [params, setParams] = useSearchParams();

  const [leases, setLeases] = useState<LeaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LeaseFilter>("all");
  const [managerTermsDraft, setManagerTermsDraft] = useState("");
  const [tenantTermsDraft, setTenantTermsDraft] = useState("");
  const [managerInitials, setManagerInitials] = useState("");
  const [managerStartDate, setManagerStartDate] = useState("");
  const [managerEndDate, setManagerEndDate] = useState("");
  const [managerRentDraft, setManagerRentDraft] = useState("0");
  const [managerDepositRequiredDraft, setManagerDepositRequiredDraft] = useState("0");
  const [depositAmountDraft, setDepositAmountDraft] = useState("0");
  const [depositDateDraft, setDepositDateDraft] = useState(todayDate());
  const [drawerError, setDrawerError] = useState("");
  const [drawerNotice, setDrawerNotice] = useState("");
  const [savingTerms, setSavingTerms] = useState(false);
  const [signingManager, setSigningManager] = useState(false);
  const [savingDeposit, setSavingDeposit] = useState(false);
  const [confirmingLeaseId, setConfirmingLeaseId] = useState<number | null>(null);

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

  const selectedLeaseId = Number(params.get("lease") ?? "") || null;
  const selectedLease = useMemo(
    () => views.find((lease) => lease.id === selectedLeaseId) ?? null,
    [selectedLeaseId, views]
  );

  useEffect(() => {
    if (!selectedLease) return;

    setManagerTermsDraft(selectedLease.manager_terms ?? "");
    setTenantTermsDraft(selectedLease.tenant_terms ?? "");
    setManagerInitials("");
    setManagerStartDate(selectedLease.start_date?.slice(0, 10) ?? "");
    setManagerEndDate(selectedLease.end_date?.slice(0, 10) ?? "");
    setManagerRentDraft(String(selectedLease.monthly_rent));
    setManagerDepositRequiredDraft(String(depositRequired(selectedLease)));
    setDepositAmountDraft(String(depositPaid(selectedLease)));
    setDepositDateDraft(
      selectedLease.deposit?.payment_date?.slice(0, 10) ?? todayDate()
    );
    setDrawerError("");
  }, [
    selectedLease,
    selectedLeaseId,
    selectedLease?.deposit?.payment_date,
    selectedLease?.manager_terms,
    selectedLease?.tenant_terms,
  ]);

  const counts = useMemo(
    () => ({
      all: views.length,
      pending: views.filter((lease) => lease.status === "pending").length,
      upcoming: views.filter((lease) => lease.computed === "upcoming" && lease.status !== "pending").length,
      active: views.filter((lease) => lease.computed === "active").length,
      notice: views.filter((lease) => lease.computed === "notice").length,
      expiring: views.filter((lease) => lease.computed === "expiring").length,
      expired: views.filter((lease) => lease.computed === "expired").length,
    }),
    [views]
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return views.filter((lease) => {
      if (filter !== "all" && (filter === "pending" ? lease.status !== "pending" : lease.computed !== filter)) return false;
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
      contracted: active
        .filter((lease) => lease.computed !== "upcoming")
        .reduce((sum, lease) => sum + lease.monthly_rent, 0),
      deposits: active.reduce((sum, lease) => sum + depositRequired(lease), 0),
      arrears: views.reduce((sum, lease) => sum + Math.max(lease.balance, 0), 0),
    };
  }, [views]);

  const agreementSummary = selectedLease ? agreementState(selectedLease) : null;
  const managerTermsChanged = selectedLease
    ? managerTermsDraft !== (selectedLease.manager_terms ?? "")
    : false;
  const tenantTermsChanged = selectedLease
    ? tenantTermsDraft !== (selectedLease.tenant_terms ?? "")
    : false;
  const depositAmountNumber = Number(depositAmountDraft);
  const depositValid =
    selectedLease !== null &&
    depositAmountDraft.trim().length > 0 &&
    Number.isFinite(depositAmountNumber) &&
    depositAmountNumber >= 0 &&
    depositAmountNumber <= depositRequired(selectedLease) &&
    depositDateDraft.length > 0;

  function openLease(leaseId: number) {
    const next = new URLSearchParams(params);
    next.set("lease", String(leaseId));
    setParams(next, { replace: true });
  }

  function closeLease() {
    const next = new URLSearchParams(params);
    next.delete("lease");
    setParams(next, { replace: true });
  }

  function syncLease(updatedLease: LeaseRecord) {
    setLeases((current) =>
      current.map((lease) => (lease.id === updatedLease.id ? updatedLease : lease))
    );
  }

  async function patchLease(
    leaseId: number,
    body: Record<string, unknown>,
    notice: string
  ) {
    const payload = await apiRequest(`/leases/${leaseId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    const updatedLease = parseLeaseUpdate(payload);
    if (updatedLease) syncLease(updatedLease);
    setDrawerNotice(notice);
    setDrawerError("");
    await load();
    return updatedLease;
  }

  async function confirmDepositReceipt(lease: LeaseRecord) {
    const required = depositRequired(lease);
    if (required <= 0) return;

    setConfirmingLeaseId(lease.id);
    if (selectedLeaseId === lease.id) {
      setDrawerNotice("");
      setDrawerError("");
    }

    try {
      const payload = await apiRequest(`/leases/${lease.id}/deposit`, {
        method: "PATCH",
        body: JSON.stringify({
          amount_paid: required,
          payment_date: todayDate(),
        }),
      });
      const updated = parseLeaseUpdate(payload);
      if (updated) syncLease(updated);
      await load();
      setDrawerNotice("Deposit marked as fully received.");

      if (updated && selectedLeaseId === lease.id) {
        setDepositAmountDraft(String(depositPaid(updated)));
        setDepositDateDraft(updated.deposit?.payment_date?.slice(0, 10) ?? todayDate());
      }
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Could not confirm the deposit yet.";
      if (selectedLeaseId === lease.id) setDrawerError(message);
      else setError(message);
    } finally {
      setConfirmingLeaseId(null);
    }
  }

  async function saveAgreementTerms() {
    if (!selectedLease || savingTerms) return;

    const body: Record<string, unknown> = {};
    if (managerTermsChanged) body.manager_terms = managerTermsDraft;
    if (selectedLease && managerStartDate !== (selectedLease.start_date?.slice(0, 10) ?? "")) {
      body.start_date = managerStartDate || null;
    }
    if (selectedLease && managerEndDate !== (selectedLease.end_date?.slice(0, 10) ?? "")) {
      body.end_date = managerEndDate || null;
    }
    if (selectedLease && Number(managerRentDraft) !== selectedLease.monthly_rent) {
      body.monthly_rent = Number(managerRentDraft);
    }
    if (selectedLease && Number(managerDepositRequiredDraft) !== depositRequired(selectedLease)) {
      body.deposit_amount = Number(managerDepositRequiredDraft);
    }
    if (Object.keys(body).length === 0) {
      setDrawerNotice("No agreement text changes to save.");
      setDrawerError("");
      return;
    }

    setSavingTerms(true);
    setDrawerError("");
    setDrawerNotice("");

    try {
      const updated = await patchLease(
        selectedLease.id,
        body,
        "Agreement text saved. Any edited copy now needs to be re-signed."
      );
      if (updated) {
        setManagerTermsDraft(updated.manager_terms ?? "");
        setTenantTermsDraft(updated.tenant_terms ?? "");
        setManagerStartDate(updated.start_date?.slice(0, 10) ?? "");
        setManagerEndDate(updated.end_date?.slice(0, 10) ?? "");
        setManagerRentDraft(String(updated.monthly_rent));
        setManagerDepositRequiredDraft(String(depositRequired(updated)));
      }
    } catch (cause) {
      setDrawerError(
        cause instanceof Error
          ? cause.message
          : "Could not save the agreement text right now."
      );
    } finally {
      setSavingTerms(false);
    }
  }

  async function signManagerCopy() {
    if (!selectedLease || signingManager) return;
    const signature = managerInitials.trim().toUpperCase();
    if (!signature) {
      setDrawerError("Enter your initials before signing.");
      setDrawerNotice("");
      return;
    }

    setSigningManager(true);
    setDrawerError("");
    setDrawerNotice("");

    try {
      const updated = await patchLease(
        selectedLease.id,
        { manager_signature: signature },
        "Manager copy signed."
      );
      if (updated) setManagerInitials("");
    } catch (cause) {
      setDrawerError(
        cause instanceof Error ? cause.message : "Could not sign the agreement yet."
      );
    } finally {
      setSigningManager(false);
    }
  }

  async function recordDepositPayment() {
    if (!selectedLease || savingDeposit || !depositValid) return;

    setSavingDeposit(true);
    setDrawerError("");
    setDrawerNotice("");

    try {
      const payload = await apiRequest(`/leases/${selectedLease.id}/deposit`, {
        method: "PATCH",
        body: JSON.stringify({
          amount_paid: depositAmountNumber,
          payment_date: depositDateDraft,
        }),
      });
      const updated = parseLeaseUpdate(payload);
      if (updated) syncLease(updated);
      await load();
      if (updated) {
        setDepositAmountDraft(String(depositPaid(updated)));
        setDepositDateDraft(updated.deposit?.payment_date?.slice(0, 10) ?? depositDateDraft);
      }
    } catch (cause) {
      setDrawerError(
        cause instanceof Error
          ? cause.message
          : "Could not record the deposit payment right now."
      );
    } finally {
      setSavingDeposit(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="mg-root">
        <style>{`${managerStyles}\n${leaseStyles}`}</style>

        <div className="mg-shell">
          <header className="mg-header">
            <div>
              <span className="mg-eyebrow">
                <FileText />
                Agreements
              </span>
              <h1 className="mg-title">Leases</h1>
              <p className="mg-subtitle">
                Review each agreement, confirm deposit receipts and keep both the
                manager and tenant copies signed before a lease is treated as fully
                executed.
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
              <p className="mg-stat__label">Deposits required</p>
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
            <div className="ls-toolbar-field">
              <label className="mg-label" htmlFor="ls-search">
                Search leases
              </label>
              <div className="ls-search">
                <Search />
                <input
                  id="ls-search"
                  className="mg-input"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Type a tenant, property or unit number…"
                />
              </div>
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
                      <th scope="col">Deposit</th>
                      <th scope="col">Agreement</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((lease) => {
                      const agreement = agreementState(lease);
                      const required = depositRequired(lease);
                      const paid = depositPaid(lease);

                      return (
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
                                    {formatMoney(lease.balance, currency)} outstanding
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
                            {formatDate(lease.start_date)} → {formatDate(lease.end_date)}
                            <span className="mg-sub">
                              Ends {relativeDays(lease.end_date)}
                            </span>
                          </td>
                          <td data-label="Rent" className="mg-num">
                            {formatMoney(lease.monthly_rent, currency)}
                          </td>
                          <td data-label="Deposit">
                            <div className="ls-deposit-meta">
                              <span className="mg-strong">
                                {formatMoney(required, currency)}
                              </span>
                              <span className="mg-sub">
                                {titleCase(depositStatus(lease))} · Confirmed{" "}
                                {formatMoney(paid, currency)}
                              </span>
                            </div>
                            {hasPendingDepositConfirmation(lease) && (
                              <div className="ls-callout">
                                <div>
                                  <p className="ls-callout__title">
                                    Tenant says they&apos;ve paid
                                  </p>
                                  <p className="ls-callout__text">
                                    Mark it received once the funds arrive.
                                  </p>
                                </div>
                                <div className="ls-inline-actions">
                                  <button
                                    type="button"
                                    className="mg-btn mg-btn--primary mg-btn--sm"
                                    onClick={() => void confirmDepositReceipt(lease)}
                                    disabled={confirmingLeaseId === lease.id}
                                  >
                                    <Wallet />
                                    {confirmingLeaseId === lease.id
                                      ? "Confirming…"
                                      : "Confirm receipt"}
                                  </button>
                                </div>
                              </div>
                            )}
                          </td>
                          <td data-label="Agreement">
                            <div className="ls-agreement-meta">
                              <span className={agreement.badgeClass}>
                                {agreement.label}
                              </span>
                              <span className="mg-sub">{agreement.detail}</span>
                            </div>
                          </td>
                          <td data-label="Status">
                            <div className="ls-inline-actions">
                              <span className={badgeClass(lease.computed)}>
                                {lease.status === "pending"
                                  ? (lease.tenant ? "Reserved / pending" : "Pending assignment")
                                  : lease.computed === "expiring"
                                    ? "Expiring soon"
                                    : titleCase(lease.computed)}
                              </span>
                              <button
                                type="button"
                                className="mg-btn mg-btn--subtle mg-btn--sm"
                                onClick={() => openLease(lease.id)}
                              >
                                <FileSignature />
                                Open panel
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {selectedLease && agreementSummary && (
          <div
            className="mg-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lease-agreement-title"
            onClick={(event) => {
              if (event.target === event.currentTarget) closeLease();
            }}
          >
            <div className="mg-drawer__panel">
              <div className="mg-drawer__head">
                <div>
                  <h2 className="mg-drawer__title" id="lease-agreement-title">
                    {selectedLease.tenant?.name ?? "Lease"} · {selectedLease.unit?.unit_number ?? "—"}
                  </h2>
                  <p className="mg-drawer__sub">
                    {selectedLease.property?.name ?? "No property"} · {formatDate(selectedLease.start_date)} →{" "}
                    {formatDate(selectedLease.end_date)}
                  </p>
                </div>
                <button
                  type="button"
                  className="mg-iconbtn"
                  onClick={closeLease}
                  aria-label="Close lease panel"
                >
                  <X />
                </button>
              </div>

              <div className="mg-drawer__body">
                {drawerError && (
                  <div className="mg-alert" role="alert">
                    <AlertCircle />
                    <span>{drawerError}</span>
                  </div>
                )}

                {drawerNotice && (
                  <div className="mg-alert mg-alert--ok" role="status">
                    <CheckCircle2 />
                    <span>{drawerNotice}</span>
                  </div>
                )}

                <section className="ls-summary-grid" aria-label="Lease agreement summary">
                  <article className="ls-summary-card">
                    <p className="ls-summary-card__label">Execution status</p>
                    <div className="ls-summary-card__stack">
                      <span className={agreementSummary.badgeClass}>{agreementSummary.label}</span>
                      <p className="ls-summary-card__hint">{agreementSummary.detail}</p>
                      <p className="ls-status-line">
                        <strong>Flow:</strong> the manager and tenant each review their own editable copy.
                        The lease is only officially binding once both copies are signed.
                      </p>
                    </div>
                  </article>

                  <article className="ls-summary-card">
                    <p className="ls-summary-card__label">Deposit tracking</p>
                    <div className="ls-summary-card__stack">
                      <p className="ls-summary-card__value">
                        {formatMoney(depositPaid(selectedLease), currency)} / {formatMoney(depositRequired(selectedLease), currency)}
                      </p>
                      <p className="ls-summary-card__hint">
                        {titleCase(depositStatus(selectedLease))}
                        {selectedLease.deposit?.payment_date
                          ? ` · last recorded ${formatDate(selectedLease.deposit.payment_date)}`
                          : ""}
                      </p>
                      {selectedLease.deposit?.tenant_marked_paid_at && (
                        <span className="mg-badge mg-badge--warn">
                          Tenant claimed payment on {formatDate(selectedLease.deposit.tenant_marked_paid_at)}
                        </span>
                      )}
                    </div>
                  </article>
                </section>

                <section className="ls-summary-card">
                  <div className="ls-section-head">
                    <div>
                      <p className="ls-summary-card__label">Official lease details</p>
                      <p className="ls-summary-card__hint">
                        These manager-controlled values become the official lease record.
                      </p>
                    </div>
                  </div>
                  <div className="ls-form-grid">
                    <div className="mg-field">
                      <label className="mg-label" htmlFor="manager-start-date">Official start date</label>
                      <input id="manager-start-date" className="mg-input" type="date" value={managerStartDate} onChange={(e) => setManagerStartDate(e.target.value)} disabled={Boolean(selectedLease.manager_signed_at)} />
                      <p className="mg-hint">Tenant requested {formatDate(selectedLease.requested_move_in_date)}.</p>
                    </div>
                    <div className="mg-field">
                      <label className="mg-label" htmlFor="manager-end-date">Official end date</label>
                      <input id="manager-end-date" className="mg-input" type="date" value={managerEndDate} onChange={(e) => setManagerEndDate(e.target.value)} disabled={Boolean(selectedLease.manager_signed_at)} />
                      <p className="mg-hint">Tenant requested {formatDate(selectedLease.requested_move_out_date)}.</p>
                    </div>
                    <div className="mg-field">
                      <label className="mg-label" htmlFor="manager-rent">Monthly rent</label>
                      <input id="manager-rent" className="mg-input" type="number" min="0" step="0.01" value={managerRentDraft} onChange={(e) => setManagerRentDraft(e.target.value)} disabled={Boolean(selectedLease.manager_signed_at)} />
                    </div>
                    <div className="mg-field">
                      <label className="mg-label" htmlFor="manager-deposit-required">Security deposit required</label>
                      <input id="manager-deposit-required" className="mg-input" type="number" min="0" step="0.01" value={managerDepositRequiredDraft} onChange={(e) => setManagerDepositRequiredDraft(e.target.value)} disabled={Boolean(selectedLease.manager_signed_at)} />
                    </div>
                  </div>
                </section>

                <section className="ls-summary-card">
                  <div className="ls-section-head">
                    <div>
                      <p className="ls-summary-card__label">Deposit payments</p>
                      <p className="ls-summary-card__hint">
                        Record the total amount you have confirmed receiving so far.
                      </p>
                    </div>
                    {hasPendingDepositConfirmation(selectedLease) && (
                      <button
                        type="button"
                        className="mg-btn mg-btn--primary mg-btn--sm"
                        onClick={() => void confirmDepositReceipt(selectedLease)}
                        disabled={confirmingLeaseId === selectedLease.id}
                      >
                        <Wallet />
                        {confirmingLeaseId === selectedLease.id
                          ? "Confirming…"
                          : "Tenant says they've paid — Confirm receipt"}
                      </button>
                    )}
                  </div>

                  <div className="ls-form-grid">
                    <div className="mg-field">
                      <label className="mg-label" htmlFor="lease-deposit-amount">
                        Confirmed paid amount
                      </label>
                      <input
                        id="lease-deposit-amount"
                        className="mg-input"
                        type="number"
                        min="0"
                        max={depositRequired(selectedLease)}
                        step="0.01"
                        value={depositAmountDraft}
                        onChange={(event) => setDepositAmountDraft(event.target.value)}
                      />
                      <p className="mg-hint">
                        Required deposit {formatMoney(depositRequired(selectedLease), currency)}.
                      </p>
                    </div>

                    <div className="mg-field">
                      <label className="mg-label" htmlFor="lease-deposit-date">
                        Payment date
                      </label>
                      <input
                        id="lease-deposit-date"
                        className="mg-input"
                        type="date"
                        value={depositDateDraft}
                        onChange={(event) => setDepositDateDraft(event.target.value)}
                      />
                      <p className="mg-hint">
                        Use the date the manager is recording this payment for.
                      </p>
                    </div>
                  </div>

                  <div className="ls-helper-row">
                    <button
                      type="button"
                      className="mg-btn mg-btn--subtle mg-btn--sm"
                      onClick={() =>
                        setDepositAmountDraft(String(depositRequired(selectedLease)))
                      }
                    >
                      Fill full amount
                    </button>
                    <button
                      type="button"
                      className="mg-btn mg-btn--primary mg-btn--sm"
                      onClick={() => void recordDepositPayment()}
                      disabled={!depositValid || savingDeposit}
                    >
                      <Wallet />
                      {savingDeposit ? "Saving…" : "Record deposit payment"}
                    </button>
                  </div>
                </section>

                <section className="ls-copy-grid">
                  <article className="ls-copy-card">
                    <div className="ls-copy-card__head">
                      <div>
                        <p className="ls-copy-card__eyebrow">Manager&apos;s copy</p>
                        <h3 className="ls-copy-card__title">Editable agreement text</h3>
                      </div>
                      <div className="ls-copy-card__status">
                        <span
                          className={
                            selectedLease.manager_signed_at
                              ? "mg-badge mg-badge--ok"
                              : "mg-badge mg-badge--warn"
                          }
                        >
                          {selectedLease.manager_signed_at
                            ? `Signed by ${selectedLease.manager_signature ?? "manager"}`
                            : "Not yet signed"}
                        </span>
                      </div>
                    </div>

                    <div className="mg-field">
                      <label className="mg-label" htmlFor="lease-manager-terms">
                        Manager&apos;s copy
                      </label>
                      <textarea
                        id="lease-manager-terms"
                        className="mg-textarea"
                        value={managerTermsDraft}
                        onChange={(event) => setManagerTermsDraft(event.target.value)}
                        disabled={Boolean(selectedLease.manager_signed_at)}
                        placeholder="Agreement terms visible to the manager…"
                      />
                      <p className="ls-copy-card__hint">
                        {selectedLease.manager_signed_at
                          ? "The manager signature has locked this lease."
                          : "Editing manager-controlled details before signing may require the tenant to review and sign the new version."}
                      </p>
                    </div>

                    <p className="ls-status-line">
                      <strong>Status:</strong>{" "}
                      {selectedLease.manager_signed_at
                        ? `${selectedLease.manager_signature ?? "Manager"} signed on ${formatDate(selectedLease.manager_signed_at)}.`
                        : "Awaiting manager signature."}
                    </p>

                    <div className="ls-sign-row">
                      <div className="mg-field">
                        <label className="mg-label" htmlFor="lease-manager-signature">
                          Sign as manager (initials)
                        </label>
                        <input
                          id="lease-manager-signature"
                          className="mg-input"
                          maxLength={20}
                          value={managerInitials}
                          onChange={(event) => setManagerInitials(event.target.value.toUpperCase())}
                          placeholder="e.g. JM"
                        />
                      </div>
                      <button
                        type="button"
                        className="mg-btn mg-btn--primary"
                        onClick={() => void signManagerCopy()}
                        disabled={managerInitials.trim().length === 0 || signingManager || !selectedLease.tenant_signed_at || Boolean(selectedLease.manager_signed_at)}
                      >
                        <FileSignature />
                        {signingManager ? "Signing…" : "Confirm signature"}
                      </button>
                    </div>
                  </article>

                  <article className="ls-copy-card">
                    <div className="ls-copy-card__head">
                      <div>
                        <p className="ls-copy-card__eyebrow">Tenant&apos;s copy</p>
                        <h3 className="ls-copy-card__title">Editable agreement text</h3>
                      </div>
                      <div className="ls-copy-card__status">
                        <span
                          className={
                            selectedLease.tenant_signed_at
                              ? "mg-badge mg-badge--ok"
                              : "mg-badge mg-badge--warn"
                          }
                        >
                          {selectedLease.tenant_signed_at
                            ? `Signed by ${selectedLease.tenant_signature ?? "tenant"}`
                            : "Not yet signed"}
                        </span>
                      </div>
                    </div>

                    <div className="mg-field">
                      <label className="mg-label" htmlFor="lease-tenant-terms">
                        Tenant&apos;s copy
                      </label>
                      <textarea
                        id="lease-tenant-terms"
                        className="mg-textarea"
                        value={tenantTermsDraft}
                        readOnly
                        placeholder="Agreement terms visible to the tenant…"
                      />
                      <p className="ls-copy-card__hint">
                        This is the tenant side of the canonical agreement. The tenant owns these terms and signs them; manager edits to authoritative lease details trigger a fresh tenant review.
                      </p>
                    </div>

                    <p className="ls-status-line">
                      <strong>Status:</strong>{" "}
                      {selectedLease.tenant_signed_at
                        ? `${selectedLease.tenant_signature ?? "Tenant"} signed on ${formatDate(selectedLease.tenant_signed_at)}.`
                        : "Awaiting tenant signature."}
                    </p>
                  </article>
                </section>
              </div>

              <div className="mg-drawer__foot">
                <button type="button" className="mg-btn mg-btn--subtle" onClick={closeLease}>
                  Close
                </button>
                <button
                  type="button"
                  className="mg-btn mg-btn--primary"
                  onClick={() => void saveAgreementTerms()}
                  disabled={savingTerms || Boolean(selectedLease.manager_signed_at) || (!managerTermsChanged && managerStartDate === (selectedLease.start_date?.slice(0, 10) ?? "") && managerEndDate === (selectedLease.end_date?.slice(0, 10) ?? "") && Number(managerRentDraft) === selectedLease.monthly_rent && Number(managerDepositRequiredDraft) === depositRequired(selectedLease))}
                >
                  {savingTerms ? "Saving…" : "Save agreement text"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default ManagerLeasesPage;
