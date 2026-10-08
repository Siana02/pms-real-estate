import { useEffect, useMemo, useState } from "react";
import TenantDashboardLayout from "../../layouts/TenantDashboardLayout";
import { apiRequest } from "../../services/api";
import {
  Bell,
  BellRing,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  CreditCard,
  Info,
  Megaphone,
  Settings2,
  Wrench,
  X,
} from "lucide-react";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  created_at: string;
  read_at?: string | null;
  status?: string | null;
  status_label?: string | null;
  maintenance_request_id?: number | null;
};

type Filter = "all" | "maintenance" | "payments" | "general" | "lease";

const styles = `
.tn-page { display:flex; flex-direction:column; gap:1.25rem; }
.tn-hero { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; padding:1.25rem 1.35rem; border:1px solid var(--tp-line); border-radius:var(--tp-r-lg); background:linear-gradient(135deg,#f8fbff,#fff); }
.tn-hero__copy { display:flex; gap:.875rem; }
.tn-hero__icon { display:flex; align-items:center; justify-content:center; flex:none; width:2.75rem; height:2.75rem; border-radius:.8rem; background:var(--tp-blue-pale); color:var(--tp-blue); }
.tn-hero__icon svg { width:1.25rem; height:1.25rem; }
.tn-hero h2 { margin:0; font-size:1rem; font-weight:700; }
.tn-hero p { margin:.3rem 0 0; color:var(--tp-muted); font-size:.84rem; line-height:1.5; max-width:38rem; }
.tn-permission { display:flex; align-items:center; gap:.625rem; padding:.65rem .8rem; border:1px solid #bfdbfe; border-radius:.65rem; background:#eff6ff; color:#1d4ed8; font-size:.78rem; font-weight:600; }
.tn-permission button { display:inline-flex; align-items:center; gap:.35rem; padding:.35rem .6rem; border-radius:.45rem; background:#2563eb; color:#fff; font-weight:700; }
.tn-permission button svg { width:.85rem; height:.85rem; }
.tn-filters { display:flex; flex-wrap:wrap; gap:.45rem; }
.tn-filter { display:inline-flex; align-items:center; gap:.4rem; min-height:2.25rem; padding:0 .75rem; border:1px solid var(--tp-line); border-radius:999px; background:#fff; color:var(--tp-muted); font-size:.78rem; font-weight:650; }
.tn-filter svg { width:.9rem; height:.9rem; }
.tn-filter[data-active="true"] { border-color:#bfdbfe; background:var(--tp-surface-tint); color:var(--tp-blue-dark); }
.tn-list { display:flex; flex-direction:column; gap:.7rem; }
.tn-item { position:relative; display:grid; grid-template-columns:auto 1fr auto; gap:.85rem; padding:1rem 1.05rem; border:1px solid var(--tp-line); border-radius:var(--tp-r-md); background:#fff; box-shadow:var(--tp-shadow-sm); }
.tn-item[data-unread="true"] { border-color:#c7dbff; background:linear-gradient(90deg,#f8fbff,#fff); }
.tn-item__dot { width:2.25rem; height:2.25rem; display:flex; align-items:center; justify-content:center; border-radius:.7rem; background:var(--tp-surface-sunken); color:var(--tp-muted); }
.tn-item[data-kind="maintenance"] .tn-item__dot { background:#ecfdf5; color:#15803d; }
.tn-item[data-kind="payments"] .tn-item__dot { background:#eff6ff; color:#2563eb; }
.tn-item[data-kind="general"] .tn-item__dot { background:#fff7ed; color:#c2410c; }
.tn-item[data-kind="lease"] .tn-item__dot { background:#f5f3ff; color:#6d28d9; }
.tn-item__dot svg { width:1.05rem; height:1.05rem; }
.tn-item__body { min-width:0; }
.tn-item__meta { display:flex; align-items:center; gap:.5rem; flex-wrap:wrap; margin-bottom:.2rem; }
.tn-item__category { font-size:.66rem; font-weight:750; letter-spacing:.06em; text-transform:uppercase; color:var(--tp-faint); }
.tn-item__new { width:.42rem; height:.42rem; border-radius:50%; background:var(--tp-blue); }
.tn-item h3 { margin:0; font-size:.9rem; font-weight:700; line-height:1.35; }
.tn-item p { margin:.3rem 0 0; color:var(--tp-muted); font-size:.82rem; line-height:1.55; }
.tn-item time { display:block; white-space:nowrap; color:var(--tp-faint); font-size:.72rem; }
.tn-status { display:inline-flex; margin-top:.55rem; padding:.25rem .5rem; border-radius:999px; background:var(--tp-surface-sunken); color:var(--tp-ink-soft); font-size:.68rem; font-weight:700; }
.tn-settings { display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:1rem 1.05rem; border:1px solid var(--tp-line); border-radius:var(--tp-r-md); background:#fff; }
.tn-settings__copy { display:flex; gap:.7rem; align-items:flex-start; }
.tn-settings__icon { color:var(--tp-muted); margin-top:.1rem; }
.tn-settings h3 { margin:0; font-size:.85rem; }
.tn-settings p { margin:.25rem 0 0; color:var(--tp-muted); font-size:.76rem; line-height:1.45; }
.tn-switch { position:relative; width:2.7rem; height:1.55rem; flex:none; border-radius:999px; background:#cbd5e1; }
.tn-switch[data-on="true"] { background:var(--tp-blue); }
.tn-switch::after { content:""; position:absolute; top:.2rem; left:.2rem; width:1.15rem; height:1.15rem; border-radius:50%; background:#fff; transition:transform .18s ease; box-shadow:0 1px 2px rgba(0,0,0,.15); }
.tn-switch[data-on="true"]::after { transform:translateX(1.15rem); }
.tn-empty { padding:3rem 1rem; text-align:center; border:1px dashed var(--tp-line); border-radius:var(--tp-r-lg); background:#fff; }
.tn-empty__icon { display:inline-flex; padding:.8rem; border-radius:50%; background:var(--tp-surface-tint); color:var(--tp-blue); }
.tn-empty h3 { margin:.8rem 0 .3rem; font-size:.95rem; }
.tn-empty p { margin:0 auto; max-width:28rem; color:var(--tp-muted); font-size:.82rem; line-height:1.5; }
.tn-toast { position:fixed; right:1rem; bottom:1rem; z-index:100; display:flex; align-items:flex-start; gap:.7rem; width:min(24rem,calc(100vw - 2rem)); padding:.9rem; border:1px solid var(--tp-line); border-radius:.8rem; background:#fff; box-shadow:var(--tp-shadow-pop); }
.tn-toast__icon { color:var(--tp-blue); }
.tn-toast strong { display:block; font-size:.82rem; }
.tn-toast span { display:block; margin-top:.2rem; color:var(--tp-muted); font-size:.74rem; }
.tn-toast button { margin-left:auto; color:var(--tp-faint); }
.tn-toast button svg { width:1rem; height:1rem; }
@media (max-width:640px) {
  .tn-hero { flex-direction:column; }
  .tn-permission { width:100%; justify-content:space-between; }
  .tn-item { grid-template-columns:auto 1fr; }
  .tn-item time { grid-column:2; }
  .tn-settings { align-items:flex-start; }
}
`;

function categoryOf(item: NotificationItem): Exclude<Filter, "all"> {
  if (item.type.includes("maintenance")) return "maintenance";
  if (item.type.includes("payment") || item.type.includes("rent")) return "payments";
  if (item.type.includes("lease") || item.type.includes("move")) return "lease";
  return "general";
}

function iconFor(kind: string) {
  if (kind === "maintenance") return <Wrench />;
  if (kind === "payments") return <CreditCard />;
  if (kind === "lease") return <CalendarDays />;
  return <Megaphone />;
}

function labelFor(kind: string) {
  return kind === "maintenance" ? "Maintenance" : kind === "payments" ? "Payments" : kind === "lease" ? "Lease & home" : "General";
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-KE", { day:"numeric", month:"short", year:"numeric", hour:"numeric", minute:"2-digit" }).format(date);
}

function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported"
  );
  const [toast, setToast] = useState<NotificationItem | null>(null);
  const [desktopEnabled, setDesktopEnabled] = useState(
    typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted"
  );

  async function loadNotifications(initial = false) {
    try {
      const payload = await apiRequest("/tenant/notifications");
      const rows = Array.isArray(payload?.data) ? payload.data : [];
      setItems(rows);
      if (initial) setLoading(false);
      return rows as NotificationItem[];
    } catch {
      if (initial) setLoading(false);
      return [];
    }
  }

  useEffect(() => {
    let active = true;
    loadNotifications(true);
    const interval = window.setInterval(async () => {
      if (!active) return;
      const next = await loadNotifications();
      if (!next.length) return;
      const known = new Set(itemsRef.current);
      const fresh = next.filter((item) => !known.has(item.id));
      if (fresh[0]) {
        setToast(fresh[0]);
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(fresh[0].title, {
            body: fresh[0].body || "You have a new property portal update.",
            tag: fresh[0].id,
          });
        }
      }
      itemsRef.current = new Set(next.map((item) => item.id));
    }, 60000);
    return () => { active = false; window.clearInterval(interval); };
  }, []);

  const itemsRef = { current: new Set<string>() };
  useEffect(() => {
    itemsRef.current = new Set(items.map((item) => item.id));
  }, [items]);

  async function enableDesktopNotifications() {
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    setDesktopEnabled(result === "granted");
  }

  const filtered = useMemo(
    () => filter === "all" ? items : items.filter((item) => categoryOf(item) === filter),
    [filter, items]
  );
  const unread = items.filter((item) => !item.read_at).length;

  return (
    <TenantDashboardLayout
      title="Notifications"
      subtitle="Important updates, payment reminders and progress from your property team."
      unreadNotifications={unread}
    >
      <style>{styles}</style>
      <div className="tn-page">
        <section className="tn-hero">
          <div className="tn-hero__copy">
            <div className="tn-hero__icon"><BellRing /></div>
            <div>
              <h2>Your property communication hub</h2>
              <p>Stay on top of maintenance, rent and property announcements without hunting through separate sections of the portal.</p>
            </div>
          </div>
          {permission === "default" && (
            <div className="tn-permission">
              <span>Get important updates on this device</span>
              <button type="button" onClick={enableDesktopNotifications}><Bell /> Enable</button>
            </div>
          )}
          {permission === "denied" && <div className="tn-permission"><span>Browser notifications are blocked.</span></div>}
        </section>

        <div className="tn-filters" aria-label="Notification categories">
          {(["all","maintenance","payments","general","lease"] as Filter[]).map((value) => (
            <button key={value} type="button" className="tn-filter" data-active={filter === value} onClick={() => setFilter(value)}>
              {value === "all" ? <Bell /> : iconFor(value)}
              {value === "all" ? "All updates" : labelFor(value)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="tn-empty"><Bell className="tn-empty__icon" /><h3>Loading your updates…</h3></div>
        ) : filtered.length === 0 ? (
          <div className="tn-empty">
            <span className="tn-empty__icon"><CheckCircle2 /></span>
            <h3>You're all caught up</h3>
            <p>When your property team posts an announcement, updates a maintenance request, records a payment or needs something from you, it will appear here.</p>
          </div>
        ) : (
          <div className="tn-list">
            {filtered.map((item) => {
              const kind = categoryOf(item);
              return (
                <article className="tn-item" key={item.id} data-kind={kind} data-unread={!item.read_at}>
                  <div className="tn-item__dot">{iconFor(kind)}</div>
                  <div className="tn-item__body">
                    <div className="tn-item__meta">
                      <span className="tn-item__category">{labelFor(kind)}</span>
                      {!item.read_at && <span className="tn-item__new" aria-label="Unread" />}
                    </div>
                    <h3>{item.title}</h3>
                    {item.body && <p>{item.body}</p>}
                    {item.status_label && <span className="tn-status">{item.status_label}</span>}
                  </div>
                  <time dateTime={item.created_at}>{formatTime(item.created_at)}</time>
                </article>
              );
            })}
          </div>
        )}

        <section className="tn-settings">
          <div className="tn-settings__copy">
            <Settings2 className="tn-settings__icon" />
            <div>
              <h3>Device notifications</h3>
              <p>{desktopEnabled ? "This device can show property updates while the portal is open." : "Allow browser notifications to see new updates as they arrive."}</p>
            </div>
          </div>
          <button type="button" className="tn-switch" data-on={desktopEnabled} onClick={enableDesktopNotifications} aria-label="Enable device notifications" />
        </section>
      </div>

      {toast && (
        <div className="tn-toast" role="status">
          <Bell className="tn-toast__icon" />
          <div><strong>{toast.title}</strong><span>{toast.body || "New property portal update."}</span></div>
          <button type="button" onClick={() => setToast(null)} aria-label="Dismiss"><X /></button>
        </div>
      )}
    </TenantDashboardLayout>
  );
}

export default NotificationsPage;
