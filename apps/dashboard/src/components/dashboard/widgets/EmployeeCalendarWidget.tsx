"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { fetchWorkspaceCalendar } from "@/lib/client/api";
import type { WorkspaceCalendarResponse } from "@/lib/types/workspace";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonCard } from "@/components/ui/SkeletonBlocks";

export default function EmployeeCalendarWidget() {
  const [data, setData] = useState<WorkspaceCalendarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const month = new Date().toISOString().slice(0, 7);
    void fetchWorkspaceCalendar(month)
      .then((result) => {
        if (!active) return;
        if (!result.ok) {
          setError(result.error ?? "Unable to load calendar preview");
          return;
        }
        setData(result.data ?? null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load calendar preview");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const highlights = useMemo(() => {
    if (!data) return [] as Array<{ date: string; title: string }>;
    return data.official_holidays.slice(0, 3).map((row) => ({
      date: new Date(row.date).toLocaleDateString(),
      title: row.name
    }));
  }, [data]);

  if (loading) {
    return <SkeletonCard rows={4} />;
  }

  return (
    <Card className="rounded-xl border-border shadow-sm">
      <CardHeader className="p-5 pb-3">
        <CardTitle className="text-lg">Calendar preview</CardTitle>
        <CardDescription>{error ? "Calendar preview unavailable" : "Upcoming holidays and approved timeline signals"}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-5 pt-0">
        {error ? (
          <EmptyState title="Calendar unavailable" subtitle={error} compact />
        ) : highlights.length === 0 ? (
          <EmptyState title="No upcoming events" subtitle="Use calendar for full month view." compact />
        ) : (
          highlights.map((row) => (
            <div key={`${row.date}-${row.title}`} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{row.title}</p>
                <p className="text-xs text-muted-foreground">{row.date}</p>
              </div>
            </div>
          ))
        )}

        <div className="flex justify-end">
          <Link href="/app/calendar" className="secondary-btn">Open calendar</Link>
        </div>
      </CardContent>
    </Card>
  );
}
