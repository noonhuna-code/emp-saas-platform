"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchPayrollRuns, runPayrollBatch } from "@/lib/client/api";
import type { PayrollRunsResponse } from "@/lib/types/payroll";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { LoadingState } from "@/components/states/LoadingState";
import { PayrollRunForm } from "@/components/payroll/PayrollRunForm";
import { PayrollRunsTable } from "@/components/payroll/PayrollRunsTable";

export const PayrollPageClient = () => {
  const [data, setData] = useState<PayrollRunsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const query = useMemo(
    () => ({
      status: status || undefined,
      limit: 36
    }),
    [status]
  );

  const load = () => {
    setLoading(true);
    setError(null);
    void fetchPayrollRuns(query)
      .then((result) => {
        if (!result.ok || !result.data) {
          setData(null);
          setError(result.error ?? "Unable to load payroll history");
          return;
        }
        setData(result.data);
      })
      .catch((err: unknown) => {
        setData(null);
        setError(err instanceof Error ? err.message : "Unable to load payroll history");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [query]);

  return (
    <div className="page-wrap stack">
      <div className="page-header">
        <div>
          <h1>Payroll Operations</h1>
          <p className="muted">Run payroll safely and review payroll run history with lock status visibility.</p>
        </div>
      </div>

      <PayrollRunForm
        onSubmit={async (payload) => {
          if (running) return;
          setRunning(true);
          setError(null);
          setNotice(null);
          try {
            const result = await runPayrollBatch(payload);
            if (!result.ok || !result.data) {
              setError(result.error ?? "Payroll run failed");
              return;
            }
            setNotice(`Payroll run completed. Run ID: ${result.data.payrollRunId}`);
            load();
          } finally {
            setRunning(false);
          }
        }}
      />

      <section className="card row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <div className="row">
          <label>
            <span className="muted">Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All</option>
              <option value="draft">Draft</option>
              <option value="processing">Processing</option>
              <option value="finalized">Finalized</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
            </select>
          </label>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="secondary-btn" type="button" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>
      </section>

      {notice ? (
        <section className="card">
          <p className="muted" style={{ margin: 0 }}>{notice}</p>
        </section>
      ) : null}

      {loading ? <LoadingState label="Loading payroll history..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}
      {!loading && !error && data && data.rows.length === 0 ? (
        <EmptyState title="No payroll runs yet" subtitle="Run payroll for a month to create the first payroll batch." />
      ) : null}
      {!loading && !error && data && data.rows.length > 0 ? <PayrollRunsTable rows={data.rows} /> : null}
    </div>
  );
};
