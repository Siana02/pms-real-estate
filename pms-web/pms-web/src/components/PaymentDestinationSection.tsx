import { useEffect, useState } from "react";
import { Building2, CheckCircle2, Smartphone } from "lucide-react";
import { ApiError, apiRequest } from "../../services/api";

type Props = { role: string };

type Settings = {
  preferred_method: "mpesa" | "bank" | null;
  mpesa_number: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_branch: string | null;
};

export default function PaymentDestinationSection({ role }: Props) {
  const owner = role === "admin" || role === "owner";
  const [method, setMethod] = useState<"mpesa" | "bank">("mpesa");
  const [mpesa, setMpesa] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [branch, setBranch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!owner) return;
    apiRequest("/organization/payment-settings")
      .then((payload) => {
        const value = payload as Partial<Settings>;
        if (value.preferred_method) setMethod(value.preferred_method);
        if (value.bank_name) setBankName(value.bank_name);
        if (value.bank_account_name) setAccountName(value.bank_account_name);
        if (value.bank_branch) setBranch(value.bank_branch);
      })
      .catch(() => undefined);
  }, [owner]);

  if (!owner) return null;

  async function save() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await apiRequest("/organization/payment-settings", {
        method: "PUT",
        body: JSON.stringify({
          preferred_method: method,
          mpesa_number: mpesa || undefined,
          bank_name: bankName || undefined,
          bank_account_name: accountName || undefined,
          bank_account_number: accountNumber || undefined,
          bank_branch: branch || undefined,
        }),
      });
      setMessage("Payment destination saved. Payment integration can use this organization-owned destination later.");
      setMpesa("");
      setAccountNumber("");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not save the payment destination.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mg-panel">
      <div className="mg-panel__head">
        <h2 className="mg-panel__title"><Building2 /> Payment destination</h2>
      </div>
      <div className="mg-panel__body">
        <p className="mg-hint" style={{ marginTop: 0 }}>
          This controls where tenant payments are directed. Only the organization owner/admin can view or change it.
        </p>

        <div className="mg-actions" style={{ marginBottom: "1rem" }}>
          <button type="button" className={`mg-btn ${method === "mpesa" ? "mg-btn--primary" : "mg-btn--ghost"}`} onClick={() => setMethod("mpesa")}>
            <Smartphone /> M-Pesa
          </button>
          <button type="button" className={`mg-btn ${method === "bank" ? "mg-btn--primary" : "mg-btn--ghost"}`} onClick={() => setMethod("bank")}>
            <Building2 /> Bank
          </button>
        </div>

        {method === "mpesa" ? (
          <label className="mg-field">
            <span className="mg-label">M-Pesa number</span>
            <input className="mg-input" value={mpesa} onChange={(e) => setMpesa(e.target.value)} placeholder="2547…" />
          </label>
        ) : (
          <div className="mg-form-grid">
            <label className="mg-field"><span className="mg-label">Bank</span><input className="mg-input" value={bankName} onChange={(e)=>setBankName(e.target.value)} placeholder="Bank name" /></label>
            <label className="mg-field"><span className="mg-label">Account name</span><input className="mg-input" value={accountName} onChange={(e)=>setAccountName(e.target.value)} placeholder="ABC Properties Limited" /></label>
            <label className="mg-field"><span className="mg-label">Account number</span><input className="mg-input" value={accountNumber} onChange={(e)=>setAccountNumber(e.target.value)} placeholder="Account number" /></label>
            <label className="mg-field"><span className="mg-label">Branch</span><input className="mg-input" value={branch} onChange={(e)=>setBranch(e.target.value)} placeholder="Branch" /></label>
          </div>
        )}

        {error && <p className="mg-hint" style={{color:"#a33"}}>{error}</p>}
        {message && <p className="mg-hint" style={{color:"#19734a",display:"flex",gap:".4rem",alignItems:"center"}}><CheckCircle2 size={16}/>{message}</p>}
        <div className="mg-actions" style={{ marginTop: "1rem" }}>
          <button type="button" className="mg-btn mg-btn--primary" disabled={loading} onClick={() => void save()}>
            {loading ? "Saving…" : "Save payment destination"}
          </button>
        </div>
      </div>
    </section>
  );
}
