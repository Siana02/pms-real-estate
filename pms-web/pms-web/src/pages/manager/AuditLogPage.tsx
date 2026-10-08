import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { apiRequest } from "../../services/api";

type Log = {
  id: number;
  event: string;
  description: string;
  created_at: string;
  actor?: { name: string; role: string };
};

const eventLabels: Record<string, string> = {
  TENANT_ADDED: "TENANT ADDED",
  TENANT_UPDATED: "TENANT UPDATED",
  TENANT_REMOVED: "TENANT REMOVED",
  PAYMENT_SETTINGS_CONFIGURED: "PAYMENT SETTINGS CONFIGURED",
  PAYMENT_SETTINGS_UPDATED: "PAYMENT SETTINGS UPDATED",
  CREATED: "CREATED",
  UPDATED: "UPDATED",
  DELETED: "DELETED",
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const data: any = await apiRequest("/audit-logs");
        setLogs(data?.data ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <DashboardLayout>
      <div style={{ padding: "2rem", maxWidth: 1200, margin: "0 auto" }}>
        <h1>Audit log</h1>
        <p style={{ color: "#64748b" }}>
          A permanent history of important organization activity, written in
          terms that make sense to your property team.
        </p>

        {loading ? (
          <p>Loading…</p>
        ) : logs.length === 0 ? (
          <p style={{ color: "#64748b" }}>No organization activity recorded yet.</p>
        ) : (
          <div style={{ display: "grid", gap: ".65rem" }}>
            {logs.map((log) => (
              <article
                key={log.id}
                style={{
                  padding: "1rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                  <strong>{eventLabels[log.event] ?? log.event.replaceAll("_", " ")}</strong>
                  <small>{new Date(log.created_at).toLocaleString()}</small>
                </div>
                <p>{log.description}</p>
                <small>
                  {log.actor?.name ?? "System"} · {log.actor?.role ?? "system"}
                </small>
              </article>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
