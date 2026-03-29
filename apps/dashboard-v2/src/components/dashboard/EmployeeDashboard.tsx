"use client";

import Link from "next/link";
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  CalendarClock,
  Clock3,
  CreditCard,
  FileText,
  HandCoins,
  MessageSquare,
  NotebookPen,
  PhoneCall,
  RefreshCw,
  ShieldCheck,
  UserCheck
} from "lucide-react";
import { fetchEmployeeDashboard, peekCachedResult } from "@/lib/client/api";
import type { EmployeeDashboardResponse } from "@/lib/types/dashboard";
import { ErrorState } from "@/components/states/ErrorState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ActionCard } from "@/components/ui/ActionCard";
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
  type DashboardView,
} from "@/components/dashboard/DashboardPrimitives";
import { SkeletonCard, SkeletonChart, SkeletonList } from "@/components/ui/SkeletonBlocks";
import EmployeeKpiSection from "@/components/dashboard/widgets/EmployeeKpiSection";
import {
  DashboardRail,
  OverviewChips,
  StatePanel,
  StatCard,
  StatGrid,
  SurfacePanel,
} from "@/components/dashboard-v2/PagePrimitives";

const EmployeeAnalyticsWidget = lazy(() => import("@/components/dashboard/widgets/EmployeeAnalyticsWidget"));
const EmployeeActivityFeedWidget = lazy(() => import("@/components/dashboard/widgets/EmployeeActivityFeedWidget"));
const EmployeeNotificationsWidget = lazy(() => import("@/components/dashboard/widgets/EmployeeNotificationsWidget"));
const EmployeeCalendarWidget = lazy(() => import("@/components/dashboard/widgets/EmployeeCalendarWidget"));
const EmployeeChatPreviewWidget = lazy(() => import("@/components/dashboard/widgets/EmployeeChatPreviewWidget"));

type LeaveBreakdown = {
  totalUsed: number;
  totalEntitled: number;
};

const currencyFormatter = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 0
});

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

const formatCurrency = (value?: number | null) => {
  if (value === null || value === undefined) return "-";
  return currencyFormatter.format(value);
};

const trimText = (value: string, max = 88) => (value.length <= max ? value : `${value.slice(0, max - 1)}...`);

const getLeaveBreakdown = (rows: EmployeeDashboardResponse["leaveBalances"]): LeaveBreakdown =>
  rows.reduce(
    (acc, row) => {
      acc.totalUsed += Math.max(0, row.used_days);
      acc.totalEntitled += Math.max(0, row.entitled_days);
      return acc;
    },
    { totalUsed: 0, totalEntitled: 0 }
  );

export const EmployeeDashboard = ({
  allowedRoutes = [],
}: {
  allowedRoutes?: string[];
}) => {
  const cachedDashboard = peekCachedResult<EmployeeDashboardResponse>("/api/dashboard/employee");
  const [data, setData] = useState<EmployeeDashboardResponse | null>(cachedDashboard?.ok ? (cachedDashboard.data ?? null) : null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<DashboardView>("workspace");
  const perf = useDashboardPerf("employee");
  const allowedRouteSet = useMemo(() => new Set(allowedRoutes), [allowedRoutes]);

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

  const workspace = data?.workspace;
  const attendance = data?.attendanceToday;
  const shift = data?.upcomingShifts[0] ?? null;
  const attendanceStatus = useMemo(() => {
    const status = attendance?.status ?? "not_clocked_in";
    return status.replace(/_/g, " ");
  }, [attendance?.status]);
  const dayState = useMemo(() => {
    const status = attendance?.dayState ?? "present";
    if (status === "go_active") return "GO Active";
    if (status === "go_applied") return "GO Applied";
    return status.replace(/_/g, " ");
  }, [attendance?.dayState]);
  const isLate = (attendance?.lateMinutes ?? 0) > 0;

  const leave = getLeaveBreakdown(data?.leaveBalances ?? []);
  const remainingLeave = Math.max(leave.totalEntitled - leave.totalUsed, 0);
  const leaveUtilization = leave.totalEntitled > 0 ? Math.round((leave.totalUsed / leave.totalEntitled) * 100) : 0;
  const unreadNotifications = workspace?.counts.unreadNotifications ?? 0;
  const pendingShiftSwaps = (data?.notifications ?? []).filter((row) => /shift swap/i.test(`${row.title} ${row.message ?? ""}`)).length;
  const upcomingLeave = (data?.notifications ?? []).find((row) =>
    /leave.*approved|approved.*leave/i.test(`${row.title} ${row.message ?? ""}`)
  );
  const recentPayslip = data?.recentPayslips[0] ?? null;
  const latestRequest = workspace?.loanRequests[0] ?? null;
  const recentChats = workspace?.chat.slice(0, 3) ?? [];
  const hasAttendance = allowedRouteSet.has("/app/attendance");
  const hasLeave = allowedRouteSet.has("/app/leave");
  const hasNotes = allowedRouteSet.has("/app/notes");
  const hasResources = allowedRouteSet.has("/app/resources");
  const hasPayslips = allowedRouteSet.has("/app/payslips");
  const hasLoans = allowedRouteSet.has("/app/loans");
  const hasChat = allowedRouteSet.has("/app/chat");
  const hasCalendar = allowedRouteSet.has("/app/calendar");
  const hasShiftSwaps = allowedRouteSet.has("/app/attendance/shift-swaps");
  const hasNotifications = allowedRouteSet.has("/app/notifications");
  const hasProfile = allowedRouteSet.has("/app/profile");
  const hasCollaborationPreview = hasCalendar || hasChat;
  const hasKnowledgePanel = hasNotes || hasResources;
  const hasRoleNavigation = hasProfile || hasPayslips || hasNotifications || hasResources;
  const activityItems = useMemo(
    () =>
      (data?.notifications ?? []).slice(0, 5).map((item) => ({
        title: item.title,
        subtitle: item.message ?? "Workspace update",
        meta: new Date(item.created_at).toLocaleString(),
      })),
    [data?.notifications]
  );
  const supportChips = [
    workspace?.employee.department_name ? workspace.employee.department_name : "No department assigned",
    workspace?.employee.team_name ? workspace.employee.team_name : "No team assigned",
    workspace?.teamLead?.full_name ? `Supervisor: ${workspace.teamLead.full_name}` : "Supervisor not assigned",
    workspace?.manager?.full_name ? `Manager: ${workspace.manager.full_name}` : "Manager not assigned",
  ];

  if (error && !data) {
    return <ErrorState message={error} />;
  }

  return (
    <div className="space-y-8 fade-in">
      <DashboardHero
        eyebrow="Employee Workspace"
        title="Your day, requests, records, and support context in one premium lane"
        subtitle="Stay on top of the self-service tools, records, and shared support context available in your workspace without leaving the employee shell."
      />

      <DashboardModeSwitch
        value={view}
        onChange={setView}
        title="Employee control lanes"
        subtitle="Move between daily execution, insight, and operating context while keeping your own requests and visibility boundaries clear."
      />

      <DashboardSection visible={view === "workspace"}>
        <DashboardRail className="items-start xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
          <SurfacePanel
            title="Personal control lane"
            description="Everything you need to act on today: shift status, leave balance, payroll visibility, profile readiness, and support contacts."
            tone="spotlight"
          >
            <div className="space-y-5">
              <OverviewChips
                chips={[
                  shift ? `${shift.start_time} - ${shift.end_time}` : "No shift assigned",
                  `${remainingLeave} leave days remaining`,
                  `${unreadNotifications} unread notifications`,
                  hasLoans ? `${workspace?.counts.openLoanRequests ?? 0} open finance requests` : "Finance requests hidden",
                ]}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <StatePanel title="Attendance" description={isLate ? "Late mark detected for today" : "Shift state is currently healthy"} className="border-slate-200 bg-slate-50/80 shadow-none">
                  <SignalRow
                    label="Day state"
                    value={<StatusBadge status={dayState} tone={attendance?.payrollImpact?.startsWith("no_pay") ? "warning" : "info"} />}
                    tone={attendance?.payrollImpact?.startsWith("no_pay") ? "warning" : "info"}
                  />
                  <SignalRow
                    label="Clock status"
                    value={<StatusBadge status={attendanceStatus} tone={isLate ? "warning" : "info"} />}
                    tone={isLate ? "warning" : "info"}
                  />
                  <SignalRow
                    label="Late Login"
                    value={
                      attendance?.lateLoginRequest.exists
                        ? attendance.lateLoginRequest.status ?? "pending"
                        : isLate
                          ? "Request available"
                          : "Not required"
                    }
                  />
                  <SignalRow label="Worked today" value={formatMinutes(attendance?.workMinutes)} />
                </StatePanel>
                <StatePanel title="Leave balance" description="Current balance and next leave signal" className="border-slate-200 bg-slate-50/80 shadow-none">
                  <SignalRow label="Remaining" value={`${remainingLeave} days`} tone={remainingLeave > 0 ? "success" : "warning"} />
                  <SignalRow label="Next leave update" value={upcomingLeave ? formatDate(upcomingLeave.created_at) : "No current leave notice"} />
                </StatePanel>
                <StatePanel title="Profile readiness" description="Keep your workspace and approvals friction-free" className="border-slate-200 bg-slate-50/80 shadow-none">
                  <SignalRow
                    label="Completeness"
                    value={`${data?.profileCompletenessScore ?? 0}%`}
                    tone={(data?.profileCompletenessScore ?? 0) >= 80 ? "success" : "warning"}
                  />
                  <SignalRow label="Files available" value={workspace?.counts.files ?? 0} />
                </StatePanel>
                <StatePanel title="Department support" description="Use the nearest support contacts when you need operational help" className="border-slate-200 bg-slate-50/80 shadow-none">
                  <SignalRow label="Supervisor" value={workspace?.teamLead?.full_name ?? "Not assigned"} tone={workspace?.teamLead?.full_name ? "info" : "default"} />
                  <SignalRow label="Contact" value={workspace?.teamLead?.phone ?? "Not configured"} />
                  <SignalRow label="Manager" value={workspace?.manager?.full_name ?? "Not assigned"} tone={workspace?.manager?.full_name ? "info" : "default"} />
                  <SignalRow label="Contact" value={workspace?.manager?.phone ?? "Not configured"} />
                </StatePanel>
              </div>
            </div>
          </SurfacePanel>

          <SurfacePanel title="Operating context" description="Stay aligned with your lead, your department, and your current support channels.">
            <div className="space-y-4">
              <OverviewChips chips={supportChips} />
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <SignalRow label="Reporting lead" value={workspace?.teamLead?.full_name ?? "Not assigned"} />
              <SignalRow label="Department" value={workspace?.department?.name ?? workspace?.employee.department_name ?? "-"} />
              <SignalRow label="Team" value={workspace?.employee.team_name ?? "-"} />
              <SignalRow label="Company" value={workspace?.company?.name ?? "-"} />
              <SignalRow label="Supervisor contact" value={workspace?.teamLead?.phone ?? "Not configured"} />
              <SignalRow label="Manager" value={workspace?.manager?.full_name ?? "Not assigned"} />
              <SignalRow label="Manager contact" value={workspace?.manager?.phone ?? "Not configured"} />
              {hasPayslips ? <SignalRow label="Latest payslip" value={recentPayslip ? formatDate(recentPayslip.generated_at) : "No payslips yet"} /> : null}
              {hasLoans ? <SignalRow label="Open requests" value={workspace?.counts.openLoanRequests ?? 0} tone={(workspace?.counts.openLoanRequests ?? 0) > 0 ? "warning" : "default"} /> : null}
              {hasResources ? <SignalRow label="Resources available" value={workspace?.counts.resources ?? 0} /> : null}
              </div>
            </div>
          </SurfacePanel>
        </DashboardRail>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">What matters now</h2>
          {!data ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SkeletonCard rows={3} />
              <SkeletonCard rows={3} />
              <SkeletonCard rows={3} />
              <SkeletonCard rows={3} />
            </div>
          ) : (
            <StatGrid>
              <StatCard
                label="Today's shift"
                value={attendance?.shiftLabel ? attendance.shiftLabel : shift ? `${shift.start_time} - ${shift.end_time}` : "No shift"}
                hint={attendance?.dayState === "off_day" ? "Off day with no default deduction" : shift ? shift.shift_name : "No active shift assignment"}
              />
              <StatCard
                label="Daily break"
                value={attendance?.status === "on_break" ? "On break" : attendance?.checkIn ? "Available" : "Inactive"}
                hint={attendance?.status === "on_break" ? "Resume from the attendance workspace" : "Use attendance to start or end breaks"}
              />
              <StatCard
                label="Work logged"
                value={formatMinutes(attendance?.workMinutes)}
                hint={attendance?.checkIn ? `Checked in ${attendance.checkIn}` : "No check-in recorded yet"}
              />
              <StatCard
                label="Payroll snapshot"
                value={recentPayslip ? formatCurrency(recentPayslip.net_salary) : "-"}
                hint={recentPayslip ? `Generated ${formatDate(recentPayslip.generated_at)}` : "No recent payslip snapshot"}
              />
              <StatCard
                label={hasLoans ? "My requests" : "Unread alerts"}
                value={hasLoans ? (workspace?.counts.openLoanRequests ?? 0) : unreadNotifications}
                hint={
                  hasLoans
                    ? (latestRequest ? `${latestRequest.obligation_type} - ${latestRequest.status}` : "No open financial requests")
                    : (hasNotifications ? `${unreadNotifications} unread notifications in your workspace` : "Notification center unavailable")
                }
              />
            </StatGrid>
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {hasAttendance ? <ActionCard title="Open Attendance" description="Track today&apos;s shift and attendance records" href="/app/attendance" icon={Clock3} /> : null}
            {hasLeave ? <ActionCard title="Apply Leave" description="Submit and review leave requests" href="/app/leave" icon={CalendarClock} /> : null}
            {hasShiftSwaps ? <ActionCard title="Shift Swaps" description="Request or track shift exchange approvals" href="/app/attendance/shift-swaps" icon={RefreshCw} /> : null}
            {hasPayslips ? <ActionCard title="Payslips" description="Review payroll snapshots and salary history" href="/app/payslips" icon={CreditCard} /> : null}
            {hasLoans ? <ActionCard title="Loans & Advances" description="Track finance requests already linked to your profile" href="/app/loans" icon={HandCoins} /> : null}
            {hasNotes ? <ActionCard title="Workspace Notes" description="Capture and pin personal workspace notes" href="/app/notes" icon={NotebookPen} /> : null}
            {hasResources ? <ActionCard title="Resources" description="Open SOPs, documents, and company resources" href="/app/resources" icon={FileText} /> : null}
            {hasChat ? <ActionCard title="Chat" description="Collaborate with your team and shared contacts" href="/app/chat" icon={MessageSquare} /> : null}
            {hasCalendar ? <ActionCard title="Calendar" description="Review shifts, leave, and calendar context" href="/app/calendar" icon={RefreshCw} /> : null}
          </div>
        </section>

        <DashboardRail className="items-start xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.95fr)]">
          <SurfacePanel title="Requests, payroll, and support" description="Keep financial requests, payroll visibility, and support contacts visible while you work.">
            <div className="space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Financial requests</h3>
                  {hasLoans ? <Link href="/app/loans" className="text-sm font-medium text-blue-700 hover:text-blue-800">
                    Open requests
                  </Link> : null}
                </div>
                {hasLoans && workspace?.loanRequests.length ? (
                  <div className="space-y-3">
                    {workspace.loanRequests.slice(0, 3).map((request) => (
                      <div key={request.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-950">{request.obligation_type}</p>
                          <StatusBadge status={request.status.replace(/_/g, " ")} tone={request.status === "approved" ? "success" : request.status === "rejected" ? "warning" : "info"} />
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          {formatCurrency(request.requested_amount)} {request.currency_code} - {formatDate(request.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title={hasLoans ? "No open requests" : "Finance requests unavailable"}
                    subtitle={hasLoans ? "Your finance queue is clear right now." : "This workspace does not currently expose finance request access."}
                    compact
                  />
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Recent payroll snapshots</h3>
                  {hasPayslips ? <Link href="/app/payslips" className="text-sm font-medium text-blue-700 hover:text-blue-800">
                    View payslips
                  </Link> : null}
                </div>
                {hasPayslips && data?.recentPayslips.length ? (
                  <div className="space-y-3">
                    {data.recentPayslips.map((payslip) => (
                      <div key={payslip.id} className="rounded-2xl border border-slate-200/80 bg-white/88 px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-950">{formatDate(payslip.generated_at)}</p>
                          <span className="text-sm font-medium text-slate-700">{formatCurrency(payslip.net_salary)}</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">Payroll visibility is available without widening deeper finance controls.</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title={hasPayslips ? "No payslips yet" : "Payslips unavailable"}
                    subtitle={hasPayslips ? "Payslip snapshots will appear here when payroll runs are generated for your scope." : "Payslip history is not currently available in this workspace."}
                    compact
                  />
                )}
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-4">
                <div className="flex items-start gap-3">
                  <PhoneCall className="mt-0.5 h-5 w-5 text-blue-700" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-950">{workspace?.department?.main_contact_label ?? "Department shared contact"}</p>
                    <p className="text-sm text-slate-600">
                      {workspace?.department?.main_contact_email ?? "Not configured yet"}
                      {workspace?.department?.main_contact_phone ? ` - ${workspace.department.main_contact_phone}` : ""}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </SurfacePanel>

          {hasKnowledgePanel ? (
          <SurfacePanel title="Notes, resources, and support context" description="Keep your own knowledge base and current operational guidance close to the employee home.">
            <div className="space-y-5">
              {hasNotes ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Pinned notes and reminders</h3>
                  <Link href="/app/notes" className="text-sm font-medium text-blue-700 hover:text-blue-800">
                    Open notes
                  </Link>
                </div>
                {workspace?.notes.length ? (
                  <div className="space-y-3">
                    {workspace.notes.slice(0, 3).map((note) => (
                      <div key={note.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-950">{note.title}</p>
                          {note.is_pinned ? <StatusBadge status="Pinned" tone="info" /> : null}
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{trimText(note.body)}</p>
                        <p className="mt-2 text-xs text-slate-500">Updated {formatDate(note.updated_at)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No notes yet" subtitle="Create workspace notes to keep daily context and reminders visible here." compact />
                )}
              </div>
              ) : null}

              {hasResources ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Resources and SOPs</h3>
                  <Link href="/app/resources" className="text-sm font-medium text-blue-700 hover:text-blue-800">
                    Browse resources
                  </Link>
                </div>
                {workspace?.resources.length ? (
                  <div className="space-y-3">
                    {workspace.resources.slice(0, 3).map((resource) => (
                      <div key={resource.id} className="rounded-2xl border border-slate-200/80 bg-white/88 px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-950">{resource.title}</p>
                          <StatusBadge status={resource.resource_type} tone={resource.resource_type === "sop" ? "info" : undefined} />
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{resource.summary ? trimText(resource.summary) : "Company guidance and operational reference material."}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No resources published yet" subtitle="Shared resources and SOPs will appear here when available for your company." compact />
                )}
              </div>
              ) : null}
            </div>
          </SurfacePanel>
          ) : null}
        </DashboardRail>
      </DashboardSection>

      <DashboardSection visible={view === "analytics"}>
        <div className={`grid grid-cols-1 gap-4 ${hasNotifications ? "xl:grid-cols-2" : ""}`}>
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
          {hasNotifications ? <ChartPanel title="Notification load" subtitle="Unread and recent updates">
            <Suspense fallback={<SkeletonCard rows={5} />}>
              <DashboardWidgetBoundary title="Notification load" message="Notification insight is temporarily unavailable.">
                <EmployeeNotificationsWidget />
              </DashboardWidgetBoundary>
            </Suspense>
          </ChartPanel> : null}
        </div>
      </DashboardSection>

      <DashboardSection visible={view === "operations"}>
        <div className={`grid grid-cols-1 gap-4 ${hasCollaborationPreview ? "xl:grid-cols-2" : ""}`}>
          <WorkflowPanel title="Inbox and activity" subtitle="Recent role-scoped updates that affect your own work.">
            {activityItems.length === 0 ? (
              <EmptyState title="Your workspace is up to date" subtitle="No recent activity to display." compact />
            ) : (
              <TimelineList
                items={activityItems.map((item, index) => ({
                  title: item.title,
                  subtitle: item.subtitle,
                  meta: item.meta ?? `#${index + 1}`,
                }))}
              />
            )}
          </WorkflowPanel>
          {hasCollaborationPreview ? <WorkflowPanel title="Calendar and collaboration" subtitle="Keep upcoming events and current conversations visible without leaving the dashboard.">
            <div className="space-y-4">
              {hasCalendar ? <Suspense fallback={<SkeletonCard rows={4} />}>
                <DashboardWidgetBoundary title="Calendar preview" message="Calendar preview is temporarily unavailable.">
                  <EmployeeCalendarWidget />
                </DashboardWidgetBoundary>
              </Suspense> : null}
              {hasChat ? <Suspense fallback={<SkeletonList rows={4} />}>
                <DashboardWidgetBoundary title="Chat preview" message="Chat preview is temporarily unavailable.">
                  <EmployeeChatPreviewWidget />
                </DashboardWidgetBoundary>
              </Suspense> : null}
            </div>
          </WorkflowPanel> : null}
        </div>

        <DashboardRail className="items-start xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <WorkflowPanel title="Detailed timeline" subtitle="Role-scoped workflow events and platform reminders.">
            <Suspense fallback={<SkeletonList rows={6} />}>
              <DashboardWidgetBoundary title="Detailed timeline" message="The activity timeline is temporarily unavailable.">
                <EmployeeActivityFeedWidget />
              </DashboardWidgetBoundary>
            </Suspense>
          </WorkflowPanel>

          <SurfacePanel title="Current support lines" description="Keep the nearest support and communication paths visible while you operate.">
            <div className="space-y-4">
              <SignalRow label="Reporting lead" value={workspace?.teamLead?.full_name ?? "Not assigned"} />
              <SignalRow label="Supervisor contact" value={workspace?.teamLead?.phone ?? "Not configured"} tone={workspace?.teamLead?.phone ? "info" : "default"} />
              <SignalRow label="Manager" value={workspace?.manager?.full_name ?? "Not assigned"} />
              <SignalRow label="Manager contact" value={workspace?.manager?.phone ?? "Not configured"} tone={workspace?.manager?.phone ? "info" : "default"} />
              <SignalRow label="Department" value={workspace?.department?.name ?? workspace?.employee.department_name ?? "-"} />
              <SignalRow label="Team" value={workspace?.employee.team_name ?? "-"} />
              <SignalRow label="Company" value={workspace?.company?.name ?? "-"} />
            </div>
          </SurfacePanel>
        </DashboardRail>

        {hasRoleNavigation ? (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Role Navigation</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {hasProfile ? <ActionCard title="My Profile" description="Review your self-service profile safely" href="/app/profile" icon={UserCheck} /> : null}
            {hasPayslips ? <ActionCard title="Payslips" description="Open payroll snapshots already available to you" href="/app/payslips" icon={CreditCard} /> : null}
            {hasNotifications ? <ActionCard title="Notifications" description="Review alerts, approvals, and reminders" href="/app/notifications" icon={BadgeCheck} /> : null}
            {hasResources ? <ActionCard title="Resources" description="Stay close to SOPs and company guidance" href="/app/resources" icon={ShieldCheck} /> : null}
          </div>
        </section>
        ) : null}

        {hasChat && recentChats.length ? (
          <SurfacePanel title="Recent chat context" description="A lightweight view of your current conversation lane without widening deeper collaboration access.">
            <div className="space-y-3">
              {recentChats.map((message) => (
                <div key={message.id} className="rounded-2xl border border-slate-200/80 bg-white/88 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-950">
                      {message.direction === "out" ? `To ${message.recipient_name ?? "Team member"}` : `From ${message.sender_name ?? "Team member"}`}
                    </p>
                    <p className="text-xs text-slate-500">{formatDate(message.created_at)}</p>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{trimText(message.message_text)}</p>
                </div>
              ))}
            </div>
          </SurfacePanel>
        ) : null}
      </DashboardSection>
    </div>
  );
};
