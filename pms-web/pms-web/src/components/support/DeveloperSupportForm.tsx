import { useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Send } from "lucide-react";
import { apiRequest } from "../../services/api";

const FORMSPREE_ENDPOINT = "https://formspree.io/f/xeaerzad";

const supportStyles = `
.ds-form { display:grid; gap:1rem; color:#182235; font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; }
.ds-form *, .ds-form *::before, .ds-form *::after { box-sizing:border-box; }
.ds-form__grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.85rem; }
.ds-form__field { display:grid; gap:.42rem; min-width:0; }
.ds-form__label { font-size:.88rem; font-weight:700; color:#263449; line-height:1.45; }
.ds-form__input { width:100%; min-width:0; border:1px solid #cbd5e1; border-radius:11px; background:#fff; color:#172033; padding:.78rem .85rem; font:inherit; font-size:.94rem; line-height:1.5; }
.ds-form__input:focus { outline:3px solid #dbeafe; border-color:#2563eb; }
.ds-form textarea.ds-form__input { resize:vertical; min-height:130px; }
.ds-form__hint { margin:0; color:#526177; font-size:.84rem; line-height:1.6; }
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
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [propertyUnit, setPropertyUnit] = useState("");
  const [receipt, setReceipt] = useState("");
  const [paymentDateTime, setPaymentDateTime] = useState("");
  const [impact, setImpact] = useState("normal");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [ticket, setTicket] = useState<number | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const context = [
      `Contact name: ${contactName.trim() || "Use account name"}`,
      `Contact email: ${contactEmail.trim() || "Use account email"}`,
      `Contact phone: ${contactPhone.trim() || "Not supplied"}`,
      `Property / unit: ${propertyUnit.trim() || "Not applicable / not supplied"}`,
      `M-Pesa receipt: ${receipt.trim() || "Not supplied"}`,
      `Payment date and time: ${paymentDateTime || "Not supplied"}`,
      `Impact: ${impact}`,
      "",
      "Issue details:",
      message.trim(),
    ].join("\n");

    try {
      // Save the ticket first. This keeps the database/platform-admin queue
      // authoritative even if the external notification service is unavailable.
      const response = await apiRequest<{
        message?: string;
        request?: { id?: number; email_status?: string; requester_name?: string; requester_email?: string };
      }>("/developer-support-requests", {
        method: "POST",
        body: JSON.stringify({
          category,
          subject: subject.trim(),
          message: context,
          page_url: window.location.pathname,
          notification_provider: "formspree",
        }),
      });

      const id = response.request?.id;
      const effectiveName = contactName.trim() || response.request?.requester_name || "";
      const effectiveEmail = contactEmail.trim() || response.request?.requester_email || "";
      setTicket(typeof id === "number" ? id : null);

      const formData = new FormData();
      formData.append("_subject", `[PMS Support${id ? ` #${id}` : ""}] ${subject.trim()}`);
      formData.append("contact_name", effectiveName);
      if (effectiveEmail) {
        formData.append("_replyto", effectiveEmail);
        formData.append("contact_email", effectiveEmail);
      }
      formData.append("category", categories.find((item) => item.value === category)?.label ?? category);
      formData.append("subject", subject.trim());
      formData.append("message", message.trim());
      formData.append("contact_phone", contactPhone.trim());
      formData.append("property_or_unit", propertyUnit.trim());
      formData.append("mpesa_receipt", receipt.trim());
      formData.append("payment_date_time", paymentDateTime);
      formData.append("impact", impact);
      formData.append("page_url", window.location.href);
      formData.append("ticket_number", id ? String(id) : "Not returned");
      formData.append("notification_source", "MARSWebz Property Management System");

      let notificationDelivered = false;
      let notificationError = "";
      try {
        const formspreeResponse = await fetch(FORMSPREE_ENDPOINT, {
          method: "POST",
          headers: { Accept: "application/json" },
          body: formData,
        });
        if (!formspreeResponse.ok) {
          const result = await formspreeResponse.json().catch(() => null) as { errors?: Array<{ message?: string }> } | null;
          notificationError = result?.errors?.map((item) => item.message).filter(Boolean).join(" ") || `Formspree returned HTTP ${formspreeResponse.status}.`;
        } else {
          notificationDelivered = true;
        }
      } catch {
        notificationError = "The notification service could not be reached from this browser.";
      }

      if (id) {
        try {
          await apiRequest(`/developer-support-requests/${id}/notification-status`, {
            method: "PATCH",
            body: JSON.stringify({
              provider: "formspree",
              status: notificationDelivered ? "sent" : "failed",
              error: notificationDelivered ? null : notificationError,
            }),
          });
        } catch {
          // The original ticket remains saved. Its notification status will
          // remain visible to the platform-admin team for follow-up.
        }
      }

      if (notificationDelivered) {
        setSuccess(`Your request has been saved and sent to the development team via Formspree.${id ? ` Ticket #${id}.` : ""}`);
      } else {
        setSuccess(`Your request has been saved${id ? ` as ticket #${id}` : ""}, but the email notification could not be confirmed. The support queue retains it for follow-up.`);
      }

      setCategory("payment_not_received");
      setSubject("");
      setMessage("");
      setContactName("");
      setContactEmail("");
      setContactPhone("");
      setPropertyUnit("");
      setReceipt("");
      setPaymentDateTime("");
      setImpact("normal");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't save your support request. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const idPrefix = compact ? "ds-quick" : "ds-page";

  return <div className="ds-form">
    <style>{supportStyles}</style>
    <p className="ds-form__hint">
      Report a missing M-Pesa confirmation, technical fault, login problem or service outage. Your request is saved in the PMS first, then sent to the development team. Never include passwords, M-Pesa PINs, full card details or secret credentials.
    </p>
    {error && <div className="ds-form__alert ds-form__alert--error" role="alert"><AlertCircle size={19} /><span>{error}</span></div>}
    {success && <div className="ds-form__alert ds-form__alert--success" role="status"><CheckCircle2 size={19} /><span>{success}</span></div>}

    <form onSubmit={(event) => void submit(event)} className="ds-form">
      <div className="ds-form__field">
        <label className="ds-form__label" htmlFor={`${idPrefix}-category`}>What do you need help with?</label>
        <select className="ds-form__input" id={`${idPrefix}-category`} value={category} onChange={(event) => setCategory(event.target.value)} required>
          {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </div>
      <div className="ds-form__field">
        <label className="ds-form__label" htmlFor={`${idPrefix}-subject`}>Short summary</label>
        <input className="ds-form__input" id={`${idPrefix}-subject`} value={subject} onChange={(event) => setSubject(event.target.value)} minLength={4} maxLength={200} placeholder="e.g. M-Pesa payment not reflected" required />
      </div>
      <div className="ds-form__grid">
        <div className="ds-form__field">
          <label className="ds-form__label" htmlFor={`${idPrefix}-name`}>Contact name (optional)</label>
          <input className="ds-form__input" id={`${idPrefix}-name`} value={contactName} onChange={(event) => setContactName(event.target.value)} maxLength={160} placeholder="Your name" />
        </div>
        <div className="ds-form__field">
          <label className="ds-form__label" htmlFor={`${idPrefix}-email`}>Contact email (optional)</label>
          <input className="ds-form__input" id={`${idPrefix}-email`} type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} maxLength={254} placeholder="Where we can reply" />
        </div>
        <div className="ds-form__field">
          <label className="ds-form__label" htmlFor={`${idPrefix}-phone`}>Contact phone (optional)</label>
          <input className="ds-form__input" id={`${idPrefix}-phone`} type="tel" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} maxLength={32} placeholder="+254…" />
        </div>
      </div>
      <div className="ds-form__grid">
        <div className="ds-form__field">
          <label className="ds-form__label" htmlFor={`${idPrefix}-property`}>Property / unit (optional)</label>
          <input className="ds-form__input" id={`${idPrefix}-property`} value={propertyUnit} onChange={(event) => setPropertyUnit(event.target.value)} maxLength={200} placeholder="Property name, unit number" />
        </div>
        <div className="ds-form__field">
          <label className="ds-form__label" htmlFor={`${idPrefix}-receipt`}>M-Pesa receipt (optional)</label>
          <input className="ds-form__input" id={`${idPrefix}-receipt`} value={receipt} onChange={(event) => setReceipt(event.target.value)} maxLength={100} placeholder="Receipt code only — never your PIN" />
        </div>
      </div>
      <div className="ds-form__grid">
        <div className="ds-form__field">
          <label className="ds-form__label" htmlFor={`${idPrefix}-payment-time`}>Payment date / time (optional)</label>
          <input className="ds-form__input" id={`${idPrefix}-payment-time`} type="datetime-local" value={paymentDateTime} onChange={(event) => setPaymentDateTime(event.target.value)} />
        </div>
        <div className="ds-form__field">
          <label className="ds-form__label" htmlFor={`${idPrefix}-impact`}>How much is this affecting you?</label>
          <select className="ds-form__input" id={`${idPrefix}-impact`} value={impact} onChange={(event) => setImpact(event.target.value)}>
            <option value="normal">Normal — one feature or question</option>
            <option value="high">High — payments or several users affected</option>
            <option value="urgent">Urgent — service appears unavailable</option>
          </select>
        </div>
      </div>
      <div className="ds-form__field">
        <label className="ds-form__label" htmlFor={`${idPrefix}-message`}>Explain the issue</label>
        <textarea className="ds-form__input" id={`${idPrefix}-message`} value={message} onChange={(event) => setMessage(event.target.value)} minLength={15} maxLength={4000} placeholder="What happened, what did you expect, and when did it start?" required />
        <p className="ds-form__meta">{message.length}/4000 characters · All fields are sent to Formspree; optional details are also included in the saved ticket.</p>
      </div>
      <button className="ds-form__button" type="submit" disabled={saving}><Send size={17} />{saving ? "Saving and notifying…" : "Submit to the development team"}</button>
    </form>
    <p className="ds-form__meta">We aim to respond within 30–60 minutes. This is a target rather than a guarantee, particularly outside support hours or during a major outage.</p>
  </div>;
}
