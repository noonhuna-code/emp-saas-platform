"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchPayrollRunTimeline } from "@/lib/client/api";
import type { PayrollRunTimelineResponse } from "@/lib/types/payroll";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { LoadingState } from "@/components/states/LoadingState";
import { PayrollRunTimelineView } from "@/components/payroll/PayrollRunTimelineView";

export const PayrollRunTimelinePageClient = ({
  runId,
  flashMessage
}: {
  runId: string;
  flashMessage?: string | null;
}) => {
  const [data, setData] = useState<PayrollRunTimelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    void fetchPayrollRunTimeline(runId)
      .then((result) => {
        if (!result.ok || !result.data) {
          setData(null);
          setError(result.error ?? "Unable to load payroll timeline");
          return;
        }
        setData(result.data);
      })
      .catch((err: unknown) => {
        setData(null);
        setError(err instanceof Error ? err.message : "Unable to load payroll timeline");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [runId]);

  return (
    <div className="page-wrap stack">
      <div className="page-header">
        <div>
          <h1>Payroll Run Timeline</h1>
          <p className="muted">Read-only lifecycle audit surface for payroll runs.</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Link href={`/app/payroll/${runId}`} className="secondary-btn">Back to Run</Link>
          <Link href={`/app/payroll/${runId}/delivery`} className="secondary-btn">Delivery Status</Link>
          <button type="button" className="secondary-btn" onClick={load} disabled={loading}>Refresh</button>
        </div>
      </div>

      {flashMessage ? (
        <div className="card stack">
          <div className="badge badge--green">{flashMessage}</div>
        </div>
      ) : null}

      {loading ? <LoadingState label="Loading payroll timeline..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}
      {!loading && !error && !data ? (
        <EmptyState title="Timeline not found" subtitle="The payroll run may not exist or you may not have access." />
      ) : null}
      {!loading && !error && data ? <PayrollRunTimelineView data={data} /> : null}
    </div>
  );
};
