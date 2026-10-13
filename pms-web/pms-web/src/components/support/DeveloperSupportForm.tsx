import { useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Send } from "lucide-react";
import { apiRequest } from "../../services/api";

const supportStyles = `
.ds-form { display:grid; gap:1rem; color:#182235; font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; }
.ds-form *, .ds-form *::before, .ds-form *::after { box-sizing:border-box; }
.ds-form__grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.85rem; }
.ds-form__field { display:grid; gap:.42rem; min-width:0; }
.ds-form__label { font-size:.88rem; font-weight:700; color:#263449; line-height:1.45; }
.ds-form__input { width:100%; min-width:0; border:1px solid #cbd5e1; border-radius:11px; background:#fff; color:#172033; padding:.78rem .85rem; font:inherit; font-size:.94rem; line-height:1.5; }
.ds-form__input:focus { outline:3px solid #dbeafe; border-color:#2563eb; }
.ds-form textarea.ds-form__input { resize:vertical; min-height:150px; }
.ds-form__hint { margin:0; color:#526177; font-size:.82rem; line-height:1.55; }
.ds-form__button { display:inline-flex; align-items:center; justify-content:center; gap:.5rem; border:0; border-radius:11px; padding:.82rem 1rem; background:#183b67; color:#fff; font:inherit; font-weight:800; cursor:pointer; min-height:46px; }
.ds-form__button:disabled { opacity:.65; cursor:wait; }
.ds-form__alert { display:flex; align-items:flex-start; gap:.65rem; border-radius:11px; padding:.85rem; font-size:.9rem; line-height:1.5; }
.ds-form__alert--error { color:#842029; background:#fff0f0; border:1px solid #f2b8b8; }
.ds-form__alert--success { color:#14532d; background:#eefbf2; border:1px solid #b8e4c4; }
.ds-form__meta { color:#58677c; font-size:.78rem; line-height:1.5; }
@media(max-width:620px) { .ds-form__grid { grid-template-columns:1fr; } .ds-form__button { width:100%; } }
`;

const categories = [
  { value: "payment_not_received", label: "Payment / M-Pesa confirmation missing" },
  { value: "mpesa_callback", label: "M-Pesa callback or reconciliation issue" },
  { value: "server_outage", label: "Server, outage or connection problem" },
  { value: "login_access", label: "Login or account access" },
  { value: "bug_report", label: "Something is not working correctly" },
  { value: "account_help", label: "How do I use a feature?" },
  { value: "other", label: "Other technical assistance" },
];

export default function DeveloperSupportForm({ compact = false }: { compact?: boolean }) {
  const [category, setCategory] = useState("payment_not_received");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [ticket, setTicket] = useState<number | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await apiRequest<{ message?: string; request?: { id?: number; email_status?: string } }>(
        "/developer-support-requests",
        {
          method: "POST",
          body: JSON.stringify({
            category,
            subject: subject.trim(),
            message: message.trim(),
            page_url: window.location.pathname,
          }),
        }
      );
      const id = response.request?.id;
      setTicket(typeof id === "number" ? id : null);
      setSuccess(response.message ?? "Your support request has been saved.");
      setSubject("");
      setMessage("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't submit your request. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return <div className="ds-form">
    <style>{supportStyles}</style>
    <p className="ds-form__hint">
      Tell us what happened, what you expected to happen, and (if relevant) the M-Pesa receipt code and payment time. Never include your password, PIN, full card details or secret credentials.
    </p>
    {error && <div className="ds-form__alert ds-form__alert--error" role="alert"><AlertCircle size={19} /><span>{error}</span></div>}
    {success && <div className="ds-form__alert ds-form__alert--success" role="status"><CheckCircle2 size={19} /><span>{success}{ticket ? ` Your ticket number is #${ticket}.` : ""}</span></div>}
    <form onSubmit={(event) => void submit(event)} className="ds-form">
      <div className="ds-form__field">
        <label className="ds-form__label" htmlFor={compact ? "ds-quick-category" : "ds-page-category"}>What do you need help with?</label>
        <select className="ds-form__input" id={compact ? "ds-quick-category" : "ds-page-category"} value={category} onChange={(event) => setCategory(event.target.value)} required>
          {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </div>
      <div className="ds-form__field">
        <label className="ds-form__label" htmlFor={compact ? "ds-quick-subject" : "ds-page-subject"}>Short summary</label>
        <input className="ds-form__input" id={compact ? "ds-quick-subject" : "ds-page-subject"} value={subject} onChange={(event) => setSubject(event.target.value)} minLength={4} maxLength={200} placeholder="e.g. M-Pesa payment not reflected" required />
      </div>
      <div className="ds-form__field">
        <label className="ds-form__label" htmlFor={compact ? "ds-quick-message" : "ds-page-message"}>Explain the issue</label>
        <textarea className="ds-form__input" id={compact ? "ds-quick-message" : "ds-page-message"} value={message} onChange={(event) => setMessage(event.target.value)} minLength={15} maxLength={5000} placeholder="What happened? When did it start? Which property/unit or screen is affected? Include a receipt reference only if relevant." required />
        <p className="ds-form__meta">{message.length}/5000 characters · Request is saved in the support queue even if email delivery needs attention.</p>
      </div>
      <button className="ds-form__button" type="submit" disabled={saving}><Send size={17} />{saving ? "Submitting request…" : "Submit to the development team"}</button>
    </form>
    <p className="ds-form__meta">We aim to respond within 30–60 minutes. This is a target rather than a guarantee, particularly outside support hours or during a major outage.</p>
  </div>;
}
