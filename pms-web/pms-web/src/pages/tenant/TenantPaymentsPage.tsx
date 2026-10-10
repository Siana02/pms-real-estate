import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import TenantDashboardLayout from "../../layouts/TenantDashboardLayout";
import { apiRequest } from "../../services/api";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Building2,
  Download,
  Loader2,
  Receipt,
  Search,
  Smartphone,
  Wallet,
  X,
} from "lucide-react";
 
/* ------------------------------------------------------------------ */
/*  STYLES — vanilla CSS                                               */
/* ------------------------------------------------------------------ */
 
const styles = `
.tpay-stack {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}
 
/* ---------- balance ---------- */
.tpay-lead {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}
 
.tpay-balance {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem;
  border-radius: var(--tp-r-lg);
  border: 1px solid #c7dbff;
  background: linear-gradient(180deg, #f5f9ff, var(--tp-surface) 62%);
}
 
.tpay-balance__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}
 
.tpay-balance__amount {
  margin: 0.5rem 0 0;
  font-size: 2.25rem;
  font-weight: 700;
  letter-spacing: -0.035em;
  line-height: 1.1;
}
 
.tpay-balance__due {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin: 0.4375rem 0 0;
  font-size: 0.875rem;
  color: var(--tp-muted);
}
 
.tpay-balance__due svg { width: 0.9375rem; height: 0.9375rem; }
 
.tpay-balance__actions { display: flex; flex-wrap: wrap; gap: 0.625rem; }
 
.tpay-side {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}
 
.tpay-stat { display: flex; flex-direction: column; justify-content: center; }
.tpay-stat dd {
  margin: 0.3125rem 0 0;
  font-size: 1.375rem;
  font-weight: 700;
  letter-spacing: -0.03em;
}
.tpay-stat small { display: block; margin-top: 0.25rem; font-size: 0.75rem; color: var(--tp-muted); }
 
/* ---------- filters ---------- */
.tpay-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.625rem;
}
 
.tpay-search { position: relative; flex: 1 1 14rem; }
 
.tpay-search svg {
  position: absolute;
  top: 50%;
  left: 0.75rem;
  width: 1rem;
  height: 1rem;
  transform: translateY(-50%);
  color: var(--tp-faint);
  pointer-events: none;
}
 
.tpay-search input {
  width: 100%;
  min-height: 2.5rem;
  padding: 0 0.75rem 0 2.25rem;
  border-radius: var(--tp-r-sm);
  border: 1px solid var(--tp-line);
  background: var(--tp-surface);
  outline: none;
}
 
.tpay-search input:focus { border-color: var(--tp-blue); }
 
.tpay-chips { display: flex; flex-wrap: wrap; gap: 0.375rem; }
 
.tpay-chip {
  min-height: 2.25rem;
  padding: 0 0.75rem;
  border-radius: var(--tp-r-sm);
  border: 1px solid var(--tp-line);
  background: var(--tp-surface);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--tp-ink-soft);
  transition: background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease;
}
 
.tpay-chip:hover { background: var(--tp-surface-sunken); }
 
.tpay-chip[aria-pressed="true"] {
  border-color: #bfdbfe;
  background: var(--tp-surface-tint);
  color: var(--tp-blue-dark);
}
 
/* ---------- table ---------- */
.tpay-table-wrap {
  display: none;
  border-radius: var(--tp-r-lg);
  border: 1px solid var(--tp-line);
  background: var(--tp-surface);
  overflow: hidden;
}
 
.tpay-table { width: 100%; border-collapse: collapse; }
 
.tpay-table th {
  position: sticky;
  top: 0;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--tp-line);
  background: var(--tp-surface-sunken);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-align: left;
  color: var(--tp-faint);
}
 
.tpay-table td {
  padding: 0.9375rem 1rem;
  border-bottom: 1px solid var(--tp-line-soft);
  font-size: 0.875rem;
  vertical-align: middle;
}
 
.tpay-table tr:last-child td { border-bottom: none; }
.tpay-table tbody tr:hover { background: #fafbfd; }
 
.tpay-num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }
.tpay-period { font-weight: 600; }
.tpay-ref { font-size: 0.75rem; color: var(--tp-faint); }
 
.tpay-receipt {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--tp-blue);
}
 
.tpay-receipt svg { width: 0.875rem; height: 0.875rem; }
 
/* ---------- mobile list ---------- */
.tpay-cards { display: flex; flex-direction: column; }
 
.tpay-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.25rem 0.75rem;
  padding: 0.9375rem 0;
  border-top: 1px solid var(--tp-line-soft);
}
 
.tpay-item:first-child { border-top: none; padding-top: 0; }
.tpay-item__period { margin: 0; font-size: 0.9375rem; font-weight: 600; }
.tpay-item__meta { margin: 0; font-size: 0.75rem; color: var(--tp-muted); }
.tpay-item__amount { margin: 0; font-size: 0.9375rem; font-weight: 700; text-align: right; font-variant-numeric: tabular-nums; }
.tpay-item__status { justify-self: end; }
 
/* ---------- modal ---------- */
.tpay-scrim {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(3px);
  animation: tpay-fade 0.18s ease;
}
 
@keyframes tpay-fade { from { opacity: 0; } to { opacity: 1; } }
 
.tpay-modal {
  width: 100%;
  max-width: 30rem;
  max-height: 92vh;
  overflow-y: auto;
  padding: 1.25rem;
  border-radius: var(--tp-r-lg) var(--tp-r-lg) 0 0;
  background: var(--tp-surface);
  box-shadow: var(--tp-shadow-pop);
  animation: tpay-rise 0.22s ease;
}
 
@keyframes tpay-rise {
  from { transform: translateY(16px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
 
.tpay-modal__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}
 
.tpay-modal__title { margin: 0; font-size: 1.125rem; font-weight: 700; letter-spacing: -0.02em; }
.tpay-modal__sub { margin: 0.25rem 0 0; font-size: 0.8125rem; color: var(--tp-muted); }
 
.tpay-form { display: flex; flex-direction: column; gap: 1.125rem; }
 
.tpay-field { display: flex; flex-direction: column; gap: 0.375rem; }
 
.tpay-field > label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--tp-ink-soft);
}
 
.tpay-field input,
.tpay-field textarea {
  min-height: 2.625rem;
  padding: 0.5rem 0.75rem;
  border-radius: var(--tp-r-sm);
  border: 1px solid var(--tp-line);
  background: var(--tp-surface);
  outline: none;
}
 
.tpay-field input:focus,
.tpay-field textarea:focus { border-color: var(--tp-blue); }
 
.tpay-methods { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.5rem; }
 
.tpay-method {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  padding: 0.75rem 0.5rem;
  border-radius: var(--tp-r-sm);
  border: 1px solid var(--tp-line);
  background: var(--tp-surface);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--tp-ink-soft);
  transition: border-color 0.18s ease, background-color 0.18s ease, color 0.18s ease;
}
 
.tpay-method svg { width: 1.125rem; height: 1.125rem; color: var(--tp-muted); }
 
.tpay-method[aria-pressed="true"] {
  border-color: var(--tp-blue);
  background: var(--tp-surface-tint);
  color: var(--tp-blue-dark);
}
 
.tpay-method[aria-pressed="true"] svg { color: var(--tp-blue); }
 
.tpay-modal__foot { display: flex; flex-wrap: wrap; gap: 0.625rem; }
.tpay-modal__foot .tp-btn { flex: 1 1 9rem; min-width: 0; justify-content: center; }
 
.tpay-error {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  border-radius: var(--tp-r-sm);
  border: 1px solid #fecaca;
  background: var(--tp-red-pale);
  font-size: 0.8125rem;
  color: var(--tp-red);
}
 
.tpay-error svg { width: 0.9375rem; height: 0.9375rem; flex: none; margin-top: 0.125rem; }
 
.tpay-done { display: flex; flex-direction: column; align-items: center; gap: 0.625rem; padding: 1.25rem 0.5rem 0.5rem; text-align: center; }
.tpay-done svg { width: 2.25rem; height: 2.25rem; color: var(--tp-green); }
.tpay-done h3 { margin: 0; font-size: 1.0625rem; font-weight: 700; }
.tpay-done p { margin: 0; font-size: 0.875rem; color: var(--tp-muted); }
 
.tpay-spin { animation: tpay-rotate 0.9s linear infinite; }
@keyframes tpay-rotate { to { transform: rotate(360deg); } }
 
.tpay-skeleton { height: 11rem; }
 
/* ---------- tablet / desktop ---------- */
@media (min-width: 640px) {
  .tpay-scrim { align-items: center; padding: 1.5rem; }
  .tpay-modal { border-radius: var(--tp-r-lg); padding: 1.5rem; }
  .tpay-table-wrap { display: block; }
  .tpay-cards { display: none; }
  .tpay-balance__amount { font-size: 2.5rem; }
}
 
@media (min-width: 1024px) {
  .tpay-lead { grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); }
}
`;
 
/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */
 
type PaymentStatus = "paid" | "pending" | "received" | "rejected" | "overdue" | "partial" | "failed";
type PayMethod = "flutterwave" | "mpesa" | "mpesa_stk" | "bank_transfer";
 
interface TenantPayment {
  id: number | string;
  period: string | null;
  amount: number | string | null;
  payment_date: string | null;
  payment_method: string | null;
  reference: string | null;
  status: PaymentStatus | null;
  receipt_url: string | null;
}
 
interface RentSummary {
  amount_due: number | string | null;
  due_date: string | null;
  status: PaymentStatus | null;
  balance: number | string | null;
  monthly_rent: number | string | null;
  paid_this_year: number | string | null;
}

interface PaymentDestination {
  id: number;
  method: "mpesa_number" | "mpesa_till" | "mpesa_paybill" | "bank";
  label: string | null;
  details: Record<string, string | null>;
}

interface PaymentOptions {
  destinations: PaymentDestination[];
  online: { available: boolean; label?: string; description?: string };
  stk_push?: { available: boolean; label?: string; description?: string; reason?: string | null; payment_destination_id?: number | null };
  tenant_payment_reference?: string | null;
}
 
/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */
 
function readStored(key: string): string | null {
  return localStorage.getItem(key) ?? sessionStorage.getItem(key);
}
 
function readCurrency(): string {
  const raw = readStored("organization");
  if (!raw) return "KSh";
 
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      const value = (parsed as Record<string, unknown>).currency;
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  } catch {
    /* fall through to the default */
  }
 
  return "KSh";
}
 
function toNumber(value: number | string | null | undefined): number {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : 0;
}
 
function money(value: number | string | null | undefined, currency: string) {
  return `${currency} ${new Intl.NumberFormat("en-KE", {
    maximumFractionDigits: 0,
  }).format(Math.round(toNumber(value)))}`;
}
 
function longDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
 
function periodLabel(payment: TenantPayment): string {
  if (payment.period) return payment.period;
  if (!payment.payment_date) return "Payment";
 
  const date = new Date(payment.payment_date);
  if (Number.isNaN(date.getTime())) return "Payment";
 
  return date.toLocaleDateString("en-KE", { month: "long", year: "numeric" });
}
 
function methodLabel(method: string | null): string {
  if (!method) return "—";
  if (method === "mpesa") return "M-PESA";
  if (method === "bank_transfer") return "Bank transfer";
  if (method === "flutterwave") return "Online payment";
  return method.charAt(0).toUpperCase() + method.slice(1).replace(/_/g, " ");
}

function destinationLabel(destination: PaymentDestination): string {
  return destination.label || ({
    mpesa_number: "M-PESA",
    mpesa_till: "M-PESA Till",
    mpesa_paybill: "M-PESA PayBill",
    bank: "Bank transfer",
  } as Record<string, string>)[destination.method];
}

function destinationDetail(destination: PaymentDestination): string {
  const details = destination.details;
  if (destination.method === "mpesa_number") return `Send to ${details.number ?? "—"}`;
  if (destination.method === "mpesa_till") return `Till ${details.till ?? "—"}`;
  if (destination.method === "mpesa_paybill") return `PayBill ${details.paybill ?? "—"} · Account ${details.account ?? "—"}`;
  return [details.bank_name, details.account_name, details.account_number ? `Account ••••${details.account_number.slice(-4)}` : null, details.branch].filter(Boolean).join(" · ");
}
 
const STATUS_LABEL: Record<PaymentStatus, string> = {
  paid: "Paid",
  pending: "Pending confirmation",
  received: "Pending confirmation",
  rejected: "Payment rejected",
  overdue: "Overdue",
  partial: "Part paid",
  failed: "Payment failed",
};
 
function statusTone(status: PaymentStatus | null): string {
  if (status === "paid") return "tp-pill--good";
  if (status === "pending" || status === "received" || status === "partial") return "tp-pill--wait";
  if (status === "overdue" || status === "failed" || status === "rejected") return "tp-pill--bad";
  return "tp-pill--mute";
}
 
function unwrap<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && "data" in payload) {
    const data = (payload as { data?: unknown }).data;
    if (Array.isArray(data)) return data as T[];
  }
  return [];
}
 
function unwrapSummary(payload: unknown): RentSummary | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const summary = record.summary ?? record.rent;
  return summary && typeof summary === "object"
    ? (summary as RentSummary)
    : null;
}
 
const FILTERS: { key: "all" | "paid" | "pending"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "paid", label: "Paid" },
  { key: "pending", label: "Outstanding" },
];
 
const METHODS: { key: PayMethod; label: string; icon: ReactNode }[] = [
  { key: "flutterwave", label: "Pay online", icon: <CreditCard /> },
  { key: "mpesa", label: "M-PESA manual payment", icon: <Smartphone /> },
  { key: "mpesa_stk", label: "M-PESA STK Push", icon: <Smartphone /> },
  { key: "bank_transfer", label: "Bank transfer", icon: <Wallet /> },
];
 
/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */
 
function TenantPaymentsPage() {
  const currency = useMemo(readCurrency, []);
  const [searchParams, setSearchParams] = useSearchParams();
 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payments, setPayments] = useState<TenantPayment[]>([]);
  const [summary, setSummary] = useState<RentSummary | null>(null);
  const [paymentOptions, setPaymentOptions] = useState<PaymentOptions>({
    destinations: [],
    online: { available: false },
    stk_push: { available: false },
  });
 
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "paid" | "pending">("all");
 
  const [payOpen, setPayOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PayMethod>("flutterwave");
  const [destinationId, setDestinationId] = useState("");
  const [reference, setReference] = useState("");
  const [phone, setPhone] = useState("");
  const [gatewayNotice, setGatewayNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);
 
  const load = useCallback(async () => {
    try {
      const response = await apiRequest("/tenant/payments");
      setPayments(unwrap<TenantPayment>(response));
      setSummary(unwrapSummary(response));
      if (response && typeof response === "object") {
        const options = (response as { payment_options?: PaymentOptions }).payment_options;
        if (options) setPaymentOptions(options);
      }
      setError("");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "We couldn't load your payment history."
      );
    } finally {
      setLoading(false);
    }
  }, []);
 
  useEffect(() => {
    void load();
  }, [load]);
 
  useEffect(() => {
    if (searchParams.get("action") === "pay") setPayOpen(true);

    const gateway = searchParams.get("flutterwave");
    if (gateway === "paid") {
      setGatewayNotice("Payment verified successfully. Your balance will reflect the confirmed payment.");
    } else if (gateway === "failed" || gateway === "verification_failed") {
      setGatewayNotice("The Flutterwave payment was not completed. You can try again.");
    }
  }, [searchParams]);
 
  useEffect(() => {
    if (!payOpen) return;
    setAmount(String(Math.round(toNumber(summary?.balance ?? summary?.amount_due))) || "");
    if (method === "flutterwave" && !paymentOptions.online.available) {
      setMethod(
        paymentOptions.stk_push?.available
          ? "mpesa_stk"
          : paymentOptions.destinations.some((item) => item.method.startsWith("mpesa"))
            ? "mpesa"
            : "bank_transfer"
      );
    }
  }, [payOpen, summary, paymentOptions, method]);
 
  const outstanding = toNumber(
    summary?.balance ?? summary?.amount_due ?? undefined
  );
 
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
 
    return payments.filter((payment) => {
      if (filter === "paid" && payment.status !== "paid") return false;
      if (filter === "pending" && payment.status === "paid") return false;
      if (!term) return true;
 
      return [
        periodLabel(payment),
        payment.reference ?? "",
        methodLabel(payment.payment_method),
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [payments, filter, query]);
 
  function openPay(nextMethod?: PayMethod, nextDestinationId = "") {
    setDestinationId(nextDestinationId);
    setReference("");
    setPhone("");
    const fallback: PayMethod = paymentOptions.online.available
      ? "flutterwave"
      : paymentOptions.stk_push?.available
        ? "mpesa_stk"
        : paymentOptions.destinations.some((item) => item.method.startsWith("mpesa"))
          ? "mpesa"
          : "bank_transfer";
    setMethod(nextMethod ?? fallback);
    setPayOpen(true);
  }

  function closePay() {
    setPayOpen(false);
    setSubmitError("");
    setSubmitted(false);
 
    if (searchParams.get("action")) {
      const next = new URLSearchParams(searchParams);
      next.delete("action");
      setSearchParams(next, { replace: true });
    }
  }
 
  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = Number(amount);

    if (!Number.isFinite(value) || value <= 0) {
      setSubmitError("Enter the amount you want to pay.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      if (method === "mpesa_stk") {
        if (!phone.trim()) throw new Error("Enter the phone number that should receive the M-PESA prompt.");
        await apiRequest("/tenant/mpesa/stk-push", {
          method: "POST",
          body: JSON.stringify({ amount: value, phone: phone.trim() }),
        });
        setSubmitted(true);
        return;
      }

      const response = (await apiRequest("/tenant/payments", {
          method: "POST",
          body: JSON.stringify({
            amount: value,
            payment_method: method,
            payment_destination_id: method === "flutterwave" ? undefined : Number(destinationId),
            reference: method === "flutterwave" ? undefined : reference.trim(),
          }),
      })) as { checkout_url?: string };

      if (method === "flutterwave") {
        if (!response.checkout_url) throw new Error("Secure checkout could not be started.");
        window.location.assign(response.checkout_url);
      } else {
        setSubmitted(true);
        await load();
      }
    } catch (caught) {
      setSubmitError(
        caught instanceof Error
          ? caught.message
          : "We couldn't start that payment. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }


  return (
    <TenantDashboardLayout
      title="Payments"
      subtitle="Your rent balance, receipts and full payment history."
      actions={
        <button
          type="button"
          className="tp-btn tp-btn--primary"
          onClick={() => openPay()}
        >
          <CreditCard />
          Pay rent
        </button>
      }
    >
      <style>{styles}</style>
 
      {gatewayNotice && (
        <p className="tpay-error" role="status">{gatewayNotice}</p>
      )}

      <div className="tpay-stack">
        {error && (
          <p className="tpay-error" role="status">
            <AlertTriangle />
            {error}
          </p>
        )}
 
        <section className="tpay-lead" aria-label="Rent balance">
          {loading ? (
            <span className="tp-skeleton tpay-skeleton" />
          ) : (
            <article className="tpay-balance">
              <div className="tpay-balance__top">
                <div>
                  <p className="tp-label">Current balance</p>
                  <p className="tpay-balance__amount tp-money">
                    {money(outstanding, currency)}
                  </p>
                  <p className="tpay-balance__due">
                    <CalendarClock />
                    {summary?.due_date
                      ? `Due ${longDate(summary.due_date)}`
                      : "No payment scheduled"}
                  </p>
                </div>
 
                <span className={`tp-pill ${statusTone(summary?.status ?? null)}`}>
                  {STATUS_LABEL[summary?.status ?? "pending"]}
                </span>
              </div>
 
              <div className="tpay-balance__actions">
                <button
                  type="button"
                  className="tp-btn tp-btn--primary"
                  onClick={() => setPayOpen(true)}
                  disabled={outstanding <= 0}
                >
                  <CreditCard />
                  {outstanding > 0 ? "Pay rent" : "Nothing due"}
                </button>
                <button type="button" className="tp-btn tp-btn--quiet">
                  <Download />
                  Download statement
                </button>
              </div>
            </article>
          )}
 
          {loading ? (
            <span className="tp-skeleton tpay-skeleton" />
          ) : (
            <div className="tpay-side">
              <article className="tp-card tpay-stat">
                <dl>
                  <dt className="tp-label">Monthly rent</dt>
                  <dd className="tp-money">
                    {money(summary?.monthly_rent, currency)}
                  </dd>
                </dl>
                <small>Per your active lease</small>
              </article>
 
              <article className="tp-card tpay-stat">
                <dl>
                  <dt className="tp-label">Paid this year</dt>
                  <dd className="tp-money">
                    {money(summary?.paid_this_year, currency)}
                  </dd>
                </dl>
                <small>
                  {payments.filter((p) => p.status === "paid").length} receipts
                </small>
              </article>
            </div>
          )}
        </section>

        <section className="tp-section" aria-label="Available payment methods">
          <div className="tp-section__head">
            <div>
              <h2 className="tp-section__title">Payment options</h2>
              <p className="tp-section__sub">Choose how you want to pay. Your property manager's payment destinations are shown here before you confirm a manual payment.</p>
              {paymentOptions.tenant_payment_reference && (
                <p className="tp-section__sub" style={{ marginTop: ".5rem" }}>
                  Paying directly through M-PESA PayBill? Use this as the account/reference for automatic matching: <strong><code>{paymentOptions.tenant_payment_reference}</code></strong>
                </p>
              )}
            </div>
          </div>

          <div className="tpay-methods" style={{ marginTop: "1rem" }}>
            {paymentOptions.online.available && (
              <button type="button" className="tpay-method" onClick={() => openPay("flutterwave")}>
                <CreditCard />
                <span><strong style={{ display: "block" }}>Pay online</strong><small style={{ color: "var(--tp-muted)" }}>Secure checkout by M-PESA, card or bank transfer.</small></span>
              </button>
            )}
            {paymentOptions.stk_push?.available && (
              <button type="button" className="tpay-method" onClick={() => openPay("mpesa_stk")}>
                <Smartphone />
                <span><strong style={{ display: "block" }}>Pay with M-PESA prompt</strong><small style={{ color: "var(--tp-muted)" }}>Get a secure STK Push prompt on your phone.</small></span>
              </button>
            )}
            {paymentOptions.destinations.map((destination) => (
              <button key={destination.id} type="button" className="tpay-method" onClick={() => {
                openPay(destination.method === "bank" ? "bank_transfer" : "mpesa", String(destination.id));
              }}>
                {destination.method === "bank" ? <Building2 /> : <Smartphone />}
                <span><strong style={{ display: "block" }}>{destinationLabel(destination)}</strong><small style={{ color: "var(--tp-muted)" }}>{destinationDetail(destination)}</small></span>
              </button>
            ))}
            {!paymentOptions.online.available && !paymentOptions.stk_push?.available && paymentOptions.destinations.length === 0 && (
              <div className="tp-card tp-empty"><Wallet /><p className="tp-empty__text">No payment destinations have been configured yet.</p></div>
            )}
          </div>
        </section>
 
        <section className="tp-section" aria-label="Payment history">
          <div className="tp-section__head">
            <div>
              <h2 className="tp-section__title">Payment history</h2>
              <p className="tp-section__sub">
                Every rent payment recorded against your unit.
              </p>
            </div>
          </div>
 
          <div className="tpay-tools">
            <div className="tpay-search">
              <Search />
              <label className="tp-sr" htmlFor="payment-search">
                Search payments
              </label>
              <input
                id="payment-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by month or reference…"
              />
            </div>
 
            <div className="tpay-chips" role="group" aria-label="Filter payments">
              {FILTERS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className="tpay-chip"
                  aria-pressed={filter === option.key}
                  onClick={() => setFilter(option.key)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
 
          {loading ? (
            <span className="tp-skeleton tpay-skeleton" />
          ) : filtered.length === 0 ? (
            <div className="tp-card tp-empty">
              <span className="tp-empty__icon">
                <Receipt />
              </span>
              <h3 className="tp-empty__title">
                {payments.length === 0
                  ? "No payments yet"
                  : "Nothing matches that search"}
              </h3>
              <p className="tp-empty__text">
                {payments.length === 0
                  ? "When your property manager records a rent payment, the receipt will appear here."
                  : "Try a different month, reference or filter."}
              </p>
            </div>
          ) : (
            <>
              <div className="tpay-table-wrap">
                <table className="tpay-table">
                  <thead>
                    <tr>
                      <th scope="col">Period</th>
                      <th scope="col">Date</th>
                      <th scope="col">Method</th>
                      <th scope="col">Status</th>
                      <th scope="col" style={{ textAlign: "right" }}>
                        Amount
                      </th>
                      <th scope="col" style={{ textAlign: "right" }}>
                        Receipt
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((payment) => (
                      <tr key={String(payment.id)}>
                        <td>
                          <span className="tpay-period">
                            {periodLabel(payment)}
                          </span>
                          {payment.reference && (
                            <div className="tpay-ref">{payment.reference}</div>
                          )}
                        </td>
                        <td>{longDate(payment.payment_date)}</td>
                        <td>{methodLabel(payment.payment_method)}</td>
                        <td>
                          <span
                            className={`tp-pill ${statusTone(payment.status)}`}
                          >
                            {STATUS_LABEL[payment.status ?? "pending"]}
                          </span>
                        </td>
                        <td className="tpay-num tp-money">
                          {money(payment.amount, currency)}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {payment.status === "paid" ? (
                            <a
                              className="tpay-receipt"
                              href={payment.receipt_url ?? "#"}
                            >
                              <Download />
                              Receipt
                            </a>
                          ) : (
                            <span className="tpay-ref">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
 
              <div className="tp-card tpay-cards">
                {filtered.map((payment) => (
                  <div className="tpay-item" key={`m-${payment.id}`}>
                    <p className="tpay-item__period">{periodLabel(payment)}</p>
                    <p className="tpay-item__amount tp-money">
                      {money(payment.amount, currency)}
                    </p>
                    <p className="tpay-item__meta">
                      {longDate(payment.payment_date)} ·{" "}
                      {methodLabel(payment.payment_method)}
                    </p>
                    <span
                      className={`tp-pill tpay-item__status ${statusTone(
                        payment.status
                      )}`}
                    >
                      {STATUS_LABEL[payment.status ?? "pending"]}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
 
      {payOpen && (
        <div
          className="tpay-scrim"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pay-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) closePay();
          }}
        >
          <div className="tpay-modal">
            <div className="tpay-modal__head">
              <div>
                <h2 className="tpay-modal__title" id="pay-title">
                  Pay rent
                </h2>
                <p className="tpay-modal__sub">
                  {money(outstanding, currency)} outstanding
                  {summary?.due_date ? ` · due ${longDate(summary.due_date)}` : ""}
                </p>
              </div>
              <button
                type="button"
                className="tp-icon-btn"
                onClick={closePay}
                aria-label="Close"
              >
                <X />
              </button>
            </div>
 
            {submitted ? (
              <div className="tpay-done">
                <CheckCircle2 />
                <h3>Payment started</h3>
                <p>
                  {method === "flutterwave"
                    ? "Your online payment is being processed securely. Your balance will update after the transaction is verified."
                    : method === "mpesa_stk"
                      ? "An M-Pesa payment prompt has been sent to your phone. Enter your M-Pesa PIN to complete it. Your rent balance updates only after Safaricom confirms the payment."
                      : "Your payment reference has been submitted and is awaiting verification by your property manager."}
                </p>
                <button
                  type="button"
                  className="tp-btn tp-btn--primary"
                  onClick={closePay}
                >
                  Done
                </button>
              </div>
            ) : (
              <form className="tpay-form" onSubmit={submitPayment}>
                {submitError && (
                  <p className="tpay-error" role="alert">
                    <AlertTriangle />
                    {submitError}
                  </p>
                )}
 
                <div className="tpay-field">
                  <label htmlFor="pay-amount">Amount</label>
                  <input
                    id="pay-amount"
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder={`${currency} 0`}
                  />
                </div>
 
                <div className="tpay-field">
                  <span
                    style={{ fontSize: "0.8125rem", fontWeight: 600 }}
                    id="pay-method-label"
                  >
                    How would you like to pay?
                  </span>
                  <div className="tpay-methods" role="group" aria-labelledby="pay-method-label">
                    {METHODS.filter((option) =>
                      option.key === "flutterwave"
                        ? paymentOptions.online.available
                        : option.key === "mpesa_stk"
                          ? Boolean(paymentOptions.stk_push?.available) || paymentOptions.destinations.some((item) => ["mpesa_till", "mpesa_paybill"].includes(item.method))
                          : option.key === "mpesa"
                            ? paymentOptions.destinations.some((item) => ["mpesa_till", "mpesa_paybill", "mpesa_number"].includes(item.method))
                          : paymentOptions.destinations.some((item) => item.method === "bank")
                    ).map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        className="tpay-method"
                        aria-pressed={method === option.key}
                        disabled={option.key === "mpesa_stk" && !paymentOptions.stk_push?.available}
                        title={option.key === "mpesa_stk" && !paymentOptions.stk_push?.available
                          ? paymentOptions.stk_push?.reason ?? "STK Push is not enabled for this property yet."
                          : undefined}
                        onClick={() => {
                          if (option.key === "mpesa_stk" && !paymentOptions.stk_push?.available) return;
                          setMethod(option.key);
                          setDestinationId("");
                          setReference("");
                        }}
                      >
                        {option.icon}
                        {option.key === "mpesa_stk" && !paymentOptions.stk_push?.available
                          ? "M-PESA STK Push (not ready)"
                          : option.label}
                      </button>
                    ))}
                  </div>
                  {!paymentOptions.stk_push?.available && paymentOptions.destinations.some((item) => ["mpesa_till", "mpesa_paybill"].includes(item.method)) && (
                    <small role="status" style={{ color: "var(--tp-muted)", lineHeight: 1.5 }}>
                      STK Push isn't available yet: {paymentOptions.stk_push?.reason ?? "the property payment destination needs to be verified by the property manager."}
                      {" "}You can still pay manually using the PayBill or Till details. Manual payment does not open the M-PESA app.
                    </small>
                  )}
                </div>

                {method !== "flutterwave" && (
                  <>
                    <div className="tpay-field">
                      <label htmlFor="pay-destination">Payment destination</label>
                      <select
                        id="pay-destination"
                        value={destinationId}
                        onChange={(event) => setDestinationId(event.target.value)}
                        required
                      >
                        <option value="">Choose where to send your payment</option>
                        {paymentOptions.destinations
                          .filter((item) =>
                            method === "mpesa" || method === "mpesa_stk"
                              ? (method === "mpesa_stk" ? ["mpesa_till", "mpesa_paybill"].includes(item.method) : item.method.startsWith("mpesa"))
                              : item.method === "bank"
                          )
                          .map((item) => (
                            <option key={item.id} value={item.id}>
                              {destinationLabel(item)} — {destinationDetail(item)}
                            </option>
                          ))}
                      </select>
                    </div>
                    {destinationId && (() => {
                      const selected = paymentOptions.destinations.find((item) => String(item.id) === destinationId);
                      return selected ? (
                        <div style={{ padding: ".75rem", border: "1px solid var(--tp-line)", borderRadius: "var(--tp-r-sm)", background: "var(--tp-surface-sunken)" }}>
                          <strong>{destinationLabel(selected)}</strong>
                          <small style={{ display: "block", marginTop: ".2rem", color: "var(--tp-muted)" }}>{destinationDetail(selected)}</small>
                          {method === "mpesa" && selected.method.startsWith("mpesa") && (
                            <>
                              <p style={{ margin: ".625rem 0 0", fontSize: ".8125rem", color: "var(--tp-muted)", lineHeight: 1.5 }}>
                                Open the M-PESA menu to complete the payment. Your phone may show the SIM Toolkit or USSD flow; this does not launch or require a specific M-PESA app.
                              </p>
                              <a
                                href="tel:*334%23"
                                className="tp-btn tp-btn--quiet"
                                style={{ display: "inline-flex", marginTop: ".625rem", textDecoration: "none" }}
                              >
                                <Smartphone />
                                Open M-PESA menu (*334#)
                              </a>
                            </>
                          )}
                        </div>
                      ) : null;
                    })()}
                    {method !== "mpesa_stk" && (
                      <div className="tpay-field">
                        <label htmlFor="pay-reference">{method === "mpesa" ? "M-PESA receipt code" : "Bank transaction reference"}</label>
                        <input id="pay-reference" value={reference} onChange={(event) => setReference(event.target.value)}
                          placeholder={method === "mpesa" ? "e.g. QAB123XYZ" : "Enter your bank reference"} required />
                        <small style={{ color: "var(--tp-muted)", lineHeight: 1.5 }}>
                          {method === "mpesa"
                            ? "Pay using the PayBill, Till or number shown above first. Then enter the receipt code from the completed M-PESA confirmation—not the PayBill number or account number. Your payment stays pending until verified."
                            : "Enter the reference from your completed bank transfer. Your payment stays pending until your property manager verifies it."}
                        </small>
                      </div>
                    )}
                  </>
                )}

                {method === "mpesa_stk" && (
                  <div className="tpay-field">
                    <label htmlFor="pay-phone">M-Pesa phone number</label>
                    <input id="pay-phone" type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="07xx xxx xxx or 2547xx xxx xxx" required />
                    <small style={{ color: "var(--tp-muted)" }}>We’ll send a secure payment prompt to this number. Your payment is not recorded as paid until Safaricom confirms the receipt.</small>
                  </div>
                )}

                {method === "flutterwave" && (
                  <div style={{ padding: ".75rem", border: "1px solid var(--tp-line)", borderRadius: "var(--tp-r-sm)", background: "var(--tp-surface-sunken)" }}>
                    <strong>Secure online checkout</strong>
                    <small style={{ display: "block", marginTop: ".2rem", color: "var(--tp-muted)" }}>
                      You'll see the total and any applicable processing fee before confirming.
                    </small>
                  </div>
                )}
 
                <div className="tpay-modal__foot">
                  <button
                    type="button"
                    className="tp-btn tp-btn--quiet"
                    onClick={closePay}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="tp-btn tp-btn--primary"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="tpay-spin" />
                        Submitting…
                      </>
                    ) : (
                      <>
                        <CreditCard />
                        {method === "flutterwave" ? "Continue to checkout" : method === "mpesa_stk" ? "Send M-PESA prompt" : "I've paid"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </TenantDashboardLayout>
  );
}
 
export default TenantPaymentsPage;