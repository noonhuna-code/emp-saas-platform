"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchPayslipDetail } from "@/lib/client/api";
import type { PayslipDetailResponse } from "@/lib/types/payroll";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { LoadingState } from "@/components/states/LoadingState";
import { PayslipDetailView } from "@/components/payroll/PayslipDetailView";

export const PayslipPrintPageClient = ({ entryId }: { entryId: string }) => {
  const [data, setData] = useState<PayslipDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    void fetchPayslipDetail(entryId)
      .then((result) => {
        if (!result.ok || !result.data) {
          setData(null);
          setError(result.error ?? "Unable to load payslip print view");
          return;
        }
        setData(result.data);
      })
      .catch((err: unknown) => {
        setData(null);
        setError(err instanceof Error ? err.message : "Unable to load payslip print view");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [entryId]);

  return (
    <div className="page-wrap stack payslip-print-page">
      <div className="page-header no-print">
        <div>
          <h1>Payslip Print View</h1>
          <p className="muted">Print-friendly read-only payslip snapshot. No recalculation and no editing.</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Link href={`/app/payslips/${entryId}`} className="secondary-btn">Back to Payslip</Link>
          <a href={`/api/payslips/${entryId}/pdf`} className="secondary-btn" target="_blank" rel="noreferrer">
            Download PDF
          </a>
          <button type="button" className="primary-btn" onClick={() => window.print()} disabled={loading}>Print</button>
          <button type="button" className="secondary-btn" onClick={load} disabled={loading}>Refresh</button>
        </div>
      </div>

      {loading ? <LoadingState label="Loading payslip print view..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}
      {!loading && !error && !data ? (
        <EmptyState title="Payslip not found" subtitle="It may not exist or you may not have access to it." />
      ) : null}
      {!loading && !error && data ? <PayslipDetailView data={data} /> : null}
    </div>
  );
};
