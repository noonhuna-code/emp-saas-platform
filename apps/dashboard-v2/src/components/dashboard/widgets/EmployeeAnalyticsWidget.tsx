"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles, TrendingUp } from "lucide-react";
import { fetchAttendanceHistory, fetchLeaveBalances } from "@/lib/client/api";
import type { AttendanceHistoryRow } from "@/lib/types/attendance";
import type { LeaveBalance } from "@/lib/types/leave";
import { SignalRow } from "@/components/dashboard/DashboardPrimitives";
import { EmptyState } from "@/components/ui/EmptyState";
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
      <div className="employee-analytics-stack">
        <SkeletonChart />
        <SkeletonChart />
      </div>
    );
  }

  return (
    <div className="employee-analytics-stack">
      <section className="employee-analytics-surface">
        <div className="employee-analytics-surface__head">
          <div>
            <h3 className="employee-analytics-surface__title">Attendance trend</h3>
            <p className="employee-analytics-surface__subtitle">Hours and late marks over the last 10 days</p>
          </div>
          <span className="metric-card-surface__trend"><TrendingUp className="h-3.5 w-3.5" /> Trend</span>
        </div>
        {error ? (
          <EmptyState title="Attendance analytics unavailable" subtitle={error} compact />
        ) : trends.workHoursTrend.length > 0 ? (
          <div className="space-y-4">
            <LineChart values={trends.workHoursTrend} height={92} />
            <MiniBarChart values={trends.lateMinutesTrend.map((value) => Math.max(1, value))} height={56} />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <SignalRow label="Records tracked" value={historyRows.length} />
              <SignalRow label="Late flags" value={trends.lateMinutesTrend.filter((value) => value > 0).length} tone="warning" />
            </div>
          </div>
        ) : (
          <EmptyState title="No attendance history yet" subtitle="Attendance trends will appear after your first tracked days." compact />
        )}
      </section>

      <section className="employee-analytics-surface">
        <div className="employee-analytics-surface__head">
          <div>
            <h3 className="employee-analytics-surface__title">Leave balance trend</h3>
            <p className="employee-analytics-surface__subtitle">Used versus remaining leave by type</p>
          </div>
          <span className="metric-card-surface__trend"><Sparkles className="h-3.5 w-3.5" /> Live</span>
        </div>
        {error ? (
          <EmptyState title="Leave analytics unavailable" subtitle="Try again in a moment." compact />
        ) : stacked.length > 0 ? (
          <div className="space-y-4">
            <StackedBarChart rows={stacked} height={104} />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <SignalRow label="Tracked days" value={historyRows.length} />
              <SignalRow label="Leave types" value={stacked.length} tone="info" />
            </div>
          </div>
        ) : (
          <EmptyState title="No leave balances configured" subtitle="Leave utilization appears after HR assigns leave balances." compact />
        )}
      </section>
    </div>
  );
}
