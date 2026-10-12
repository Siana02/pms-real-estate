import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, ClipboardCheck, RefreshCw } from "lucide-react";
import { apiRequest } from "../../services/api";
import { formatDate, rows, asNumber, asString, toRecord } from "../../services/format";

interface ReviewFlag {
  id: number;
  record_type: string;
  record_id: number;
  issue_code: string;
  details: string;
  status: "open" | "resolved";
  first_flagged_at: string;
  last_flagged_at: string;
  reviewed_at: string | null;
  resolution_notes: string | null;
}

const ISSUE_LABELS: Record<string, string> = {
  payment_lease_scope: "Payment and lease do not share the same organization",
  legacy_obligation_scope: "Historical rent-month link points outside the payment lease",
  payment_not_represented_once: "Payment total does not equal its ledger allocations and rent credit",
  allocation_scope_or_source: "Allocation has an invalid source, amount or rent obligation",
  credit_scope_or_amount: "Rent credit has inconsistent ownership or balance",
  credit_overallocated: "Rent credit allocations exceed the original credit",
  credit_balance_mismatch: "Allocated and remaining credit do not equal the original credit",
  credit_allocation_scope_or_source: "Credit allocation points to an invalid source or lease",
  lease_property_scope: "Lease property is missing or belongs to another organization",
  lease_unit_scope: "Lease unit does not belong to its recorded property",
  lease_tenant_scope: "Lease tenant is missing or belongs to another organization",
  obligation_scope: "Rent obligation ownership does not match its lease",
  obligation_overallocated: "Payments recorded against this rent month exceed the amount due",
  allocation_source_cardinality: "Allocation must belong to exactly one source",
  duplicate_provider_receipt: "More than one payment row uses the same provider receipt",
  reconciled_transaction_mismatch: "Reconciled provider transaction and payment do not agree",
};

function parseFlags(payload: unknown): ReviewFlag[] {
  return rows(toRecord(payload).data ?? payload).map((item) => ({
    id: asNumber(item.id),
    record_type: asString(item.record_type),
    record_id: asNumber(item.record_id),
    issue_code: asString(item.issue_code),
    details: asString(item.details),
    status: asString(item.status) === "resolved" ? "resolved" : "open",
    first_flagged_at: asString(item.first_flagged_at),
    last_flagged_at: asString(item.last_flagged_at),
    reviewed_at: asString(item.reviewed_at) || null,
    resolution_notes: asString(item.resolution_notes) || null,
  }));
}

export default function RentLedgerReviewPanel() {
  const [flags, setFlags] = useState<ReviewFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showResolved, setShowResolved] = useState(false);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setFlags(parseFlags(await apiRequest("/payment-reconciliation/ledger-review-flags")));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load ledger review flags.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(
    () => flags.filter((flag) => showResolved || flag.status !== "resolved"),
    [flags, showResolved],
  );
  const openCount = flags.filter((flag) => flag.status !== "resolved").length;

  async function resolve(flag: ReviewFlag) {
    const resolutionNotes = (notes[flag.id] ?? "").trim();
    if (resolutionNotes.length < 10) {
      setError("Add at least 10 characters explaining the review and evidence before marking an issue resolved.");
      return;
    }
    setSavingId(flag.id);
    setError("");
    try {
      await apiRequest(`/payment-reconciliation/ledger-review-flags/${flag.id}/resolve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution_notes: resolutionNotes }),
      });
      setNotes((current) => ({ ...current, [flag.id]: "" }));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the review decision.");
    } finally {
      setSavingId(null);
    }
  }

  return <section className="mg-panel" style={{ marginBottom: "1.25rem" }}>
    <div className="mg-panel__head">
      <h2 className="mg-panel__title"><ClipboardCheck /> Rent ledger integrity review</h2>
      <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
        <span className="mg-panel__meta">{openCount} open</span>
        <button className="mg-btn mg-btn--subtle" onClick={() => void load()} disabled={loading} aria-label="Refresh ledger review flags"><RefreshCw className={loading ? "mg-spin" : undefined} /> Refresh</button>
      </div>
    </div>
    <div className="mg-panel__body">
      <p className="mg-subtitle" style={{ marginTop: 0 }}>
        These are integrity findings, not automatic corrections. Compare the M-PESA/provider receipt with the payment, rent-month allocations, rent credit and obligation balance. If a correction is needed, follow your approved accounting process separately, then rerun <code>php artisan rent:ledger-audit</code>. Recording a review below never changes ledger amounts; an issue that still exists will be flagged again by the next audit.
      </p>
      {error && <div className="mg-alert"><AlertCircle /><span>{error}</span></div>}
      <label style={{ display: "flex", alignItems: "center", gap: ".5rem", margin: "0 0 1rem" }}>
        <input type="checkbox" checked={showResolved} onChange={(event) => setShowResolved(event.target.checked)} />
        Show resolved reviews
      </label>
      {loading ? <span className="mg-skeleton" style={{ height: "3rem" }} /> : visible.length === 0 ? (
        <div className="mg-empty">
          <CheckCircle2 />
          <p className="mg-empty__title">{openCount === 0 ? "No open ledger issues" : "No matching review flags"}</p>
          <p className="mg-empty__text">{openCount === 0 ? "The latest saved audit has no unresolved flags for this organization. Run the audit again after importing or correcting historical data." : "Try showing resolved reviews to inspect previously reviewed issues."}</p>
        </div>
      ) : <div style={{ display: "grid", gap: ".85rem" }}>
        {visible.map((flag) => <article key={flag.id} className="mg-stat" style={{ border: "1px solid #e5e7eb", borderRadius: ".75rem", padding: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <span className={`mg-badge mg-badge--${flag.status === "resolved" ? "ok" : "warn"}`}>{flag.status === "resolved" ? "Reviewed" : "Action required"}</span>
              <h3 style={{ margin: ".6rem 0 .25rem", fontSize: "1rem" }}>{ISSUE_LABELS[flag.issue_code] ?? flag.issue_code.replaceAll("_", " ")}</h3>
              <p className="mg-sub" style={{ margin: 0 }}>{flag.record_type.replaceAll("_", " ")} #{flag.record_id} · Issue code: {flag.issue_code}</p>
            </div>
            <div className="mg-sub" style={{ textAlign: "right" }}>
              <div>First flagged: {formatDate(flag.first_flagged_at)}</div>
              <div>Last seen: {formatDate(flag.last_flagged_at)}</div>
            </div>
          </div>
          <p style={{ margin: ".75rem 0", lineHeight: 1.5 }}>{flag.details}</p>
          {flag.status === "resolved" ? <div className="mg-alert"><CheckCircle2 /><span>Reviewed {flag.reviewed_at ? `on ${formatDate(flag.reviewed_at)}` : ""}. Notes: {flag.resolution_notes || "No notes recorded."}</span></div> : <div className="mg-field">
            <label className="mg-label" htmlFor={`review-notes-${flag.id}`}>Review evidence and resolution notes</label>
            <textarea id={`review-notes-${flag.id}`} className="mg-input" rows={3} value={notes[flag.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [flag.id]: event.target.value }))} placeholder="Describe the receipt/statement checked, the discrepancy found, and the approved action taken (or why no ledger correction was needed)." />
            <p className="mg-hint">Required. Resolving this flag records your review only; it does not edit payments, allocations, credits or balances.</p>
            <button className="mg-btn mg-btn--primary" disabled={savingId === flag.id || (notes[flag.id] ?? "").trim().length < 10} onClick={() => void resolve(flag)}><CheckCircle2 />{savingId === flag.id ? "Saving review…" : "Record review decision"}</button>
          </div>}
        </article>)}
      </div>}
    </div>
  </section>;
}
