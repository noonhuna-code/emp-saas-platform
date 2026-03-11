"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { archivePayrollRun, fetchPayrollRunDetail, markPayrollRunPaid } from "@/lib/client/api";
import type { PayrollRunDetailResponse } from "@/lib/types/payroll";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { LoadingState } from "@/components/states/LoadingState";
import { PayrollRunSummaryCard } from "@/components/payroll/PayrollRunSummaryCard";
import { PayrollRunEntriesTable } from "@/components/payroll/PayrollRunEntriesTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

export const PayrollRunDetailPageClient = ({
  runId,
  permissions
}: {
  runId: string;
  permissions: string[];
}) => {
  const router = useRouter();
  const [data, setData] = useState<PayrollRunDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<"paid" | "archive" | null>(null);
  const [confirmAction, setConfirmAction] = useState<"paid" | "archive" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const actionSubmittingRef = useRef(false);

  const canManagePayroll = permissions.includes("manage_payroll");

  const load = () => {
    setLoading(true);
    setError(null);
    void fetchPayrollRunDetail(runId)
      .then((result) => {
        if (!result.ok || !result.data) {
          setData(null);
          setError(result.error ?? "Unable to load payroll run");
          return;
        }
        setData(result.data);
      })
      .catch((err: unknown) => {
        setData(null);
        setError(err instanceof Error ? err.message : "Unable to load payroll run");
      })
      .finally(() => setLoading(false));
  };

  const submitLifecycleAction = async (action: "paid" | "archive") => {
    if (actionSubmittingRef.current) {
      return;
    }
    actionSubmittingRef.current = true;
    setActionError(null);
    setActionLoading(action);

    try {
      const result = action === "paid"
        ? await markPayrollRunPaid(runId)
        : await archivePayrollRun(runId);

      if (!result.ok || !result.data) {
        setActionError(result.error ?? (action === "paid" ? "Unable to mark payroll run as paid" : "Unable to archive payroll run"));
        return;
      }

      setConfirmAction(null);
      router.push(`/app/payroll/${runId}/timeline?updated=${encodeURIComponent(action)}&ts=${Date.now()}`);
      router.refresh();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Unable to update payroll lifecycle");
    } finally {
      setActionLoading(null);
      actionSubmittingRef.current = false;
    }
  };

  useEffect(() => {
    load();
  }, [runId]);

  return (
    <div className="page-wrap stack">
      <div className="page-header">
        <div>
          <h1>Payroll Run</h1>
          <p className="muted">Detailed payroll run summary and entries table.</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Link href="/app/payroll" className="secondary-btn">Back to Payroll</Link>
          <Link href={`/app/payroll/${runId}/timeline`} className="secondary-btn">Timeline</Link>
          <Link href={`/app/payroll/${runId}/delivery`} className="secondary-btn">Delivery Status</Link>
          {canManagePayroll && data?.run.status?.toLowerCase() === "finalized" ? (
            <button
              type="button"
              className="primary-btn"
              onClick={() => {
                setActionError(null);
                setConfirmAction("paid");
              }}
              disabled={loading || actionLoading !== null}
            >
              {actionLoading === "paid" ? "Marking Paid..." : "Mark as Paid"}
            </button>
          ) : null}
          {canManagePayroll && data?.run.status?.toLowerCase() === "paid" ? (
            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                setActionError(null);
                setConfirmAction("archive");
              }}
              disabled={loading || actionLoading !== null}
            >
              {actionLoading === "archive" ? "Archiving..." : "Archive Run"}
            </button>
          ) : null}
          <button type="button" className="secondary-btn" onClick={load} disabled={loading}>Refresh</button>
        </div>
      </div>

      {actionError ? (
        <div className="card stack">
          <p className="error" style={{ margin: 0 }}>{actionError}</p>
        </div>
      ) : null}

      {loading ? <LoadingState label="Loading payroll run detail..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}
      {!loading && !error && !data ? (
        <EmptyState title="Payroll run not found" subtitle="The run may not exist or you may not have access." />
      ) : null}
      {!loading && !error && data ? (
        <>
          <PayrollRunSummaryCard data={data} />
          {data.entries.length > 0 ? (
            <PayrollRunEntriesTable rows={data.entries} />
          ) : (
            <EmptyState title="No payroll entries" subtitle="This payroll run has no entries yet." />
          )}
        </>
      ) : null}

      <ConfirmDialog
        open={confirmAction !== null}
        busy={actionLoading !== null}
        title={
          confirmAction === "paid"
            ? "Confirm mark payroll run as paid?"
            : "Confirm archive payroll run?"
        }
        confirmLabel={
          actionLoading === "paid"
            ? "Marking Paid..."
            : actionLoading === "archive"
              ? "Archiving..."
              : confirmAction === "paid"
                ? "Mark Paid"
                : "Archive Run"
        }
        onCancel={() => {
          if (actionLoading === null) setConfirmAction(null);
        }}
        onConfirm={() => {
          if (confirmAction) {
            void submitLifecycleAction(confirmAction);
          }
        }}
      />
    </div>
  );
};
