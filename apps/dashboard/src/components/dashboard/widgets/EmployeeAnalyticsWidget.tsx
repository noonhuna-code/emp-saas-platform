"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles, TrendingUp } from "lucide-react";
import { fetchAttendanceHistory, fetchLeaveBalances } from "@/lib/client/api";
import type { AttendanceHistoryRow } from "@/lib/types/attendance";
import type { LeaveBalance } from "@/lib/types/leave";
import { DashboardPanel, SignalRow } from "@/components/dashboard/DashboardPrimitives";
import { LineChart, MiniBarChart, StackedBarChart } from "@/components/shared/Charts";
import { SkeletonChart } from "@/components/ui/SkeletonBlocks";

const toTrendSeries = (rows: AttendanceHistoryRow[]) => {
  if (rows.length === 0) {
    return {
      workHoursTrend: [] as number[],
      lateMinutesTrend: [] as number[]
    };
  }

  const ordered = [...rows]
    .sort((a, b) => a.attendance_date.localeCompare(b.attendance_date))
    .slice(-10);

  return {
    workHoursTrend: ordered.map((row) => Math.round(((row.work_minutes ?? 0) / 60) * 10) / 10),
    lateMinutesTrend: ordered.map((row) => row.late_minutes ?? 0)
  };
};

const breakdownRows = (rows: LeaveBalance[]) => {
  const totals = new Map<string, { used: number; remaining: number }>();
  for (const row of rows) {
    const key = row.leave_type_id.toUpperCase();
    const existing = totals.get(key) ?? { used: 0, remaining: 0 };
    existing.used += Math.max(0, row.used_days);
    existing.remaining += Math.max(0, row.entitled_days - row.used_days);
    totals.set(key, existing);
  }

  return Array.from(totals.entries()).slice(0, 4).map(([label, value]) => ({
    label,
    a: value.used,
    b: value.remaining
  }));
};

export default function EmployeeAnalyticsWidget() {
  const [historyRows, setHistoryRows] = useState<AttendanceHistoryRow[]>([]);
  const [leaveRows, setLeaveRows] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void Promise.all([
      fetchAttendanceHistory({ page: 1, pageSize: 14 }),
      fetchLeaveBalances({ year: new Date().getFullYear() })
    ])
      .then(([historyResult, leaveResult]) => {
        if (!active) return;

        if (!historyResult.ok && !leaveResult.ok) {
          setError(historyResult.error ?? leaveResult.error ?? "Unable to load analytics");
          return;
        }

        setHistoryRows(historyResult.ok && historyResult.data ? historyResult.data.rows ?? [] : []);
        setLeaveRows(leaveResult.ok && leaveResult.data ? leaveResult.data.balances ?? [] : []);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load analytics");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const trends = useMemo(() => toTrendSeries(historyRows), [historyRows]);
  const stacked = useMemo(() => breakdownRows(leaveRows), [leaveRows]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SkeletonChart />
        <SkeletonChart />
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DashboardPanel title="Attendance trend" subtitle="Analytics unavailable" tone="spotlight">
          <p className="text-sm text-muted-foreground">{error}</p>
        </DashboardPanel>
        <DashboardPanel title="Leave balance trend" subtitle="Analytics unavailable" tone="soft">
          <p className="text-sm text-muted-foreground">Try again in a moment.</p>
        </DashboardPanel>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <DashboardPanel
        title="Attendance trend"
        subtitle="Hours and late marks (last 10 days)"
        tone="spotlight"
        actions={<span className="tag"><TrendingUp className="h-3.5 w-3.5" /> Trend</span>}
      >
        {trends.workHoursTrend.length > 0 ? (
          <div className="space-y-3">
            <LineChart values={trends.workHoursTrend} height={92} />
            <MiniBarChart values={trends.lateMinutesTrend.map((value) => Math.max(1, value))} height={56} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No attendance history yet.</p>
        )}
      </DashboardPanel>

      <DashboardPanel
        title="Leave balance trend"
        subtitle="Used vs remaining by leave type"
        tone="soft"
        actions={<span className="tag"><Sparkles className="h-3.5 w-3.5" /> Live</span>}
      >
        {stacked.length > 0 ? <StackedBarChart rows={stacked} height={96} /> : <p className="text-sm text-muted-foreground">No leave balances configured.</p>}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <SignalRow label="Tracked days" value={historyRows.length} />
          <SignalRow label="Leave types" value={stacked.length} />
        </div>
      </DashboardPanel>
    </div>
  );
}
