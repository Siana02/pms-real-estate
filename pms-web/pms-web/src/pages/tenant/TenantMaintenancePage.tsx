import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import TenantDashboardLayout from "../../layouts/TenantDashboardLayout";
import { apiRequest } from "../../services/api";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  Droplets,
  Flame,
  Loader2,
  Plug,
  Plus,
  ShieldCheck,
  Wrench,
  X,
} from "lucide-react";
 
/* ------------------------------------------------------------------ */
/*  STYLES — vanilla CSS                                               */
/* ------------------------------------------------------------------ */
 
const styles = `
.tmt-stack {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}
 
.tmt-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.875rem;
}
 
.tmt-stat dd {
  margin: 0.3125rem 0 0;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.03em;
}
 
.tmt-stat--open dd { color: var(--tp-amber); }
.tmt-stat--progress dd { color: var(--tp-blue-dark); }
.tmt-stat--done dd { color: var(--tp-green); }
 
.tmt-group__title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.75rem;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--tp-faint);
}
 
.tmt-group__title::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--tp-line);
}
 
.tmt-list { display: flex; flex-direction: column; margin: 0; padding: 0; list-style: none; }
 
.tmt-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.25rem 0.875rem;
  width: 100%;
  padding: 0.9375rem 0.25rem;
  border-top: 1px solid var(--tp-line-soft);
  text-align: left;
  transition: background-color 0.18s ease;
}
 
.tmt-list li:first-child .tmt-item { border-top: none; }
.tmt-item:hover { background: #fafbfd; }
 
.tmt-item__icon {
  display: inline-flex;
  grid-row: span 2;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: var(--tp-r-md);
  background: var(--tp-surface-sunken);
  color: var(--tp-muted);
}
 
.tmt-item__icon svg { width: 1rem; height: 1rem; }
.tmt-item__icon[data-tone="open"] { background: var(--tp-amber-pale); color: var(--tp-amber); }
.tmt-item__icon[data-tone="progress"] { background: var(--tp-blue-pale); color: var(--tp-blue-dark); }
.tmt-item__icon[data-tone="done"] { background: var(--tp-green-pale); color: var(--tp-green); }
 
.tmt-item__title { margin: 0; font-size: 0.9375rem; font-weight: 600; overflow-wrap: anywhere; }
.tmt-item__meta { margin: 0.1875rem 0 0; font-size: 0.8125rem; color: var(--tp-muted); }
 
.tmt-item__right {
  display: flex;
  grid-row: span 2;
  align-items: center;
  gap: 0.625rem;
}
 
.tmt-item__right svg { width: 1rem; height: 1rem; color: var(--tp-faint); }
 
/* ---------- detail / form panel ---------- */
.tmt-scrim {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(3px);
  animation: tmt-fade 0.18s ease;
}
 
@keyframes tmt-fade { from { opacity: 0; } to { opacity: 1; } }
 
.tmt-panel {
  width: 100%;
  max-width: 32rem;
  max-height: 92vh;
  overflow-y: auto;
  padding: 1.25rem;
  border-radius: var(--tp-r-lg) var(--tp-r-lg) 0 0;
  background: var(--tp-surface);
  box-shadow: var(--tp-shadow-pop);
  animation: tmt-rise 0.22s ease;
}
 
@keyframes tmt-rise {
  from { transform: translateY(16px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
 
.tmt-panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}
 
.tmt-panel__title { margin: 0; font-size: 1.125rem; font-weight: 700; letter-spacing: -0.02em; }
.tmt-panel__sub { margin: 0.25rem 0 0; font-size: 0.8125rem; color: var(--tp-muted); }
 
.tmt-form { display: flex; flex-direction: column; gap: 1.125rem; }
 
.tmt-fieldset { border: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
 
.tmt-fieldset legend,
.tmt-field > label {
  padding: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--tp-ink-soft);
}
 
.tmt-field { display: flex; flex-direction: column; gap: 0.375rem; }
 
.tmt-field input,
.tmt-field textarea,
.tmt-field select {
  min-height: 2.625rem;
  padding: 0.5rem 0.75rem;
  border-radius: var(--tp-r-sm);
  border: 1px solid var(--tp-line);
  background: var(--tp-surface);
  outline: none;
  resize: vertical;
}
 
.tmt-field textarea { min-height: 6rem; line-height: 1.55; }
.tmt-field input:focus,
.tmt-field textarea:focus,
.tmt-field select:focus { border-color: var(--tp-blue); }
.tmt-field input[aria-invalid="true"],
.tmt-field textarea[aria-invalid="true"] { border-color: var(--tp-red); }
 
.tmt-hint { margin: 0; font-size: 0.75rem; color: var(--tp-faint); }
.tmt-err { margin: 0; font-size: 0.75rem; font-weight: 600; color: var(--tp-red); }
 
.tmt-choices { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem; }
 
.tmt-choice {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  border-radius: var(--tp-r-sm);
  border: 1px solid var(--tp-line);
  background: var(--tp-surface);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--tp-ink-soft);
  transition: border-color 0.18s ease, background-color 0.18s ease, color 0.18s ease;
}
 
.tmt-choice svg { width: 1rem; height: 1rem; color: var(--tp-muted); }
 
.tmt-choice[aria-pressed="true"] {
  border-color: var(--tp-blue);
  background: var(--tp-surface-tint);
  color: var(--tp-blue-dark);
}
 
.tmt-choice[aria-pressed="true"] svg { color: var(--tp-blue); }
 
.tmt-panel__foot { display: flex; flex-wrap: wrap; gap: 0.625rem; }
.tmt-panel__foot .tp-btn { flex: 1 1 9rem; min-width: 0; justify-content: center; }
 
.tmt-error,
.tmt-note {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  border-radius: var(--tp-r-sm);
  font-size: 0.8125rem;
  line-height: 1.5;
}
 
.tmt-error { border: 1px solid #fecaca; background: var(--tp-red-pale); color: var(--tp-red); }
.tmt-note { border: 1px solid var(--tp-line); background: var(--tp-surface-sunken); color: var(--tp-ink-soft); }
.tmt-error svg, .tmt-note svg { width: 0.9375rem; height: 0.9375rem; flex: none; margin-top: 0.125rem; }
 
.tmt-done { display: flex; flex-direction: column; align-items: center; gap: 0.625rem; padding: 1.25rem 0.5rem 0.5rem; text-align: center; }
.tmt-done svg { width: 2.25rem; height: 2.25rem; color: var(--tp-green); }
.tmt-done h3 { margin: 0; font-size: 1.0625rem; font-weight: 700; }
.tmt-done p { margin: 0; font-size: 0.875rem; color: var(--tp-muted); }
 
/* ---------- detail ---------- */
.tmt-detail { display: flex; flex-direction: column; gap: 1.25rem; }
 
.tmt-detail__body {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--tp-ink-soft);
  overflow-wrap: anywhere;
}
 
.tmt-detail__facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.875rem; margin: 0; }
.tmt-detail__facts dt { margin: 0; }
.tmt-detail__facts dd { margin: 0.25rem 0 0; font-size: 0.875rem; font-weight: 600; }
 
.tmt-timeline { display: flex; flex-direction: column; margin: 0; padding: 0; list-style: none; }
 
.tmt-event {
  position: relative;
  display: flex;
  gap: 0.75rem;
  padding: 0 0 1rem 0;
}
 
.tmt-event:last-child { padding-bottom: 0; }
 
.tmt-event__dot {
  position: relative;
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  background: var(--tp-surface-tint);
  color: var(--tp-blue);
}
 
.tmt-event__dot svg { width: 0.75rem; height: 0.75rem; }
 
.tmt-event:not(:last-child) .tmt-event__dot::after {
  content: "";
  position: absolute;
  top: 1.625rem;
  left: 50%;
  width: 1px;
  height: calc(100% + 0.375rem);
  background: var(--tp-line);
  transform: translateX(-50%);
}
 
.tmt-event__label { margin: 0.125rem 0 0; font-size: 0.875rem; font-weight: 600; }
.tmt-event__when { margin: 0.125rem 0 0; font-size: 0.75rem; color: var(--tp-muted); }
 
.tmt-spin { animation: tmt-rotate 0.9s linear infinite; }
@keyframes tmt-rotate { to { transform: rotate(360deg); } }
 
.tmt-skeleton { height: 9rem; }
 
@media (min-width: 640px) {
  .tmt-summary { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .tmt-scrim { align-items: center; padding: 1.5rem; }
  .tmt-panel { border-radius: var(--tp-r-lg); padding: 1.5rem; }
  .tmt-choices { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}

/* Premium maintenance experience — UI/UX only */
.tmt-stack{gap:1.5rem!important}
.tmt-hero{position:relative;overflow:hidden;display:flex;align-items:flex-end;justify-content:space-between;gap:1.5rem;padding:1.65rem 1.7rem;border-radius:1.25rem;background:linear-gradient(135deg,#101114 0%,#17191d 58%,#25201a 100%);color:#fff;box-shadow:0 18px 45px -30px rgba(0,0,0,.55)}
.tmt-hero::before{content:"";position:absolute;width:16rem;height:16rem;border-radius:50%;right:-5rem;top:-8rem;background:rgba(201,168,108,.16);filter:blur(2px)}
.tmt-hero__copy,.tmt-hero__action{position:relative;z-index:1}
.tmt-hero__eyebrow{display:flex;align-items:center;gap:.45rem;margin:0 0 .5rem;color:#d7bd8b;font-size:.68rem;font-weight:800;letter-spacing:.13em;text-transform:uppercase}
.tmt-hero__eyebrow svg{width:.9rem;height:.9rem}
.tmt-hero h2{margin:0;font-size:1.45rem;line-height:1.15;letter-spacing:-.035em;color:#fff}
.tmt-hero p{max-width:38rem;margin:.45rem 0 0;color:#b8bcc4;font-size:.82rem;line-height:1.55}
.tmt-hero .tp-btn--primary{background:#d2b77f;color:#171717;border-color:#d2b77f;box-shadow:none}
.tmt-hero .tp-btn--primary:hover{background:#dfc78f;border-color:#dfc78f}
.tmt-summary{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:.75rem!important}
.tmt-stat{position:relative;overflow:hidden;padding:1.1rem 1.2rem!important;border:1px solid #e7e4de!important;border-radius:1rem!important;background:linear-gradient(180deg,#fff 0%,#fbfaf8 100%)!important}
.tmt-stat::after{content:"";position:absolute;right:1rem;top:1rem;width:.45rem;height:.45rem;border-radius:50%;background:currentColor;opacity:.45}
.tmt-stat dd{font-size:1.75rem!important;margin-top:.4rem!important}
.tmt-stat .tp-label{letter-spacing:.08em}
.tmt-stat--open{color:#a46f19}.tmt-stat--progress{color:#315d92}.tmt-stat--done{color:#2f7654}
.tmt-stat--open dd,.tmt-stat--progress dd,.tmt-stat--done dd{color:currentColor!important}
.tmt-group__title{margin:0 0 .65rem!important;color:#77736b!important;font-size:.65rem!important;letter-spacing:.13em!important}
.tmt-list{gap:.6rem}
.tmt-list li{border:0!important}
.tmt-item{grid-template-columns:auto minmax(0,1fr) auto!important;gap:.75rem!important;padding:1rem 1.05rem!important;border:1px solid #e8e5df!important;border-radius:.9rem!important;background:#fff!important;box-shadow:0 5px 18px -18px rgba(20,20,20,.35)}
.tmt-item:hover{background:#fdfcfb!important;border-color:#d8d1c4!important;transform:translateY(-1px)}
.tmt-item__icon{width:2.5rem!important;height:2.5rem!important;border-radius:.75rem!important}
.tmt-item__title{font-size:.9rem!important;font-weight:700!important;color:#191a1c}
.tmt-item__meta{color:#7b7d83!important;font-size:.74rem!important}
.tmt-item__right{gap:.5rem!important}
.tmt-item__right .tp-pill{font-size:.68rem!important;font-weight:750!important}
.tmt-detail{gap:1.35rem!important}
.tmt-detail__body{padding:1rem 1.05rem;border-radius:.8rem;background:#f8f7f4;border:1px solid #ece8df}
.tmt-detail__facts{padding:1rem 1.05rem;border:1px solid #e8e5df;border-radius:.85rem;background:#fff;gap:0!important}
.tmt-detail__facts>div{padding:.75rem 0}
.tmt-detail__facts>div:nth-child(odd){padding-right:1rem}
.tmt-detail__facts>div:nth-child(even){padding-left:1rem;border-left:1px solid #eeeae3}
.tmt-detail__facts>div:nth-child(n+3){border-top:1px solid #eeeae3}
.tmt-panel{max-width:38rem!important;border:1px solid #e7e2d8;box-shadow:0 28px 70px -30px rgba(0,0,0,.5)!important}
.tmt-panel__head{padding-bottom:1rem;border-bottom:1px solid #ece9e2}
.tmt-panel__title{font-size:1.2rem!important}
.tmt-choice{border-radius:.7rem!important;padding:.72rem .75rem!important}
.tmt-choice[aria-pressed="true"]{border-color:#b79862!important;background:#fbf6eb!important;color:#705522!important}
.tmt-choice[aria-pressed="true"] svg{color:#a47b36!important}
.tmt-event__dot{background:#f7f1e6!important;color:#98743b!important}
.tmt-event:not(:last-child) .tmt-event__dot::after{background:#ddd5c7!important}
.tmt-done{padding:1.5rem .5rem .5rem}.tmt-done svg{color:#4d8b6a!important}
@media(max-width:700px){.tmt-hero{align-items:flex-start;flex-direction:column;padding:1.35rem}.tmt-hero .tp-btn{width:100%;justify-content:center}}
@media(max-width:520px){.tmt-summary{grid-template-columns:1fr!important}.tmt-item{grid-template-columns:auto minmax(0,1fr)!important}.tmt-item__right{grid-column:2;grid-row:auto;justify-content:flex-start}.tmt-detail__facts{grid-template-columns:1fr!important}.tmt-detail__facts>div:nth-child(even){padding-left:0;border-left:0}.tmt-detail__facts>div:nth-child(n+2){border-top:1px solid #eeeae3}}
`;
 
/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */
 
type RequestStatus = "open" | "in_progress" | "completed" | "cancelled";
type Priority = "low" | "medium" | "high" | "urgent";
 
interface TenantRequest {
  id: number | string;
  title: string;
  description: string | null;
  category: string | null;
  priority: Priority | null;
  status: RequestStatus | null;
  assigned_to: string | null;
  reported_date: string | null;
  completed_date: string | null;
  updated_at: string | null;
  notes: string | null;
}
 
/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */
 
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
 
function unwrap<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && "data" in payload) {
    const data = (payload as { data?: unknown }).data;
    if (Array.isArray(data)) return data as T[];
  }
  return [];
}
 
const STATUS_LABEL: Record<RequestStatus, string> = {
  open: "Submitted",
  in_progress: "In progress",
  completed: "Resolved",
  cancelled: "Closed",
};
 
function statusTone(status: RequestStatus | null): string {
  if (status === "completed") return "tp-pill--good";
  if (status === "in_progress") return "tp-pill--info";
  if (status === "cancelled") return "tp-pill--mute";
  return "tp-pill--wait";
}
 
function iconTone(status: RequestStatus | null): string {
  if (status === "completed") return "done";
  if (status === "in_progress") return "progress";
  if (status === "cancelled") return "";
  return "open";
}
 
const CATEGORIES: { key: string; label: string; icon: ReactNode }[] = [
  { key: "plumbing", label: "Plumbing", icon: <Droplets /> },
  { key: "electrical", label: "Electrical", icon: <Plug /> },
  { key: "appliance", label: "Appliance", icon: <Flame /> },
  { key: "other", label: "Other", icon: <Wrench /> },
];
 
const PRIORITIES: { key: Priority; label: string }[] = [
  { key: "low", label: "Low" },
  { key: "medium", label: "Normal" },
  { key: "high", label: "High" },
  { key: "urgent", label: "Emergency" },
];
 
function categoryIcon(category: string | null): ReactNode {
  const match = CATEGORIES.find((item) => item.key === category);
  return match ? match.icon : <Wrench />;
}
 
interface TimelineEvent {
  label: string;
  when: string | null;
}
 
function buildTimeline(request: TenantRequest): TimelineEvent[] {
  const events: TimelineEvent[] = [
    { label: "Request submitted", when: request.reported_date },
  ];
 
  if (request.status === "in_progress" || request.status === "completed") {
    events.push({
      label: request.assigned_to
        ? `Assigned to ${request.assigned_to}`
        : "Work started",
      when: request.updated_at,
    });
  }
 
  if (request.status === "completed") {
    events.push({ label: "Marked resolved", when: request.completed_date });
  }
 
  if (request.status === "cancelled") {
    events.push({ label: "Request closed", when: request.updated_at });
  }
 
  return events;
}
 
/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */
 
function TenantMaintenancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requests, setRequests] = useState<TenantRequest[]>([]);
 
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<TenantRequest | null>(null);
 
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("plumbing");
  const [priority, setPriority] = useState<Priority>("medium");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);
 
  const load = useCallback(async () => {
    try {
      const response = await apiRequest("/tenant/maintenance-requests");
      setRequests(unwrap<TenantRequest>(response));
      setError("");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "We couldn't load your maintenance requests."
      );
    } finally {
      setLoading(false);
    }
  }, []);
 
  useEffect(() => {
    void load();
  }, [load]);
 
  useEffect(() => {
    if (searchParams.get("action") === "new") setFormOpen(true);
  }, [searchParams]);
 
  const open = useMemo(
    () =>
      requests.filter(
        (item) => item.status === "open" || item.status === "in_progress"
      ),
    [requests]
  );
 
  const inProgress = useMemo(
    () => requests.filter((item) => item.status === "in_progress"),
    [requests]
  );
 
  const resolved = useMemo(
    () =>
      requests.filter(
        (item) => item.status === "completed" || item.status === "cancelled"
      ),
    [requests]
  );
 
  function closeForm() {
    setFormOpen(false);
    setSubmitted(false);
    setSubmitError("");
    setFieldErrors({});
 
    if (searchParams.get("action")) {
      const next = new URLSearchParams(searchParams);
      next.delete("action");
      setSearchParams(next, { replace: true });
    }
  }
 
  function resetForm() {
    setTitle("");
    setDescription("");
    setCategory("plumbing");
    setPriority("medium");
  }
 
  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
 
    const errors: Record<string, string> = {};
    if (!title.trim()) errors.title = "Give your request a short title.";
    if (description.trim().length < 10) {
      errors.description = "Add a little more detail so it can be triaged.";
    }
 
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
 
    setSubmitting(true);
    setSubmitError("");
 
    try {
      await apiRequest("/tenant/maintenance-requests", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          priority,
          reported_date: new Date().toISOString().slice(0, 10),
        }),
      });
 
      setSubmitted(true);
      resetForm();
      await load();
    } catch (caught) {
      setSubmitError(
        caught instanceof Error
          ? caught.message
          : "We couldn't submit that request. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }
 
  function renderList(items: TenantRequest[]) {
    return (
      <ul className="tmt-list">
        {items.map((request) => (
          <li key={String(request.id)}>
            <button
              type="button"
              className="tmt-item"
              onClick={() => setSelected(request)}
            >
              <span
                className="tmt-item__icon"
                data-tone={iconTone(request.status)}
                aria-hidden="true"
              >
                {categoryIcon(request.category)}
              </span>
 
              <p className="tmt-item__title">{request.title}</p>
 
              <span className="tmt-item__right">
                <span className={`tp-pill ${statusTone(request.status)}`}>
                  {STATUS_LABEL[request.status ?? "open"]}
                </span>
                <ChevronRight />
              </span>
 
              <p className="tmt-item__meta">
                {request.status === "completed"
                  ? `Resolved ${longDate(request.completed_date)}`
                  : `Submitted ${longDate(request.reported_date)}`}
                {request.assigned_to ? ` · ${request.assigned_to}` : ""}
              </p>
            </button>
          </li>
        ))}
      </ul>
    );
  }
 
  return (
    <TenantDashboardLayout
      title="Maintenance"
      subtitle="Report a problem and follow it through to resolution."
      openRequests={open.length}
      actions={
        <button
          type="button"
          className="tp-btn tp-btn--primary"
          onClick={() => setFormOpen(true)}
        >
          <Plus />
          Submit request
        </button>
      }
    >
      <style>{styles}</style>
 
      <div className="tmt-stack">
        <section className="tmt-hero" aria-label="Maintenance overview">
          <div className="tmt-hero__copy">
            <p className="tmt-hero__eyebrow"><Wrench /> Home care</p>
            <h2>Keep your home in good shape.</h2>
            <p>Report an issue, tell us what is happening, and follow the request from submission through to resolution.</p>
          </div>
          <div className="tmt-hero__action">
            <button type="button" className="tp-btn tp-btn--primary" onClick={() => setFormOpen(true)}>
              <Plus /> Submit request
            </button>
          </div>
        </section>

        {error && (
          <p className="tmt-error" role="status">
            <AlertTriangle />
            {error}
          </p>
        )}
 
        <section className="tmt-summary" aria-label="Request summary">
          <article className="tp-card tmt-stat tmt-stat--open">
            <dl>
              <dt className="tp-label">Open</dt>
              <dd>{open.length - inProgress.length}</dd>
            </dl>
          </article>
          <article className="tp-card tmt-stat tmt-stat--progress">
            <dl>
              <dt className="tp-label">In progress</dt>
              <dd>{inProgress.length}</dd>
            </dl>
          </article>
          <article className="tp-card tmt-stat tmt-stat--done">
            <dl>
              <dt className="tp-label">Resolved</dt>
              <dd>{resolved.length}</dd>
            </dl>
          </article>
        </section>
 
        {loading ? (
          <span className="tp-skeleton tmt-skeleton" />
        ) : requests.length === 0 ? (
          <div className="tp-card tp-empty">
            <span className="tp-empty__icon">
              <Wrench />
            </span>
            <h3 className="tp-empty__title">Nothing needs fixing</h3>
            <p className="tp-empty__text">
              When something in your unit breaks, submit a request here. You can
              follow every status change until it&apos;s resolved.
            </p>
            <button
              type="button"
              className="tp-btn tp-btn--primary"
              onClick={() => setFormOpen(true)}
            >
              <Plus />
              Submit request
            </button>
          </div>
        ) : (
          <>
            <section aria-label="Open requests">
              <h2 className="tmt-group__title">Active requests · {open.length}</h2>
              {open.length === 0 ? (
                <div className="tp-card tp-empty">
                  <span className="tp-empty__icon">
                    <CheckCircle2 />
                  </span>
                  <h3 className="tp-empty__title">No open requests</h3>
                  <p className="tp-empty__text">
                    Everything you&apos;ve reported has been dealt with.
                  </p>
                </div>
              ) : (
                <div className="tp-card">{renderList(open)}</div>
              )}
            </section>
 
            {resolved.length > 0 && (
              <section aria-label="Resolved requests">
                <h2 className="tmt-group__title">Request history · {resolved.length}</h2>
                <div className="tp-card">{renderList(resolved)}</div>
              </section>
            )}
          </>
        )}
      </div>
 
      {/* ---------- submit request ---------- */}
      {formOpen && (
        <div
          className="tmt-scrim"
          role="dialog"
          aria-modal="true"
          aria-labelledby="request-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
        >
          <div className="tmt-panel">
            <div className="tmt-panel__head">
              <div>
                <h2 className="tmt-panel__title" id="request-title">
                  Submit a request
                </h2>
                <p className="tmt-panel__sub">
                  Your property manager sees this immediately.
                </p>
              </div>
              <button
                type="button"
                className="tp-icon-btn"
                onClick={closeForm}
                aria-label="Close"
              >
                <X />
              </button>
            </div>
 
            {submitted ? (
              <div className="tmt-done">
                <CheckCircle2 />
                <h3>Request submitted</h3>
                <p>
                  It&apos;s in your manager&apos;s queue. You&apos;ll see the
                  status change here as work progresses.
                </p>
                <button
                  type="button"
                  className="tp-btn tp-btn--primary"
                  onClick={closeForm}
                >
                  Done
                </button>
              </div>
            ) : (
              <form className="tmt-form" onSubmit={submitRequest}>
                {submitError && (
                  <p className="tmt-error" role="alert">
                    <AlertTriangle />
                    {submitError}
                  </p>
                )}
 
                <div className="tmt-field">
                  <label htmlFor="request-name">What&apos;s wrong?</label>
                  <input
                    id="request-name"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Kitchen sink is leaking"
                    aria-invalid={Boolean(fieldErrors.title)}
                  />
                  {fieldErrors.title && (
                    <p className="tmt-err">{fieldErrors.title}</p>
                  )}
                </div>
 
                <fieldset className="tmt-fieldset">
                  <legend>Category</legend>
                  <div className="tmt-choices">
                    {CATEGORIES.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        className="tmt-choice"
                        aria-pressed={category === option.key}
                        onClick={() => setCategory(option.key)}
                      >
                        {option.icon}
                        {option.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
 
                <fieldset className="tmt-fieldset">
                  <legend>How urgent is it?</legend>
                  <div className="tmt-choices">
                    {PRIORITIES.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        className="tmt-choice"
                        aria-pressed={priority === option.key}
                        onClick={() => setPriority(option.key)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <p className="tmt-hint">
                    Emergency is for anything unsafe — flooding, gas, no power.
                  </p>
                </fieldset>
 
                <div className="tmt-field">
                  <label htmlFor="request-detail">Describe the problem</label>
                  <textarea
                    id="request-detail"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="When did it start, what have you tried, is it getting worse?"
                    aria-invalid={Boolean(fieldErrors.description)}
                  />
                  {fieldErrors.description && (
                    <p className="tmt-err">{fieldErrors.description}</p>
                  )}
                </div>
 
                <p className="tmt-note">
                  <ShieldCheck />
                  Requests are logged against your unit, so your manager already
                  knows which property and unit to send someone to.
                </p>
 
                <div className="tmt-panel__foot">
                  <button
                    type="button"
                    className="tp-btn tp-btn--quiet"
                    onClick={closeForm}
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
                        <Loader2 className="tmt-spin" />
                        Submitting…
                      </>
                    ) : (
                      <>
                        <Plus />
                        Submit request
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
 
      {/* ---------- request detail ---------- */}
      {selected && (
        <div
          className="tmt-scrim"
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelected(null);
          }}
        >
          <div className="tmt-panel">
            <div className="tmt-panel__head">
              <div>
                <h2 className="tmt-panel__title" id="detail-title">
                  {selected.title}
                </h2>
                <p className="tmt-panel__sub">
                  Submitted {longDate(selected.reported_date)}
                </p>
              </div>
              <button
                type="button"
                className="tp-icon-btn"
                onClick={() => setSelected(null)}
                aria-label="Close"
              >
                <X />
              </button>
            </div>
 
            <div className="tmt-detail">
              <span className={`tp-pill ${statusTone(selected.status)}`}>
                {STATUS_LABEL[selected.status ?? "open"]}
              </span>
 
              {selected.description && (
                <p className="tmt-detail__body">{selected.description}</p>
              )}
 
              <dl className="tmt-detail__facts">
                <div>
                  <dt className="tp-label">Category</dt>
                  <dd>{selected.category ?? "General"}</dd>
                </div>
                <div>
                  <dt className="tp-label">Priority</dt>
                  <dd>
                    {PRIORITIES.find((p) => p.key === selected.priority)
                      ?.label ?? "Normal"}
                  </dd>
                </div>
                <div>
                  <dt className="tp-label">Assigned to</dt>
                  <dd>{selected.assigned_to ?? "Not yet assigned"}</dd>
                </div>
                <div>
                  <dt className="tp-label">Resolved</dt>
                  <dd>
                    {selected.completed_date
                      ? longDate(selected.completed_date)
                      : "—"}
                  </dd>
                </div>
              </dl>
 
              <div>
                <p className="tp-label" style={{ marginBottom: "0.75rem" }}>
                  History
                </p>
                <ul className="tmt-timeline">
                  {buildTimeline(selected).map((event) => (
                    <li className="tmt-event" key={event.label}>
                      <span className="tmt-event__dot" aria-hidden="true">
                        <Clock />
                      </span>
                      <div>
                        <p className="tmt-event__label">{event.label}</p>
                        <p className="tmt-event__when">{longDate(event.when)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
 
              {selected.notes && (
                <p className="tmt-note">
                  <Wrench />
                  {selected.notes}
                </p>
              )}
 
              <div className="tmt-panel__foot">
                <button
                  type="button"
                  className="tp-btn tp-btn--quiet"
                  onClick={() => setSelected(null)}
                >
                  <ArrowLeft />
                  Back to requests
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </TenantDashboardLayout>
  );
}
 
export default TenantMaintenancePage;