"use client";

import { useEffect, useState } from "react";
import { fetchPayslipHistory } from "@/lib/client/api";
import type { PayslipHistoryResponse } from "@/lib/types/payroll";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { LoadingState } from "@/components/states/LoadingState";
import { PayslipHistoryTable } from "@/components/payroll/PayslipHistoryTable";

export const PayslipsPageClient = () => {
  const [data, setData] = useState<PayslipHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const load = () => {
    setLoading(true);
    setError(null);
    void fetchPayslipHistory({ page, pageSize })
      .then((result) => {
        if (!result.ok || !result.data) {
          setData(null);
          setError(result.error ?? "Unable to load payslips");
          return;
        }
        setData(result.data);
      })
      .catch((err: unknown) => {
        setData(null);
        setError(err instanceof Error ? err.message : "Unable to load payslips");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [page]);

  return (
    <div className="page-wrap stack">
      <div className="page-header">
        <div>
          <h1>Payslips</h1>
          <p className="muted">View your payroll history and open detailed payslip snapshots.</p>
        </div>
      </div>

      <section className="card row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <div className="row" style={{ gap: 8 }}>
          <button className="secondary-btn" type="button" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={loading || page <= 1}>
            Previous
          </button>
          <button
            className="secondary-btn"
            type="button"
            onClick={() => setPage((prev) => prev + 1)}
            disabled={loading || !(data?.hasMore ?? false)}
          >
            Next
          </button>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <span className="muted">Page {data?.page ?? page}</span>
          <button className="secondary-btn" type="button" onClick={load} disabled={loading}>Refresh</button>
        </div>
      </section>

      {loading ? <LoadingState label="Loading payslips..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}
      {!loading && !error && data && data.rows.length === 0 ? (
        <EmptyState title="No payslips available" subtitle="No payroll entry snapshots are available for your current scope." />
      ) : null}
      {!loading && !error && data && data.rows.length > 0 ? (
        <PayslipHistoryTable rows={data.rows} showEmployeeColumn={data.viewerScope === "manage_payroll"} />
      ) : null}
    </div>
  );
};
