"use client";

import { useEffect, useState } from "react";
import { fetchOvertimeRequests, approveOvertime, rejectOvertime } from "@/lib/client/api";
import type { OvertimeListResponse } from "@/lib/types/overtime";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { OvertimeReviewTable } from "@/components/overtime/OvertimeReviewTable";

export const OvertimeReviewPageClient = () => {
  const [data, setData] = useState<OvertimeListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    void fetchOvertimeRequests({ status: "pending" })
      .then((result) => {
        if (!result.ok || !result.data) {
          setError(result.error ?? "Unable to load overtime review queue");
          setData(null);
          return;
        }
        setData(result.data);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to load overtime review queue");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="page-wrap stack">
      <div className="page-header">
        <div>
          <h1>Overtime Review</h1>
          <p className="muted">Approve or reject overtime requests from your team.</p>
        </div>
      </div>

      {loading ? <LoadingState label="Loading overtime review queue..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}
      {!loading && !error && data && data.rows.length === 0 ? (
        <EmptyState title="No pending requests" subtitle="Overtime approvals will appear here." />
      ) : null}
      {!loading && !error && data && data.rows.length > 0 ? (
        <OvertimeReviewTable
          rows={data.rows}
          onApprove={async (id) => {
            const result = await approveOvertime(id);
            if (!result.ok) {
              setError(result.error ?? "Approval failed");
              return;
            }
            load();
          }}
          onReject={async (id, reason) => {
            const result = await rejectOvertime(id, reason);
            if (!result.ok) {
              setError(result.error ?? "Rejection failed");
              return;
            }
            load();
          }}
        />
      ) : null}
    </div>
  );
};
