import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import TenantDashboardLayout from "../../layouts/TenantDashboardLayout";
import { apiRequest } from "../../services/api";
import {
  ArrowRight,
  Bell,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  FileText,
  Home,
  MapPin,
  Megaphone,
  Phone,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Wrench,
} from "lucide-react";
 
/* ------------------------------------------------------------------ */
/*  STYLES — vanilla CSS                                               */
/* ------------------------------------------------------------------ */
 
const styles = `
.td-stack {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}
 
.td-alert {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  padding: 0.75rem 0.875rem;
  border-radius: var(--tp-r-md);
  border: 1px solid #fde68a;
  background: var(--tp-amber-pale);
  font-size: 0.8125rem;
  line-height: 1.5;
  color: #78350f;
}
 
.td-alert svg { width: 1rem; height: 1rem; flex: none; margin-top: 0.125rem; }
 
/* ---------- rent, the headline ---------- */
.td-lead {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}
 
.td-rent {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem;
  border-radius: var(--tp-r-lg);
  border: 1px solid #c7dbff;
  background: linear-gradient(180deg, #f5f9ff, var(--tp-surface) 62%);
  box-shadow: var(--tp-shadow-sm);
}
 
.td-rent__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}
 
.td-rent__amount {
  margin: 0.5rem 0 0;
  font-size: 2.25rem;
  font-weight: 700;
  letter-spacing: -0.035em;
  line-height: 1.1;
}
 
.td-rent__due {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin: 0.4375rem 0 0;
  font-size: 0.875rem;
  color: var(--tp-muted);
}
 
.td-rent__due svg { width: 0.9375rem; height: 0.9375rem; }
 
.td-rent__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.625rem;
}
 
.td-rent__actions .tp-btn { flex: 1 1 12rem; }
 
.td-rent__last {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding-top: 1rem;
  border-top: 1px solid var(--tp-line-soft);
  font-size: 0.8125rem;
  color: var(--tp-muted);
}
 
.td-rent__last svg { width: 1rem; height: 1rem; color: var(--tp-green); }
.td-rent__last strong { color: var(--tp-ink); font-weight: 600; }
.td-rent__last a { margin-left: auto; }
 
/* ---------- my home ---------- */
.td-home {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
 
.td-home__head {
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
}
 
.td-home__mark {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: var(--tp-r-md);
  background: var(--tp-surface-tint);
  color: var(--tp-blue);
}
 
.td-home__mark svg { width: 1.25rem; height: 1.25rem; }
 
.td-home__name {
  margin: 0;
  font-size: 1.0625rem;
  font-weight: 600;
  letter-spacing: -0.015em;
}
 
.td-home__where {
  display: flex;
  align-items: flex-start;
  gap: 0.375rem;
  margin: 0.25rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--tp-muted);
}
 
.td-home__where svg { width: 0.875rem; height: 0.875rem; flex: none; margin-top: 0.125rem; }
 
.td-facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.875rem 1rem;
  margin: 0;
  padding-top: 1rem;
  border-top: 1px solid var(--tp-line-soft);
}
 
.td-facts div { min-width: 0; }
.td-facts dt { margin: 0; }
.td-facts dd { margin: 0.25rem 0 0; font-size: 0.9375rem; font-weight: 600; }
 
.td-manager {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
  padding: 0.75rem 0.875rem;
  border-radius: var(--tp-r-md);
  background: var(--tp-surface-sunken);
  font-size: 0.8125rem;
  color: var(--tp-ink-soft);
}
 
.td-manager svg { width: 0.9375rem; height: 0.9375rem; color: var(--tp-muted); }
.td-manager a { color: var(--tp-blue); font-weight: 600; }
.td-manager span:first-of-type { font-weight: 600; }
 
/* ---------- two-up grid ---------- */
.td-duo {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}
 
.td-tile {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  height: 100%;
}
 
.td-tile__head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
 
.td-tile__head svg { width: 1rem; height: 1rem; color: var(--tp-muted); }
 
.td-tile__head h2 {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
}
 
.td-tile__foot { margin-top: auto; }
 
.td-counts {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}
 
.td-count dt { margin: 0; }
.td-count dd {
  margin: 0.1875rem 0 0;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.03em;
}
 
.td-count--open dd { color: var(--tp-amber); }
.td-count--done dd { color: var(--tp-green); }
 
.td-mini {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
 
.td-mini li {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 0;
  border-top: 1px solid var(--tp-line-soft);
  font-size: 0.875rem;
}
 
.td-mini li:first-child { border-top: none; padding-top: 0; }
.td-mini__title { font-weight: 500; overflow-wrap: anywhere; }
.td-mini__meta { margin-left: auto; display: flex; align-items: center; gap: 0.625rem; }
.td-mini__when { font-size: 0.75rem; color: var(--tp-faint); white-space: nowrap; }
 
/* ---------- lease ---------- */
.td-lease__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.875rem 1rem;
  margin: 0;
}
 
.td-lease__grid dt { margin: 0; }
.td-lease__grid dd { margin: 0.25rem 0 0; font-size: 0.9375rem; font-weight: 600; }
 
.td-progress {
  height: 0.375rem;
  border-radius: 999px;
  background: var(--tp-surface-sunken);
  overflow: hidden;
}
 
.td-progress span {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--tp-blue);
}
 
.td-progress__note {
  margin: 0.5rem 0 0;
  font-size: 0.75rem;
  color: var(--tp-muted);
}
 
/* ---------- notifications ---------- */
.td-feed {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}
 
.td-feed li {
  display: flex;
  gap: 0.875rem;
  padding: 0.875rem 0;
  border-top: 1px solid var(--tp-line-soft);
}
 
.td-feed li:first-child { border-top: none; padding-top: 0; }
 
.td-feed__icon {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: var(--tp-surface-sunken);
  color: var(--tp-muted);
}
 
.td-feed__icon svg { width: 0.9375rem; height: 0.9375rem; }
.td-feed__icon[data-tone="good"] { background: var(--tp-green-pale); color: var(--tp-green); }
.td-feed__icon[data-tone="wait"] { background: var(--tp-amber-pale); color: var(--tp-amber); }
.td-feed__icon[data-tone="info"] { background: var(--tp-blue-pale); color: var(--tp-blue-dark); }
 
.td-feed__body { min-width: 0; flex: 1; }
 
.td-feed__title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  overflow-wrap: anywhere;
}
 
.td-feed__text {
  margin: 0.1875rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--tp-muted);
  overflow-wrap: anywhere;
}
 
.td-feed__when {
  flex: none;
  font-size: 0.75rem;
  color: var(--tp-faint);
  white-space: nowrap;
}
 
.td-unread { position: relative; }
 
.td-unread .td-feed__title::after {
  content: "";
  display: inline-block;
  width: 0.375rem;
  height: 0.375rem;
  margin-left: 0.4375rem;
  border-radius: 50%;
  background: var(--tp-blue);
  vertical-align: middle;
}
 
/* ---------- vacancies ---------- */
.td-vacancies {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 15rem), 1fr));
  gap: 0.875rem;
}
 
.td-vacancy {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.9375rem;
  border-radius: var(--tp-r-md);
  border: 1px solid var(--tp-line);
  background: var(--tp-surface);
  transition: border-color 0.18s ease, box-shadow 0.18s ease,
    transform 0.18s ease;
}
 
.td-vacancy:hover {
  border-color: #c7dbff;
  box-shadow: var(--tp-shadow-md);
  transform: translateY(-1px);
}
 
.td-vacancy__name { margin: 0; font-size: 0.9375rem; font-weight: 600; }
 
.td-vacancy__meta {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--tp-muted);
}
 
.td-vacancy__rent {
  margin: 0.125rem 0 0;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}
 
.td-vacancy__link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.25rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--tp-blue);
}
 
.td-vacancy__link svg { width: 0.875rem; height: 0.875rem; }
 
/* ---------- loading ---------- */
.td-skeleton-lead { height: 13rem; }
.td-skeleton-tile { height: 9rem; }
 
/* ---------- tablet / desktop ---------- */
@media (min-width: 640px) {
  .td-duo { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .td-rent__amount { font-size: 2.5rem; }
  .td-rent__actions .tp-btn { flex: 0 0 auto; }
}
 
@media (min-width: 1024px) {
  .td-lead { grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); }
  .td-facts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
`;
 
/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */
 
type PaymentStatus = "paid" | "pending" | "overdue" | "partial";
type RequestStatus = "open" | "in_progress" | "completed" | "cancelled";
type LeaseStatus = "active" | "ended" | "terminated";
 
interface TenantHome {
  property_name: string | null;
  unit_number: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  bedrooms: number | string | null;
  manager_name: string | null;
  manager_phone: string | null;
  manager_email: string | null;
}
 
interface TenantLease {
  status: LeaseStatus | null;
  start_date: string | null;
  end_date: string | null;
  monthly_rent: number | string | null;
  deposit_amount: number | string | null;
}
 
interface RentSummary {
  amount_due: number | string | null;
  due_date: string | null;
  status: PaymentStatus | null;
  balance: number | string | null;
}
 
interface TenantPayment {
  id: number | string;
  amount: number | string | null;
  payment_date: string | null;
  payment_method: string | null;
  reference: string | null;
  status: PaymentStatus | null;
  period: string | null;
}
 
interface TenantRequest {
  id: number | string;
  title: string;
  status: RequestStatus | null;
  reported_date: string | null;
  completed_date: string | null;
}
 
interface TenantNotification {
  id: number | string;
  type: string | null;
  title: string;
  body: string | null;
  created_at: string | null;
  read_at: string | null;
}
 
interface Vacancy {
  id: number | string;
  property_name: string | null;
  unit_number: string | null;
  unit_type: string | null;
  city: string | null;
  monthly_rent: number | string | null;
}
 
interface TenantOverview {
  home: TenantHome | null;
  lease: TenantLease | null;
  rent: RentSummary | null;
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
 
function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
 
function shortDate(value: string | null | undefined): string {
  const date = parseDate(value);
  if (!date) return "—";
  return date.toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}
 
function longDate(value: string | null | undefined): string {
  const date = parseDate(value);
  if (!date) return "—";
  return date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
 
function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}
 
function relativeDay(value: string | null | undefined): string {
  const date = parseDate(value);
  if (!date) return "";
 
  const days = daysBetween(date, new Date());
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return shortDate(value);
}
 
function unwrap<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && "data" in payload) {
    const data = (payload as { data?: unknown }).data;
    if (Array.isArray(data)) return data as T[];
  }
  return [];
}
 
function asOverview(payload: unknown): TenantOverview {
  const empty: TenantOverview = { home: null, lease: null, rent: null };
  if (!payload || typeof payload !== "object") return empty;
 
  const record = payload as Record<string, unknown>;
  const source =
    record.data && typeof record.data === "object"
      ? (record.data as Record<string, unknown>)
      : record;
 
  return {
    home: (source.home as TenantHome | undefined) ?? null,
    lease: (source.lease as TenantLease | undefined) ?? null,
    rent: (source.rent as RentSummary | undefined) ?? null,
  };
}
 
function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
 
function rentTone(status: PaymentStatus | null, due: string | null) {
  if (status === "paid") return { className: "tp-pill--good", label: "Paid" };
  if (status === "overdue") return { className: "tp-pill--bad", label: "Overdue" };
  if (status === "partial")
    return { className: "tp-pill--wait", label: "Part paid" };
 
  const dueDate = parseDate(due);
  if (dueDate && daysBetween(new Date(), dueDate) < 0) {
    return { className: "tp-pill--bad", label: "Overdue" };
  }
 
  return { className: "tp-pill--wait", label: "Due" };
}
 
const REQUEST_LABEL: Record<RequestStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  completed: "Resolved",
  cancelled: "Closed",
};
 
function requestTone(status: RequestStatus | null): string {
  if (status === "completed") return "tp-pill--good";
  if (status === "in_progress") return "tp-pill--info";
  if (status === "cancelled") return "tp-pill--mute";
  return "tp-pill--wait";
}
 
function notificationTone(type: string | null): "good" | "wait" | "info" | "" {
  if (!type) return "";
  if (type.includes("payment")) return "good";
  if (type.includes("maintenance")) return "info";
  if (type.includes("lease")) return "wait";
  return "";
}
 
function notificationIcon(type: string | null) {
  if (!type) return <Bell />;
  if (type.includes("payment")) return <CheckCircle2 />;
  if (type.includes("maintenance")) return <Wrench />;
  if (type.includes("lease")) return <FileText />;
  if (type.includes("announcement")) return <Megaphone />;
  return <Bell />;
}
 
/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */
 
function TenantDashboardPage() {
  const navigate = useNavigate();
  const currency = useMemo(readCurrency, []);
 
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
 
  const [overview, setOverview] = useState<TenantOverview>({
    home: null,
    lease: null,
    rent: null,
  });
  const [payments, setPayments] = useState<TenantPayment[]>([]);
  const [requests, setRequests] = useState<TenantRequest[]>([]);
  const [notifications, setNotifications] = useState<TenantNotification[]>([]);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
 
  const load = useCallback(async () => {
    setError("");
    setNotice("");
 
    const [
      overviewResult,
      paymentsResult,
      requestsResult,
      notificationsResult,
      vacanciesResult,
    ] = await Promise.allSettled([
      apiRequest("/tenant/overview"),
      apiRequest("/tenant/payments"),
      apiRequest("/tenant/maintenance-requests"),
      apiRequest("/tenant/notifications"),
      apiRequest("/tenant/vacancies"),
    ]);
 
    if (overviewResult.status === "fulfilled") {
      setOverview(asOverview(overviewResult.value));
    } else {
      setError(
        overviewResult.reason instanceof Error
          ? overviewResult.reason.message
          : "We couldn't load your home details."
      );
    }
 
    if (paymentsResult.status === "fulfilled") {
      setPayments(unwrap<TenantPayment>(paymentsResult.value));
    }
 
    if (requestsResult.status === "fulfilled") {
      setRequests(unwrap<TenantRequest>(requestsResult.value));
    } else {
      setNotice(
        "Maintenance history is unavailable right now — you can still submit a request."
      );
    }
 
    if (notificationsResult.status === "fulfilled") {
      setNotifications(unwrap<TenantNotification>(notificationsResult.value));
    }
 
    if (vacanciesResult.status === "fulfilled") {
      setVacancies(unwrap<Vacancy>(vacanciesResult.value));
    }
 
    setLoading(false);
    setRefreshing(false);
  }, []);
 
  useEffect(() => {
    void load();
  }, [load]);
 
  const openRequests = useMemo(
    () =>
      requests.filter(
        (item) => item.status === "open" || item.status === "in_progress"
      ),
    [requests]
  );
 
  const resolvedRequests = useMemo(
    () => requests.filter((item) => item.status === "completed"),
    [requests]
  );
 
  const lastPayment = useMemo(() => {
    const paid = payments
      .filter((payment) => payment.status !== "pending")
      .slice()
      .sort((a, b) => {
        const left = parseDate(a.payment_date)?.getTime() ?? 0;
        const right = parseDate(b.payment_date)?.getTime() ?? 0;
        return right - left;
      });
 
    return paid[0] ?? null;
  }, [payments]);
 
  const unread = useMemo(
    () => notifications.filter((item) => !item.read_at).length,
    [notifications]
  );
 
  const home = overview.home;
  const lease = overview.lease;
  const rent = overview.rent;
 
  const residence = [home?.property_name, home?.unit_number]
    .filter(Boolean)
    .join(" · ");
 
  const rentStatus = rentTone(rent?.status ?? null, rent?.due_date ?? null);
  const dueDate = parseDate(rent?.due_date ?? null);
  const daysToDue = dueDate ? daysBetween(new Date(), dueDate) : null;
 
  const leaseProgress = useMemo(() => {
    const start = parseDate(lease?.start_date ?? null);
    const end = parseDate(lease?.end_date ?? null);
    if (!start || !end || end <= start) return null;
 
    const total = daysBetween(start, end);
    const done = daysBetween(start, new Date());
    const percent = Math.min(100, Math.max(0, Math.round((done / total) * 100)));
 
    return { percent, daysLeft: Math.max(0, daysBetween(new Date(), end)) };
  }, [lease]);
 
  function refresh() {
    setRefreshing(true);
    void load();
  }
 
  return (
    <TenantDashboardLayout
      title={`${greeting()}, ${readTenantFirstName()}`}
      subtitle={
        residence
          ? `${residence} — everything about your home in one place.`
          : "Everything about your home in one place."
      }
      unreadNotifications={unread}
      openRequests={openRequests.length}
      actions={
        <button
          type="button"
          className="tp-btn tp-btn--quiet"
          onClick={refresh}
          disabled={refreshing}
        >
          <RefreshCw />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      }
    >
      <style>{styles}</style>
 
      <div className="td-stack">
        {error && (
          <p className="td-alert" role="status">
            <Bell />
            {error}
          </p>
        )}
 
        {notice && !error && (
          <p className="td-alert" role="status">
            <Wrench />
            {notice}
          </p>
        )}
 
        {/* ---------- rent + my home ---------- */}
        <section className="td-lead" aria-label="Rent and home">
          {loading ? (
            <span className="tp-skeleton td-skeleton-lead" />
          ) : (
            <article className="td-rent">
              <div className="td-rent__top">
                <div>
                  <p className="tp-label">Rent due</p>
                  <p className="td-rent__amount tp-money">
                    {money(rent?.amount_due ?? lease?.monthly_rent, currency)}
                  </p>
                  <p className="td-rent__due">
                    <CalendarClock />
                    {rent?.due_date
                      ? `Due ${longDate(rent.due_date)}`
                      : "No due date set"}
                    {daysToDue !== null && daysToDue >= 0 && daysToDue <= 7
                      ? ` · in ${daysToDue} day${daysToDue === 1 ? "" : "s"}`
                      : ""}
                  </p>
                </div>
 
                <span className={`tp-pill ${rentStatus.className}`}>
                  {rentStatus.label}
                </span>
              </div>
 
              <div className="td-rent__actions">
                <button
                  type="button"
                  className="tp-btn tp-btn--primary"
                  onClick={() => navigate("/tenant/payments?action=pay")}
                >
                  <CreditCard />
                  Pay rent
                </button>
                <Link to="/tenant/payments" className="tp-btn tp-btn--quiet">
                  <Receipt />
                  Statements
                </Link>
              </div>
 
              <div className="td-rent__last">
                {lastPayment ? (
                  <>
                    <CheckCircle2 />
                    <span>
                      Last payment{" "}
                      <strong>{money(lastPayment.amount, currency)}</strong> on{" "}
                      {longDate(lastPayment.payment_date)}
                    </span>
                  </>
                ) : (
                  <>
                    <Receipt />
                    <span>No payments recorded yet.</span>
                  </>
                )}
                <Link to="/tenant/payments" className="tp-btn tp-btn--link">
                  History
                </Link>
              </div>
            </article>
          )}
 
          {loading ? (
            <span className="tp-skeleton td-skeleton-lead" />
          ) : (
            <article className="tp-card td-home">
              <div className="td-home__head">
                <span className="td-home__mark" aria-hidden="true">
                  <Home />
                </span>
                <div>
                  <h2 className="td-home__name">
                    {home?.property_name ?? "Your home"}
                  </h2>
                  <p className="td-home__where">
                    <MapPin />
                    {[home?.address, home?.city, home?.country]
                      .filter(Boolean)
                      .join(", ") || "Address not on file"}
                  </p>
                </div>
              </div>
 
              <dl className="td-facts">
                <div>
                  <dt className="tp-label">Unit</dt>
                  <dd>{home?.unit_number ?? "—"}</dd>
                </div>
                <div>
                  <dt className="tp-label">Monthly rent</dt>
                  <dd className="tp-money">
                    {money(lease?.monthly_rent, currency)}
                  </dd>
                </div>
                <div>
                  <dt className="tp-label">Lease</dt>
                  <dd>
                    <span
                      className={`tp-pill ${
                        lease?.status === "active"
                          ? "tp-pill--good"
                          : "tp-pill--mute"
                      }`}
                    >
                      {lease?.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="tp-label">Lease ends</dt>
                  <dd>{longDate(lease?.end_date)}</dd>
                </div>
              </dl>
 
              <div className="td-manager">
                <ShieldCheck />
                <span>{home?.manager_name ?? "Property management"}</span>
                {home?.manager_phone && (
                  <a href={`tel:${home.manager_phone}`}>
                    <Phone aria-hidden="true" /> {home.manager_phone}
                  </a>
                )}
                <Link to="/tenant/home" className="tp-btn tp-btn--link">
                  My home
                </Link>
              </div>
            </article>
          )}
        </section>
 
        {/* ---------- maintenance + lease ---------- */}
        <section className="td-duo" aria-label="Maintenance and lease">
          {loading ? (
            <span className="tp-skeleton td-skeleton-tile" />
          ) : (
            <article className="tp-card td-tile">
              <div className="td-tile__head">
                <Wrench />
                <h2>Maintenance</h2>
              </div>
 
              <dl className="td-counts">
                <div className="td-count td-count--open">
                  <dt className="tp-label">Open</dt>
                  <dd>{openRequests.length}</dd>
                </div>
                <div className="td-count td-count--done">
                  <dt className="tp-label">Resolved</dt>
                  <dd>{resolvedRequests.length}</dd>
                </div>
              </dl>
 
              {openRequests.length > 0 && (
                <ul className="td-mini">
                  {openRequests.slice(0, 2).map((request) => (
                    <li key={String(request.id)}>
                      <span className="td-mini__title">{request.title}</span>
                      <span className="td-mini__meta">
                        <span
                          className={`tp-pill ${requestTone(request.status)}`}
                        >
                          {REQUEST_LABEL[request.status ?? "open"]}
                        </span>
                        <span className="td-mini__when">
                          {relativeDay(request.reported_date)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
 
              <div className="td-tile__foot">
                <Link
                  to="/tenant/maintenance?action=new"
                  className="tp-btn tp-btn--primary"
                >
                  <Wrench />
                  Report a problem
                </Link>
              </div>
            </article>
          )}
 
          {loading ? (
            <span className="tp-skeleton td-skeleton-tile" />
          ) : (
            <article className="tp-card td-tile">
              <div className="td-tile__head">
                <FileText />
                <h2>Lease</h2>
              </div>
 
              <dl className="td-lease__grid">
                <div>
                  <dt className="tp-label">Starts</dt>
                  <dd>{longDate(lease?.start_date)}</dd>
                </div>
                <div>
                  <dt className="tp-label">Ends</dt>
                  <dd>{longDate(lease?.end_date)}</dd>
                </div>
                <div>
                  <dt className="tp-label">Monthly rent</dt>
                  <dd className="tp-money">
                    {money(lease?.monthly_rent, currency)}
                  </dd>
                </div>
                <div>
                  <dt className="tp-label">Deposit held</dt>
                  <dd className="tp-money">
                    {money(lease?.deposit_amount, currency)}
                  </dd>
                </div>
              </dl>
 
              {leaseProgress && (
                <div>
                  <div
                    className="td-progress"
                    role="progressbar"
                    aria-valuenow={leaseProgress.percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Lease term elapsed"
                  >
                    <span style={{ width: `${leaseProgress.percent}%` }} />
                  </div>
                  <p className="td-progress__note">
                    {leaseProgress.daysLeft} days left on this lease
                  </p>
                </div>
              )}
 
              <div className="td-tile__foot">
                <Link to="/tenant/lease" className="tp-btn tp-btn--quiet">
                  <FileText />
                  View lease details
                </Link>
              </div>
            </article>
          )}
        </section>
 
        {/* ---------- notifications ---------- */}
        <section className="tp-section" aria-label="Notifications">
          <div className="tp-section__head">
            <div>
              <h2 className="tp-section__title">Recent activity</h2>
              <p className="tp-section__sub">
                Payments, repairs and messages from your property manager.
              </p>
            </div>
            <Link to="/tenant/notifications" className="tp-btn tp-btn--link">
              See all
            </Link>
          </div>
 
          {loading ? (
            <span className="tp-skeleton td-skeleton-tile" />
          ) : notifications.length === 0 ? (
            <div className="tp-card tp-empty">
              <span className="tp-empty__icon">
                <Bell />
              </span>
              <h3 className="tp-empty__title">Nothing new</h3>
              <p className="tp-empty__text">
                Payment receipts, maintenance updates and announcements from
                your property manager will appear here.
              </p>
            </div>
          ) : (
            <div className="tp-card">
              <ul className="td-feed">
                {notifications.slice(0, 5).map((item) => (
                  <li
                    key={String(item.id)}
                    className={item.read_at ? undefined : "td-unread"}
                  >
                    <span
                      className="td-feed__icon"
                      data-tone={notificationTone(item.type)}
                      aria-hidden="true"
                    >
                      {notificationIcon(item.type)}
                    </span>
                    <div className="td-feed__body">
                      <p className="td-feed__title">{item.title}</p>
                      {item.body && <p className="td-feed__text">{item.body}</p>}
                    </div>
                    <span className="td-feed__when">
                      {relativeDay(item.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
 
        {/* ---------- vacancies ---------- */}
        {vacancies.length > 0 && (
          <section className="tp-section" aria-label="Available properties">
            <div className="tp-section__head">
              <div>
                <h2 className="tp-section__title">Looking for another home?</h2>
                <p className="tp-section__sub">
                  {vacancies.length} available{" "}
                  {vacancies.length === 1 ? "unit" : "units"} from the same
                  management.
                </p>
              </div>
              <Link to="/tenant/vacancies" className="tp-btn tp-btn--link">
                Browse all
              </Link>
            </div>
 
            <div className="td-vacancies">
              {vacancies.slice(0, 3).map((vacancy) => (
                <article className="td-vacancy" key={String(vacancy.id)}>
                  <h3 className="td-vacancy__name">
                    {vacancy.property_name ?? "Available unit"}
                  </h3>
                  <p className="td-vacancy__meta">
                    {[vacancy.unit_type, vacancy.unit_number, vacancy.city]
                      .filter(Boolean)
                      .join(" · ") || "Details on request"}
                  </p>
                  <p className="td-vacancy__rent tp-money">
                    {money(vacancy.monthly_rent, currency)}
                    <span className="td-vacancy__meta"> /month</span>
                  </p>
                  <Link
                    to={`/tenant/vacancies?unit=${vacancy.id}`}
                    className="td-vacancy__link"
                  >
                    View property
                    <ChevronRight />
                  </Link>
                </article>
              ))}
            </div>
          </section>
        )}
 
        <p className="tp-section__sub">
          <Building2
            aria-hidden="true"
            style={{
              width: "0.875rem",
              height: "0.875rem",
              verticalAlign: "-2px",
              marginRight: "0.375rem",
            }}
          />
          Managed by {home?.manager_name ?? "your property manager"}. Need help?{" "}
          <Link to="/tenant/help" className="tp-btn tp-btn--link">
            Contact support
            <ArrowRight style={{ width: "0.875rem", height: "0.875rem" }} />
          </Link>
        </p>
      </div>
    </TenantDashboardLayout>
  );
}
 
function readTenantFirstName(): string {
  const raw = readStored("user");
  if (!raw) return "there";
 
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      const name = (parsed as Record<string, unknown>).name;
      if (typeof name === "string" && name.trim()) {
        return name.trim().split(/\s+/)[0];
      }
    }
  } catch {
    /* fall through to the default */
  }
 
  return "there";
}
 
export default TenantDashboardPage;