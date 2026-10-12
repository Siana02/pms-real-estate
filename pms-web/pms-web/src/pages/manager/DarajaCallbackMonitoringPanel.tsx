import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Clock3, RefreshCw, UploadCloud } from "lucide-react";
import { apiRequest } from "../../services/api";
import { asNumber, asString, rows, toRecord } from "../../services/format";

interface MonitorEvent {
  id: number;
  shortcode: string;
  receipt: string | null;
  source: string;
  delivery_status: string;
  processing_status: string;
  transaction_at: string | null;
  received_at: string;
  latency_seconds: number | null;
  is_delayed: boolean;
  error_message: string | null;
}
interface ShortcodeHealth {
  shortcode: string;
  last_callback_at: string | null;
  seconds_since_last_callback: number | null;
  registered: boolean;
  note: string;
}
function parseMonitor(payload: unknown) {
  const root = toRecord(payload);
  const events = rows(root.data).map((r): MonitorEvent => ({
    id: asNumber(r.id),
    shortcode: asString(r.shortcode),
    receipt: asString(r.receipt) || null,
    source: asString(r.source),
    delivery_status: asString(r.delivery_status),
    processing_status: asString(r.processing_status),
    transaction_at: asString(r.transaction_at) || null,
    received_at: asString(r.received_at),
    latency_seconds: r.latency_seconds == null ? null : asNumber(r.latency_seconds),
    is_delayed: Boolean(r.is_delayed),
    error_message: asString(r.error_message) || null,
  }));
  const shortcodes = rows(root.shortcodes).map((r): ShortcodeHealth => ({
    shortcode: asString(r.shortcode),
    last_callback_at: asString(r.last_callback_at) || null,
    seconds_since_last_callback: r.seconds_since_last_callback == null ? null : asNumber(r.seconds_since_last_callback),
    registered: Boolean(r.registered),
    note: asString(r.note),
  }));
  const summary = toRecord(root.summary);
  return { events, shortcodes, summary: {
    delayed: asNumber(summary.delayed), failed: asNumber(summary.failed),
    needs_review: asNumber(summary.needs_review), recovered: asNumber(summary.recovered),
  } };
}
function displayDate(value: string | null) {
  if (!value) return "Not observed";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function DarajaCallbackMonitoringPanel() {
  const [events, setEvents] = useState<MonitorEvent[]>([]);
  const [shortcodes, setShortcodes] = useState<ShortcodeHealth[]>([]);
  const [summary, setSummary] = useState({ delayed: 0, failed: 0, needs_review: 0, recovered: 0 });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [statement, setStatement] = useState<File | null>(null);
  const [confirmedOfficial, setConfirmedOfficial] = useState(false);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = parseMonitor(await apiRequest("/payment-reconciliation/callback-monitoring"));
      setEvents(result.events);
      setShortcodes(result.shortcodes);
      setSummary(result.summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load M-Pesa callback monitoring.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function recover(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!statement || !confirmedOfficial || !periodStart || !periodEnd || notes.trim().length < 10) {
      setError("Choose a statement, confirm it came from the official M-Pesa organization statement, enter the statement period, and provide review notes.");
      return;
    }
    setUploading(true);
    setError("");
    setMessage("");
    const body = new FormData();
    body.append("statement", statement);
    body.append("confirm_official_statement", "1");
    body.append("statement_period_start", periodStart);
    body.append("statement_period_end", periodEnd);
    body.append("recovery_notes", notes.trim());
    try {
      const response = toRecord(await apiRequest("/payment-reconciliation/callback-monitoring/recover", { method: "POST", body }));
      const counts = toRecord(response.summary);
      setMessage(`Recovery processed: ${asNumber(counts.recovered)} reconciled, ${asNumber(counts.needs_review)} sent to review, ${asNumber(counts.rejected)} rejected. A row is not considered paid unless it passes the existing verified reconciliation rules.`);
      setStatement(null);
      setConfirmedOfficial(false);
      setNotes("");
      const input = document.getElementById("mpesa-recovery-file") as HTMLInputElement | null;
      if (input) input.value = "";
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Statement recovery failed.");
    } finally {
      setUploading(false);
    }
  }

  return <section className="mg-panel" style={{ marginBottom: "1.25rem" }}>
    <div className="mg-panel__head">
      <h2 className="mg-panel__title"><Clock3 /> M-Pesa callback monitoring & recovery</h2>
      <button className="mg-btn mg-btn--subtle" onClick={() => void load()} disabled={loading} aria-label="Refresh callback monitoring"><RefreshCw className={loading ? "mg-spin" : undefined} /> Refresh</button>
    </div>
    <div className="mg-panel__body">
      <p className="mg-subtitle" style={{ marginTop: 0 }}>
        Monitor observed callback delays and processing failures. The last callback timestamp is a heartbeat only: no recent callback does not prove that a payment was missed. Compare it with the official M-Pesa organization statement.
      </p>
      {error && <div className="mg-alert"><AlertCircle /><span>{error}</span></div>}
      {message && <div className="mg-alert"><CheckCircle2 /><span>{message}</span></div>}
      <div className="mg-stats">
        <article className="mg-stat"><p className="mg-stat__label">Delayed notifications</p><p className="mg-stat__value">{summary.delayed}</p></article>
        <article className="mg-stat"><p className="mg-stat__label">Processing failures</p><p className="mg-stat__value">{summary.failed}</p></article>
        <article className="mg-stat"><p className="mg-stat__label">Needs review</p><p className="mg-stat__value">{summary.needs_review}</p></article>
        <article className="mg-stat"><p className="mg-stat__label">Statement-recovered</p><p className="mg-stat__value">{summary.recovered}</p></article>
      </div>
      <h3 style={{ margin: "1rem 0 .5rem", fontSize: "1rem" }}>Configured shortcode health</h3>
      {shortcodes.length === 0 ? <p className="mg-subtitle">No M-Pesa PayBill/Till destinations are configured for this organization.</p> :
        <div style={{ display: "grid", gap: ".5rem", marginBottom: "1.25rem" }}>
          {shortcodes.map((item) => <div key={item.shortcode} className="mg-stat" style={{ padding: ".8rem 1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
              <strong>Shortcode {item.shortcode}</strong>
              <span className={item.registered ? "mg-badge mg-badge--ok" : "mg-badge mg-badge--warn"}>{item.registered ? "Callback registration recorded" : "Registration not recorded"}</span>
            </div>
            <p className="mg-sub" style={{ margin: ".4rem 0 0" }}>Last observed callback: {displayDate(item.last_callback_at)}. {item.note}</p>
          </div>)}
        </div>
      }
      <h3 style={{ margin: "1rem 0 .5rem", fontSize: "1rem" }}>Recover transactions from an official statement</h3>
      <p className="mg-subtitle">
        Use this when a callback appears to be missing. Download the statement from the M-Pesa organization portal and map its verified transaction data into a CSV with these exact headers:
        <code> TransID,TransTime,TransAmount,BusinessShortCode,BillRefNumber,MSISDN</code>.
        <code> TransTime</code> must be <code>YYYYMMDDHHmmss</code>; <code>MSISDN</code> is optional. Upload only the relevant statement period. This workflow does not call a transaction-status API or fetch statements automatically.
      </p>
      <form onSubmit={(e) => void recover(e)} style={{ display: "grid", gap: ".85rem" }}>
        <div className="mg-field">
          <label className="mg-label" htmlFor="mpesa-recovery-file">Statement CSV</label>
          <input id="mpesa-recovery-file" className="mg-input" type="file" accept=".csv,.txt,text/csv,text/plain" onChange={(e) => setStatement(e.target.files?.[0] ?? null)} required />
        </div>
        <div className="mg-grid2">
          <div className="mg-field"><label className="mg-label" htmlFor="mpesa-period-start">Statement period start</label><input id="mpesa-period-start" className="mg-input" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} required /></div>
          <div className="mg-field"><label className="mg-label" htmlFor="mpesa-period-end">Statement period end</label><input id="mpesa-period-end" className="mg-input" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} min={periodStart || undefined} required /></div>
        </div>
        <div className="mg-field"><label className="mg-label" htmlFor="mpesa-recovery-notes">Evidence / recovery notes</label><textarea id="mpesa-recovery-notes" className="mg-input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} minLength={10} maxLength={2000} placeholder="Record statement source, who verified it, and the reason for recovery." required /></div>
        <label style={{ display: "flex", alignItems: "flex-start", gap: ".55rem" }}>
          <input type="checkbox" checked={confirmedOfficial} onChange={(e) => setConfirmedOfficial(e.target.checked)} required />
          <span>I confirm this data was checked against an official M-Pesa organization statement. I understand unmatched or conflicting receipts will be held for review, not automatically allocated.</span>
        </label>
        <div><button className="mg-btn mg-btn--primary" type="submit" disabled={uploading || loading || !statement || !confirmedOfficial}><UploadCloud />{uploading ? "Processing statement…" : "Verify and recover statement rows"}</button></div>
      </form>
      <h3 style={{ margin: "1.25rem 0 .5rem", fontSize: "1rem" }}>Recent callback/recovery events</h3>
      {loading ? <span className="mg-skeleton" style={{ height: "3rem" }} /> : events.length === 0 ? <p className="mg-subtitle">No monitor events have been recorded for this organization yet.</p> :
        <div className="mg-tablewrap"><table className="mg-table"><thead><tr><th>Received</th><th>Receipt / shortcode</th><th>Source</th><th>Latency</th><th>Status</th></tr></thead><tbody>
          {events.map((item) => <tr key={item.id}>
            <td>{displayDate(item.received_at)}</td>
            <td>{item.receipt || "Receipt unavailable"}<span className="mg-sub">Shortcode {item.shortcode}</span></td>
            <td>{item.source === "statement_recovery" ? "Official statement recovery" : "Safaricom callback"}</td>
            <td>{item.latency_seconds == null ? "Unknown" : item.latency_seconds < 3600 ? `${Math.floor(item.latency_seconds / 60)}m ${item.latency_seconds % 60}s` : `${Math.floor(item.latency_seconds / 3600)}h ${Math.floor((item.latency_seconds % 3600) / 60)}m`}{item.is_delayed ? <span className="mg-sub">Delayed (&gt; 5 minutes)</span> : null}</td>
            <td><span className={item.delivery_status === "failed" || item.processing_status === "needs_review" ? "mg-badge mg-badge--warn" : "mg-badge mg-badge--ok"}>{item.delivery_status === "failed" ? "Processing failed" : item.processing_status === "needs_review" ? "Needs review" : item.source === "statement_recovery" ? "Recovered / deduplicated" : "Received"}</span>{item.error_message ? <span className="mg-sub">{item.error_message}</span> : null}</td>
          </tr>)}
        </tbody></table></div>
      }
    </div>
  </section>;
}
