"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { fetchPayrollRunDeliveryStatus, queuePayrollRunPayslipEmails } from "@/lib/client/api";
import type {
  PayrollRunDeliveryStatusResponse,
  PayrollRunPayslipEmailBulkQueueResponse
} from "@/lib/types/payroll";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { LoadingState } from "@/components/states/LoadingState";

const formatPeriodLabel = (period: string) => {
  const [yearPart, monthPart] = period.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  if (!Number.isInteger(year) || !Number.isInteger(month)) return period;
  const date = new Date(Date.UTC(year, month - 1, 1));
  return date.toLocaleString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });
};

const PAGE_SIZE = 25;

export const PayrollRunDeliveryPageClient = ({
  runId,
  permissions
}: {
  runId: string;
  permissions: string[];
}) => {
  const [data, setData] = useState<PayrollRunDeliveryStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [queueBusy, setQueueBusy] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [queueResult, setQueueResult] = useState<PayrollRunPayslipEmailBulkQueueResponse | null>(null);
  const queueSubmitRef = useRef(false);

  const canQueuePayslips = permissions.includes("manage_payroll") && permissions.includes("manage_employees");

  const load = (nextPage = page) => {
    setLoading(true);
    setError(null);
    void fetchPayrollRunDeliveryStatus(runId, { page: nextPage, pageSize: PAGE_SIZE })
      .then((result) => {
        if (!result.ok || !result.data) {
          setData(null);
          setError(result.error ?? "Unable to load payroll delivery status");
          return;
        }
        setData(result.data);
      })
      .catch((err: unknown) => {
        setData(null);
        setError(err instanceof Error ? err.message : "Unable to load payroll delivery status");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(page);
  }, [runId, page]);

  const queueAllPayslips = async () => {
    if (queueSubmitRef.current) return;
    queueSubmitRef.current = true;
    setQueueBusy(true);
    setQueueError(null);
    setQueueResult(null);

    try {
      const result = await queuePayrollRunPayslipEmails(runId);
      if (!result.ok || !result.data) {
        setQueueError(result.error ?? "Unable to queue payslip emails");
        return;
      }

      setQueueResult(result.data);
      setConfirmOpen(false);
      load(page);
    } catch (err: unknown) {
      setQueueError(err instanceof Error ? err.message : "Unable to queue payslip emails");
    } finally {
      setQueueBusy(false);
      queueSubmitRef.current = false;
    }
  };

  return (
    <div className="page-wrap stack">
      <div className="page-header">
        <div>
          <h1>Payroll Delivery Status</h1>
          <p className="muted">Queued email delivery attempts for payslips in this payroll run.</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Link href={`/app/payroll/${runId}`} className="secondary-btn">Back to Run</Link>
          <Link href={`/app/payroll/${runId}/timeline`} className="secondary-btn">Timeline</Link>
          {canQueuePayslips ? (
            <button
              type="button"
              className="primary-btn"
              onClick={() => {
                setQueueError(null);
                setConfirmOpen(true);
              }}
              disabled={loading || queueBusy}
            >
              {queueBusy ? "Queuing..." : "Queue Payslips for Run"}
            </button>
          ) : null}
          <button type="button" className="secondary-btn" onClick={() => load(page)} disabled={loading || queueBusy}>
            Refresh
          </button>
        </div>
      </div>

      {queueError ? (
        <div className="card stack">
          <p className="error" style={{ margin: 0 }}>{queueError}</p>
        </div>
      ) : null}

      {queueResult ? (
        <div className="card stack">
          <div className="badge badge--green">
            Queued: {queueResult.queued} | Already queued: {queueResult.alreadyQueued} | Failed: {queueResult.failed}
          </div>
          {queueResult.errors.length > 0 ? (
            <div className="stack" style={{ gap: 6 }}>
              <strong>Queue errors (first {queueResult.errors.length})</strong>
              {queueResult.errors.map((item) => (
                <div key={`${item.entryId}-${item.message}`} className="muted" style={{ fontSize: 13 }}>
                  <code>{item.entryId.slice(0, 8)}…</code>: {item.message}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {loading ? <LoadingState label="Loading payroll delivery status..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}
      {!loading && !error && !data ? (
        <EmptyState title="Delivery status not found" subtitle="The payroll run may not exist or you may not have access." />
      ) : null}

      {!loading && !error && data ? (
        <>
          <section className="card stack">
            <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: 0 }}>Run Summary</h2>
                <p className="muted" style={{ marginTop: 6 }}>
                  Period {formatPeriodLabel(data.period)} | Run <code>{data.runId}</code>
                </p>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <StatusBadge status={data.runStatus} />
                <StatusBadge status={data.isLocked ? "locked" : "unlocked"} tone={data.isLocked ? "success" : "warning"} />
              </div>
            </div>
          </section>

          <section className="card stack">
            <div>
              <h3>Delivery Summary</h3>
              <p className="muted">Latest queue status per payslip entry plus total queue attempts.</p>
            </div>
            <div className="form-grid form-grid--three">
              <div className="card card--nested stack"><span className="muted">Entries Total</span><strong>{data.summary.entriesTotal}</strong></div>
              <div className="card card--nested stack"><span className="muted">Entries With Dispatch</span><strong>{data.summary.entriesWithDispatch}</strong></div>
              <div className="card card--nested stack"><span className="muted">Total Dispatch Attempts</span><strong>{data.summary.totalDispatchAttempts}</strong></div>
              <div className="card card--nested stack"><span className="muted">Pending</span><strong>{data.summary.pendingEntries}</strong></div>
              <div className="card card--nested stack"><span className="muted">Sent</span><strong>{data.summary.sentEntries}</strong></div>
              <div className="card card--nested stack"><span className="muted">Failed</span><strong>{data.summary.failedEntries}</strong></div>
            </div>
          </section>

          <section className="card stack">
            <div>
              <h3>Queue Attempts</h3>
              <p className="muted">Paginated dispatch attempts tied to payroll entries and queue status.</p>
            </div>
            {data.rows.length === 0 ? (
              <EmptyState title="No delivery attempts yet" subtitle="Queue payslips for this run to start email delivery tracking." />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Status</th>
                      <th>Retry</th>
                      <th>Queued At</th>
                      <th>Updated At</th>
                      <th>Queued By</th>
                      <th>Payslip</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row) => (
                      <tr key={row.dispatchId}>
                        <td>
                          <div className="stack" style={{ gap: 2 }}>
                            <strong>{row.employeeName}</strong>
                            <span className="muted" style={{ fontSize: 12 }}>
                              {row.employeeCode ? `Code: ${row.employeeCode}` : `Employee: ${row.employeeId.slice(0, 8)}…`}
                            </span>
                          </div>
                        </td>
                        <td><StatusBadge status={row.queueStatus} /></td>
                        <td>{row.retryCount}</td>
                        <td>{row.queuedAt || "-"}</td>
                        <td>{row.updatedAt || "-"}</td>
                        <td>{row.queuedBy ?? "-"}</td>
                        <td>
                          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                            <Link href={`/app/payslips/${row.entryId}`}>View</Link>
                            <a href={`/api/payslips/${row.entryId}/pdf`} target="_blank" rel="noreferrer">PDF</a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <span className="muted">Page {data.page} · {data.rows.length} rows shown</span>
              <div className="row" style={{ gap: 8 }}>
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={loading || page <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={loading || !data.hasMore}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        </>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        busy={queueBusy}
        title="Queue payslip emails for this payroll run?"
        confirmLabel={queueBusy ? "Queuing..." : "Queue Payslips"}
        onCancel={() => {
          if (!queueBusy) setConfirmOpen(false);
        }}
        onConfirm={() => {
          void queueAllPayslips();
        }}
      />
    </div>
  );
};

