"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchWorkspaceNotifications, fetchWorkspaceResources } from "@/lib/client/api";
import { ActivityFeed, type ActivityItem } from "@/components/dashboard/ActivityFeed";
import { SkeletonList } from "@/components/ui/SkeletonBlocks";

export default function EmployeeActivityFeedWidget() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ActivityItem[]>([]);

  useEffect(() => {
    let active = true;

    void Promise.all([
      fetchWorkspaceNotifications({ limit: 5 }),
      fetchWorkspaceResources(3)
    ])
      .then(([notificationResult, resourceResult]) => {
        if (!active) return;

        const notificationItems = notificationResult.ok && notificationResult.data
          ? notificationResult.data.rows.map((row) => ({
              id: row.id,
              title: row.title,
              description: row.message ?? "Workspace update",
              timestamp: new Date(row.created_at).toLocaleString()
            }))
          : [];

        const resourceItems = resourceResult.ok && resourceResult.data
          ? resourceResult.data.rows.map((resource) => ({
              id: resource.id,
              title: "New company announcement",
              description: resource.title,
              timestamp: new Date(resource.created_at).toLocaleDateString()
            }))
          : [];

        setItems([...notificationItems, ...resourceItems].slice(0, 6));
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

  return <ActivityFeed items={list} />;
}
