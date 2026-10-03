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

/* Refined maintenance UI — presentation only */
.tmt-stack{gap:1.75rem!important}
.tmt-hero{position:relative;overflow:hidden;display:flex;align-items:flex-end;justify-content:space-between;gap:2rem;padding:2rem 2.1rem;border:1px solid #17263a;border-radius:1rem;background:linear-gradient(135deg,#0a192f 0%,#12243d 68%,#1b304c 100%);color:#fff;box-shadow:0 20px 50px -34px rgba(10,25,47,.65)}
.tmt-hero::before{content:"";position:absolute;width:20rem;height:20rem;border-radius:50%;right:-7rem;top:-11rem;background:rgba(148,181,211,.13);border:1px solid rgba(226,232,240,.12)}
.tmt-hero__copy,.tmt-hero__action{position:relative;z-index:1}
.tmt-hero__eyebrow{display:flex;align-items:center;gap:.45rem;margin:0 0 .65rem;color:#a9c2d8;font-size:.66rem;font-weight:800;letter-spacing:.15em;text-transform:uppercase}
.tmt-hero h2{margin:0;font-family:Georgia,"Times New Roman",serif;font-size:clamp(1.55rem,2.8vw,2.15rem);font-weight:500;line-height:1.08;letter-spacing:-.025em;color:#fff}
.tmt-hero p{max-width:40rem;margin:.6rem 0 0;color:#c3cedb;font-size:.84rem;line-height:1.65}
.tmt-hero .tp-btn--primary{min-height:2.7rem;padding:0 1.15rem;background:#fff;color:#0a192f;border-color:#fff;border-radius:.5rem;box-shadow:none}
.tmt-hero .tp-btn--primary:hover{background:#e9f0f6;border-color:#e9f0f6}
.tmt-summary{display:flex!important;align-items:stretch;gap:0!important;padding:.35rem 0;border:1px solid #e1e6eb;border-radius:.8rem;background:rgba(241,244,247,.72);backdrop-filter:blur(10px);overflow:hidden}
.tmt-stat{position:relative;flex:1;padding:1rem 1.25rem!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}
.tmt-stat:not(:last-child)::after{content:"";position:absolute;right:0;top:22%;height:56%;width:1px;background:#d6dde4}
.tmt-stat dd{margin:.3rem 0 0!important;font-size:1.8rem!important;font-weight:650!important;line-height:1;letter-spacing:-.04em}
.tmt-stat .tp-label{font-size:.62rem!important;letter-spacing:.13em!important;color:#6b7280!important}
.tmt-stat--open{color:#6b4d1f}.tmt-stat--progress{color:#294e72}.tmt-stat--done{color:#315f4b}
.tmt-stat--open dd,.tmt-stat--progress dd,.tmt-stat--done dd{color:currentColor!important}
.tmt-group__title{margin:0 0 .7rem!important;color:#667085!important;font-size:.64rem!important;letter-spacing:.14em!important}
.tmt-list{gap:0}.tmt-list li{border:0!important}
.tmt-item{grid-template-columns:2.65rem minmax(0,1fr) auto!important;gap:1rem!important;padding:1.1rem 1.15rem!important;border:1px solid #e4e8ed!important;border-radius:.65rem!important;background:#fff!important;box-shadow:0 8px 24px -24px rgba(10,25,47,.5);transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease!important}
.tmt-item:hover{background:#fbfcfd!important;border-color:#cbd5df!important;transform:translateY(-1px);box-shadow:0 12px 28px -24px rgba(10,25,47,.45)}
.tmt-item+.tmt-item{margin-top:.55rem}
.tmt-item__icon{width:2.65rem!important;height:2.65rem!important;border-radius:.65rem!important;background:#f1f4f7!important;color:#52667a!important}
.tmt-item__icon[data-tone="open"]{background:#f5f0e8!important;color:#765d32!important}.tmt-item__icon[data-tone="progress"]{background:#edf3f8!important;color:#315b7d!important}.tmt-item__icon[data-tone="done"]{background:#edf4ef!important;color:#416b54!important}
.tmt-item__title{font-size:.94rem!important;font-weight:700!important;line-height:1.35!important;color:#1f2933}
.tmt-item__meta{margin-top:.35rem!important;color:#7b8794!important;font-size:.73rem!important}
.tmt-item__right{justify-content:flex-end;flex-wrap:wrap;gap:.4rem!important}.tmt-item__right svg{width:.9rem!important;height:.9rem!important;color:#9aa6b2!important}
.tmt-priority{display:inline-flex;align-items:center;padding:.27rem .52rem;border-radius:999px;font-size:.62rem;font-weight:700;white-space:nowrap}
.tmt-priority--high{background:#f5ede2;color:#704f28;border:1px solid #e9dcc7}.tmt-priority--normal{background:#f0f3f6;color:#596878;border:1px solid #e1e6eb}.tmt-priority--low{background:#edf3ef;color:#4d6756;border:1px solid #dce8df}
.tp-pill--wait{border-color:#e8dcc9!important;background:#f7f1e7!important;color:#73552c!important}.tp-pill--info{border-color:#d1deea!important;background:#eef4f8!important;color:#315b7d!important}.tp-pill--good{border-color:#d6e5da!important;background:#edf5ef!important;color:#426b52!important}
.tmt-panel{max-width:38rem!important;border:1px solid #dfe5ea;box-shadow:0 28px 70px -30px rgba(10,25,47,.45)!important}.tmt-panel__title{font-family:Georgia,"Times New Roman",serif;font-size:1.3rem!important;font-weight:500!important}
@media(max-width:700px){.tmt-hero{align-items:flex-start;flex-direction:column;padding:1.4rem}.tmt-hero .tp-btn{width:100%;justify-content:center}}
@media(max-width:520px){.tmt-summary{display:grid!important;grid-template-columns:1fr 1fr!important}.tmt-stat:not(:last-child)::after{display:none}.tmt-item{grid-template-columns:2.35rem minmax(0,1fr)!important;padding:.95rem!important}.tmt-item__icon{width:2.35rem!important;height:2.35rem!important}.tmt-item__right{grid-column:2;grid-row:auto;justify-content:flex-start}}
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
  open: "Received",
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
 
function priorityTone(priority: Priority | null): string {
  if (priority === "urgent" || priority === "high") return "tmt-priority--high";
  if (priority === "low") return "tmt-priority--low";
  return "tmt-priority--normal";
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
                <span className={`tmt-priority ${priorityTone(request.priority)}`}>
                  {PRIORITIES.find((item) => item.key === request.priority)?.label ?? "Normal"} priority
                </span>
                <span className={`tp-pill ${statusTone(request.status)}`}>
                  {STATUS_LABEL[request.status ?? "open"]}
                </span>
                <ChevronRight />
              </span>
 
              <p className="tmt-item__meta">
                {request.status === "completed"
                  ? `Resolved ${longDate(request.completed_date)}`
                  : `Reported ${longDate(request.reported_date)}`}
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
      title="Home Care"
      subtitle="Maintenance requests, access coordination, and the path back to a well-kept home."
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
            <p className="tmt-hero__eyebrow"><Wrench /> Maintenance</p>
            <h2>Maintenance requests</h2>
            <p>Report a problem, coordinate access, and follow every step until your home is back to normal.</p>
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
              <dt className="tp-label">Received</dt>
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