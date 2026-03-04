"use client";

import { useCallback, useEffect, useState } from "react";
import {
  applyLeaveRequest,
  cancelLeaveRequest,
  fetchLeaveBalances,
  fetchLeaveHistory
} from "@/lib/client/api";
import type { LeaveBalance, LeaveRequest } from "@/lib/types/leave";
import { LeaveBalanceCard } from "@/components/leave/LeaveBalanceCard";
import { LeaveApplyForm } from "@/components/leave/LeaveApplyForm";
import { LeaveHistoryTable } from "@/components/leave/LeaveHistoryTable";
import { LeaveStatusTimeline } from "@/components/leave/LeaveStatusTimeline";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export const LeavePageClient = () => {
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize] = useState(10);
  const [historyHasNext, setHistoryHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [balancesResult, historyResult] = await Promise.all([
        fetchLeaveBalances(),
        fetchLeaveHistory({ page: historyPage, pageSize: historyPageSize })
      ]);

      if (!balancesResult.ok || !balancesResult.data) {
        setError(balancesResult.error ?? "Unable to load leave balances");
        setBalances([]);
      } else {
        setBalances(balancesResult.data.balances ?? []);
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

  const handleApply = useCallback(async (payload: Parameters<typeof applyLeaveRequest>[0]) => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await applyLeaveRequest(payload);
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
  }, [load]);

  const handleCancel = useCallback(async (requestId: string, employeeId: string) => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await cancelLeaveRequest(requestId, employeeId);
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
            Apply for leave and track balances. All requests are validated server-side.
          </p>
        </CardHeader>
      </Card>

      {loading ? <LoadingState label="Loading leave data..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}

      {!loading ? (
        <>
          <LeaveBalanceCard balances={balances} />
          <LeaveApplyForm onSubmit={handleApply} loading={submitting} />
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
