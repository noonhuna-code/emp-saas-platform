"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  Clock3,
  FileUp,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck
} from "lucide-react";
import { fetchAttendanceHistory, fetchEmployeeDashboard } from "@/lib/client/api";
import type { EmployeeDashboardResponse } from "@/lib/types/dashboard";
import type { AttendanceHistoryRow } from "@/lib/types/attendance";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ActionCard } from "@/components/ui/ActionCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardPanel, SignalRow } from "@/components/dashboard/DashboardPrimitives";
import { FlowStepper, LazyVisual } from "@/components/dashboard/DashboardVisuals";
import { Donut, LineChart, MiniBarChart, StackedBarChart } from "@/components/shared/Charts";

type LeaveBreakdown = {
  cl: { used: number; remaining: number };
  sl: { used: number; remaining: number };
  al: { used: number; remaining: number };
  totalUsed: number;
  totalRemaining: number;
  totalEntitled: number;
};

const formatMinutes = (value?: number | null) => {
  if (value === null || value === undefined) return "-";
  const hours = Math.floor(value / 60);
  const minutes = Math.max(0, value % 60);
  return `${hours}h ${minutes}m`;
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
};

const resolveLeaveKey = (leaveTypeId: string): "cl" | "sl" | "al" | null => {
  const key = leaveTypeId.toLowerCase();
  if (key.includes("casual") || key === "cl") return "cl";
  if (key.includes("sick") || key === "sl") return "sl";
  if (key.includes("annual") || key.includes("earned") || key === "al") return "al";
  return null;
};

const getLeaveBreakdown = (rows: EmployeeDashboardResponse["leaveBalances"]): LeaveBreakdown => {
  const breakdown: LeaveBreakdown = {
    cl: { used: 0, remaining: 0 },
    sl: { used: 0, remaining: 0 },
    al: { used: 0, remaining: 0 },
    totalUsed: 0,
    totalRemaining: 0,
    totalEntitled: 0
  };

  for (const row of rows) {
    const used = Math.max(0, row.used_days);
    const remaining = Math.max(0, row.entitled_days - row.used_days);
    const key = resolveLeaveKey(row.leave_type_id);

    breakdown.totalUsed += used;
    breakdown.totalRemaining += remaining;
    breakdown.totalEntitled += Math.max(0, row.entitled_days);

    if (!key) continue;
    breakdown[key].used += used;
    breakdown[key].remaining += remaining;
  }

  return breakdown;
};

const toTrendSeries = (rows: AttendanceHistoryRow[]) => {
  if (rows.length === 0) {
    return {
      workHoursTrend: [] as number[],
      lateMinutesTrend: [] as number[],
      overtimeTrend: [] as number[]
    };
  }

  const ordered = [...rows]
    .sort((a, b) => a.attendance_date.localeCompare(b.attendance_date))
    .slice(-10);

  return {
    workHoursTrend: ordered.map((row) => Math.round(((row.work_minutes ?? 0) / 60) * 10) / 10),
    lateMinutesTrend: ordered.map((row) => row.late_minutes ?? 0),
    overtimeTrend: ordered.map((row) => Math.round(((row.overtime_minutes ?? 0) / 60) * 10) / 10)
  };
};

export const EmployeeDashboard = () => {
  const [data, setData] = useState<EmployeeDashboardResponse | null>(null);
  const [historyRows, setHistoryRows] = useState<AttendanceHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    void Promise.all([
      fetchEmployeeDashboard(),
      fetchAttendanceHistory({ pageSize: 14 })
    ])
      .then(([dashboardResult, historyResult]) => {
        if (!active) return;

        if (!dashboardResult.ok || !dashboardResult.data) {
          setError(dashboardResult.error ?? "Unable to load dashboard");
          return;
        }

        setData(dashboardResult.data);

        if (historyResult.ok && historyResult.data) {
          setHistoryRows(historyResult.data.rows ?? []);
        } else {
          setHistoryRows([]);
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load dashboard");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const attendanceStatus = useMemo(() => {
    const status = data?.attendanceToday?.status ?? "not_clocked_in";
    return status.replace(/_/g, " ");
  }, [data]);

  if (loading) return <LoadingState label="Loading dashboard..." />;
  if (error || !data) return <ErrorState message={error ?? "Dashboard unavailable"} />;

  const workspace = data.workspace;
  const shift = data.upcomingShifts[0] ?? null;
  const attendance = data.attendanceToday;
  const isLate = (attendance?.lateMinutes ?? 0) > 0;

  const leave = getLeaveBreakdown(data.leaveBalances);
  const leaveUtilization = leave.totalEntitled > 0 ? Math.round((leave.totalUsed / leave.totalEntitled) * 100) : 0;

  const pendingShiftSwaps = data.notifications.filter((row) => /shift swap/i.test(`${row.title} ${row.message ?? ""}`)).length;
  const upcomingLeave = data.notifications.find((row) => /leave.*approved|approved.*leave/i.test(`${row.title} ${row.message ?? ""}`));

  const trends = toTrendSeries(historyRows);
  const activityPulse = [
    workspace.counts.unreadNotifications,
    workspace.counts.resources,
    workspace.counts.chatMessages,
    workspace.counts.notes,
    workspace.counts.files
  ];

  return (
    <div className="page-wrap space-y-8 fade-in">
      <Card className="rounded-xl border-border shadow-sm dashboard-hero dashboard-hero--operations">
        <CardHeader className="space-y-2 p-5 pb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">Employee workspace</p>
          <CardTitle className="text-3xl">My Daily Work Workspace</CardTitle>
          <CardDescription className="text-base">
            Focused shift operations, attendance momentum, leave planning, and team updates in one premium workspace.
          </CardDescription>
        </CardHeader>
      </Card>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Today</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="rounded-xl border-border shadow-sm">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-lg">Today&apos;s Shift</CardTitle>
              <CardDescription>{shift ? `${shift.start_time} - ${shift.end_time} (${shift.shift_name})` : "No shift assigned"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-5 pt-0">
              <SignalRow label="Attendance" value={<StatusBadge status={attendanceStatus} tone={isLate ? "warning" : "info"} />} tone={isLate ? "warning" : "info"} />
              <SignalRow label="Check in" value={attendance?.checkIn ?? "-"} />
              <SignalRow label="Check out" value={attendance?.checkOut ?? "-"} />
            </CardContent>
          </Card>

          <Card className="rounded-xl border-border shadow-sm">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-lg">Clock In / Out</CardTitle>
              <CardDescription>Open attendance to record your shift status.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-5 pt-0">
              <SignalRow label="Worked today" value={formatMinutes(attendance?.workMinutes)} />
              <SignalRow label="Overtime" value={formatMinutes(attendance?.overtimeMinutes)} tone={(attendance?.overtimeMinutes ?? 0) > 0 ? "warning" : "default"} />
              <div className="flex justify-end">
                <Link href="/app/attendance" className="secondary-btn">Open Attendance</Link>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-border shadow-sm">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-lg">Team & Company</CardTitle>
              <CardDescription>Assigned reporting and organization context.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-5 pt-0">
              <SignalRow label="Team lead" value={workspace.teamLead?.full_name ?? "Not assigned"} />
              <SignalRow label="Department" value={workspace.employee.department_name ?? "-"} />
              <SignalRow label="Company" value={workspace.company?.name ?? "-"} />
            </CardContent>
          </Card>

          <Card className="rounded-xl border-border shadow-sm">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-lg">Security</CardTitle>
              <CardDescription>Last known auth health signal.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-5 pt-0">
              <SignalRow label="Risk score" value={data.securityStatus.lastRiskScore ?? "-"} tone={(data.securityStatus.lastRiskScore ?? 0) > 65 ? "warning" : "success"} />
              <SignalRow label="Last sign in" value={formatDate(data.securityStatus.lastLoginAt)} />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4" />
                Secure session controls active
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">My Stats</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Card className="rounded-xl border-border shadow-sm">
            <CardContent className="space-y-2 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Hours this week</p>
              <p className="text-3xl font-semibold leading-none">{formatMinutes(attendance?.workMinutes)}</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-border shadow-sm">
            <CardContent className="space-y-2 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Leave utilization</p>
              <div className="flex items-center justify-between gap-3">
                <p className="text-2xl font-semibold leading-none">{leaveUtilization}%</p>
                <Donut value={leaveUtilization} />
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-border shadow-sm">
            <CardContent className="space-y-2 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Pending shift swaps</p>
              <p className="text-3xl font-semibold leading-none">{pendingShiftSwaps}</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-border shadow-sm">
            <CardContent className="space-y-2 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Upcoming leave</p>
              <p className="text-lg font-semibold">{upcomingLeave ? formatDate(upcomingLeave.created_at) : "None"}</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-border shadow-sm">
            <CardContent className="space-y-2 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Notifications</p>
              <p className="text-3xl font-semibold leading-none">{workspace.counts.unreadNotifications}</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Visual Insights</h2>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <DashboardPanel
            title="Attendance momentum"
            subtitle="Recent worked hours and late-minute patterns"
            tone="spotlight"
            actions={<span className="tag"><TrendingUp className="h-3.5 w-3.5" /> Trend</span>}
          >
            {trends.workHoursTrend.length > 0 ? (
              <div className="space-y-3">
                <LineChart values={trends.workHoursTrend} height={92} />
                <MiniBarChart values={trends.lateMinutesTrend.map((value) => Math.max(1, value))} height={56} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent attendance history available.</p>
            )}
          </DashboardPanel>

          <DashboardPanel
            title="Workload mix"
            subtitle="Leave type utilization and workspace activity"
            tone="soft"
            actions={<span className="tag"><Sparkles className="h-3.5 w-3.5" /> Live</span>}
          >
            <StackedBarChart
              rows={[
                { label: "CL", a: leave.cl.used, b: leave.cl.remaining },
                { label: "SL", a: leave.sl.used, b: leave.sl.remaining },
                { label: "AL", a: leave.al.used, b: leave.al.remaining }
              ]}
              height={96}
            />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <SignalRow label="Messages" value={workspace.counts.chatMessages} />
              <SignalRow label="Notes + files" value={workspace.counts.notes + workspace.counts.files} />
            </div>
            <MiniBarChart values={activityPulse.map((value) => Math.max(value, 1))} height={44} />
          </DashboardPanel>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Workflow Flows</h2>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card className="rounded-xl border-border shadow-sm">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-lg">Leave Lifecycle</CardTitle>
              <CardDescription>Track where your leave request is in the pipeline.</CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <LazyVisual minHeight={110}>
                <FlowStepper
                  title="Leave request path"
                  steps={[
                    { label: "Request", state: "done" },
                    { label: "Manager", state: "active" },
                    { label: "HR", state: "pending" },
                    { label: "Final", state: "pending" }
                  ]}
                />
              </LazyVisual>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-border shadow-sm">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-lg">Shift Swap Lifecycle</CardTitle>
              <CardDescription>Visual handoff for shift change requests.</CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <LazyVisual minHeight={110}>
                <FlowStepper
                  title="Swap approval path"
                  steps={[
                    { label: "Submit", state: "done" },
                    { label: "Team Lead", state: "active" },
                    { label: "HR", state: "pending" },
                    { label: "Applied", state: "pending" }
                  ]}
                />
              </LazyVisual>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ActionCard title="Apply Leave" description="Submit and track leave requests" href="/app/leave" icon={CalendarDays} />
          <ActionCard title="Request Shift Swap" description="Propose shift exchange" href="/app/attendance/shift-swaps" icon={RefreshCw} />
          <ActionCard title="Open Attendance" description="Track daily attendance" href="/app/attendance" icon={Clock3} />
          <ActionCard title="Open Calendar" description="Holidays, shifts, and leaves" href="/app/calendar" icon={CalendarDays} />
          <ActionCard title="Open Chat" description="Collaborate with your team" href="/app/chat" icon={MessageSquare} />
          <ActionCard title="Upload Document" description="Save profile files and notes" href="/app/notes" icon={FileUp} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Upcoming</h2>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <DashboardPanel title="Upcoming events" subtitle="Holidays, approved leaves, and company announcements" tone="soft">
            <SignalRow label="Next holiday" value="Open Work Calendar" />
            <SignalRow label="Approved leave" value={upcomingLeave ? formatDate(upcomingLeave.created_at) : "No approved leave pending"} />
            <SignalRow label="Announcements" value={workspace.resources.length} />
          </DashboardPanel>

          <DashboardPanel title="Company announcements" subtitle="Recent notices and SOP updates" tone="soft">
            {workspace.resources.length === 0 ? (
              <Card className="rounded-xl border-dashed border-border shadow-none">
                <CardContent className="p-5 text-sm text-muted-foreground">No announcements published yet.</CardContent>
              </Card>
            ) : null}
            {workspace.resources.slice(0, 4).map((resource) => (
              <SignalRow key={resource.id} label={resource.title} value={resource.resource_type.toUpperCase()} />
            ))}
            <div className="flex justify-end">
              <Link href="/app/resources" className="secondary-btn">Open SOP Resources</Link>
            </div>
          </DashboardPanel>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Workspace Snapshot</h2>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="rounded-xl border-border shadow-sm">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-lg">Profile</CardTitle>
              <CardDescription>Personal employee record context</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-5 pt-0">
              <SignalRow label="Employee" value={workspace.employee.full_name ?? "Employee"} />
              <SignalRow label="Employee ID" value={workspace.employee.employee_code ?? "-"} />
              <SignalRow label="Designation" value={workspace.employee.designation ?? "-"} />
            </CardContent>
          </Card>

          <Card className="rounded-xl border-border shadow-sm">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-lg">Resources</CardTitle>
              <CardDescription>Knowledge base and SOP activity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-5 pt-0">
              <SignalRow label="SOPs" value={workspace.counts.sops} />
              <SignalRow label="Resources" value={workspace.counts.resources} />
              <SignalRow label="Chat messages" value={workspace.counts.chatMessages} />
            </CardContent>
          </Card>

          <Card className="rounded-xl border-border shadow-sm">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-lg">Personal inventory</CardTitle>
              <CardDescription>Notes, files, and loan requests</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-5 pt-0">
              <SignalRow label="Notes" value={workspace.counts.notes} />
              <SignalRow label="Files" value={workspace.counts.files} />
              <SignalRow label="Open loan requests" value={workspace.counts.openLoanRequests} />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Role Navigation</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ActionCard title="My Profile" description="Update personal details" href="/app/profile" icon={UserCheck} />
          <ActionCard title="Payslips" description="Payroll snapshot history" href="/app/payslips" icon={Clock3} />
          <ActionCard title="Notifications" description="Inbox and reminders" href="/app/notifications" icon={Bell} />
        </div>
      </section>
    </div>
  );
};



