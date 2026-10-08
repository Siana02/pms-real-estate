import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, KeyRound, ShieldCheck, Unplug } from "lucide-react";
import { ApiError, apiRequest } from "../services/api";

type Props = { role: string };

type Integration = {
  configured: boolean;
  environment?: "test" | "live";
  merchant_name?: string | null;
  currency?: string;
  connected_at?: string | null;
  webhook_secret_configured?: boolean;
};

export default function FlutterwaveIntegrationSection({ role }: Props) {
  const owner = ["admin", "owner"].includes(String(role ?? "").toLowerCase());
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [secretKey, setSecretKey] = useState("");
  const [environment, setEnvironment] = useState<"test" | "live">("test");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const value = (await apiRequest("/organization/flutterwave")) as Integration;
      setIntegration(value);
      if (value.environment) setEnvironment(value.environment);
    } catch {
      setIntegration(null);
    }
  }

  useEffect(() => { if (owner) void load(); }, [owner]);

  async function connect() {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const value = (await apiRequest("/organization/flutterwave", {
        method: "POST",
        body: JSON.stringify({ secret_key: secretKey.trim(), environment }),
      })) as Integration & { webhook_secret?: string; webhook_url?: string };

      setIntegration(value);
      setWebhookSecret(value.webhook_secret ?? "");
      setWebhookUrl(value.webhook_url ?? "");
      setSecretKey("");
      setMessage("Flutterwave is connected. Add the webhook details below in your Flutterwave dashboard.");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not connect Flutterwave.");
    } finally {
      setSaving(false);
    }
  }

  async function disconnect() {
    if (!window.confirm("Disconnect Flutterwave online payments? Tenants will no longer be able to start online payments until it is connected again.")) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      await apiRequest("/organization/flutterwave", { method: "DELETE" });
      setIntegration({ configured: false });
      setWebhookSecret("");
      setWebhookUrl("");
      setMessage("Flutterwave disconnected.");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not disconnect Flutterwave.");
    } finally {
      setSaving(false);
    }
  }

  if (!owner) return null;

  return (
    <section className="mg-panel">
      <div className="mg-panel__head">
        <h2 className="mg-panel__title"><KeyRound /> Flutterwave online payments</h2>
        <span className="mg-panel__meta">
          {integration?.configured ? "Connected" : "Not connected"}
        </span>
      </div>
      <div className="mg-panel__body">
        <p className="mg-hint" style={{ marginTop: 0 }}>
          Connect the organization’s own Flutterwave merchant account. Tenant payments go directly through that account; MARSwebz does not hold the rent.
        </p>

        {integration?.configured ? (
          <>
            <div className="mg-alert" style={{ display: "flex", alignItems: "center", gap: ".55rem", marginTop: "1rem" }}>
              <CheckCircle2 size={18} />
              <span>
                {integration.merchant_name || "Flutterwave account"} · {integration.environment === "live" ? "Live" : "Test"} mode · {integration.currency || "KES"}
              </span>
            </div>

            {(webhookSecret || webhookUrl) && (
              <div style={{ marginTop: "1rem", padding: "1rem", borderRadius: ".75rem", border: "1px solid var(--pms-border-soft)", background: "var(--pms-glass)" }}>
                <p className="mg-label">Webhook setup</p>
                <p className="mg-hint">In Flutterwave Dashboard → Settings → Webhooks, use this URL and secret hash. The secret is shown here only after connection.</p>
                <label className="mg-field">
                  <span className="mg-label">Webhook URL</span>
                  <input className="mg-input" readOnly value={webhookUrl} />
                </label>
                <label className="mg-field">
                  <span className="mg-label">Secret hash</span>
                  <input className="mg-input" readOnly value={webhookSecret} />
                </label>
                <p className="mg-hint" style={{ display: "flex", gap: ".4rem", alignItems: "center" }}>
                  <ShieldCheck size={15} /> Keep the secret hash private. If you lose it, reconnecting does not expose the existing secret; we can add regeneration later.
                </p>
              </div>
            )}

            <div className="mg-actions" style={{ marginTop: "1rem" }}>
              <a className="mg-btn mg-btn--ghost" href="https://app.flutterwave.com" target="_blank" rel="noreferrer">
                <ExternalLink /> Open Flutterwave
              </a>
              <button type="button" className="mg-btn mg-btn--ghost" disabled={saving} onClick={() => void disconnect()}>
                <Unplug /> Disconnect
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
            <label className="mg-field">
              <span className="mg-label">Environment</span>
              <select className="mg-input" value={environment} onChange={(e) => setEnvironment(e.target.value as "test" | "live")}>
                <option value="test">Test / Sandbox</option>
                <option value="live">Live</option>
              </select>
            </label>
            <label className="mg-field">
              <span className="mg-label">Flutterwave Secret Key</span>
              <input className="mg-input" type="password" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} placeholder={environment === "live" ? "FLWSECK-…" : "FLWSECK_TEST-…"} autoComplete="off" />
              <small className="mg-hint">This is sent only to the secure Laravel backend and stored encrypted. Never put it in the frontend code or GitHub.</small>
            </label>
            {error && <p className="mg-hint" style={{ color: "#a33" }}>{error}</p>}
            {message && <p className="mg-hint" style={{ color: "#19734a" }}>{message}</p>}
            <div className="mg-actions">
              <button type="button" className="mg-btn mg-btn--primary" disabled={saving || secretKey.trim().length < 20} onClick={() => void connect()}>
                {saving ? "Connecting…" : "Connect Flutterwave"}
              </button>
            </div>
          </div>
        )}
        {error && integration?.configured && <p className="mg-hint" style={{ color: "#a33", marginTop: ".75rem" }}>{error}</p>}
        {message && integration?.configured && !(webhookSecret || webhookUrl) && <p className="mg-hint" style={{ color: "#19734a", marginTop: ".75rem" }}>{message}</p>}
      </div>
    </section>
  );
}