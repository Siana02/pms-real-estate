import { useEffect, useState } from "react";
import { apiRequest } from "../../services/api";

function isOwner() {
  try {
    const raw = localStorage.getItem("user") ?? sessionStorage.getItem("user");
    const user = raw ? JSON.parse(raw) : {};
    return ["admin", "owner"].includes(String(user?.role ?? "").toLowerCase());
  } catch {
    return false;
  }
}

type DarajaSettings = {
  configured?: boolean;
  enabled?: boolean;
  environment?: "sandbox" | "production";
  shortcode?: string;
  shortcode_type?: "PayBill" | "Till";
  has_consumer_key?: boolean;
  has_consumer_secret?: boolean;
  has_passkey?: boolean;
  stk_callback_url?: string;
  c2b_confirmation_url?: string;
  c2b_validation_url?: string;
};

export default function PaymentDestinationSection() {
  const [allowed] = useState(isOwner);
  const [method, setMethod] = useState("mpesa_number");
  const [mpesa, setMpesa] = useState("");
  const [till, setTill] = useState("");
  const [paybill, setPaybill] = useState("");
  const [bank, setBank] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [branch, setBranch] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [daraja, setDaraja] = useState<DarajaSettings>({});
  const [environment, setEnvironment] = useState<"sandbox" | "production">("sandbox");
  const [shortcode, setShortcode] = useState("");
  const [shortcodeType, setShortcodeType] = useState<"PayBill" | "Till">("PayBill");
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [passkey, setPasskey] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [darajaSaving, setDarajaSaving] = useState(false);
  const [darajaMessage, setDarajaMessage] = useState("");

  useEffect(() => {
    if (!allowed) return;
    void (async () => {
      try {
        const response: any = await apiRequest("/organization/payment-settings");
        setMethod(response?.preferred_method ?? "mpesa_number");
        setMpesa(response?.mpesa_number ?? "");
        setTill(response?.mpesa_till ?? "");
        setPaybill(response?.mpesa_paybill ?? "");
        setBank(response?.bank_name ?? "");
        setAccountName(response?.bank_account_name ?? "");
        setAccountNumber(response?.bank_account_number ?? "");
        setBranch(response?.bank_branch ?? "");
      } catch {
        // Existing payment destination settings may not have been configured yet.
      }
      try {
        const integration = (await apiRequest("/organization/daraja")) as DarajaSettings;
        setDaraja(integration);
        setEnvironment(integration.environment ?? "sandbox");
        setShortcode(integration.shortcode ?? "");
        setShortcodeType(integration.shortcode_type ?? "PayBill");
        setEnabled(Boolean(integration.enabled));
      } catch {
        // Daraja is optional until the owner configures it.
      }
    })();
  }, [allowed]);

  if (!allowed) return null;

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      await apiRequest("/organization/payment-settings", {
        method: "PUT",
        body: JSON.stringify({
          preferred_method: method,
          mpesa_number: mpesa,
          mpesa_till: till,
          mpesa_paybill: paybill,
          bank_name: bank,
          bank_account_name: accountName,
          bank_account_number: accountNumber,
          bank_branch: branch,
        }),
      });
      setMessage("Payment destination saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save payment destination.");
    } finally {
      setSaving(false);
    }
  }

  async function saveDaraja() {
    setDarajaSaving(true);
    setDarajaMessage("");
    try {
      const response = (await apiRequest("/organization/daraja", {
        method: "PUT",
        body: JSON.stringify({
          environment,
          shortcode,
          shortcode_type: shortcodeType,
          consumer_key: consumerKey || undefined,
          consumer_secret: consumerSecret || undefined,
          passkey: passkey || undefined,
          enabled,
        }),
      })) as DarajaSettings;
      setDaraja(response);
      setConsumerKey("");
      setConsumerSecret("");
      setPasskey("");
      setDarajaMessage("Daraja settings saved. Secret fields were cleared from this form; stored credentials are encrypted.");
    } catch (error) {
      setDarajaMessage(error instanceof Error ? error.message : "Could not save Daraja settings.");
    } finally {
      setDarajaSaving(false);
    }
  }

  return (
    <>
      <section className="mg-panel">
        <div className="mg-panel__head"><h2 className="mg-panel__title">Payment destination</h2></div>
        <div className="mg-panel__body">
          <p className="mg-hint">Set the payment destination tenants see in their portal.</p>
          <div className="mg-field">
            <label>Preferred method</label>
            <select value={method} onChange={(event) => setMethod(event.target.value)}>
              <option value="mpesa_number">M-Pesa number</option>
              <option value="mpesa_till">M-Pesa Till</option>
              <option value="mpesa_paybill">M-Pesa PayBill</option>
              <option value="bank">Bank account</option>
            </select>
          </div>
          {method === "mpesa_number" ? (
            <div className="mg-field"><label>M-Pesa number</label><input value={mpesa} onChange={(event) => setMpesa(event.target.value)} placeholder="07xx xxx xxx" /></div>
          ) : method === "mpesa_till" ? (
            <div className="mg-field"><label>M-Pesa Till number</label><input value={till} onChange={(event) => setTill(event.target.value)} placeholder="Till number" /></div>
          ) : method === "mpesa_paybill" ? (
            <div className="mg-field"><label>M-Pesa PayBill number</label><input value={paybill} onChange={(event) => setPaybill(event.target.value)} placeholder="PayBill number" /></div>
          ) : (
            <>
              <div className="mg-field"><label>Bank name</label><input value={bank} onChange={(event) => setBank(event.target.value)} /></div>
              <div className="mg-field"><label>Account name</label><input value={accountName} onChange={(event) => setAccountName(event.target.value)} /></div>
              <div className="mg-field"><label>Account number</label><input value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} /></div>
              <div className="mg-field"><label>Branch</label><input value={branch} onChange={(event) => setBranch(event.target.value)} /></div>
            </>
          )}
          <button className="mg-btn mg-btn--primary" disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : "Save payment destination"}</button>
          {message && <p className="mg-hint" role="status" style={{ marginTop: ".75rem" }}>{message}</p>}
        </div>
      </section>

      <section className="mg-panel" style={{ marginTop: "1rem" }}>
        <div className="mg-panel__head"><h2 className="mg-panel__title">Safaricom Daraja integration</h2></div>
        <div className="mg-panel__body">
          <p className="mg-hint">Connect this organization’s own Daraja app and PayBill/Till. Consumer secrets and passkeys are encrypted at rest and never returned to the browser. Use sandbox until Safaricom approves production access.</p>
          <p className="mg-hint" role="status">Connection: {daraja.configured ? (daraja.enabled ? "Configured and enabled" : "Configured but disabled") : "Not configured"}</p>
          <div className="mg-field">
            <label>Environment</label>
            <select value={environment} onChange={(event) => setEnvironment(event.target.value as "sandbox" | "production")}>
              <option value="sandbox">Sandbox (testing)</option>
              <option value="production">Production (live payments)</option>
            </select>
          </div>
          <div className="mg-field">
            <label>Business shortcode / PayBill / Till</label>
            <input inputMode="numeric" value={shortcode} onChange={(event) => setShortcode(event.target.value)} placeholder="5–7 digit shortcode" required />
          </div>
          <div className="mg-field">
            <label>Shortcode type</label>
            <select value={shortcodeType} onChange={(event) => setShortcodeType(event.target.value as "PayBill" | "Till")}>
              <option value="PayBill">PayBill</option>
              <option value="Till">Till / Buy Goods</option>
            </select>
          </div>
          <div className="mg-field">
            <label>Consumer key {daraja.has_consumer_key ? "(saved — leave blank to keep current)" : ""}</label>
            <input autoComplete="off" value={consumerKey} onChange={(event) => setConsumerKey(event.target.value)} placeholder="Daraja consumer key" />
          </div>
          <div className="mg-field">
            <label>Consumer secret {daraja.has_consumer_secret ? "(saved — leave blank to keep current)" : ""}</label>
            <input type="password" autoComplete="new-password" value={consumerSecret} onChange={(event) => setConsumerSecret(event.target.value)} placeholder="Daraja consumer secret" />
          </div>
          <div className="mg-field">
            <label>STK passkey {daraja.has_passkey ? "(saved — leave blank to keep current)" : ""}</label>
            <input type="password" autoComplete="new-password" value={passkey} onChange={(event) => setPasskey(event.target.value)} placeholder="Lipa Na M-Pesa passkey" />
          </div>
          <label className="mg-field" style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
            <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
            Enable STK Push and C2B reconciliation
          </label>
          <button className="mg-btn mg-btn--primary" disabled={darajaSaving || !shortcode.trim()} onClick={() => void saveDaraja()}>{darajaSaving ? "Saving…" : "Save Daraja settings"}</button>
          {darajaMessage && <p className="mg-hint" role="status" style={{ marginTop: ".75rem" }}>{darajaMessage}</p>}
          {daraja.configured && (
            <div style={{ marginTop: "1rem" }}>
              <p className="mg-hint"><strong>Register these callback URLs in Daraja:</strong></p>
              <p className="mg-hint">STK callback: <code>{daraja.stk_callback_url}</code></p>
              <p className="mg-hint">C2B confirmation: <code>{daraja.c2b_confirmation_url}</code></p>
              <p className="mg-hint">C2B validation: <code>{daraja.c2b_validation_url}</code></p>
              <p className="mg-hint">Safaricom must be able to reach these HTTPS URLs in production. Register the confirmation URL for your shortcode in the Daraja portal.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
