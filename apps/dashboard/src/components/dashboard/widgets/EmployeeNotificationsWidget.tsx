"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { fetchWorkspaceNotifications } from "@/lib/client/api";
import type { WorkspaceNotification } from "@/lib/types/workspace";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonList } from "@/components/ui/SkeletonBlocks";

export default function EmployeeNotificationsWidget() {
  const [rows, setRows] = useState<WorkspaceNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void fetchWorkspaceNotifications({ limit: 6, unreadOnly: true })
      .then((result) => {
        if (!active) return;
        setRows(result.ok && result.data ? result.data.rows ?? [] : []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const unread = useMemo(() => rows.filter((row) => !row.is_read), [rows]);

  if (loading) {
    return <SkeletonList rows={4} />;
  }

  return (
    <Card className="rounded-xl border-border shadow-sm">
      <CardHeader className="p-5 pb-3">
        <CardTitle className="text-lg">Notifications</CardTitle>
        <CardDescription>{unread.length} unread updates</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-5 pt-0">
        {unread.length === 0 ? (
          <EmptyState title="No notifications yet" subtitle="Your workspace is up to date." compact />
        ) : (
          unread.slice(0, 4).map((row) => (
            <div key={row.id} className="flex items-start gap-3 rounded-xl border border-border px-3 py-2.5">
              <Bell className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-5">{row.title}</p>
                {row.message ? <p className="text-xs text-muted-foreground">{row.message}</p> : null}
              </div>
            </div>
          ))
        )}
        <div className="flex justify-end">
          <Link href="/app/notifications" className="secondary-btn">Open notifications</Link>
        </div>
      </CardContent>
    </Card>
  );
}
