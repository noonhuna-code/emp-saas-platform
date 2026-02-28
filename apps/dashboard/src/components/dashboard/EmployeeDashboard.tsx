"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchEmployeeDashboard } from "@/lib/client/api";
import type { EmployeeDashboardResponse } from "@/lib/types/dashboard";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Donut, MiniBarChart } from "@/components/shared/Charts";
import {
  DashboardHero,
  DashboardKpiTile,
  DashboardPanel,
  QuickActionGrid,
  SignalRow,
  TimelineList
} from "@/components/dashboard/DashboardPrimitives";

const formatMinutes = (value?: number | null) => {
  if (value === null || value === undefined) return "-";
  const hours = Math.floor(value / 60);
  const minutes = Math.max(0, value % 60);
  return `${hours}h ${minutes}m`;
};

const formatCurrency = (value?: number | null) => {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value);
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

  const attendanceLabel = useMemo(() => {
    const status = data?.attendanceToday?.status ?? "not_clocked_in";
    return status.replace(/_/g, " ");
  }, [data]);

  const leaveUtilizationBars = useMemo(() => {
    return (data?.leaveBalances ?? []).slice(0, 6).map((balance) => Math.round(balance.used_days));
  }, [data]);

  const notificationTimeline = useMemo(() => {
    return (data?.notifications ?? []).slice(0, 6).map((note) => ({
      title: note.title,
      subtitle: note.message ?? undefined,
      meta: note.created_at
    }));
  }, [data]);

  const shiftTimeline = useMemo(() => {
    return (data?.upcomingShifts ?? []).slice(0, 6).map((shift) => ({
      title: shift.shift_name,
      subtitle: `${shift.start_time} - ${shift.end_time} (${shift.timezone})`,
      meta: shift.effective_from
    }));
  }, [data]);

  if (loading) return <LoadingState label="Loading dashboard..." />;
  if (error || !data) return <ErrorState message={error ?? "Dashboard unavailable"} />;

  const attendance = data.attendanceToday;
  const riskScore = data.securityStatus.lastRiskScore ?? 0;
  const tone = attendance?.status === "late" ? "warning" : attendance?.status === "clocked_out" ? "success" : "info";

  return (
    <div className="dashboard-shell fade-in">
      <DashboardHero
        eyebrow="Employee Workspace"
        title="Daily work summary"
        subtitle="Track attendance, leave balances, recent payroll snapshots, and account security signals in one read-only view."
        emphasis="default"
        actions={(
          <>
            <Link href="/app/attendance" className="secondary-btn">Attendance</Link>
            <Link href="/app/leave" className="secondary-btn">Leave</Link>
            <Link href="/app/payslips" className="secondary-btn">Payslips</Link>
            <Link href="/app/employees/me" className="primary-btn">My Profile</Link>
          </>
        )}
      />

      <div className="dashboard-kpi-grid">
        <DashboardKpiTile
          label="Attendance today"
          value={attendanceLabel}
          hint={`Check-in ${attendance?.checkIn ?? "-"} | Check-out ${attendance?.checkOut ?? "-"}`}
          accent={attendance?.status === "late" ? "warning" : "success"}
          footer={<StatusBadge status={attendanceLabel} tone={tone} />}
        />
        <DashboardKpiTile
          label="Worked time"
          value={formatMinutes(attendance?.workMinutes)}
          hint={`Overtime ${formatMinutes(attendance?.overtimeMinutes)}`}
          accent="info"
        />
        <DashboardKpiTile
          label="Profile completeness"
          value={`${data.profileCompletenessScore ?? 0}%`}
          hint="Used for HR profile quality checks"
          footer={<Donut value={data.profileCompletenessScore ?? 0} />}
        />
        <DashboardKpiTile
          label="Security risk"
          value={riskScore}
          hint={`Last login ${data.securityStatus.lastLoginAt ?? "-"}`}
          accent={riskScore >= 90 ? "danger" : riskScore >= 60 ? "warning" : "success"}
        />
      </div>

      <div className="grid-2">
        <DashboardPanel title="Today attendance card" subtitle="Snapshot pulled from tenant-scoped dashboard service" tone="spotlight">
          <SignalRow label="Current status" value={<StatusBadge status={attendanceLabel} tone={tone} />} tone={tone} />
          <SignalRow label="Check-in" value={attendance?.checkIn ?? "-"} />
          <SignalRow label="Check-out" value={attendance?.checkOut ?? "-"} />
          <SignalRow label="Worked" value={formatMinutes(attendance?.workMinutes)} />
          <SignalRow label="Overtime" value={formatMinutes(attendance?.overtimeMinutes)} tone={(attendance?.overtimeMinutes ?? 0) > 0 ? "warning" : "default"} />
          <SignalRow label="Break status" value={attendance?.isOnBreak ? "On break" : "Active / Not on break"} />
        </DashboardPanel>

        <DashboardPanel title="Quick actions" subtitle="Common workforce actions" actions={<Link href="/app/dashboard" className="ghost-btn">Refresh</Link>}>
          <QuickActionGrid
            actions={[
              { label: "Clock In / Out", href: "/app/attendance", caption: "Attendance actions" },
              { label: "Request Leave", href: "/app/leave", caption: "Apply and track" },
              { label: "View Payslips", href: "/app/payslips", caption: "Payroll snapshots" },
              { label: "Update Profile", href: "/app/employees/me", caption: "Personal records" }
            ]}
          />
          <SignalRow label="Unread notifications" value={data.notifications.filter((n) => !n.is_read).length} />
          <SignalRow label="Leave balance types" value={data.leaveBalances.length} />
        </DashboardPanel>
      </div>

      <div className="grid-2">
        <DashboardPanel title="Upcoming shifts" subtitle="Future assigned shifts" tone="soft">
          {shiftTimeline.length > 0 ? (
            <TimelineList items={shiftTimeline} />
          ) : (
            <p className="muted">No upcoming shifts assigned.</p>
          )}
        </DashboardPanel>

        <DashboardPanel title="Notifications" subtitle="Recent tenant-scoped notifications" tone="soft">
          {notificationTimeline.length > 0 ? (
            <TimelineList items={notificationTimeline} />
          ) : (
            <p className="muted">No recent notifications.</p>
          )}
        </DashboardPanel>
      </div>

      <div className="grid-2">
        <DashboardPanel title="Recent payslips" subtitle="Read-only snapshot values; no recalculation in UI">
          {data.recentPayslips.length === 0 ? <p className="muted">No payslips generated.</p> : null}
          {data.recentPayslips.slice(0, 6).map((payslip) => (
            <div key={payslip.id} className="signal-row">
              <span className="signal-row__label">{payslip.generated_at}</span>
              <span className="signal-row__value">{formatCurrency(payslip.net_salary)}</span>
            </div>
          ))}
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <Link href="/app/payslips" className="secondary-btn">Open payslip history</Link>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Leave balances" subtitle="Usage by leave type for current employee">
          {data.leaveBalances.length === 0 ? <p className="muted">No leave balances found.</p> : null}
          {data.leaveBalances.slice(0, 6).map((balance) => (
            <div key={`${balance.leave_type_id}-${balance.year}`} className="stack" style={{ gap: 8 }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong>Type {balance.leave_type_id}</strong>
                <span className="tag">Year {balance.year}</span>
              </div>
              <SignalRow label="Used" value={balance.used_days} />
              <SignalRow label="Remaining" value={Math.max(0, balance.entitled_days - balance.used_days)} />
            </div>
          ))}
          {leaveUtilizationBars.length > 0 ? <MiniBarChart values={leaveUtilizationBars} height={72} /> : null}
        </DashboardPanel>
      </div>
    </div>
  );
};
