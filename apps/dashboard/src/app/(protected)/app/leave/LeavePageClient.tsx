"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  applyLeaveRequest,
  cancelLeaveRequest,
  fetchEmployeeMe,
  fetchLeaveBalances,
  fetchLeaveHistory,
  fetchLeaveTypes
} from "@/lib/client/api";
import type { LeaveBalance, LeaveRequest, LeaveTypeOption } from "@/lib/types/leave";
import { LeaveBalanceCard } from "@/components/leave/LeaveBalanceCard";
import { LeaveApplyForm } from "@/components/leave/LeaveApplyForm";
import { LeaveHistoryTable } from "@/components/leave/LeaveHistoryTable";
import { LeaveStatusTimeline } from "@/components/leave/LeaveStatusTimeline";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const LeavePageClient = () => {
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeOption[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize] = useState(10);
  const [historyHasNext, setHistoryHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [meResult, balancesResult, historyResult, leaveTypesResult] = await Promise.all([
        fetchEmployeeMe(),
        fetchLeaveBalances(),
        fetchLeaveHistory({ page: historyPage, pageSize: historyPageSize }),
        fetchLeaveTypes()
      ]);

      if (meResult.ok && meResult.data?.employeeId) {
        setEmployeeId(meResult.data.employeeId);
      }

      if (!balancesResult.ok || !balancesResult.data) {
        setError(balancesResult.error ?? "Unable to load leave balances");
        setBalances([]);
      } else {
        setBalances(balancesResult.data.balances ?? []);
      }

      if (!leaveTypesResult.ok || !leaveTypesResult.data) {
        setLeaveTypes([]);
      } else {
        setLeaveTypes(leaveTypesResult.data.leaveTypes ?? []);
      }

      if (!historyResult.ok || !historyResult.data) {
        setError(historyResult.error ?? "Unable to load leave history");
        setRequests([]);
        setHistoryHasNext(false);
      } else {
        const historyData = historyResult.data.requests ?? [];
        setRequests(historyData);
        setSelectedRequest((prev) => prev ?? historyData[0] ?? null);
        setHistoryHasNext(historyData.length === historyPageSize);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load leave data");
    } finally {
      setLoading(false);
    }
  }, [historyPage, historyPageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => {
    const counts = { applied: 0, approved: 0, rejected: 0, cancelled: 0 };
    requests.forEach((req) => {
      const status = (req.status ?? "").toLowerCase();
      if (status === "approved") counts.approved += 1;
      else if (status === "rejected") counts.rejected += 1;
      else if (status === "cancelled") counts.cancelled += 1;
      else counts.applied += 1;
    });
    const totalAnnual = balances.reduce((sum, b) => sum + (b.entitled_days ?? 0), 0);
    const totalRemaining = balances.reduce((sum, b) => sum + (b.remaining_days ?? 0), 0);
    return { ...counts, totalAnnual, totalRemaining };
  }, [requests, balances]);

  const handleApply = useCallback(async (payload: Parameters<typeof applyLeaveRequest>[0]) => {
    if (!employeeId) {
      setError("Employee record not found");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await applyLeaveRequest({ ...payload, employeeId });
      if (!result.ok) {
        setError(result.error ?? "Leave request failed");
      } else {
        await load();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Leave request failed");
    } finally {
      setSubmitting(false);
    }
  }, [employeeId, load]);

  const handleCancel = useCallback(async (requestId: string, targetEmployeeId: string) => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await cancelLeaveRequest(requestId, targetEmployeeId);
      if (!result.ok) {
        setError(result.error ?? "Cancel request failed");
      } else {
        await load();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel request failed");
    } finally {
      setSubmitting(false);
    }
  }, [load]);

  return (
    <div className="page-wrap space-y-8">
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle>Leave</CardTitle>
          <p className="text-sm text-muted-foreground">
            Apply for leave and track balances. Requests are validated server-side.
          </p>
        </CardHeader>
      </Card>

      {loading ? <LoadingState label="Loading leave data..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}

      {!loading ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Leave Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="rounded-xl border-border shadow-sm">
                <CardContent className="space-y-1 p-4">
                  <div className="text-xs text-muted-foreground">Applied</div>
                  <div className="text-2xl font-semibold">{summary.applied}</div>
                </CardContent>
              </Card>
              <Card className="rounded-xl border-border shadow-sm">
                <CardContent className="space-y-1 p-4">
                  <div className="text-xs text-muted-foreground">Approved</div>
                  <div className="text-2xl font-semibold">{summary.approved}</div>
                </CardContent>
              </Card>
              <Card className="rounded-xl border-border shadow-sm">
                <CardContent className="space-y-1 p-4">
                  <div className="text-xs text-muted-foreground">Rejected / Cancelled</div>
                  <div className="text-2xl font-semibold">{summary.rejected + summary.cancelled}</div>
                </CardContent>
              </Card>
              <Card className="rounded-xl border-border shadow-sm">
                <CardContent className="space-y-1 p-4">
                  <div className="text-xs text-muted-foreground">Annual / Remaining</div>
                  <div className="text-lg font-semibold">{summary.totalAnnual} / {summary.totalRemaining}</div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          <LeaveBalanceCard balances={balances} />
          <LeaveApplyForm
            onSubmit={handleApply}
            loading={submitting}
            employeeId={employeeId}
            balances={balances}
            leaveTypes={leaveTypes}
          />
          <LeaveHistoryTable
            requests={requests}
            onCancel={handleCancel}
            busy={submitting}
            page={historyPage}
            hasNext={historyHasNext}
            onPageChange={setHistoryPage}
          />
          <LeaveStatusTimeline request={selectedRequest} />
        </>
      ) : null}
    </div>
  );
};
