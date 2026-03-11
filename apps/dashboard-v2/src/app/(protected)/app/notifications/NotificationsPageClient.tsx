"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchWorkspaceNotifications, markWorkspaceNotificationsRead, peekCachedResult } from "@/lib/client/api";
import type { WorkspaceNotification } from "@/lib/types/workspace";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusChip } from "@/components/ui/StatusChip";

const NotificationsPageClient = () => {
  const cachedNotifications = peekCachedResult<{ rows: WorkspaceNotification[] }>("/api/workspace/notifications?limit=100");
  const [rows, setRows] = useState<WorkspaceNotification[]>(cachedNotifications?.ok ? (cachedNotifications.data?.rows ?? []) : []);
  const [loading, setLoading] = useState(!(cachedNotifications?.ok && cachedNotifications.data));
  const [error, setError] = useState<string | null>(null);
  const [markingRead, setMarkingRead] = useState(false);

  const unreadCount = useMemo(() => rows.filter((row) => !row.is_read).length, [rows]);

  const load = async () => {
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
    <div className="page-wrap space-y-8">
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Notifications</CardTitle>
              <p className="text-sm text-muted-foreground">Tenant-scoped activity and hierarchy notifications for your workspace.</p>
            </div>
            <button type="button" className="secondary-btn" onClick={() => void markAllRead()} disabled={markingRead || unreadCount === 0}>
              Mark all read
            </button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 pt-0">
          <StatusChip label={`Unread ${unreadCount}`} tone={unreadCount > 0 ? "warning" : "success"} />
          <StatusChip label={`Total ${rows.length}`} />
        </CardContent>
      </Card>

      {loading ? <LoadingState label="Loading notifications..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}

      {!loading && !error ? (
        <Card>
          <CardContent className="space-y-3 p-5">
            {rows.length === 0 ? <EmptyState title="No notifications yet" subtitle="Your workspace is up to date." compact /> : null}
            {rows.map((row) => (
              <Card key={row.id} className="rounded-xl border-border shadow-sm">
                <CardContent className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{row.title}</p>
                    <StatusChip label={row.is_read ? "Read" : "Unread"} tone={row.is_read ? "default" : "info"} compact />
                  </div>
                  <p className="text-xs text-muted-foreground">{row.type} | {new Date(row.created_at).toLocaleString()}</p>
                  {row.message ? <p className="text-sm text-muted-foreground">{row.message}</p> : null}
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default NotificationsPageClient;


