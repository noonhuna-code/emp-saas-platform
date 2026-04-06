"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  applyLeaveRequest,
  cancelLeaveRequest,
  fetchEmployeeMe,
  fetchLeaveBalances,
  fetchLeaveHistory,
  fetchLeaveTypes,
} from "@/lib/client/api";
import type { LeaveBalance, LeaveRequest, LeaveTypeOption } from "@/lib/types/leave";
import { LeaveBalanceCard } from "@/components/leave/LeaveBalanceCard";
import { LeaveApplyForm } from "@/components/leave/LeaveApplyForm";
import { LeaveHistoryTable } from "@/components/leave/LeaveHistoryTable";
import { LeaveStatusTimeline } from "@/components/leave/LeaveStatusTimeline";
import { Tabs } from "@/components/shared/Tabs";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";
import {
  FeatureCallout,
  PageContainer,
  PageHeader,
  StatCard,
  StatGrid,
  SurfacePanel,
} from "@/components/dashboard-v2/PagePrimitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const TAB_ITEMS = [
  { id: "apply", label: "Apply for leave" },
  { id: "balances", label: "Leave balances" },
  { id: "history", label: "Leave history" },
];

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
  const [notice, setNotice] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("apply");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const meResult = await fetchEmployeeMe();
      const resolvedEmployeeId = meResult.ok && meResult.data?.employeeId ? meResult.data.employeeId : null;
      if (resolvedEmployeeId) {
        setEmployeeId(resolvedEmployeeId);
      }

      const [balancesResult, historyResult, leaveTypesResult] = await Promise.all([
        fetchLeaveBalances(),
        fetchLeaveHistory({ page: historyPage, pageSize: historyPageSize }),
        fetchLeaveTypes({ employeeId: resolvedEmployeeId ?? undefined }),
      ]);

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
        setSelectedRequest(null);
      } else {
        const historyData = historyResult.data.requests ?? [];
        setRequests(historyData);
        setSelectedRequest((prev) => {
          const preferredId = selectedRequestId ?? prev?.id ?? null;
          if (!preferredId) return historyData[0] ?? null;
          return historyData.find((request) => request.id === preferredId) ?? historyData[0] ?? null;
        });
        setHistoryHasNext(historyData.length === historyPageSize);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load leave data");
    } finally {
      setLoading(false);
    }
  }, [historyPage, historyPageSize, selectedRequestId]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => {
    const counts = { applied: 0, approved: 0, rejected: 0, cancelled: 0 };
    requests.forEach((req) => {
      const current = (req.status ?? "").toLowerCase();
      if (current === "approved") counts.approved += 1;
      else if (current === "rejected") counts.rejected += 1;
      else if (current === "cancelled") counts.cancelled += 1;
      else counts.applied += 1;
    });
    const totalAnnual = balances.reduce((sum, balance) => sum + (balance.entitled_days ?? 0), 0);
    const totalRemaining = balances.reduce((sum, balance) => sum + (balance.remaining_days ?? 0), 0);
    return { ...counts, totalAnnual, totalRemaining };
  }, [requests, balances]);

  const handleApply = useCallback(async (payload: Parameters<typeof applyLeaveRequest>[0]) => {
    if (!employeeId) {
      setError("Employee record not found");
      return;
    }
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const result = await applyLeaveRequest({ ...payload, employeeId });
      if (!result.ok) {
        setError(result.error ?? "Leave request failed");
      } else {
        setSelectedRequestId(result.data?.requestId ?? null);
        setNotice("Leave request submitted and routed into the live approval workflow.");
        await load();
        setActiveTab("apply");
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
    <PageContainer>
      <PageHeader
        eyebrow="Leave & swaps"
        title="Leave workspace"
        description="Manage requests, balances, and approval progress from one focused lane."
        actions={
          <>
            <Badge className="rounded-full border-blue-200 bg-blue-50 text-blue-700">
              {leaveTypes.length} leave types
            </Badge>
            <Button variant="secondary" className="rounded-full" onClick={() => void load()}>
              Refresh
            </Button>
          </>
        }
      />

      {loading ? <LoadingState label="Loading leave workspace" /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}

      {!loading ? (
        <>
          {notice ? (
            <FeatureCallout
              badge="Leave applied"
              title="Your request was submitted successfully"
              description={notice}
            />
          ) : null}

          <StatGrid>
            <StatCard label="Applied" value={summary.applied} hint="Open or pending requests" />
            <StatCard label="Approved" value={summary.approved} hint="Approved leave requests" />
            <StatCard label="Annual entitlement" value={summary.totalAnnual} hint="Configured entitlement days" />
            <StatCard label="Remaining" value={summary.totalRemaining} hint="Available balance" />
          </StatGrid>

          <SurfacePanel title="Leave workspace sections" description="Move between applying, balances, and history without a long stacked page.">
            <Tabs tabs={TAB_ITEMS} active={activeTab} onChange={setActiveTab} noWrap variant="soft" />
          </SurfacePanel>

          {activeTab === "apply" ? (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.85fr)]">
              <SurfacePanel title="Apply for leave" description="Submit one request without leaving the employee workspace.">
                <LeaveApplyForm
                  onSubmit={handleApply}
                  loading={submitting}
                  employeeId={employeeId}
                  balances={balances}
                  leaveTypes={leaveTypes}
                />
              </SurfacePanel>
              <SurfacePanel
                title="Latest request status"
                description="Track the current stage and next approver for your latest request without switching screens."
              >
                <LeaveStatusTimeline request={selectedRequest} />
              </SurfacePanel>
            </div>
          ) : null}

          {activeTab === "balances" ? <LeaveBalanceCard balances={balances} /> : null}

          {activeTab === "history" ? (
            <LeaveHistoryTable
              requests={requests}
              onCancel={handleCancel}
              busy={submitting}
              page={historyPage}
              hasNext={historyHasNext}
              onPageChange={setHistoryPage}
            />
          ) : null}
        </>
      ) : null}
    </PageContainer>
  );
};
