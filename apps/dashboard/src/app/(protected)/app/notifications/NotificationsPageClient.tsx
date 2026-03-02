"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchWorkspaceNotifications, markWorkspaceNotificationsRead } from "@/lib/client/api";
import type { WorkspaceNotification } from "@/lib/types/workspace";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";

const NotificationsPageClient = () => {
  const [rows, setRows] = useState<WorkspaceNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingRead, setMarkingRead] = useState(false);

  const unreadCount = useMemo(() => rows.filter((row) => !row.is_read).length, [rows]);

  const load = async () => {
    setLoading(true);
    setError(null);
    const result = await fetchWorkspaceNotifications({ limit: 100 });
    if (!result.ok || !result.data) {
      setError(result.error ?? "Unable to load notifications");
      setLoading(false);
      return;
    }
    setRows(result.data.rows);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const markAllRead = async () => {
    if (unreadCount === 0) return;
    setMarkingRead(true);
    setError(null);
    const unreadIds = rows.filter((row) => !row.is_read).map((row) => row.id);
    const result = await markWorkspaceNotificationsRead({ ids: unreadIds });
    if (!result.ok) {
      setError(result.error ?? "Unable to mark notifications as read");
      setMarkingRead(false);
      return;
    }
    await load();
    setMarkingRead(false);
  };

  return (
    <div className="page-wrap page-grid">
      <section className="card stack">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div className="stack" style={{ gap: 6 }}>
            <h1>Notifications</h1>
            <p className="muted">Tenant-scoped activity and hierarchy notifications for your workspace.</p>
          </div>
          <button type="button" className="secondary-btn" onClick={() => void markAllRead()} disabled={markingRead || unreadCount === 0}>
            Mark all read
          </button>
        </div>
        <div className="row">
          <span className="tag">Unread {unreadCount}</span>
          <span className="tag">Total {rows.length}</span>
        </div>
      </section>

      {loading ? <LoadingState label="Loading notifications..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}

      {!loading && !error ? (
        <section className="card stack">
          {rows.length === 0 ? <p className="muted">No notifications yet.</p> : null}
          {rows.map((row) => (
            <article key={row.id} className="card card--nested stack">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong>{row.title}</strong>
                <span className={`tag ${row.is_read ? "" : "tag--success"}`}>
                  {row.is_read ? "Read" : "Unread"}
                </span>
              </div>
              <div className="row">
                <span className="muted" style={{ fontSize: 12 }}>{row.type}</span>
                <span className="muted" style={{ fontSize: 12 }}>{new Date(row.created_at).toLocaleString()}</span>
              </div>
              {row.message ? <p className="muted">{row.message}</p> : null}
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
};

export default NotificationsPageClient;

