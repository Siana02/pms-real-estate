import { useEffect, useMemo, useState } from "react";
import { Banknote, Building2, CheckCircle2, Plus, Smartphone, Trash2, Wallet } from "lucide-react";
import { ApiError, apiRequest } from "../services/api";

type Props = { role: string };
type Property = { id: number; name: string };
type Method = "mpesa_number" | "mpesa_till" | "mpesa_paybill" | "bank";
type Destination = {
  id: number;
  property_id: number;
  property_name?: string | null;
  method: Method;
  label?: string | null;
  details: Record<string, string | null>;
  is_active: boolean;
  account_reference_format?: string | null;
  daraja?: {
    shortcode_type?: string | null;
    has_passkey?: boolean;
    authorization_status?: string;
    authorization_checked_at?: string | null;
    c2b_registration_status?: string;
    c2b_authorization_status?: string;
    c2b_authorization_checked_at?: string | null;
    c2b_registered_at?: string | null;
    platform_configured?: boolean;
    stk_push_available?: boolean;
  };
};

type Payload = {
  data: Destination[];
  online?: { available: boolean; label: string; description: string };
};

const METHOD_LABEL: Record<Method, string> = {
  mpesa_number: "M-PESA number",
  mpesa_till: "M-PESA Till",
  mpesa_paybill: "M-PESA PayBill",
  bank: "Bank account",
};

function destinationSummary(item: Destination) {
  const d = item.details;
  switch (item.method) {
    case "mpesa_number":
      return d.number ?? "M-PESA number";
    case "mpesa_till":
      return `Till ${d.till ?? "—"}`;
    case "mpesa_paybill":
      return `PayBill ${d.paybill ?? "—"} · Account ${d.account ?? "—"}`;
    case "bank":
      return [d.bank_name, d.account_name, d.account_number ? `••••${d.account_number.slice(-4)}` : null]
        .filter(Boolean)
        .join(" · ");
  }
}

export default function PaymentDestinationSection({ role }: Props) {
  const owner = ["admin", "owner"].includes(String(role ?? "").toLowerCase());
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyId] = useState<number | null>(null);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [onlineAvailable, setOnlineAvailable] = useState(false);
  const [method, setMethod] = useState<Method>("mpesa_paybill");
  const [label, setLabel] = useState("");
  const [number, setNumber] = useState("");
  const [till, setTill] = useState("");
  const [paybill, setPaybill] = useState("");
  const [account, setAccount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [branch, setBranch] = useState("");
  const [darajaPasskey, setDarajaPasskey] = useState("");
  const [accountReferenceFormat, setAccountReferenceFormat] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === propertyId),
    [properties, propertyId]
  );

  async function loadProperties() {
    try {
      const payload = await apiRequest("/properties");
      const list = Array.isArray(payload) ? (payload as Property[]) : [];
      setProperties(list);
      if (!propertyId && list[0]) setPropertyId(list[0].id);
    } catch {
      setProperties([]);
    }
  }

  async function loadDestinations(id = propertyId) {
    if (!id) return;
    try {
      const payload = (await apiRequest(`/organization/payment-destinations?property_id=${id}`)) as Payload;
      setDestinations(payload.data ?? []);
      setOnlineAvailable(Boolean(payload.online?.available));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not load payment destinations.");
    }
  }

  useEffect(() => { void loadProperties(); }, []);
  useEffect(() => { void loadDestinations(); }, [propertyId]);

  function resetForm() {
    setEditingId(null);
    setShowForm(false);
    setLabel("");
    setNumber("");
    setTill("");
    setPaybill("");
    setAccount("");
    setBankName("");
    setAccountName("");
    setAccountNumber("");
    setBranch("");
    setDarajaPasskey("");
    setAccountReferenceFormat("");
    setError("");
  }

  function startEdit(item: Destination) {
    const d = item.details;
    setEditingId(item.id);
    setShowForm(true);
    setMethod(item.method);
    setLabel(item.label ?? "");
    setNumber(d.number ?? "");
    setTill(d.till ?? "");
    setPaybill(d.paybill ?? "");
    setAccount(d.account ?? "");
    setBankName(d.bank_name ?? "");
    setAccountName(d.account_name ?? "");
    setAccountNumber("");
    setBranch(d.branch ?? "");
    setDarajaPasskey("");
    setAccountReferenceFormat(item.account_reference_format ?? "");
    setError("");
  }

  function details() {
    if (method === "mpesa_number") return { number };
    if (method === "mpesa_till") return { till };
    if (method === "mpesa_paybill") return { paybill, account };
    return { bank_name: bankName, account_name: accountName, account_number: accountNumber, branch };
  }

  async function save() {
    if (!propertyId) return;
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload: Record<string, unknown> = {
        property_id: propertyId,
        method,
        label: label.trim() || null,
        details: details(),
        is_active: true,
      };

      if (method === "mpesa_paybill" || method === "mpesa_till") {
        payload.daraja_shortcode_type = method === "mpesa_till" ? "Till" : "PayBill";
        payload.account_reference_format = accountReferenceFormat.trim() || null;
        // Never send an empty passkey while editing: the API omits secrets from responses.
        if (darajaPasskey.trim()) payload.daraja_passkey = darajaPasskey.trim();
      }

      const body = JSON.stringify(payload);

      if (editingId) {
        await apiRequest(`/organization/payment-destinations/${editingId}`, { method: "PATCH", body });
        setMessage("Payment destination updated.");
      } else {
        await apiRequest("/organization/payment-destinations", { method: "POST", body });
        setMessage("Payment destination added.");
      }

      resetForm();
      await loadDestinations();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not save the payment destination.");
    } finally {
      setSaving(false);
    }
  }

  async function disable(item: Destination) {
    if (!window.confirm(`Disable ${METHOD_LABEL[item.method]} for ${selectedProperty?.name ?? "this property"}?`)) return;
    try {
      await apiRequest(`/organization/payment-destinations/${item.id}`, { method: "DELETE" });
      setMessage("Payment destination disabled.");
      await loadDestinations();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not disable the payment destination.");
    }
  }

  if (!owner) return null;

  return (
    <section className="mg-panel">
      <div className="mg-panel__head">
        <h2 className="mg-panel__title"><Wallet /> Payment destinations</h2>
        <span className="mg-panel__meta">What tenants can pay to</span>
      </div>

      <div className="mg-panel__body">
        <p className="mg-hint" style={{ marginTop: 0 }}>
          Add the payment destinations tenants should see for each property. You can offer more than one option.
        </p>

        <label className="mg-field" style={{ marginTop: "1rem" }}>
          <span className="mg-label">Property</span>
          <select className="mg-select" value={propertyId ?? ""} onChange={(e) => { setPropertyId(Number(e.target.value) || null); resetForm(); }}>
            <option value="">Select property</option>
            {properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}
          </select>
        </label>

        {propertyId && (
          <>
            <div style={{ display: "grid", gap: ".75rem", marginTop: "1rem" }}>
              {destinations.map((item) => (
                <article key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", padding: "1rem", border: "1px solid var(--pms-border-soft)", borderRadius: ".75rem", background: "var(--pms-glass)" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: ".75rem", minWidth: 0 }}>
                    <span aria-hidden="true" style={{ display: "inline-flex", marginTop: ".1rem" }}>
                      {item.method === "bank" ? <Building2 size={20} /> : <Smartphone size={20} />}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ display: "block" }}>{item.label || METHOD_LABEL[item.method]}</strong>
                      <span className="mg-hint" style={{ display: "block", marginTop: ".15rem", overflowWrap: "anywhere" }}>{destinationSummary(item)}</span>
                      {(item.method === "mpesa_paybill" || item.method === "mpesa_till") && (
                        <span className="mg-hint" style={{ display: "block", marginTop: ".3rem" }}>
                          Daraja: {item.daraja?.authorization_status === "ready" ? "Ready for STK Push" : item.daraja?.authorization_status === "awaiting_merchant_authorization" ? "Awaiting merchant authorization" : "Not configured"}
                          {item.daraja?.stk_push_available ? " · STK Push available" : " · STK Push disabled"}
                          {" · C2B: "}{item.daraja?.c2b_authorization_status === "ready" ? "authorized" : item.daraja?.c2b_authorization_status === "awaiting_merchant_authorization" ? "awaiting verification" : "not configured"}
                          {item.daraja?.c2b_registration_status === "registered" ? " · C2B callback registered" : " · C2B callback not registered"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mg-actions">
                    <button type="button" className="mg-btn mg-btn--ghost" onClick={() => startEdit(item)}>Edit</button>
                    <button type="button" className="mg-btn mg-btn--ghost" onClick={() => void disable(item)}><Trash2 />Disable</button>
                  </div>
                </article>
              ))}

              {onlineAvailable && (
                <article style={{ display: "flex", alignItems: "center", gap: ".75rem", padding: "1rem", border: "1px solid var(--pms-border-soft)", borderRadius: ".75rem", background: "var(--pms-glass)" }}>
                  <Banknote size={20} />
                  <div>
                    <strong style={{ display: "block" }}>Online payment</strong>
                    <span className="mg-hint">Tenants can pay securely by M-PESA, card or bank transfer.</span>
                  </div>
                  <span className="mg-panel__meta" style={{ marginLeft: "auto" }}><CheckCircle2 size={15} style={{ verticalAlign: "middle" }} /> Available</span>
                </article>
              )}
            </div>

            {!showForm && (
              <div className="mg-actions" style={{ marginTop: "1rem" }}>
                <button type="button" className="mg-btn mg-btn--primary" onClick={() => setShowForm(true)}><Plus /> Add payment destination</button>
              </div>
            )}

            {showForm && (
              <div style={{ marginTop: "1rem", padding: "1rem", border: "1px solid var(--pms-border-soft)", borderRadius: ".75rem" }}>
                <div className="mg-grid2">
                  <label className="mg-field">
                    <span className="mg-label">Payment type</span>
                    <select className="mg-select" value={method} onChange={(e) => setMethod(e.target.value as Method)}>
                      <option value="mpesa_paybill">M-PESA PayBill</option>
                      <option value="mpesa_till">M-PESA Till</option>
                      <option value="mpesa_number">M-PESA number</option>
                      <option value="bank">Bank account</option>
                    </select>
                  </label>
                  <label className="mg-field">
                    <span className="mg-label">Label (optional)</span>
                    <input className="mg-input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Rent payments" />
                  </label>
                </div>

                {method === "mpesa_number" && <label className="mg-field"><span className="mg-label">M-PESA number</span><input className="mg-input" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="0712345678" /></label>}
                {method === "mpesa_till" && <label className="mg-field"><span className="mg-label">Till number</span><input className="mg-input" value={till} onChange={(e) => setTill(e.target.value)} placeholder="Enter Till number" /></label>}
                {method === "mpesa_paybill" && <div className="mg-grid2"><label className="mg-field"><span className="mg-label">PayBill number</span><input className="mg-input" value={paybill} onChange={(e) => setPaybill(e.target.value)} placeholder="Enter PayBill number" /></label><label className="mg-field"><span className="mg-label">Account / reference</span><input className="mg-input" value={account} onChange={(e) => setAccount(e.target.value)} placeholder="ABC Properties" /></label></div>}

                {(method === "mpesa_paybill" || method === "mpesa_till") && (
                  <div style={{ marginTop: ".75rem", padding: ".85rem", border: "1px solid var(--pms-border-soft)", borderRadius: ".65rem" }}>
                    <strong style={{ display: "block", marginBottom: ".35rem" }}>Daraja STK Push setup</strong>
                    <p className="mg-hint" style={{ marginTop: 0 }}>
                      MARSWebz manages the platform app credentials. Enter the merchant passkey for this destination only if Safaricom has provisioned STK Push for this shortcode. The passkey is encrypted on the server and never returned to this page.
                    </p>
                    <label className="mg-field">
                      <span className="mg-label">Merchant shortcode type</span>
                      <input className="mg-input" value={method === "mpesa_till" ? "Till" : "PayBill"} readOnly />
                    </label>
                    <label className="mg-field">
                      <span className="mg-label">Merchant STK passkey</span>
                      <input className="mg-input" type="password" autoComplete="new-password" value={darajaPasskey} onChange={(e) => setDarajaPasskey(e.target.value)} placeholder={editingId ? "Leave blank to keep the saved passkey" : "Enter merchant passkey"} />
                    </label>
                    <label className="mg-field">
                      <span className="mg-label">Account reference format (for C2B reconciliation)</span>
                      <input className="mg-input" value={accountReferenceFormat} onChange={(e) => setAccountReferenceFormat(e.target.value)} placeholder="51683/{unit}" />
                      <span className="mg-hint">Use {"{unit}"} or {"{lease}"} as a placeholder, e.g. 51683/{"{unit}"}. C2B automatic matching is a follow-up step; this template must match the reference format configured for the merchant PayBill.</span>
                    </label>
                    {editingId && destinations.find((item) => item.id === editingId)?.daraja && (
                      <p className="mg-hint">
                        Current status: {destinations.find((item) => item.id === editingId)?.daraja?.authorization_status ?? "not configured"}.
                        Saving a new shortcode or passkey returns the destination to authorization review; entering credentials alone does not mark it ready.
                      </p>
                    )}
                  </div>
                )}
                {method === "bank" && <div className="mg-grid2"><label className="mg-field"><span className="mg-label">Bank</span><input className="mg-input" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="KCB" /></label><label className="mg-field"><span className="mg-label">Account name</span><input className="mg-input" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="ABC Properties Ltd" /></label><label className="mg-field"><span className="mg-label">Account number</span><input className="mg-input" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder={editingId ? "Leave blank to keep current" : "Account number"} /></label><label className="mg-field"><span className="mg-label">Branch</span><input className="mg-input" value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="Branch" /></label></div>}

                {error && <p className="mg-hint" style={{ color: "#a33" }}>{error}</p>}
                {message && <p className="mg-hint" style={{ color: "#19734a" }}>{message}</p>}

                <div className="mg-actions" style={{ marginTop: "1rem" }}>
                  <button type="button" className="mg-btn mg-btn--subtle" onClick={resetForm}>Cancel</button>
                  <button type="button" className="mg-btn mg-btn--primary" disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : editingId ? "Save changes" : "Add destination"}</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
