"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  approveLeaveRequest,
  cancelLeaveRequest,
  fetchLeaveCalendar,
  fetchLeaveReviewHistory,
  fetchLeaveReviewQueue,
  rejectLeaveRequest
} from "@/lib/client/api";
import type { LeaveRequest } from "@/lib/types/leave";
import { LeaveReviewTable } from "@/components/leave/LeaveReviewTable";
import { LeaveApprovalHistoryTable } from "@/components/leave/LeaveApprovalHistoryTable";
import { TeamLeaveCalendar } from "@/components/leave/TeamLeaveCalendar";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";
import {
  FeatureCallout,
  PageContainer,
  PageHeader,
  StatCard,
  StatGrid,
} from "@/components/dashboard-v2/PagePrimitives";
import { Button } from "@/components/ui/button";

const toDateInputValue = (date: Date) => date.toISOString().slice(0, 10);

export const LeaveReviewPageClient = ({
  initialEmployeeId,
  focusId
}: {
  initialEmployeeId?: string;
  focusId?: string;
}) => {
  const [pending, setPending] = useState<LeaveRequest[]>([]);
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [calendar, setCalendar] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calendarRange = useMemo(() => {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 30);
    return {
      dateFrom: toDateInputValue(start),
      dateTo: toDateInputValue(end)
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pendingResult, historyResult, calendarResult] = await Promise.all([
        fetchLeaveReviewQueue({ employeeId: initialEmployeeId || undefined }),
        fetchLeaveReviewHistory({ employeeId: initialEmployeeId || undefined }),
        fetchLeaveCalendar(calendarRange)
      ]);

      if (!pendingResult.ok || !pendingResult.data) {
        setError(pendingResult.error ?? "Unable to load pending leave approvals");
        setPending([]);
      } else {
        setPending(pendingResult.data.requests ?? []);
      }

      if (!historyResult.ok || !historyResult.data) {
        setError(historyResult.error ?? "Unable to load approval history");
        setHistory([]);
      } else {
        setHistory(historyResult.data.requests ?? []);
      }

      if (!calendarResult.ok || !calendarResult.data) {
        setError(calendarResult.error ?? "Unable to load team leave calendar");
        setCalendar([]);
      } else {
        setCalendar(calendarResult.data.requests ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load leave approvals");
    } finally {
      setLoading(false);
    }
  }, [calendarRange, initialEmployeeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleApprove = useCallback(async (requestId: string) => {
    setBusy(true);
    setError(null);
    try {
      const result = await approveLeaveRequest(requestId);
      if (!result.ok) {
        setError(result.error ?? "Leave approval failed");
      } else {
        await load();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Leave approval failed");
    } finally {
      setBusy(false);
    }
  }, [load]);

  const handleReject = useCallback(async (requestId: string, reason?: string) => {
    setBusy(true);
    setError(null);
    try {
      const result = await rejectLeaveRequest(requestId, reason ?? "");
      if (!result.ok) {
        setError(result.error ?? "Leave rejection failed");
      } else {
        await load();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Leave rejection failed");
    } finally {
      setBusy(false);
    }
  }, [load]);

  const handleCancel = useCallback(async (requestId: string, employeeId: string) => {
    setBusy(true);
    setError(null);
    try {
      const result = await cancelLeaveRequest(requestId, employeeId);
      if (!result.ok) {
        setError(result.error ?? "Leave cancellation failed");
      } else {
        await load();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Leave cancellation failed");
    } finally {
      setBusy(false);
    }
  }, [load]);

  const pendingDays = useMemo(
    () => pending.reduce((sum, request) => sum + (request.total_days ?? 0), 0),
    [pending]
  );

  const calendarEntries = useMemo(() => calendar.length, [calendar]);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Leave approvals"
        title="Leave review workspace"
        description="Approve, reject, or cancel leave requests in the right sequence while keeping team coverage visible."
        chips={["Supervisor aware", "Manager escalation", "HR-ready fallback"]}
        actions={
          <Button variant="secondary" className="rounded-full" onClick={() => void load()}>
            Refresh
          </Button>
        }
      />

      {loading ? <LoadingState label="Loading leave approvals..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}

      {!loading ? (
        <>
          <FeatureCallout
            badge="Approval chain"
            title="Requests follow the live reporting chain instead of a flat approval queue"
            description="Agents route through team lead and then manager, team leads route to manager, and manager requests route to HR or the next eligible admin fallback."
          />

          <StatGrid>
            <StatCard label="Pending requests" value={pending.length} hint="Requests waiting on your action" />
            <StatCard label="Pending days" value={pendingDays} hint="Upcoming time away in this queue" />
            <StatCard label="History items" value={history.length} hint="Requests already resolved" />
            <StatCard label="Calendar entries" value={calendarEntries} hint="Approved or pending leave in the next 30 days" />
          </StatGrid>

          <LeaveReviewTable
            requests={pending}
            onApprove={handleApprove}
            onReject={handleReject}
            onCancel={handleCancel}
            busy={busy}
            focusId={focusId}
          />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <LeaveApprovalHistoryTable requests={history} />
            <TeamLeaveCalendar requests={calendar} />
          </div>
        </>
      ) : null}
    </PageContainer>
  );
};
