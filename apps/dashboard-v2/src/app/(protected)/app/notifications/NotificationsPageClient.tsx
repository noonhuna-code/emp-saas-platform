"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchWorkspaceNotifications, markWorkspaceNotificationsRead, peekCachedResult } from "@/lib/client/api";
import type { WorkspaceNotification } from "@/lib/types/workspace";
import {
  DashboardRail,
  FeatureCallout,
  PageContainer,
  PageHeader,
  StatCard,
  StatGrid,
  SurfacePanel,
} from "@/components/dashboard-v2/PagePrimitives";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusChip } from "@/components/ui/StatusChip";

const formatStamp = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const NotificationsPageClient = () => {
  const cachedNotifications = peekCachedResult<{ rows: WorkspaceNotification[] }>("/api/workspace/notifications?limit=100");
  const [rows, setRows] = useState<WorkspaceNotification[]>(cachedNotifications?.ok ? (cachedNotifications.data?.rows ?? []) : []);
  const [loading, setLoading] = useState(!(cachedNotifications?.ok && cachedNotifications.data));
  const [error, setError] = useState<string | null>(null);
  const [markingRead, setMarkingRead] = useState(false);

  const unreadCount = useMemo(() => rows.filter((row) => !row.is_read).length, [rows]);
  const unreadRows = useMemo(() => rows.filter((row) => !row.is_read), [rows]);

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
    <PageContainer>
      <PageHeader
        eyebrow="Notifications"
        title="Unread alerts, reminders, and workflow signals"
        description="Keep operational reminders, request changes, and workspace updates in one inbox so the rest of the product can stay calm."
        chips={["Unread first", "Role-scoped feed", "Action routing", "Operational context"]}
        actions={(
          <button type="button" className="secondary-btn" onClick={() => void markAllRead()} disabled={markingRead || unreadCount === 0}>
            {markingRead ? "Marking..." : "Mark all read"}
          </button>
        )}
      />

      <FeatureCallout
        badge="Inbox"
        title="One place for role-scoped reminders and workflow signals."
        description="This feed is intentionally compact: the goal is to surface what changed, what still needs acknowledgement, and which updates should send you into a deeper workflow."
      />

      <StatGrid>
        <StatCard label="Unread" value={unreadCount} hint="Items still waiting on acknowledgement" />
        <StatCard label="Total" value={rows.length} hint="Notifications loaded for this workspace" />
        <StatCard
          label="Latest event"
          value={rows[0] ? formatStamp(rows[0].created_at) : "-"}
          hint="Most recent notification timestamp"
        />
        <StatCard
          label="Active feed"
          value={unreadCount > 0 ? "Needs review" : "Up to date"}
          hint="Current inbox posture"
        />
      </StatGrid>

      {loading ? <LoadingState label="Loading notifications..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}

      {!loading && !error ? (
        <DashboardRail>
          <SurfacePanel title="Notification feed" description="Sorted newest first so new operational context lands immediately.">
            {rows.length === 0 ? (
              <EmptyState title="No notifications yet" subtitle="Your workspace is up to date." compact />
            ) : (
              <div className="space-y-3">
                {rows.map((row) => (
                  <div key={row.id} className="rounded-[22px] border border-slate-200/80 bg-white/90 p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-950">{row.title}</p>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{row.type}</p>
                      </div>
                      <StatusChip label={row.is_read ? "Read" : "Unread"} tone={row.is_read ? "default" : "info"} compact />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{row.message ?? "No additional message provided."}</p>
                    <p className="mt-3 text-xs text-slate-500">{formatStamp(row.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </SurfacePanel>

          <div className="space-y-6">
            <SurfacePanel title="Unread first" description="The items still asking for attention.">
              {unreadRows.length === 0 ? (
                <EmptyState title="No unread notifications" subtitle="Everything in this workspace has already been reviewed." compact />
              ) : (
                <div className="space-y-3">
                  {unreadRows.slice(0, 6).map((row) => (
                    <div key={`${row.id}-unread`} className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-950">{row.title}</p>
                        <StatusChip label="Unread" tone="info" compact />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{row.message ?? "Open the source workflow for details."}</p>
                    </div>
                  ))}
                </div>
              )}
            </SurfacePanel>

            <SurfacePanel title="How to use this lane" description="The inbox should route you toward action, not become the action itself.">
              <p className="text-sm leading-6 text-slate-600">
                Read notifications here, then move directly into approvals, attendance, payroll, or people workflows where the actual decision or correction lives.
              </p>
            </SurfacePanel>
          </div>
        </DashboardRail>
      ) : null}
    </PageContainer>
  );
};

export default NotificationsPageClient;
