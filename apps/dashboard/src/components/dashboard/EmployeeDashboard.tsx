"use client";

import Link from "next/link";
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { Clock3, FileUp, MessageSquare, RefreshCw, ShieldCheck, UserCheck } from "lucide-react";
import { fetchEmployeeDashboard, peekCachedResult } from "@/lib/client/api";
import type { EmployeeDashboardResponse } from "@/lib/types/dashboard";
import { ErrorState } from "@/components/states/ErrorState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ActionCard } from "@/components/ui/ActionCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { DashboardPerfMarker, useDashboardPerf } from "@/components/dashboard/useDashboardPerf";
import { DashboardWidgetBoundary } from "@/components/dashboard/DashboardWidgetBoundary";
import {
  ChartPanel,
  DashboardHero,
  DashboardModeSwitch,
  DashboardSection,
  SignalRow,
  TimelineList,
  WorkflowPanel,
  type DashboardView
} from "@/components/dashboard/DashboardPrimitives";
import { SkeletonCard, SkeletonChart, SkeletonList } from "@/components/ui/SkeletonBlocks";
import EmployeeKpiSection from "@/components/dashboard/widgets/EmployeeKpiSection";

const EmployeeAnalyticsWidget = lazy(() => import("@/components/dashboard/widgets/EmployeeAnalyticsWidget"));
const EmployeeActivityFeedWidget = lazy(() => import("@/components/dashboard/widgets/EmployeeActivityFeedWidget"));
const EmployeeNotificationsWidget = lazy(() => import("@/components/dashboard/widgets/EmployeeNotificationsWidget"));
const EmployeeCalendarWidget = lazy(() => import("@/components/dashboard/widgets/EmployeeCalendarWidget"));
const EmployeeChatPreviewWidget = lazy(() => import("@/components/dashboard/widgets/EmployeeChatPreviewWidget"));

type LeaveBreakdown = {
  totalUsed: number;
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

const getLeaveBreakdown = (rows: EmployeeDashboardResponse["leaveBalances"]): LeaveBreakdown => {
  return rows.reduce(
    (acc, row) => {
      acc.totalUsed += Math.max(0, row.used_days);
      acc.totalEntitled += Math.max(0, row.entitled_days);
      return acc;
    },
    { totalUsed: 0, totalEntitled: 0 }
  );
};

export const EmployeeDashboard = () => {
  const cachedDashboard = peekCachedResult<EmployeeDashboardResponse>("/api/dashboard/employee");
  const [data, setData] = useState<EmployeeDashboardResponse | null>(cachedDashboard?.ok ? (cachedDashboard.data ?? null) : null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<DashboardView>("workspace");
  const perf = useDashboardPerf("employee");

  const loadDashboard = useCallback(() => {
    let active = true;
    setError(null);

    void fetchEmployeeDashboard()
      .then((dashboardResult) => {
        if (!active) return;
        if (!dashboardResult.ok || !dashboardResult.data) {
          setError(dashboardResult.error ?? "Unable to load dashboard");
          return;
        }
        setData(dashboardResult.data);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load dashboard");
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const cleanup = loadDashboard();
    return cleanup;
  }, [loadDashboard]);

  useEffect(() => {
    perf.markKpiRendered();
  }, [perf]);

  const attendanceStatus = useMemo(() => {
    const status = data?.attendanceToday?.status ?? "not_clocked_in";
    return status.replace(/_/g, " ");
  }, [data]);

  if (error && !data) {
    return <ErrorState message={error} />;
  }

  const workspace = data?.workspace;
  const shift = data?.upcomingShifts[0] ?? null;
  const attendance = data?.attendanceToday;
  const isLate = (attendance?.lateMinutes ?? 0) > 0;

  const leave = getLeaveBreakdown(data?.leaveBalances ?? []);
  const leaveUtilization = leave.totalEntitled > 0 ? Math.round((leave.totalUsed / leave.totalEntitled) * 100) : 0;

  const pendingShiftSwaps = (data?.notifications ?? []).filter((row) =>
    /shift swap/i.test(`${row.title} ${row.message ?? ""}`)
  ).length;

  const upcomingLeave = (data?.notifications ?? []).find((row) =>
    /leave.*approved|approved.*leave/i.test(`${row.title} ${row.message ?? ""}`)
  );

  const unreadNotifications = workspace?.counts.unreadNotifications ?? 0;

  const activityItems = useMemo(() => {
    return (data?.notifications ?? []).slice(0, 5).map((item) => ({
      title: item.title,
      subtitle: item.message ?? "Workspace update",
      meta: new Date(item.created_at).toLocaleString()
    }));
  }, [data?.notifications]);

  return (
    <div className="page-wrap space-y-8 fade-in">
      <DashboardHero
        eyebrow="Employee workspace"
        title="My Daily Work Workspace"
        subtitle="Focused shift operations, attendance momentum, leave planning, and team updates in one premium workspace."
        emphasis="operations"
      />

      <DashboardModeSwitch value={view} onChange={setView} />

      <DashboardSection visible={view === "workspace"}>
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Today</h2>
          {!data ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SkeletonCard rows={3} />
              <SkeletonCard rows={3} />
              <SkeletonCard rows={3} />
              <SkeletonCard rows={3} />
            </div>
          ) : (
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
                  <SignalRow label="Reporting lead" value={workspace?.teamLead?.full_name ?? "Not assigned"} />
                  <SignalRow label="Department" value={workspace?.employee.department_name ?? "-"} />
                  <SignalRow label="Company" value={workspace?.company?.name ?? "-"} />
                </CardContent>
              </Card>

              <Card className="rounded-xl border-border shadow-sm">
                <CardHeader className="p-5 pb-2">
                  <CardTitle className="text-lg">Security</CardTitle>
                  <CardDescription>Last known auth health signal.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 p-5 pt-0">
                  <SignalRow label="Risk score" value={data?.securityStatus.lastRiskScore ?? "-"} tone={(data?.securityStatus.lastRiskScore ?? 0) > 65 ? "warning" : "success"} />
                  <SignalRow label="Last sign in" value={formatDate(data?.securityStatus.lastLoginAt)} />
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="h-4 w-4" />
                    Secure session controls active
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">My Stats</h2>
          <EmployeeKpiSection
            workMinutes={attendance?.workMinutes ?? null}
            leaveUtilization={leaveUtilization}
            pendingShiftSwaps={pendingShiftSwaps}
            upcomingLeave={upcomingLeave ? formatDate(upcomingLeave.created_at) : "None"}
            unreadNotifications={unreadNotifications}
          />
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <ActionCard title="Apply Leave" description="Submit and track leave requests" href="/app/leave" icon={Clock3} />
            <ActionCard title="Request Shift Swap" description="Propose shift exchange" href="/app/attendance/shift-swaps" icon={RefreshCw} />
            <ActionCard title="Open Attendance" description="Track daily attendance" href="/app/attendance" icon={Clock3} />
            <ActionCard title="Open Calendar" description="Holidays, shifts, and leaves" href="/app/calendar" icon={Clock3} />
            <ActionCard title="Open Chat" description="Collaborate with your team" href="/app/chat" icon={MessageSquare} />
            <ActionCard title="Upload Document" description="Save profile files and notes" href="/app/notes" icon={FileUp} />
          </div>
        </section>
      </DashboardSection>

      <DashboardSection visible={view === "analytics"}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartPanel title="Productivity trends" subtitle="Attendance and leave movement">
            <Suspense fallback={<SkeletonChart />}>
              <DashboardWidgetBoundary title="Productivity trends" message="Analytics are temporarily unavailable.">
                <>
                  <DashboardPerfMarker onReady={perf.markChartsLoaded} />
                  <EmployeeAnalyticsWidget />
                </>
              </DashboardWidgetBoundary>
            </Suspense>
          </ChartPanel>
          <ChartPanel title="Notification load" subtitle="Unread and recent updates">
            <Suspense fallback={<SkeletonCard rows={5} />}>
              <DashboardWidgetBoundary title="Notification load" message="Notification insight is temporarily unavailable.">
                <EmployeeNotificationsWidget />
              </DashboardWidgetBoundary>
            </Suspense>
          </ChartPanel>
        </div>
      </DashboardSection>

      <DashboardSection visible={view === "operations"}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <WorkflowPanel title="Activity feed" subtitle="Recent role-scoped workspace events">
            {activityItems.length === 0 ? (
              <EmptyState title="Your workspace is up to date" subtitle="No recent activity to display." compact />
            ) : (
              <TimelineList
                items={activityItems.map((item, index) => ({
                  title: item.title,
                  subtitle: item.subtitle,
                  meta: item.meta ?? `#${index + 1}`
                }))}
              />
            )}
          </WorkflowPanel>
          <WorkflowPanel title="Calendar & chat" subtitle="Upcoming events and team signals">
            <div className="space-y-4">
              <Suspense fallback={<SkeletonCard rows={4} />}>
                <DashboardWidgetBoundary title="Calendar preview" message="Calendar preview is temporarily unavailable.">
                  <EmployeeCalendarWidget />
                </DashboardWidgetBoundary>
              </Suspense>
              <Suspense fallback={<SkeletonList rows={4} />}>
                <DashboardWidgetBoundary title="Chat preview" message="Chat preview is temporarily unavailable.">
                  <EmployeeChatPreviewWidget />
                </DashboardWidgetBoundary>
              </Suspense>
            </div>
          </WorkflowPanel>
        </div>

        <WorkflowPanel title="Detailed timeline" subtitle="Role-scoped workflow events">
          <Suspense fallback={<SkeletonList rows={6} />}>
            <DashboardWidgetBoundary title="Detailed timeline" message="The activity timeline is temporarily unavailable.">
              <EmployeeActivityFeedWidget />
            </DashboardWidgetBoundary>
          </Suspense>
        </WorkflowPanel>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Role Navigation</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <ActionCard title="My Profile" description="Update personal details" href="/app/profile" icon={UserCheck} />
            <ActionCard title="Payslips" description="Payroll snapshot history" href="/app/payslips" icon={Clock3} />
            <ActionCard title="Notifications" description="Inbox and reminders" href="/app/notifications" icon={MessageSquare} />
          </div>
        </section>
      </DashboardSection>
    </div>
  );
};
