import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound, RefreshCw, ShieldCheck } from "lucide-react";
import { ApiError, apiRequest } from "../services/api";

type DarajaStatus = {
  configured: boolean; enabled: boolean; environment: "sandbox" | "production";
  shortcode: string | null; shortcode_type: "PayBill" | "Till";
  has_consumer_key: boolean; has_consumer_secret: boolean; has_passkey: boolean;
  c2b_registered_at: string | null; stk_callback_url: string;
  c2b_confirmation_url: string; c2b_validation_url: string;
};

const emptyStatus: DarajaStatus = {
  configured: false, enabled: false, environment: "sandbox", shortcode: "",
  shortcode_type: "PayBill", has_consumer_key: false, has_consumer_secret: false,
  has_passkey: false, c2b_registered_at: null, stk_callback_url: "",
  c2b_confirmation_url: "", c2b_validation_url: "",
};

export default function DarajaSettingsSection() {
  const [status, setStatus] = useState<DarajaStatus>(emptyStatus);
  const [environment, setEnvironment] = useState<"sandbox" | "production">("sandbox");
  const [shortcode, setShortcode] = useState("");
  const [shortcodeType, setShortcodeType] = useState<"PayBill" | "Till">("PayBill");
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [passkey, setPasskey] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const data = (await apiRequest("/organization/daraja")) as DarajaStatus;
      setStatus(data); setEnvironment(data.environment ?? "sandbox");
      setShortcode(data.shortcode ?? ""); setShortcodeType(data.shortcode_type ?? "PayBill");
      setEnabled(Boolean(data.enabled));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not load Daraja settings.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function save() {
    setSaving(true); setError(""); setMessage("");
    try {
      const body: Record<string, unknown> = {
        environment, shortcode: shortcode.trim(), shortcode_type: shortcodeType, enabled,
      };
      if (consumerKey.trim()) body.consumer_key = consumerKey.trim();
      if (consumerSecret.trim()) body.consumer_secret = consumerSecret.trim();
      if (passkey.trim()) body.passkey = passkey.trim();
      await apiRequest("/organization/daraja", { method: "PUT", body: JSON.stringify(body) });
      setConsumerKey(""); setConsumerSecret(""); setPasskey("");
      setMessage("Daraja settings saved. Secret values are not sent back to the browser.");
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : caught instanceof Error ? caught.message : "Could not save Daraja settings.");
    } finally { setSaving(false); }
  }

  async function registerC2B() {
    setRegistering(true); setError(""); setMessage("");
    try {
      const response = (await apiRequest("/organization/daraja/register-c2b", { method: "POST" })) as { message?: string };
      setMessage(response.message ?? "C2B callback registration requested.");
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : caught instanceof Error ? caught.message : "Could not register C2B callbacks.");
    } finally { setRegistering(false); }
  }

  return (
    <section className="mg-panel">
      <div className="mg-panel__head">
        <h2 className="mg-panel__title"><ShieldCheck /> Safaricom Daraja</h2>
        <span className="mg-panel__meta">{status.configured ? (status.enabled ? "Connected" : "Disabled") : "Not connected"}</span>
      </div>
      <div className="mg-panel__body">
        <p className="mg-hint" style={{ marginTop: 0 }}>
          Connect this organization’s own Daraja app and PayBill/Till. Credentials are encrypted by the backend and never returned to this page. Sandbox is for testing; use production credentials only after Safaricom approves the live shortcode.
        </p>
        {loading ? <p className="mg-hint">Loading Daraja settings…</p> : (
          <>
            <div className="mg-grid2">
              <label className="mg-field">
                <span className="mg-label">Environment</span>
                <select className="mg-select" value={environment} onChange={(e) => setEnvironment(e.target.value as "sandbox" | "production")}>
                  <option value="sandbox">Sandbox / test</option><option value="production">Production / live</option>
                </select>
              </label>
              <label className="mg-field">
                <span className="mg-label">Account type</span>
                <select className="mg-select" value={shortcodeType} onChange={(e) => setShortcodeType(e.target.value as "PayBill" | "Till")}>
                  <option value="PayBill">PayBill</option><option value="Till">Till / Buy Goods</option>
                </select>
              </label>
              <label className="mg-field">
                <span className="mg-label">Business shortcode</span>
                <input className="mg-input" inputMode="numeric" value={shortcode} onChange={(e) => setShortcode(e.target.value)} placeholder="PayBill or Till number" />
              </label>
              <label className="mg-field">
                <span className="mg-label">Integration status</span>
                <span style={{ display: "flex", gap: ".5rem", alignItems: "center", minHeight: "2.6rem" }}>
                  <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
                  Enable STK Push and C2B callbacks
                </span>
              </label>
            </div>
            <div style={{ marginTop: "1rem", padding: "1rem", border: "1px solid var(--pms-border-soft)", borderRadius: ".75rem" }}>
              <strong style={{ display: "flex", gap: ".5rem", alignItems: "center" }}><KeyRound size={18} /> Daraja API credentials</strong>
              <p className="mg-hint">Leave a secret field blank to keep the currently saved value. These values must come from the same Daraja app and environment selected above.</p>
              <div className="mg-grid2">
                <label className="mg-field">
                  <span className="mg-label">Consumer key {status.has_consumer_key ? "· saved" : "· required"}</span>
                  <input className="mg-input" autoComplete="off" value={consumerKey} onChange={(e) => setConsumerKey(e.target.value)} placeholder={status.has_consumer_key ? "Saved securely — enter to replace" : "Consumer key"} />
                </label>
                <label className="mg-field">
                  <span className="mg-label">Consumer secret {status.has_consumer_secret ? "· saved" : "· required"}</span>
                  <input className="mg-input" type="password" autoComplete="new-password" value={consumerSecret} onChange={(e) => setConsumerSecret(e.target.value)} placeholder={status.has_consumer_secret ? "Saved securely — enter to replace" : "Consumer secret"} />
                </label>
                <label className="mg-field" style={{ gridColumn: "1 / -1" }}>
                  <span className="mg-label">Lipa Na M-PESA passkey {status.has_passkey ? "· saved" : "· required for STK"}</span>
                  <input className="mg-input" type="password" autoComplete="new-password" value={passkey} onChange={(e) => setPasskey(e.target.value)} placeholder={status.has_passkey ? "Saved securely — enter to replace" : "STK Push passkey"} />
                </label>
              </div>
            </div>
            {error && <p className="mg-hint" role="alert" style={{ color: "#a33" }}>{error}</p>}
            {message && <p className="mg-hint" role="status" style={{ color: "#19734a" }}><CheckCircle2 size={15} style={{ verticalAlign: "middle" }} /> {message}</p>}
            <div className="mg-actions" style={{ marginTop: "1rem" }}>
              <button type="button" className="mg-btn mg-btn--primary" disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : "Save Daraja settings"}</button>
              <button type="button" className="mg-btn mg-btn--ghost" disabled={!status.configured || !enabled || registering} onClick={() => void registerC2B()}><RefreshCw size={16} /> {registering ? "Registering…" : "Register C2B callbacks"}</button>
            </div>
            {status.configured && (
              <div style={{ display: "grid", gap: ".5rem", marginTop: "1.25rem" }}>
                <strong>Callback URLs</strong>
                {[["STK Push", status.stk_callback_url], ["C2B confirmation", status.c2b_confirmation_url], ["C2B validation", status.c2b_validation_url]].map(([label, url]) => (
                  <div key={label} style={{ padding: ".65rem .75rem", border: "1px solid var(--pms-border-soft)", borderRadius: ".5rem", overflowWrap: "anywhere" }}>
                    <small className="mg-hint" style={{ display: "block" }}>{label}</small><code>{url}</code>
                  </div>
                ))}
                <p className="mg-hint">C2B registration status: {status.c2b_registered_at ? "registered " + new Date(status.c2b_registered_at).toLocaleString() : "not registered yet"}.</p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
