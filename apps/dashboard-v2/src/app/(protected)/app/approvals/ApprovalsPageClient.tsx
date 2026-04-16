"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  approveAttendanceCorrectionRequest,
  approveLeaveRequest,
  cancelLeaveRequest,
  fetchUnifiedApprovals,
  rejectAttendanceCorrectionRequest,
  rejectLeaveRequest,
} from "@/lib/client/api";
import type { UnifiedApprovalItem } from "@/lib/types/approvals";
import {
  DashboardRail,
  FeatureCallout,
  OverviewChips,
  PageContainer,
  PageHeader,
  StatCard,
  StatGrid,
  SurfacePanel,
  WorkspaceModuleGrid,
} from "@/components/dashboard-v2/PagePrimitives";
import { UnifiedApprovalsTable } from "@/components/approvals/UnifiedApprovalsTable";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";

const toHours = (submittedAt: string): number => {
  const submitted = new Date(submittedAt);
  if (Number.isNaN(submitted.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - submitted.getTime()) / (1000 * 60 * 60)));
};

export const ApprovalsPageClient = () => {
  const [items, setItems] = useState<UnifiedApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<"all" | "leave" | "attendance">("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchUnifiedApprovals();
      if (!result.ok || !result.data) {
        setItems([]);
        setError(result.error ?? "Unable to load approvals");
        return;
      }
      setItems(result.data.items);
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : "Unable to load approvals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDecision = useCallback(
    async (item: UnifiedApprovalItem, decision: "approve" | "reject" | "cancel", reason?: string) => {
      setBusy(true);
      setNotice(null);
      setError(null);

      try {
        const result =
          item.type === "leave"
            ? decision === "approve"
              ? await approveLeaveRequest(item.id)
              : decision === "reject"
                ? await rejectLeaveRequest(item.id, reason ?? "")
                : await cancelLeaveRequest(item.id, item.employee_id)
            : decision === "approve"
              ? await approveAttendanceCorrectionRequest(item.id)
              : await rejectAttendanceCorrectionRequest(item.id, reason ?? "");

        if (!result.ok) {
          setError(result.error ?? "Unable to update approval");
          return;
        }

        setNotice(
          decision === "approve"
            ? `${item.employee_name ?? "Request"} approved successfully.`
            : decision === "reject"
              ? `${item.employee_name ?? "Request"} rejected successfully.`
              : `${item.employee_name ?? "Request"} cancelled successfully.`
        );
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to update approval");
      } finally {
        setBusy(false);
      }
    },
    [load]
  );

  const stats = useMemo(() => {
    const leaveCount = items.filter((item) => item.type === "leave").length;
    const attendanceCount = items.filter((item) => item.type === "attendance").length;
    const oldestHours = items.length > 0 ? Math.max(...items.map((item) => toHours(item.submitted_at))) : 0;
    return {
      total: items.length,
      leave: leaveCount,
      attendance: attendanceCount,
      oldestHours,
    };
  }, [items]);

  const queueSummary = useMemo(() => {
    const queue = typeFilter === "all" ? items : items.filter((item) => item.type === typeFilter);
    return queue.slice(0, 5);
  }, [items, typeFilter]);
  const workspaceModules = [
    {
      title: "Unified approval queue",
      description: "Work the mixed leave and attendance backlog from one lane before requests age into operational risk.",
      href: "/app/approvals",
      label: "Queue",
      metric: `${stats.total} open`,
      highlights: ["Unified review", "Aging queue", "Role-aware"],
    },
    {
      title: "Leave review surface",
      description: "Move into the leave-focused workspace when a request needs deeper context or coverage follow-up.",
      href: "/app/leave/review",
      label: "Leave",
      metric: `${stats.leave} pending`,
      highlights: ["Coverage", "Approvals", "Leave context"],
    },
    {
      title: "Attendance corrections",
      description: "Handle correction traffic and late-login issues in the attendance review workspace when needed.",
      href: "/app/attendance/review",
      label: "Attendance",
      metric: `${stats.attendance} pending`,
      highlights: ["Corrections", "Late login", "Exceptions"],
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Approvals"
        title="Decision queue for leave, attendance, and ownership handoffs"
        description="Keep one approval surface for the requests that block staffing, attendance cleanup, and downstream operational reporting."
        chips={["Unified queue", "Role-aware review", "Leave + attendance", "Escalation ready"]}
        actions={(
          <>
            <Link href="/app/leave/review" className="secondary-btn">Leave review</Link>
            <Link href="/app/attendance/review" className="secondary-btn">Attendance review</Link>
          </>
        )}
      />

      <FeatureCallout
        badge="Unified queue"
        title="Resolve the backlog before it fragments across modules."
        description="This workspace keeps leave decisions and attendance corrections in one role-aware queue so managers, HR, and operations leads can act without hunting across separate pages."
      />

      <StatGrid>
        <StatCard label="Open items" value={stats.total} hint="Current pending decisions across all request types" />
        <StatCard label="Leave requests" value={stats.leave} hint="Pending leave approvals waiting on review" />
        <StatCard label="Attendance items" value={stats.attendance} hint="Corrections and attendance-related decisions" />
        <StatCard
          label="Oldest age"
          value={`${stats.oldestHours}h`}
          hint="Longest-waiting request in the current queue"
        />
      </StatGrid>

      <SurfacePanel
        title="Workspace modules"
        description="TailAdmin-style modules for the decision surfaces that matter most while the queue is active."
      >
        <WorkspaceModuleGrid modules={workspaceModules} />
      </SurfacePanel>

      <DashboardRail>
        <SurfacePanel
          title="Approval queue"
          description="Triage the oldest requests first, then move into the dedicated review pages only when deeper context is needed."
        >
          {notice ? (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700">
              {notice}
            </div>
          ) : null}

          {loading ? <LoadingState label="Loading approval queue..." /> : null}
          {!loading && error ? <ErrorState message={error} /> : null}
          {!loading && !error ? (
            <UnifiedApprovalsTable
              items={items}
              busy={busy}
              typeFilter={typeFilter}
              onTypeFilterChange={setTypeFilter}
              onApprove={(item) => void handleDecision(item, "approve")}
              onReject={(item, reason) => void handleDecision(item, "reject", reason)}
              onCancel={(item) => void handleDecision(item, "cancel")}
            />
          ) : null}
        </SurfacePanel>

        <div className="space-y-6">
          <SurfacePanel title="Queue context" description="What this role-aware lane is optimized to keep clean.">
            <OverviewChips
              chips={[
                `${stats.total} pending total`,
                `${stats.leave} leave`,
                `${stats.attendance} attendance`,
                stats.oldestHours > 0 ? `Oldest ${stats.oldestHours}h` : "No aging queue",
              ]}
            />
            <div className="mt-4 space-y-3">
              <p className="text-sm leading-6 text-slate-600">
                Keep this queue focused on requests that affect staffing, payroll-adjacent corrections, and operational accountability. Older requests should be escalated first.
              </p>
              <WorkspaceModuleGrid
                className="xl:grid-cols-1"
                modules={[
                  {
                    title: "Organization context",
                    description: "Open reporting and structure context when a decision needs escalation or ownership clarity.",
                    href: "/app/organization",
                    label: "Context",
                    highlights: ["Reporting", "Ownership", "Escalation"],
                  },
                  {
                    title: "Dashboard return",
                    description: "Jump back to the role dashboard once the active approval pressure is under control.",
                    href: "/app/dashboard",
                    label: "Navigation",
                    highlights: ["Role home", "Workspace", "Follow-up"],
                  },
                ]}
              />
            </div>
          </SurfacePanel>

          <SurfacePanel title="Oldest items" description="The first few requests in the active queue view.">
            {queueSummary.length === 0 ? (
              <EmptyState
                title="No approvals in this lane"
                subtitle="The current filter is clear. New requests will appear here automatically."
                compact
              />
            ) : (
              <div className="space-y-3">
                {queueSummary.map((item) => (
                  <div
                    key={`${item.type}-${item.id}-summary`}
                    className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-950">{item.employee_name ?? item.employee_id}</p>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{item.type}</p>
                      </div>
                      <span className="text-xs font-semibold text-slate-500">{toHours(item.submitted_at)}h</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.summary}</p>
                  </div>
                ))}
              </div>
            )}
          </SurfacePanel>
        </div>
      </DashboardRail>
    </PageContainer>
  );
};
