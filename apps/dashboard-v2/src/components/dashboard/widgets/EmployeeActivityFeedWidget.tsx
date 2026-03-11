"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchWorkspaceNotifications, fetchWorkspaceResources } from "@/lib/client/api";
import { TimelineList } from "@/components/dashboard/DashboardPrimitives";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonList } from "@/components/ui/SkeletonBlocks";

export default function EmployeeActivityFeedWidget() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Array<{ id: string; title: string; subtitle?: string; meta?: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void Promise.all([
      fetchWorkspaceNotifications({ limit: 5 }),
      fetchWorkspaceResources(3)
    ])
      .then(([notificationResult, resourceResult]) => {
        if (!active) return;

        if (!notificationResult.ok && !resourceResult.ok) {
          setError(notificationResult.error ?? resourceResult.error ?? "Unable to load activity feed");
          return;
        }

        const notificationItems = notificationResult.ok && notificationResult.data
          ? notificationResult.data.rows.map((row) => ({
              id: row.id,
              title: row.title,
              subtitle: row.message ?? "Workspace update",
              meta: new Date(row.created_at).toLocaleString()
            }))
          : [];

        const resourceItems = resourceResult.ok && resourceResult.data
          ? resourceResult.data.rows.map((resource) => ({
              id: resource.id,
              title: "New company announcement",
              subtitle: resource.title,
              meta: new Date(resource.created_at).toLocaleDateString()
            }))
          : [];

        setItems([...notificationItems, ...resourceItems].slice(0, 6));
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load activity feed");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const list = useMemo(() => items, [items]);

  if (loading) {
    return <SkeletonList rows={6} />;
  }

  if (error) {
    return <div className="rounded-xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">Activity feed unavailable. {error}</div>;
  }

  if (list.length === 0) {
    return <EmptyState title="Your workspace is up to date" subtitle="No recent activity to display." compact />;
  }

  return <TimelineList items={list} />;
}
