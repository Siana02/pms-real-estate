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
.tl-hero { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; flex-wrap:wrap; }
.tl-hero__eyebrow { margin:0 0 .35rem; font-size:.7rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:var(--tp-muted); }
.tl-hero__title { margin:0; font-size:clamp(1.35rem,3vw,1.8rem); letter-spacing:-.03em; color:var(--tp-ink); }
.tl-hero__meta { margin:.35rem 0 0; color:var(--tp-muted); font-size:.875rem; }
.tl-detail-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.75rem; }
.tl-detail { padding:.85rem; border-radius:var(--tp-r-md); background:var(--tp-surface-sunken); border:1px solid var(--tp-line); }
.tl-detail__label { margin:0; font-size:.68rem; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:var(--tp-muted); }
.tl-detail__value { margin:.3rem 0 0; font-size:.9rem; font-weight:700; color:var(--tp-ink); overflow-wrap:anywhere; }
.tl-prefill { padding:1rem; border:1px solid #d8e5fb; border-radius:var(--tp-r-md); background:linear-gradient(180deg,#f8fbff,var(--tp-surface)); }
.tl-prefill__title { margin:0; font-size:.95rem; font-weight:750; }
.tl-prefill__text { margin:.3rem 0 .9rem; color:var(--tp-muted); font-size:.78rem; line-height:1.5; }
.tl-form-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.75rem; }
.tl-field { display:flex; flex-direction:column; gap:.35rem; }
.tl-field input { width:100%; box-sizing:border-box; border-radius:var(--tp-r-sm); border:1px solid var(--tp-line); padding:.65rem .7rem; font:inherit; color:var(--tp-ink); background:var(--tp-surface); }
.tl-contract { white-space:pre-wrap; min-height:18rem; padding:1rem; border:1px solid var(--tp-line); border-radius:var(--tp-r-md); background:var(--tp-surface-sunken); color:var(--tp-ink); font-size:.875rem; line-height:1.65; overflow:auto; }
.tl-download-row { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:.75rem; }
@media (max-width:620px) { .tl-detail-grid,.tl-form-grid { grid-template-columns:1fr; } }
@media (max-width:620px) { .tl-detail-grid { grid-template-columns:1fr; } }

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
  contract_text: string | null;
  manager_signature: string | null;
  manager_signed_at: string | null;
  tenant_signature: string | null;
  tenant_signed_at: string | null;
  agreement_finalized: boolean;
  deposit: DepositInfo | null;
  tenant: { id:number; name:string; email:string|null; phone:string|null; national_id:string|null; employer_name:string|null; employer_phone:string|null; next_of_kin_name:string|null; next_of_kin_phone:string|null } | null;
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

  const [requestedStart, setRequestedStart] = useState("");
  const [requestedEnd, setRequestedEnd] = useState("");
  const [lockedEndDate, setLockedEndDate] = useState("");
  const [savingEndDate, setSavingEndDate] = useState(false);
  const [phone, setPhone] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [employerName, setEmployerName] = useState("");
  const [employerPhone, setEmployerPhone] = useState("");
  const [nextOfKinName, setNextOfKinName] = useState("");
  const [nextOfKinPhone, setNextOfKinPhone] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsMessage, setDetailsMessage] = useState("");

  const [initials, setInitials] = useState("");
  const [signing, setSigning] = useState(false);

  const [markingPaid, setMarkingPaid] = useState(false);
  const [depositMessage, setDepositMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await apiRequest("/tenant/lease-agreement");
      const parsed = asAgreement(response);
      setAgreement(parsed);
      setRequestedStart(parsed?.requested_move_in_date ?? "");
      setRequestedEnd(parsed?.requested_move_out_date ?? "");
      setLockedEndDate(parsed?.end_date ?? "");
      setPhone(parsed?.tenant?.phone ?? "");
      setNationalId(parsed?.tenant?.national_id ?? "");
      setEmployerName(parsed?.tenant?.employer_name ?? "");
      setEmployerPhone(parsed?.tenant?.employer_phone ?? "");
      setNextOfKinName(parsed?.tenant?.next_of_kin_name ?? "");
      setNextOfKinPhone(parsed?.tenant?.next_of_kin_phone ?? "");
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

  const detailsChanged = useMemo(() => {
    const tenant = agreement?.tenant;
    return phone !== (tenant?.phone ?? "") ||
      nationalId !== (tenant?.national_id ?? "") ||
      employerName !== (tenant?.employer_name ?? "") ||
      employerPhone !== (tenant?.employer_phone ?? "") ||
      nextOfKinName !== (tenant?.next_of_kin_name ?? "") ||
      nextOfKinPhone !== (tenant?.next_of_kin_phone ?? "");
  }, [agreement?.tenant, phone, nationalId, employerName, employerPhone, nextOfKinName, nextOfKinPhone]);

  const datesChanged =
    (agreement?.requested_move_in_date ?? "") !== requestedStart ||
    (agreement?.requested_move_out_date ?? "") !== requestedEnd;

  async function handleSaveDetails(e: FormEvent) {
    e.preventDefault();
    if (!agreement) return;
    setSavingDetails(true);
    setDetailsMessage("");
    try {
      const response = await apiRequest("/tenant/lease-agreement/tenant-details", {
        method: "PATCH",
        body: JSON.stringify({
          phone,
          national_id: nationalId,
          employer_name: employerName,
          employer_phone: employerPhone,
          next_of_kin_name: nextOfKinName,
          next_of_kin_phone: nextOfKinPhone,
        }),
      });
      const parsed = asAgreement(response);
      if (parsed) {
        setAgreement(parsed);
        setPhone(parsed.tenant?.phone ?? "");
        setNationalId(parsed.tenant?.national_id ?? "");
        setEmployerName(parsed.tenant?.employer_name ?? "");
        setEmployerPhone(parsed.tenant?.employer_phone ?? "");
        setNextOfKinName(parsed.tenant?.next_of_kin_name ?? "");
        setNextOfKinPhone(parsed.tenant?.next_of_kin_phone ?? "");
      }
      setDetailsMessage("Your details were added to the contract.");
    } catch (caught) {
      setDetailsMessage(caught instanceof Error ? caught.message : "Couldn't save your details.");
    } finally {
      setSavingDetails(false);
    }
  }

  async function handleSaveDates(e: FormEvent) {
    e.preventDefault();
    if (!agreement || leaseLocked || tenantSigned) return;
    setDetailsMessage("");
    try {
      const response = await apiRequest("/tenant/lease-agreement", {
        method: "PATCH",
        body: JSON.stringify({
          requested_move_in_date: requestedStart || null,
          requested_move_out_date: requestedEnd || null,
        }),
      });
      const parsed = asAgreement(response);
      if (parsed) {
        setAgreement(parsed);
        setRequestedStart(parsed.requested_move_in_date ?? "");
        setRequestedEnd(parsed.requested_move_out_date ?? "");
      }
      setDetailsMessage("Requested lease dates saved.");
    } catch (caught) {
      setDetailsMessage(caught instanceof Error ? caught.message : "Couldn't save the requested dates.");
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
        setRequestedStart(parsed.requested_move_in_date ?? "");
        setRequestedEnd(parsed.requested_move_out_date ?? "");
      }
      setInitials("");
      setDetailsMessage("Signed — your lease is now with the manager for final confirmation and signature.");
    } catch (caught) {
      setDetailsMessage(
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

  async function handleDownload() {
    if (!agreement?.contract_text) return;
    const esc = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Lease Agreement</title><style>body{font-family:Arial,sans-serif;line-height:1.6;margin:48px;color:#222}h1{text-align:center;font-size:22px}pre{white-space:pre-wrap;font:14px Arial}</style></head><body><h1>RESIDENTIAL LEASE AGREEMENT</h1><pre>${esc(agreement.contract_text)}</pre></body></html>`;
    const blob = new Blob([html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lease-agreement-${agreement.lease_id}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleLockedEndDate(e: FormEvent) {
    e.preventDefault();
    if (!agreement || !leaseLocked) return;
    setSavingEndDate(true);
    setDetailsMessage("");
    try {
      const response = await apiRequest("/tenant/lease-agreement/end-date", {
        method: "PATCH",
        body: JSON.stringify({ end_date: lockedEndDate || null }),
      });
      const parsed = asAgreement(response);
      if (parsed) {
        setAgreement(parsed);
        setLockedEndDate(parsed.end_date ?? "");
      }
      setDetailsMessage("Lease end date updated. The signed contract document remains unchanged.");
    } catch (caught) {
      setDetailsMessage(caught instanceof Error ? caught.message : "Couldn't update the lease end date.");
    } finally {
      setSavingEndDate(false);
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
              <div className="tl-hero">
                <div>
                  <p className="tl-hero__eyebrow">Your tenancy</p>
                  <h2 className="tl-hero__title">Lease agreement</h2>
                  <p className="tl-hero__meta">{agreement.property?.name ?? "Property"} · Unit {agreement.unit?.unit_number ?? "—"}{agreement.unit?.unit_type ? ` · ${agreement.unit.unit_type}` : ""}</p>
                </div>
                <span className={`tl-badge ${leaseLocked ? "tl-badge--done" : "tl-badge--pending"}`}>
                  {leaseLocked ? <ShieldCheck /> : <Clock />}
                  {leaseLocked ? "Lease locked" : awaitingManager ? "Awaiting manager signature" : agreement.status === "pending" ? "Awaiting manager confirmation" : "Ready for your review"}
                </span>
              </div>
              <div className="tl-detail-grid">
                <div className="tl-detail"><p className="tl-detail__label">Organization</p><p className="tl-detail__value">{agreement.organization?.name ?? "—"}</p></div>
                <div className="tl-detail"><p className="tl-detail__label">Tenant</p><p className="tl-detail__value">{agreement.tenant?.name ?? "—"}</p></div>
                <div className="tl-detail"><p className="tl-detail__label">Property</p><p className="tl-detail__value">{agreement.property?.name ?? "—"}</p></div>
                <div className="tl-detail"><p className="tl-detail__label">Unit</p><p className="tl-detail__value">{agreement.unit?.unit_number ?? "—"}</p></div>
                <div className="tl-detail"><p className="tl-detail__label">Monthly rent</p><p className="tl-detail__value">KSh {Number(agreement.monthly_rent ?? 0).toLocaleString()}</p></div>
                <div className="tl-detail"><p className="tl-detail__label">Security deposit</p><p className="tl-detail__value">KSh {Number(agreement.deposit_amount ?? 0).toLocaleString()}</p></div>
              </div>
              <div
                className={`tl-badge ${leaseLocked ? "tl-badge--done" : "tl-badge--pending"}`}
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

              <div className="tl-prefill">
                <p className="tl-prefill__title">Your lease information is prefilled</p>
                <p className="tl-prefill__text">Your account details, property, unit, rent, deposit and requested dates are already attached to this lease. Review them before signing.</p>
                <div className="tl-detail-grid">
                  <div className="tl-detail"><p className="tl-detail__label">Email</p><p className="tl-detail__value">{agreement.tenant?.email ?? "—"}</p></div>
                  <div className="tl-detail"><p className="tl-detail__label">Phone</p><p className="tl-detail__value">{agreement.tenant?.phone ?? "—"}</p></div>
                  <div className="tl-detail"><p className="tl-detail__label">National ID</p><p className="tl-detail__value">{agreement.tenant?.national_id ?? "—"}</p></div>
                  <div className="tl-detail"><p className="tl-detail__label">Employer</p><p className="tl-detail__value">{agreement.tenant?.employer_name ?? "—"}</p></div>
                </div>
              </div>
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

            <section className="tp-card tl-prefill">
              <p className="tl-prefill__title">Complete your lease information</p>
              <p className="tl-prefill__text">
                Your organization, property, unit, monthly rent and security deposit are already populated from your registration and the unit record. Enter the tenant details we do not have yet.
              </p>
              <form onSubmit={handleSaveDetails}>
                <div className="tl-form-grid">
                  <label className="tl-field"><span className="tp-label">Phone number</span><input value={phone} onChange={e=>setPhone(e.target.value)} disabled={tenantSigned || leaseLocked} required /></label>
                  <label className="tl-field"><span className="tp-label">National ID</span><input value={nationalId} onChange={e=>setNationalId(e.target.value)} disabled={tenantSigned || leaseLocked} required /></label>
                  <label className="tl-field"><span className="tp-label">Employer</span><input value={employerName} onChange={e=>setEmployerName(e.target.value)} disabled={tenantSigned || leaseLocked} required /></label>
                  <label className="tl-field"><span className="tp-label">Employer contact</span><input value={employerPhone} onChange={e=>setEmployerPhone(e.target.value)} disabled={tenantSigned || leaseLocked} required /></label>
                  <label className="tl-field"><span className="tp-label">Next of kin</span><input value={nextOfKinName} onChange={e=>setNextOfKinName(e.target.value)} disabled={tenantSigned || leaseLocked} required /></label>
                  <label className="tl-field"><span className="tp-label">Next of kin contact</span><input value={nextOfKinPhone} onChange={e=>setNextOfKinPhone(e.target.value)} disabled={tenantSigned || leaseLocked} required /></label>
                </div>
                <div className="tl-sign-row" style={{marginTop:".85rem"}}>
                  <button type="submit" className="tp-btn tp-btn--quiet" disabled={!detailsChanged || savingDetails || tenantSigned || leaseLocked}>{savingDetails ? <Loader2 className="tl-spin" /> : null} Save tenant details</button>
                </div>
              </form>
              {detailsMessage && <p className="tl-hint" role="status">{detailsMessage}</p>}
            </section>

            <section className="tp-card">
              <div className="tl-copy__head">
                <div>
                  <h3 style={{margin:0}}>Lease terms & conditions</h3>
                  <p className="tl-hint">This is the main contract. It is generated from the organization, property, unit, rent, deposit and tenant information.</p>
                </div>
                {leaseLocked && <button type="button" className="tp-btn tp-btn--primary" onClick={handleDownload}><FileText /> Download signed agreement</button>}
              </div>
              <div className="tl-contract">{agreement.contract_text || agreement.manager_terms || agreement.tenant_terms || "Contract will appear here once the lease details are confirmed."}</div>
            </section>

            <section className="tp-card">
              <form onSubmit={handleSaveDates}>
                <div className="tl-copy__head">
                  <div>
                    <h3 style={{margin:0}}>Requested lease dates</h3>
                    <p className="tl-hint">Before signing, you can provide the dates you are requesting. The manager confirms the official dates.</p>
                  </div>
                </div>
                <div className="tl-form-grid" style={{marginTop:".85rem"}}>
                  <label className="tl-field"><span className="tp-label">Requested start</span><input type="date" value={requestedStart} onChange={e=>setRequestedStart(e.target.value)} disabled={tenantSigned || leaseLocked} /></label>
                  <label className="tl-field"><span className="tp-label">Requested end</span><input type="date" value={requestedEnd} onChange={e=>setRequestedEnd(e.target.value)} disabled={tenantSigned || leaseLocked} /></label>
                </div>
                {!tenantSigned && !leaseLocked && <button type="submit" className="tp-btn tp-btn--quiet" style={{marginTop:".85rem"}} disabled={!datesChanged}>Save requested dates</button>}
              </form>
            </section>

            <section className="tp-card">
              <div className="tl-copy__head">
                <div>
                  <h3 style={{margin:0}}>Signature</h3>
                  <p className="tl-hint">{tenantSigned ? "Your signature has been recorded and the lease is awaiting the manager's final confirmation and signature." : "After you complete your details and review the contract, sign here to send it to the manager."}</p>
                </div>
                {tenantSigned && <span className="tl-badge tl-badge--done"><CheckCircle2 /> Signed {agreement.tenant_signature}</span>}
              </div>
              {!tenantSigned && !leaseLocked && (
                <form onSubmit={handleSign} className="tl-sign-row" style={{marginTop:".85rem"}}>
                  <label htmlFor="tenant-initials" className="tp-label">Sign with initials</label>
                  <input id="tenant-initials" value={initials} onChange={e=>setInitials(e.target.value)} maxLength={6} placeholder="e.g. SO" />
                  <button type="submit" className="tp-btn tp-btn--primary" disabled={signing || !initials.trim() || !detailsChanged && !agreement.tenant?.employer_name || !agreement.tenant?.employer_phone || !agreement.tenant?.next_of_kin_name || !agreement.tenant?.next_of_kin_phone || !agreement.tenant?.national_id || !agreement.tenant?.phone}>
                    {signing ? <Loader2 className="tl-spin" /> : <FileSignature />} Sign & send to manager
                  </button>
                </form>
              )}
            </section>

            {leaseLocked && (
              <section className="tp-card">
                <div className="tl-copy__head">
                  <div>
                    <h3 style={{margin:0}}>Lease end date</h3>
                    <p className="tl-hint">This is the only lease field you can edit after final signing. The signed agreement document stays unchanged.</p>
                  </div>
                </div>
                <form onSubmit={handleLockedEndDate} className="tl-sign-row" style={{marginTop:".85rem"}}>
                  <input type="date" value={lockedEndDate} onChange={e=>setLockedEndDate(e.target.value)} />
                  <button type="submit" className="tp-btn tp-btn--quiet" disabled={savingEndDate || lockedEndDate === (agreement.end_date ?? "")}>
                    {savingEndDate ? <Loader2 className="tl-spin" /> : null} Save end date
                  </button>
                </form>
              </section>
            )}

            <div className="tl-grid">
              <article className="tp-card tl-copy">
                <div className="tl-copy__head"><h3>Manager's copy</h3><span className={`tl-badge ${managerSigned ? "tl-badge--done" : "tl-badge--pending"}`}>{managerSigned ? <CheckCircle2 /> : <Clock />}{managerSigned ? `Signed ${agreement.manager_signature} · ${longDateTime(agreement.manager_signed_at)}` : "Awaiting manager signature"}</span></div>
                <div className="tl-contract">{agreement.contract_text || "Contract not yet generated."}</div>
              </article>
              <article className="tp-card tl-copy">
                <div className="tl-copy__head"><h3>Your copy</h3><span className={`tl-badge ${tenantSigned ? "tl-badge--done" : "tl-badge--pending"}`}>{tenantSigned ? <CheckCircle2 /> : <Clock />}{tenantSigned ? `Signed ${agreement.tenant_signature} · ${longDateTime(agreement.tenant_signed_at)}` : "Awaiting your signature"}</span></div>
                <div className="tl-contract">{agreement.contract_text || "Contract not yet generated."}</div>
                <p className="tl-hint">Both copies contain the same canonical contract. They differ only by the signature status.</p>
              </article>
            </div>
          </>
        )}
      </div>
    </TenantDashboardLayout>
  );
}

export default TenantLeasePage;
