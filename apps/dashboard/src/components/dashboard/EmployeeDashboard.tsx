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
  Timer,
  UserCheck
} from "lucide-react";
import { fetchEmployeeDashboard } from "@/lib/client/api";
import type { EmployeeDashboardResponse } from "@/lib/types/dashboard";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ActionCard } from "@/components/ui/ActionCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardPanel, SignalRow } from "@/components/dashboard/DashboardPrimitives";

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

const getLeaveBuckets = (rows: EmployeeDashboardResponse["leaveBalances"]) => {
  const buckets = { cl: 0, sl: 0, al: 0 };

  for (const row of rows) {
    const remaining = Math.max(0, row.entitled_days - row.used_days);
    const key = row.leave_type_id.toLowerCase();

    if (key.includes("casual") || key === "cl") {
      buckets.cl += remaining;
      continue;
    }
    if (key.includes("sick") || key === "sl") {
      buckets.sl += remaining;
      continue;
    }
    if (key.includes("annual") || key.includes("earned") || key === "al") {
      buckets.al += remaining;
    }
  }

  return buckets;
};

export const EmployeeDashboard = () => {
  const [data, setData] = useState<EmployeeDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    void fetchEmployeeDashboard()
      .then((result) => {
        if (!active) return;
        if (!result.ok || !result.data) {
          setError(result.error ?? "Unable to load dashboard");
          return;
        }
        setData(result.data);
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
  const leaveBuckets = getLeaveBuckets(data.leaveBalances);
  const pendingShiftSwaps = data.notifications.filter((row) => /shift swap/i.test(`${row.title} ${row.message ?? ""}`)).length;
  const upcomingLeave = data.notifications.find((row) => /leave.*approved|approved.*leave/i.test(`${row.title} ${row.message ?? ""}`));

  return (
    <div className="page-wrap space-y-8 fade-in">
      <Card className="rounded-xl border-border shadow-sm">
        <CardHeader className="space-y-2 p-5 pb-3">
          <CardTitle className="text-3xl">My Daily Work Workspace</CardTitle>
          <CardDescription className="text-base">
            Focus on today&apos;s shift, attendance, leave, and team updates.
          </CardDescription>
        </CardHeader>
      </Card>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Today</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card className="rounded-xl border-border shadow-sm">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-lg">Today&apos;s Shift</CardTitle>
              <CardDescription>
                {shift ? `${shift.start_time} - ${shift.end_time} (${shift.shift_name})` : "No shift assigned"}
              </CardDescription>
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
              <CardDescription>Assigned reporting and org context.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-5 pt-0">
              <SignalRow label="Team lead" value={workspace.teamLead?.full_name ?? "Not assigned"} />
              <SignalRow label="Department" value={workspace.employee.department_name ?? "-"} />
              <SignalRow label="Company" value={workspace.company?.name ?? "-"} />
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
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Leave balance</p>
              <p className="text-2xl font-semibold leading-none">CL {leaveBuckets.cl} | SL {leaveBuckets.sl} | AL {leaveBuckets.al}</p>
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
        <h2 className="text-xl font-semibold">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ActionCard title="Apply Leave" description="Submit and track leave requests" href="/app/leave" icon={CalendarDays} />
          <ActionCard title="Request Shift Swap" description="Propose shift exchange" href="/app/attendance/shift-swaps" icon={RefreshCw} />
          <ActionCard title="Open Attendance" description="Track daily attendance" href="/app/attendance" icon={Clock3} />
          <ActionCard title="Open Calendar" description="Holidays, shifts, leaves" href="/app/calendar" icon={CalendarDays} />
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
          <ActionCard title="Payslips" description="Payroll snapshot history" href="/app/payslips" icon={Timer} />
          <ActionCard title="Notifications" description="Inbox and reminders" href="/app/notifications" icon={Bell} />
        </div>
      </section>
    </div>
  );
};