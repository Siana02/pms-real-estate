import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import TenantDashboardLayout from "../../layouts/TenantDashboardLayout";
import { apiRequest, downloadFile } from "../../services/api";
import {
  BadgeCheck,
  CheckCircle2,
  Clock,
  FileSignature,
  FileText,
  Loader2,
  ShieldCheck,
  Info,
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

.tl-summary__head {
  display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; padding-bottom:1rem; border-bottom:1px solid var(--tp-line-soft);
}
.tl-summary__title { margin:0; font-size:1.25rem; font-weight:750; letter-spacing:-0.025em; color:var(--tp-ink); }
.tl-summary__subtitle { margin:0.3rem 0 0; font-size:0.8125rem; color:var(--tp-muted); }
.tl-date-card { padding:1rem; border:1px solid var(--tp-line); border-radius:var(--tp-r-md); background:var(--tp-surface-sunken); }
.tl-date-card__head { margin-bottom:0.75rem; }
.tl-date-card__title { margin:0; font-size:0.9rem; font-weight:700; }
.tl-date-card__hint { margin:0.25rem 0 0; font-size:0.75rem; color:var(--tp-muted); line-height:1.45; }
.tl-date-fields { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:0.75rem; }
.tl-date-fields > div { display:flex; flex-direction:column; gap:0.35rem; }
.tl-date-fields input { min-width:0; border-radius:var(--tp-r-sm); border:1px solid var(--tp-line); padding:0.6rem 0.7rem; font:inherit; color:var(--tp-ink); background:var(--tp-surface); }
@media (max-width:620px) { .tl-date-fields { grid-template-columns:1fr; } }

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
.tl-signed-mark {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.9rem 1rem;
  border: 1px solid #bbdec9;
  border-radius: var(--tp-r-md);
  background: #f2fbf5;
}
.tl-signed-mark__initials {
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--tp-ink);
}
.tl-signed-mark__stamp {
  width: fit-content;
  padding: 0.2rem 0.45rem;
  border: 1px solid #17834b;
  border-radius: 0.35rem;
  color: #17834b;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}
.tl-download {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border: 1px solid #bbdec9;
  border-radius: var(--tp-r-md);
  background: #f2fbf5;
}
.tl-end-date {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid var(--tp-line);
  border-radius: var(--tp-r-md);
  background: var(--tp-surface-sunken);
}
.tl-end-date > div {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.tl-end-date input {
  min-width: 12rem;
  border-radius: var(--tp-r-sm);
  border: 1px solid var(--tp-line);
  padding: 0.6rem 0.7rem;
  font: inherit;
  color: var(--tp-ink);
  background: var(--tp-surface);
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

/* Executive lease overview */
.tl-summary{gap:0!important;padding:1.5rem 1.6rem!important}
.tl-summary__head{display:flex!important;align-items:flex-start!important;justify-content:space-between!important;gap:1.5rem!important;padding-bottom:1.2rem!important;border-bottom:1px solid var(--tp-line-soft)!important}
.tl-summary__heading{min-width:0!important}
.tl-summary__title{color:#0F172A!important;font-size:1.3rem!important;font-weight:750!important}
.tl-summary__subtitle{color:#64748B!important}
.tl-summary__badges{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:.5rem!important;flex-wrap:wrap!important}
.tl-summary__badges .tl-badge{white-space:nowrap!important}
.tl-badge--document{background:#EFF6FF!important;color:#1E40AF!important}
.tl-summary__map{display:flex!important;flex-direction:column!important}
.tl-summary__parties{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:2rem!important;padding:1.35rem 0!important;border-bottom:1px solid #E7EEF4}
.tl-summary__parties>div,.tl-summary__timeline>div,.tl-summary__financials>div{min-width:0!important}
.tl-summary__parties dd,.tl-summary__timeline dd{margin:.35rem 0 0!important;color:#0F172A!important;font-size:.9rem!important;font-weight:700!important}
.tl-summary__timeline{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:1.25rem!important;padding:1.35rem 0!important;border-bottom:1px solid #E7EEF4}
.tl-summary__timeline dd{white-space:nowrap!important}
.tl-summary__financials{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:2rem!important;padding:1.35rem 0!important}
.tl-summary__financials>div+div{padding-left:2rem!important;border-left:1px solid #E7EEF4}
.tl-summary__financials strong{display:block!important;margin-top:.35rem!important;color:#0F172A!important;font-size:1.15rem!important;font-weight:750!important}
.tl-summary__info{display:flex!important;align-items:flex-start!important;gap:.65rem!important;margin-top:.25rem!important;padding:.9rem 1rem!important;border-radius:.8rem!important;background:#EFF6FF!important;color:#64748B!important}
.tl-summary__info svg{flex:none!important;width:1rem!important;height:1rem!important;margin-top:.12rem!important;color:#2563EB!important}
.tl-summary__info p{margin:0!important;font-size:.74rem!important;line-height:1.55!important}
@media(max-width:900px){
  .tl-summary__timeline{grid-template-columns:repeat(2,minmax(0,1fr))!important}
}
@media(max-width:620px){
  .tl-summary__head{flex-direction:column!important}
  .tl-summary__badges{justify-content:flex-start!important}
  .tl-summary__parties,.tl-summary__financials{grid-template-columns:1fr!important}
  .tl-summary__financials>div+div{padding-left:0!important;border-left:0!important;padding-top:1rem!important;border-top:1px solid #E7EEF4}
  .tl-summary__timeline{grid-template-columns:1fr!important}
  .tl-summary__timeline dd{white-space:normal!important}
}
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
  const firstData =
    record.data && typeof record.data === "object"
      ? (record.data as Record<string, unknown>)
      : record;
  const source =
    firstData.data && typeof firstData.data === "object"
      ? (firstData.data as Record<string, unknown>)
      : firstData;

  if (!source || Object.keys(source).length === 0) return null;

  const objectOrNull = (value: unknown) =>
    value && typeof value === "object" ? value as Record<string, unknown> : null;

  const organization = objectOrNull(source.organization);
  const property = objectOrNull(source.property);
  const unit = objectOrNull(source.unit);
  const tenant = objectOrNull(source.tenant);
  const deposit = objectOrNull(source.deposit);

  // Normalize the exact fields rendered by this page. Laravel numeric fields
  // may arrive as strings, while some older API responses may omit a field.
  // Keep nulls as null rather than turning missing values into misleading
  // zeroes; the UI can then distinguish missing data from a real KSh 0 value.
  return {
    ...source,
    organization: organization
      ? { id: Number(organization.id), name: String(organization.name ?? "") }
      : null,
    property: property
      ? {
          id: Number(property.id),
          name: String(property.name ?? ""),
          address: property.address == null ? null : String(property.address),
          city: property.city == null ? null : String(property.city),
        }
      : null,
    unit: unit
      ? {
          id: Number(unit.id),
          unit_number: String(unit.unit_number ?? ""),
          unit_type: unit.unit_type == null ? null : String(unit.unit_type),
          default_rent: unit.default_rent == null ? null : unit.default_rent as number | string,
        }
      : null,
    monthly_rent: source.monthly_rent == null ? null : source.monthly_rent as number | string,
    deposit_amount: source.deposit_amount == null ? null : source.deposit_amount as number | string,
    deposit: deposit
      ? {
          amount_required: deposit.amount_required == null ? null : deposit.amount_required as number | string,
          amount_paid: deposit.amount_paid == null ? null : deposit.amount_paid as number | string,
          status: deposit.status == null ? null : String(deposit.status),
          tenant_marked_paid_at: deposit.tenant_marked_paid_at == null ? null : String(deposit.tenant_marked_paid_at),
        }
      : null,
    tenant: tenant
      ? {
          id: Number(tenant.id),
          name: String(tenant.name ?? ""),
          email: tenant.email == null ? null : String(tenant.email),
          phone: tenant.phone == null ? null : String(tenant.phone),
          national_id: tenant.national_id == null ? null : String(tenant.national_id),
          employer_name: tenant.employer_name == null ? null : String(tenant.employer_name),
          employer_phone: tenant.employer_phone == null ? null : String(tenant.employer_phone),
          next_of_kin_name: tenant.next_of_kin_name == null ? null : String(tenant.next_of_kin_name),
          next_of_kin_phone: tenant.next_of_kin_phone == null ? null : String(tenant.next_of_kin_phone),
        }
      : null,
  } as unknown as Agreement;
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
  const [savingEndDate, setSavingEndDate] = useState(false);
  const [endDateMessage, setEndDateMessage] = useState("");
  const [downloading, setDownloading] = useState(false);

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
  const downloadReady = managerSigned && tenantSigned && (!depositRequired || depositConfirmed);

  useEffect(() => {
    if (!tenantSigned || downloadReady) return;
    const interval = window.setInterval(() => {
      void load();
    }, 10000);
    return () => window.clearInterval(interval);
  }, [tenantSigned, downloadReady, load]);

  async function handleSaveEndDate() {
    if (!agreement || !managerSigned) return;
    setSavingEndDate(true);
    setEndDateMessage("");
    try {
      const response = await apiRequest("/tenant/lease-agreement/end-date", {
        method: "PATCH",
        body: JSON.stringify({ end_date: requestedEnd || null }),
      });
      const parsed = asAgreement(response);
      if (parsed) {
        setAgreement(parsed);
        setRequestedEnd(parsed.end_date ?? "");
      }
      setEndDateMessage("Lease end date updated.");
    } catch (caught) {
      setEndDateMessage(
        caught instanceof Error ? caught.message : "Couldn't update the lease end date."
      );
    } finally {
      setSavingEndDate(false);
    }
  }

  async function handleDownload() {
    if (!downloadReady) return;
    setDownloading(true);
    setEndDateMessage("");
    try {
      await downloadFile(
        "/tenant/lease-agreement/download",
        "signed-lease-agreement.html"
      );
    } catch (caught) {
      setEndDateMessage(
        caught instanceof Error ? caught.message : "Couldn't download the signed lease."
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <TenantDashboardLayout
      title="Lease agreement"
      subtitle="Review, edit your copy and sign your digital lease."
      pageClassName="tl-page"
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
              <div className="tl-summary__head">
                <div className="tl-summary__heading">
                  <h2 className="tl-summary__title">Lease agreement</h2>
                  <p className="tl-summary__subtitle">{agreement.property?.name ?? "Property"} · Unit {agreement.unit?.unit_number ?? "—"}</p>
                </div>
                <div className="tl-summary__badges">
                  <span className="tl-badge tl-badge--document"><FileSignature />Digital lease</span>
                  <span className={`tl-badge ${leaseLocked ? "tl-badge--done" : "tl-badge--pending"}`}>
                    {leaseLocked ? <ShieldCheck /> : <Clock />}
                    {leaseLocked ? "Lease locked" : "Lease pending"}
                  </span>
                </div>
              </div>

              <div className="tl-summary__map">
                <div className="tl-summary__parties">
                  <div><dt className="tp-label">Organization</dt><dd>{agreement.organization?.name ?? "—"}</dd></div>
                  <div><dt className="tp-label">Property / unit</dt><dd>{agreement.property?.name ?? "—"} · {agreement.unit?.unit_number ?? "—"}</dd></div>
                </div>
                <div className="tl-summary__timeline">
                  <div><dt className="tp-label">Official start</dt><dd>{agreement.start_date ? longDate(agreement.start_date) : "Not confirmed"}</dd></div>
                  <div><dt className="tp-label">Requested start</dt><dd>{longDate(agreement.requested_move_in_date)}</dd></div>
                  <div><dt className="tp-label">Official end</dt><dd>{longDate(agreement.end_date)}</dd></div>
                  <div><dt className="tp-label">Requested end</dt><dd>{longDate(agreement.requested_move_out_date)}</dd></div>
                </div>
                <div className="tl-summary__financials">
                  <div><span className="tp-label">Monthly rent</span><strong>KSh {Number(agreement.monthly_rent ?? 0).toLocaleString()}</strong></div>
                  <div><span className="tp-label">Rent due</span><strong>{agreement.rent_due_day}th of each month</strong></div>
                </div>
              </div>

              <div className="tl-summary__info">
                <Info />
                <p>Property, unit, rent, official dates and deposit terms come from the organization's lease record. You can provide your requested dates and your side of the agreement before signing. Once you sign, your agreement copy becomes read-only. After the manager signs, only the lease end date remains editable.</p>
              </div>
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

            {tenantSigned && !managerSigned && (
              <section className="tl-download" aria-label="Manager confirmation status">
                <div>
                  <strong>Your signature is locked.</strong>
                  <p className="tl-hint">Keep checking — the property manager still needs to review and sign the final agreement.</p>
                </div>
              </section>
            )}

            {managerSigned && !downloadReady && (
              <section className="tl-download" aria-label="Final lease status">
                <div>
                  <strong>Manager signature recorded.</strong>
                  <p className="tl-hint">Your signed agreement is locked. The download will appear once the deposit is confirmed.</p>
                </div>
              </section>
            )}

            {downloadReady && (
              <section className="tl-download" aria-label="Completed signed lease">
                <div>
                  <strong>Signed lease complete</strong>
                  <p className="tl-hint">Both parties have signed and the deposit has been confirmed. Keep an offline copy of the completed agreement.</p>
                </div>
                <button type="button" className="tp-btn tp-btn--primary" disabled={downloading} onClick={handleDownload}>
                  {downloading ? <Loader2 className="tl-spin" /> : <FileText />}
                  Download signed copy
                </button>
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
                {managerSigned && (
                  <div className="tl-signed-mark" aria-label="Manager signature">
                    <span className="tl-signed-mark__initials">{agreement.manager_signature}</span>
                    <span className="tl-signed-mark__stamp">SIGNED</span>
                    <span className="tl-hint">{longDateTime(agreement.manager_signed_at)}</span>
                  </div>
                )}
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
                  {!tenantSigned && (
                    <div className="tl-date-card">
                      <div className="tl-date-card__head"><p className="tl-date-card__title">Your requested lease dates</p><p className="tl-date-card__hint">You choose the dates you are requesting. The manager confirms the official lease dates before the final signature.</p></div>
                      <div className="tl-date-fields">
                        <div><label className="tp-label" htmlFor="requested-start">Move-in / lease start</label><input id="requested-start" type="date" value={requestedStart} onChange={(e) => setRequestedStart(e.target.value)} disabled={leaseLocked} /></div>
                        <div><label className="tp-label" htmlFor="requested-end">Move-out / lease end</label><input id="requested-end" type="date" value={requestedEnd} onChange={(e) => setRequestedEnd(e.target.value)} disabled={leaseLocked} /></div>
                      </div>
                    </div>
                  )}
                  {leaseLocked && (
                    <div className="tl-end-date">
                      <div>
                        <label className="tp-label" htmlFor="final-lease-end">Lease end date</label>
                        <input
                          id="final-lease-end"
                          type="date"
                          value={agreement.end_date ?? ""}
                          onChange={(e) => setRequestedEnd(e.target.value)}
                        />
                      </div>
                      <button type="button" className="tp-btn tp-btn--quiet" disabled={savingEndDate} onClick={handleSaveEndDate}>
                        {savingEndDate ? <Loader2 className="tl-spin" /> : null}
                        Save end date
                      </button>
                    </div>
                  )}
                  <textarea
                    value={tenantTerms}
                    onChange={(e) => setTenantTerms(e.target.value)}
                    disabled={tenantSigned || leaseLocked}
                    aria-label="Your copy of the lease agreement"
                  />
                  {tenantSigned && (
                    <div className="tl-signed-mark" aria-label="Tenant signature">
                      <span className="tl-signed-mark__initials">{agreement.tenant_signature}</span>
                      <span className="tl-signed-mark__stamp">SIGNED</span>
                      <span className="tl-hint">{longDateTime(agreement.tenant_signed_at)}</span>
                    </div>
                  )}
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

                {!tenantSigned && (
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
                      disabled={signing || !initials.trim()}
                    >
                      {signing ? <Loader2 className="tl-spin" /> : <FileSignature />}
                      Sign
                    </button>
                  </form>
                )}

                {termsMessage && (
                  <p className="tl-hint" role="status">
                    {termsMessage}
                  </p>
                )}
                {endDateMessage && (
                  <p className="tl-hint" role="status">
                    {endDateMessage}
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
