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

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return value;
  return parsed.toLocaleString();
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
  const workspace = data.workspace;

  return (
    <div className="dashboard-shell fade-in">
      <DashboardHero
        eyebrow="Employee Workspace"
        title="Daily work summary"
        subtitle="Track attendance, shifts, loans, SOP resources, personal notes/files, and secure team communication in one portal."
        emphasis="default"
        actions={(
          <>
            <Link href="/app/attendance" className="secondary-btn">Attendance</Link>
            <Link href="/app/leave" className="secondary-btn">Leave</Link>
            <Link href="/app/payslips" className="secondary-btn">Payslips</Link>
            <Link href="/app/loans" className="secondary-btn">Loans</Link>
            <Link href="/app/chat" className="secondary-btn">Chat</Link>
            <Link href="/app/notifications" className="secondary-btn">Notifications</Link>
            <Link href="/app/resources" className="secondary-btn">SOPs</Link>
            <Link href="/app/notes" className="secondary-btn">Notes</Link>
            <Link href="/app/profile" className="primary-btn">My Profile</Link>
          </>
        )}
      />

      <div className="grid-2">
        <DashboardPanel title="Employee workspace snapshot" subtitle="Profile, hierarchy, and company context" tone="spotlight">
          <div className="row" style={{ marginBottom: 8 }}>
            {workspace.employee.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={workspace.employee.avatar_url}
                alt="Employee avatar"
                width={44}
                height={44}
                style={{ borderRadius: "50%", border: "1px solid var(--line)", objectFit: "cover" }}
              />
            ) : (
              <span className="tag" style={{ minWidth: 44, justifyContent: "center" }}>
                {(workspace.employee.full_name?.[0] ?? "E").toUpperCase()}
              </span>
            )}
            <span className="muted" style={{ fontSize: 12 }}>
              Personal profile image from your employee record.
            </span>
          </div>
          <SignalRow label="Employee" value={workspace.employee.full_name ?? "Employee"} />
          <SignalRow label="Employee code" value={workspace.employee.employee_code ?? "-"} />
          <SignalRow label="Designation" value={workspace.employee.designation ?? "-"} />
          <SignalRow label="Department / Team" value={`${workspace.employee.department_name ?? "-"} / ${workspace.employee.team_name ?? "-"}`} />
          <SignalRow label="Team lead" value={workspace.teamLead?.full_name ?? "Not assigned"} />
          <SignalRow label="Company" value={workspace.company ? `${workspace.company.name} (${workspace.company.slug})` : "-"} />
        </DashboardPanel>

        <DashboardPanel title="Workspace inventory" subtitle="Your personal workspace counters">
          <SignalRow label="Notes" value={workspace.counts.notes} />
          <SignalRow label="Files" value={workspace.counts.files} />
          <SignalRow label="SOP/resources" value={`${workspace.counts.sops}/${workspace.counts.resources}`} />
          <SignalRow label="Unread notifications" value={workspace.counts.unreadNotifications} />
          <SignalRow label="Open loan requests" value={workspace.counts.openLoanRequests} />
          <SignalRow label="Active loan obligations" value={workspace.counts.activeLoans} />
          <SignalRow label="Chat messages" value={workspace.counts.chatMessages} />
        </DashboardPanel>
      </div>

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
              { label: "Loans / Advances", href: "/app/loans", caption: "Request & track" },
              { label: "Team Chat", href: "/app/chat", caption: "Direct messages" },
              { label: "Notifications", href: "/app/notifications", caption: "Inbox and alerts" },
              { label: "SOP Resources", href: "/app/resources", caption: "Knowledge base" },
              { label: "My Notes", href: "/app/notes", caption: "Private workspace notes" },
              { label: "Update Profile", href: "/app/profile", caption: "Personal records" }
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
        <DashboardPanel title="SOP & resources" subtitle="Company knowledge and process references">
          {workspace.resources.length === 0 ? <p className="muted">No resources published yet.</p> : null}
          {workspace.resources.map((resource) => (
            <div key={resource.id} className="signal-row">
              <span className="signal-row__label">
                <strong>{resource.title}</strong>
                <br />
                <span className="muted">{resource.resource_type.toUpperCase()}</span>
              </span>
              <span className="signal-row__value">
                {resource.link_url ? (
                  <a href={resource.link_url} target="_blank" rel="noreferrer" className="secondary-btn" style={{ padding: "6px 10px" }}>
                    Open
                  </a>
                ) : resource.file_url ? (
                  <a href={resource.file_url} target="_blank" rel="noreferrer" className="secondary-btn" style={{ padding: "6px 10px" }}>
                    Download
                  </a>
                ) : (
                  "-"
                )}
              </span>
            </div>
          ))}
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <Link href="/app/resources" className="secondary-btn">Open resources</Link>
          </div>
        </DashboardPanel>

        <DashboardPanel title="My notes & files" subtitle="Private employee notes saved in workspace">
          {workspace.notes.length === 0 ? <p className="muted">No notes yet. Use My Notes to save your work.</p> : null}
          {workspace.notes.map((note) => (
            <div key={note.id} className="stack" style={{ gap: 6, border: "1px solid var(--line)", borderRadius: 12, padding: 10 }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong>{note.title}</strong>
                {note.is_pinned ? <span className="tag">Pinned</span> : null}
              </div>
              <p className="muted" style={{ fontSize: 13 }}>{note.body}</p>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="muted" style={{ fontSize: 12 }}>{formatDateTime(note.updated_at)}</span>
                {note.file_url ? <a href={note.file_url} target="_blank" rel="noreferrer" className="secondary-btn" style={{ padding: "6px 10px" }}>File</a> : null}
              </div>
            </div>
          ))}
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <Link href="/app/notes" className="secondary-btn">Open notes</Link>
          </div>
        </DashboardPanel>
      </div>

      <div className="grid-2">
        <DashboardPanel title="Loans & advances" subtitle="Your obligation requests and statuses">
          {workspace.loanRequests.length === 0 ? <p className="muted">No loan/advance requests submitted yet.</p> : null}
          {workspace.loanRequests.map((item) => (
            <div key={item.id} className="signal-row">
              <span className="signal-row__label">
                {item.obligation_type.toUpperCase()} - {formatDateTime(item.created_at)}
              </span>
              <span className="signal-row__value">
                {formatCurrency(item.requested_amount)} {item.currency_code} - {item.status}
              </span>
            </div>
          ))}
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <Link href="/app/loans" className="secondary-btn">Open loans</Link>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Team chat" subtitle="Recent direct messages in your company scope">
          {workspace.chat.length === 0 ? <p className="muted">No messages yet.</p> : null}
          {workspace.chat.map((msg) => (
            <div key={msg.id} className="stack" style={{ gap: 4, border: "1px solid var(--line)", borderRadius: 12, padding: 10 }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="tag">{msg.direction === "out" ? "Sent" : "Received"}</span>
                <span className="muted" style={{ fontSize: 12 }}>{formatDateTime(msg.created_at)}</span>
              </div>
              <strong style={{ fontSize: 13 }}>
                {msg.direction === "out" ? `To ${msg.recipient_name ?? "Employee"}` : `From ${msg.sender_name ?? "Employee"}`}
              </strong>
              <p className="muted" style={{ fontSize: 13 }}>{msg.message_text}</p>
            </div>
          ))}
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <Link href="/app/chat" className="secondary-btn">Open chat</Link>
          </div>
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
