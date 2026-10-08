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
  ArrowRight,
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
 
type PaymentStatus = "paid" | "pending" | "overdue" | "partial" | "failed";
type PayMethod = "flutterwave";
 
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
  return method.charAt(0).toUpperCase() + method.slice(1).replace(/_/g, " ");
}
 
const STATUS_LABEL: Record<PaymentStatus, string> = {
  paid: "Paid",
  pending: "Pending",
  overdue: "Overdue",
  partial: "Part paid",
  failed: "Failed",
};
 
function statusTone(status: PaymentStatus | null): string {
  if (status === "paid") return "tp-pill--good";
  if (status === "pending" || status === "partial") return "tp-pill--wait";
  if (status === "overdue" || status === "failed") return "tp-pill--bad";
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
  { key: "flutterwave", label: "Flutterwave", icon: <CreditCard /> },
];  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = Number(amount);

    if (!Number.isFinite(value) || value <= 0) {
      setSubmitError("Enter the amount you want to pay.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const response = (await apiRequest("/tenant/payments", {
        method: "POST",
        body: JSON.stringify({
          amount: value,
          payment_method: "flutterwave",
        }),
      })) as { checkout_url?: string };

      if (!response.checkout_url) {
        throw new Error("Flutterwave did not return a checkout link.");
      }

      window.location.assign(response.checkout_url);
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
;