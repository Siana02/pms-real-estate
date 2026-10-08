import { useEffect, useState } from "react";
import { Building2, CheckCircle2, Eye, Smartphone } from "lucide-react";
import { ApiError, apiRequest } from "../services/api";

type Props = { role: string };

type Method = "mpesa_number" | "mpesa_till" | "mpesa_paybill" | "bank";

type Settings = {
  can_manage: boolean;
  configured: boolean;
  preferred_method: Method | null;
  mpesa_number: string | null;
  mpesa_till: string | null;
  mpesa_paybill: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_branch: string | null;
};

const normalizeDigits = (value: string) => value.replace(/\D/g, "");

const validateDestination = (method: Method, value: string) => {
  const digits = normalizeDigits(value);

  if (method === "mpesa_number") {
    const valid = /^(?:2547\d{8}|07\d{8})$/.test(digits);
    return valid ? "" : "Enter a valid Kenyan M-Pesa number, e.g. 0712345678 or 254712345678.";
  }

  if (method === "mpesa_till") {
    return /^\d{5,7}$/.test(digits) ? "" : "Enter a valid M-Pesa Till number (5–7 digits).";
  }

  if (method === "mpesa_paybill") {
    return /^\d{5,7}$/.test(digits) ? "" : "Enter a valid M-Pesa PayBill number (5–7 digits).";
  }

  return "";
};

export default function PaymentDestinationSection({ role }: Props) {
  const owner = ["admin", "owner"].includes(String(role ?? "").toLowerCase());
  const [settings, setSettings] = useState<Settings | null>(null);
  const [method, setMethod] = useState<Method>("mpesa_number");
  const [mpesa, setMpesa] = useState("");
  const [till, setTill] = useState("");
  const [paybill, setPaybill] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [branch, setBranch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiRequest("/organization/payment-settings")
      .then((payload) => {
        const value = payload as Settings;
        setSettings(value);
        if (!value.can_manage) return;

        if (value.preferred_method) setMethod(value.preferred_method);
        if (value.mpesa_number && !value.mpesa_number.startsWith("••••")) setMpesa(value.mpesa_number);
        if (value.mpesa_till && !value.mpesa_till.startsWith("••••")) setTill(value.mpesa_till);
        if (value.mpesa_paybill && !value.mpesa_paybill.startsWith("••••")) setPaybill(value.mpesa_paybill);
        if (value.bank_name) setBankName(value.bank_name);
        if (value.bank_account_name) setAccountName(value.bank_account_name);
        if (value.bank_branch) setBranch(value.bank_branch);
      })
      .catch(() => undefined);
  }, []);

  async function save() {
    setLoading(true);
    setError("");
    setMessage("");

    const currentValue =
      method === "mpesa_number" ? mpesa :
      method === "mpesa_till" ? till :
      method === "mpesa_paybill" ? paybill :
      "";

    if (method !== "bank") {
      const validationError = validateDestination(method, currentValue);
      if (!currentValue.trim()) {
        setError("Please enter the selected M-Pesa destination before saving.");
        setLoading(false);
        return;
      }
      if (validationError) {
        setError(validationError);
        setLoading(false);
        return;
      }
    }

    if (
      method === "bank" &&
      (!bankName.trim() || !accountName.trim() || !accountNumber.trim())
    ) {
      setError("Bank name, account name and account number are required.");
      setLoading(false);
      return;
    }

    try {
      await apiRequest("/organization/payment-settings", {
        method: "PUT",
        body: JSON.stringify({
          preferred_method: method,
          mpesa_number: method === "mpesa_number" ? normalizeDigits(mpesa) : undefined,
          mpesa_till: method === "mpesa_till" ? normalizeDigits(till) : undefined,
          mpesa_paybill: method === "mpesa_paybill" ? normalizeDigits(paybill) : undefined,
          bank_name: method === "bank" ? bankName.trim() : undefined,
          bank_account_name: method === "bank" ? accountName.trim() : undefined,
          bank_account_number: method === "bank" ? accountNumber.trim() : undefined,
          bank_branch: method === "bank" ? branch.trim() : undefined,
        }),
      });

      setMessage("Payment destination saved.");
      const refreshed = (await apiRequest("/organization/payment-settings")) as Settings;
      setSettings(refreshed);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not save the payment destination."
      );
    } finally {
      setLoading(false);
    }
  }

  const configured = settings?.configured ?? false;

  return (
    <section className="mg-panel">
      <div className="mg-panel__head">
        <h2 className="mg-panel__title">
          <Building2 />
          Payment destination
        </h2>
        <span className="mg-panel__meta">
          {configured ? "Configured" : "Not configured"}
        </span>
      </div>

      <div className="mg-panel__body">
        {!owner ? (
          <>
            <p className="mg-hint" style={{ marginTop: 0 }}>
              Payment settings are managed by your organization owner/admin.
              You can view the collection status, but you cannot change the
              payment destination.
            </p>
            <div className="mg-alert" style={{ display: "flex", alignItems: "center", gap: ".5rem", marginTop: "1rem" }}>
              {configured ? <CheckCircle2 size={18} /> : <Eye size={18} />}
              <span>
                {configured
                  ? "Tenant payment destination is configured via " +
                    (settings?.preferred_method === "bank"
                      ? "bank."
                      : settings?.preferred_method === "mpesa_till"
                        ? "M-Pesa Till."
                        : settings?.preferred_method === "mpesa_paybill"
                          ? "M-Pesa PayBill."
                          : "M-Pesa number.")
                  : "Tenant payment destination has not been configured yet."}
              </span>
            </div>
          </>
        ) : (
          <>
            <p className="mg-hint" style={{ marginTop: 0 }}>
              Only the organization owner/admin can change the destination
              used for tenant payment collection.
            </p>

            <div className="mg-actions" style={{ marginBottom: "1rem", flexWrap: "wrap" }}>
              <button type="button" className={`mg-btn ${method === "mpesa_number" ? "mg-btn--primary" : "mg-btn--ghost"}`} onClick={() => setMethod("mpesa_number")}>
                <Smartphone /> M-Pesa number
              </button>
              <button type="button" className={`mg-btn ${method === "mpesa_till" ? "mg-btn--primary" : "mg-btn--ghost"}`} onClick={() => setMethod("mpesa_till")}>
                <Smartphone /> M-Pesa Till
              </button>
              <button type="button" className={`mg-btn ${method === "mpesa_paybill" ? "mg-btn--primary" : "mg-btn--ghost"}`} onClick={() => setMethod("mpesa_paybill")}>
                <Smartphone /> M-Pesa PayBill
              </button>
              <button type="button" className={`mg-btn ${method === "bank" ? "mg-btn--primary" : "mg-btn--ghost"}`} onClick={() => setMethod("bank")}>
                <Building2 /> Bank
              </button>
            </div>

            {method === "mpesa_number" && (
              <label className="mg-field">
                <span className="mg-label">M-Pesa number</span>
                <input className="mg-input" value={mpesa} onChange={(e) => setMpesa(e.target.value)} placeholder="0712345678" inputMode="numeric" autoComplete="tel" />
              </label>
            )}

            {method === "mpesa_till" && (
              <label className="mg-field">
                <span className="mg-label">M-Pesa Till number</span>
                <input className="mg-input" value={till} onChange={(e) => setTill(e.target.value)} placeholder="Enter Till number" inputMode="numeric" />
                <small className="mg-hint">5–7 digits. Only numbers are accepted.</small>
              </label>
            )}

            {method === "mpesa_paybill" && (
              <label className="mg-field">
                <span className="mg-label">M-Pesa PayBill number</span>
                <input className="mg-input" value={paybill} onChange={(e) => setPaybill(e.target.value)} placeholder="Enter PayBill number" inputMode="numeric" />
                <small className="mg-hint">5–7 digits. Only numbers are accepted.</small>
              </label>
            )}

            {method === "bank" && (
              <div className="mg-form-grid">
                <label className="mg-field"><span className="mg-label">Bank</span><input className="mg-input" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Bank name" /></label>
                <label className="mg-field"><span className="mg-label">Account name</span><input className="mg-input" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="ABC Properties Limited" /></label>
                <label className="mg-field"><span className="mg-label">Account number</span><input className="mg-input" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Account number" inputMode="numeric" /></label>
                <label className="mg-field"><span className="mg-label">Branch</span><input className="mg-input" value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="Branch" /></label>
              </div>
            )}

            {error && <p className="mg-hint" style={{ color: "#a33" }}>{error}</p>}
            {message && <p className="mg-hint" style={{ color: "#19734a", display: "flex", gap: ".4rem", alignItems: "center" }}><CheckCircle2 size={16} />{message}</p>}

            <div className="mg-actions" style={{ marginTop: "1rem" }}>
              <button type="button" className="mg-btn mg-btn--primary" disabled={loading} onClick={() => void save()}>
                {loading ? "Saving…" : "Save payment destination"}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
