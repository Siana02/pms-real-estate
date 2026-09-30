import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import TenantDashboardLayout from "../../layouts/TenantDashboardLayout";
import { apiRequest } from "../../services/api";
import {
  BadgeCheck,
  CheckCircle2,
  Clock,
  FileSignature,
  FileText,
  Loader2,
  ShieldCheck,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  STYLES — vanilla CSS                                               */
/* ------------------------------------------------------------------ */

const styles = `
.tl-stack {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.tl-summary {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border-radius: var(--tp-r-lg);
  border: 1px solid #c7dbff;
  background: linear-gradient(180deg, #f5f9ff, var(--tp-surface) 65%);
}

.tl-summary__row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.tl-summary__row dt { margin: 0; }
.tl-summary__row dd { margin: 0.25rem 0 0; font-weight: 700; }

.tl-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 600;
  width: fit-content;
}

.tl-badge--done { background: #dcfce7; color: #166534; }
.tl-badge--pending { background: #fef3c7; color: #92400e; }

.tl-badge svg { width: 0.9375rem; height: 0.9375rem; }

.tl-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 900px) {
  .tl-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

.tl-copy {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  height: 100%;
}

.tl-copy__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tl-copy__head h3 {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 700;
}

.tl-copy textarea {
  flex: 1;
  min-height: 14rem;
  resize: vertical;
  border-radius: var(--tp-r-md);
  border: 1px solid var(--tp-line);
  padding: 0.75rem;
  font: inherit;
  font-size: 0.875rem;
  line-height: 1.55;
  color: var(--tp-ink);
  background: var(--tp-surface);
}

.tl-copy textarea:disabled {
  background: var(--tp-surface-sunken);
  color: var(--tp-muted);
}

.tl-hint {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--tp-muted);
  line-height: 1.5;
}

.tl-sign-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.625rem;
}

.tl-sign-row input {
  width: 6rem;
  border-radius: var(--tp-r-sm);
  border: 1px solid var(--tp-line);
  padding: 0.5rem 0.625rem;
  font: inherit;
  text-transform: uppercase;
}

.tl-deposit {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-radius: var(--tp-r-md);
  border: 1px solid var(--tp-line);
  background: var(--tp-surface-sunken);
}

.tl-skeleton { height: 20rem; }

.tl-spin { animation: tl-rotate 0.9s linear infinite; }

@keyframes tl-rotate { to { transform: rotate(360deg); } }
`;

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */

interface DepositInfo {
  amount_required: number | string | null;
  amount_paid: number | string | null;
  status: string | null;
  tenant_marked_paid_at: string | null;
}

interface Agreement {
  lease_id: number;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  requested_move_in_date: string | null;
  requested_move_out_date: string | null;
  rent_due_day: number;
  agreement_status: string;
  organization: { id: number; name: string } | null;
  property: { id: number; name: string; address: string | null; city: string | null } | null;
  unit: { id: number; unit_number: string; unit_type: string | null; default_rent: number | string | null } | null;
  monthly_rent: number | string | null;
  deposit_amount: number | string | null;
  manager_terms: string | null;
  tenant_terms: string | null;
  manager_signature: string | null;
  manager_signed_at: string | null;
  tenant_signature: string | null;
  tenant_signed_at: string | null;
  agreement_finalized: boolean;
  deposit: DepositInfo | null;
}

/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */

function asAgreement(payload: unknown): Agreement | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const source =
    record.data && typeof record.data === "object"
      ? (record.data as Record<string, unknown>)
      : record;

  if (!source || Object.keys(source).length === 0) return null;
  return source as unknown as Agreement;
}

function longDateTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function longDate(value: string | null): string {
  if (!value) return "Open-ended";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */

function TenantLeasePage() {
  const [loading, setLoading] = useState(true);
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [error, setError] = useState("");

  const [tenantTerms, setTenantTerms] = useState("");
  const [requestedStart, setRequestedStart] = useState("");
  const [requestedEnd, setRequestedEnd] = useState("");
  const [savingTerms, setSavingTerms] = useState(false);
  const [termsMessage, setTermsMessage] = useState("");

  const [initials, setInitials] = useState("");
  const [signing, setSigning] = useState(false);

  const [markingPaid, setMarkingPaid] = useState(false);
  const [depositMessage, setDepositMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await apiRequest("/tenant/lease-agreement");
      const parsed = asAgreement(response);
      setAgreement(parsed);
      setTenantTerms(parsed?.tenant_terms ?? "");
      setRequestedStart(parsed?.requested_move_in_date ?? "");
      setRequestedEnd(parsed?.requested_move_out_date ?? "");
      setError("");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "We couldn't load your lease agreement."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const tenantSigned = Boolean(agreement?.tenant_signed_at);
  const managerSigned = Boolean(agreement?.manager_signed_at);
  const leaseLocked = managerSigned;
  const awaitingManager = Boolean(agreement?.tenant_signed_at && !managerSigned);

  const termsChanged = useMemo(
    () =>
      (agreement?.tenant_terms ?? "") !== tenantTerms ||
      (agreement?.requested_move_in_date ?? "") !== requestedStart ||
      (agreement?.requested_move_out_date ?? "") !== requestedEnd,
    [agreement?.tenant_terms, agreement?.requested_move_in_date, agreement?.requested_move_out_date, tenantTerms, requestedStart, requestedEnd]
  );

  async function handleSaveTerms(e: FormEvent) {
    e.preventDefault();
    if (!agreement) return;
    setSavingTerms(true);
    setTermsMessage("");
    try {
      const response = await apiRequest("/tenant/lease-agreement", {
        method: "PATCH",
        body: JSON.stringify({
        tenant_terms: tenantTerms,
        requested_move_in_date: requestedStart || null,
        requested_move_out_date: requestedEnd || null,
      }),
      });
      const parsed = asAgreement(response);
      if (parsed) {
        setAgreement(parsed);
        setTenantTerms(parsed.tenant_terms ?? "");
        setRequestedStart(parsed.requested_move_in_date ?? "");
        setRequestedEnd(parsed.requested_move_out_date ?? "");
      }
      setTermsMessage("Your copy has been saved.");
    } catch (caught) {
      setTermsMessage(
        caught instanceof Error ? caught.message : "Couldn't save your changes."
      );
    } finally {
      setSavingTerms(false);
    }
  }

  async function handleSign(e: FormEvent) {
    e.preventDefault();
    if (!initials.trim() || !agreement || leaseLocked || tenantSigned) return;
    setSigning(true);
    setTermsMessage("");
    try {
      const response = await apiRequest("/tenant/lease-agreement", {
        method: "PATCH",
        body: JSON.stringify({ tenant_signature: initials.trim() }),
      });
      const parsed = asAgreement(response);
      if (parsed) {
        setAgreement(parsed);
        setTenantTerms(parsed.tenant_terms ?? "");
        setRequestedStart(parsed.requested_move_in_date ?? "");
        setRequestedEnd(parsed.requested_move_out_date ?? "");
      }
      setInitials("");
      setTermsMessage("Signed — your copy of the agreement is now locked in.");
    } catch (caught) {
      setTermsMessage(
        caught instanceof Error ? caught.message : "Couldn't record your signature."
      );
    } finally {
      setSigning(false);
    }
  }

  async function handleMarkDepositPaid() {
    setMarkingPaid(true);
    setDepositMessage("");
    try {
      const response = await apiRequest("/tenant/deposit/mark-paid", {
        method: "POST",
      });
      const parsed = asAgreement(response);
      if (parsed) setAgreement(parsed);
      setDepositMessage(
        "Thanks — we've let your property manager know to confirm receipt."
      );
    } catch (caught) {
      setDepositMessage(
        caught instanceof Error ? caught.message : "Couldn't record this."
      );
    } finally {
      setMarkingPaid(false);
    }
  }

  const deposit = agreement?.deposit;
  const depositConfirmed = deposit?.status === "paid";
  const depositRequired = Number(deposit?.amount_required ?? 0) > 0;
  const depositTenantMarked = Boolean(deposit?.tenant_marked_paid_at);

  return (
    <TenantDashboardLayout
      title="Lease agreement"
      subtitle="Review, edit your copy and sign your digital lease."
    >
      <style>{styles}</style>

      <div className="tl-stack">
        {error && (
          <p className="tp-card" role="status">
            {error}
          </p>
        )}

        {loading ? (
          <span className="tp-skeleton tl-skeleton" />
        ) : !agreement ? (
          <div className="tp-card tp-empty">
            <span className="tp-empty__icon">
              <FileText />
            </span>
            <h3 className="tp-empty__title">No lease agreement yet</h3>
            <p className="tp-empty__text">
              Once your property manager assigns you to a unit, a digital
              lease agreement is generated automatically and will appear
              here for you to review and sign.
            </p>
          </div>
        ) : (
          <>
            <section className="tp-card tl-summary" aria-label="Lease summary">
              <div
                className={`tl-badge ${
                  leaseLocked ? "tl-badge--done" : "tl-badge--pending"
                }`}
              >
                {leaseLocked ? <ShieldCheck /> : <Clock />}
                {leaseLocked
                  ? "Lease locked — final manager signature recorded"
                  : awaitingManager
                    ? "Your side is signed — awaiting manager review and signature"
                    : agreement.status === "pending"
                      ? "Pending manager confirmation"
                      : "Ready for your review and signature"}
              </div>

              <dl className="tl-summary__row">
                <div>
                  <dt className="tp-label">Organization</dt>
                  <dd>{agreement.organization?.name ?? "—"}</dd>
                </div>
                <div>
                  <dt className="tp-label">Property / unit</dt>
                  <dd>
                    {agreement.property?.name ?? "—"} · {agreement.unit?.unit_number ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="tp-label">Official lease start</dt>
                  <dd>{agreement.start_date ? longDate(agreement.start_date) : "Not confirmed"}</dd>
                </div>
                <div>
                  <dt className="tp-label">Official lease end</dt>
                  <dd>{longDate(agreement.end_date)}</dd>
                </div>
                <div>
                  <dt className="tp-label">Requested start</dt>
                  <dd>{longDate(agreement.requested_move_in_date)}</dd>
                </div>
                <div>
                  <dt className="tp-label">Requested end</dt>
                  <dd>{longDate(agreement.requested_move_out_date)}</dd>
                </div>
                <div>
                  <dt className="tp-label">Monthly rent</dt>
                  <dd>KSh {Number(agreement.monthly_rent ?? 0).toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="tp-label">Rent due</dt>
                  <dd>{agreement.rent_due_day}th of each month</dd>
                </div>
              </dl>

              <p className="tl-hint">
                Property, unit, rent, official dates and deposit terms come from
                the organization's lease record. You can provide your requested
                dates and your side of the agreement before signing. Once the
                manager signs the final version, this lease is locked.
              </p>
            </section>

            {deposit && (
              <section
                className="tp-card tl-deposit"
                aria-label="Deposit status"
              >
                <div>
                  <p className="tp-label" style={{ margin: 0 }}>
                    Security deposit
                  </p>
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem" }}>
                    {!depositRequired
                      ? "No security deposit is required for this lease."
                      : `Required: KSh ${Number(deposit?.amount_required ?? agreement.deposit_amount ?? 0).toLocaleString()} · Received: KSh ${Number(deposit?.amount_paid ?? 0).toLocaleString()}`}
                  </p>
                  {depositRequired && (
                    <p className="tl-hint">
                      {depositConfirmed
                        ? "Confirmed as received by your property manager."
                        : depositTenantMarked
                          ? "You've marked this as paid — waiting for your manager to confirm."
                          : "Not yet confirmed as paid."}
                    </p>
                  )}
                  {depositMessage && (
                    <p className="tl-hint" role="status">
                      {depositMessage}
                    </p>
                  )}
                </div>
                {depositRequired && !depositConfirmed && !depositTenantMarked && (
                  <button
                    type="button"
                    className="tp-btn tp-btn--primary"
                    disabled={markingPaid}
                    onClick={handleMarkDepositPaid}
                  >
                    {markingPaid ? <Loader2 className="tl-spin" /> : <CheckCircle2 />}
                    I've paid my deposit
                  </button>
                )}
                {depositConfirmed && (
                  <span className="tl-badge tl-badge--done">
                    <BadgeCheck /> Confirmed
                  </span>
                )}
              </section>
            )}

            <div className="tl-grid">
              <article className="tp-card tl-copy">
                <div className="tl-copy__head">
                  <h3>Manager's copy</h3>
                  <span
                    className={`tl-badge ${
                      managerSigned ? "tl-badge--done" : "tl-badge--pending"
                    }`}
                  >
                    {managerSigned ? <CheckCircle2 /> : <Clock />}
                    {managerSigned
                      ? `Signed ${agreement.manager_signature} · ${longDateTime(
                          agreement.manager_signed_at
                        )}`
                      : "Not yet signed"}
                  </span>
                </div>
                <textarea
                  value={agreement.manager_terms ?? ""}
                  disabled
                  readOnly
                  aria-label="Manager's copy of the lease agreement (read-only)"
                />
                <p className="tl-hint">
                  This is your property manager's copy — for reference only,
                  you can't edit it here.
                </p>
              </article>

              <article className="tp-card tl-copy">
                <form onSubmit={handleSaveTerms} className="tl-copy">
                  <div className="tl-copy__head">
                    <h3>Your copy</h3>
                    <span
                      className={`tl-badge ${
                        tenantSigned ? "tl-badge--done" : "tl-badge--pending"
                      }`}
                    >
                      {tenantSigned ? <CheckCircle2 /> : <Clock />}
                      {tenantSigned
                        ? `Signed ${agreement.tenant_signature} · ${longDateTime(
                            agreement.tenant_signed_at
                          )}`
                        : "Not yet signed"}
                    </span>
                  </div>
                  <div className="tl-sign-row">
                    <label className="tp-label" htmlFor="requested-start">
                      Requested lease start
                    </label>
                    <input
                      id="requested-start"
                      type="date"
                      value={requestedStart}
                      onChange={(e) => setRequestedStart(e.target.value)}
                      disabled={tenantSigned || leaseLocked}
                    />
                    <label className="tp-label" htmlFor="requested-end">
                      Requested lease end
                    </label>
                    <input
                      id="requested-end"
                      type="date"
                      value={requestedEnd}
                      onChange={(e) => setRequestedEnd(e.target.value)}
                      disabled={tenantSigned || leaseLocked}
                    />
                  </div>
                  <textarea
                    value={tenantTerms}
                    onChange={(e) => setTenantTerms(e.target.value)}
                    disabled={tenantSigned || leaseLocked}
                    aria-label="Your copy of the lease agreement"
                  />
                  <p className="tl-hint">
                    {tenantSigned
                      ? "You have signed this version. It is now with the manager for final review."
                      : "Set your requested dates and review your side of the agreement before signing."}
                  </p>
                  <div className="tl-sign-row">
                    <button
                      type="submit"
                      className="tp-btn tp-btn--quiet"
                      disabled={savingTerms || !termsChanged || tenantSigned || leaseLocked}
                    >
                      {savingTerms ? <Loader2 className="tl-spin" /> : null}
                      Save changes
                    </button>
                  </div>
                </form>

                <form onSubmit={handleSign} className="tl-sign-row">
                  <label htmlFor="tenant-initials" className="tp-label">
                    Sign (initials)
                  </label>
                  <input
                    id="tenant-initials"
                    value={initials}
                    onChange={(e) => setInitials(e.target.value)}
                    maxLength={6}
                    placeholder="e.g. JM"
                  />
                  <button
                    type="submit"
                    className="tp-btn tp-btn--primary"
                    disabled={signing || !initials.trim() || tenantSigned || leaseLocked}
                  >
                    {signing ? <Loader2 className="tl-spin" /> : <FileSignature />}
                    Sign
                  </button>
                </form>

                {termsMessage && (
                  <p className="tl-hint" role="status">
                    {termsMessage}
                  </p>
                )}
              </article>
            </div>
          </>
        )}
      </div>
    </TenantDashboardLayout>
  );
}

export default TenantLeasePage;
