"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchPayslipDetail, queuePayslipEmailDispatch } from "@/lib/client/api";
import type { PayslipDetailResponse } from "@/lib/types/payroll";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { LoadingState } from "@/components/states/LoadingState";
import { PayslipDetailView } from "@/components/payroll/PayslipDetailView";

export const PayslipDetailPageClient = ({
  entryId,
  permissions
}: {
  entryId: string;
  permissions: string[];
}) => {
  const [data, setData] = useState<PayslipDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const canQueueEmail = permissions.includes("manage_payroll") && permissions.includes("manage_employees");

  const load = () => {
    setLoading(true);
    setError(null);
    void fetchPayslipDetail(entryId)
      .then((result) => {
        if (!result.ok || !result.data) {
          setData(null);
          setError(result.error ?? "Unable to load payslip");
          return;
        }
        setData(result.data);
      })
      .catch((err: unknown) => {
        setData(null);
        setError(err instanceof Error ? err.message : "Unable to load payslip");
      })
      .finally(() => setLoading(false));
  };

  const queueEmail = async () => {
    setEmailError(null);
    setEmailStatus(null);
    setEmailSending(true);

    try {
      const result = await queuePayslipEmailDispatch(entryId);
      if (!result.ok || !result.data) {
        setEmailError(result.error ?? "Unable to queue payslip email");
        return;
      }

      if (result.data.queueStatus === "existing_pending") {
        setEmailStatus(`Payslip email already queued (job ${result.data.queueId.slice(0, 8)}…).`);
      } else {
        setEmailStatus(`Payslip email queued (job ${result.data.queueId.slice(0, 8)}…).`);
      }
    } catch (err: unknown) {
      setEmailError(err instanceof Error ? err.message : "Unable to queue payslip email");
    } finally {
      setEmailSending(false);
    }
  };

  useEffect(() => {
    load();
  }, [entryId]);

  return (
    <div className="page-wrap stack">
      <div className="page-header">
        <div>
          <h1>Payslip Detail</h1>
          <p className="muted">Read-only payroll snapshot. No recalculation or editing available.</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Link href="/app/payslips" className="secondary-btn">Back to Payslips</Link>
          {canQueueEmail ? (
            <button
              type="button"
              className="primary-btn"
              onClick={() => void queueEmail()}
              disabled={loading || emailSending}
            >
              {emailSending ? "Queuing Email..." : "Email Payslip"}
            </button>
          ) : null}
          <a href={`/api/payslips/${entryId}/pdf`} className="secondary-btn" target="_blank" rel="noreferrer">
            Download PDF
          </a>
          <Link href={`/app/payslips/${entryId}/print`} className="secondary-btn">Print View</Link>
          <button type="button" className="secondary-btn" onClick={load} disabled={loading}>Refresh</button>
        </div>
      </div>

      {emailError ? (
        <div className="card stack">
          <p className="error" style={{ margin: 0 }}>{emailError}</p>
        </div>
      ) : null}
      {emailStatus ? (
        <div className="card stack">
          <div className="badge badge--green">{emailStatus}</div>
        </div>
      ) : null}

      {loading ? <LoadingState label="Loading payslip detail..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}
      {!loading && !error && !data ? (
        <EmptyState title="Payslip not found" subtitle="It may not exist or you may not have access to it." />
      ) : null}
      {!loading && !error && data ? <PayslipDetailView data={data} /> : null}
    </div>
  );
};
