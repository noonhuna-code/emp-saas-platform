"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchOvertimeRequests, requestOvertime } from "@/lib/client/api";
import type { OvertimeListResponse } from "@/lib/types/overtime";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { OvertimeRequestForm } from "@/components/overtime/OvertimeRequestForm";
import { OvertimeHistoryTable } from "@/components/overtime/OvertimeHistoryTable";

export const OvertimePageClient = () => {
  const [data, setData] = useState<OvertimeListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const query = useMemo(() => ({
    status: status || undefined
  }), [status]);

  const load = () => {
    setLoading(true);
    setError(null);
    void fetchOvertimeRequests(query)
      .then((result) => {
        if (!result.ok || !result.data) {
          setError(result.error ?? "Unable to load overtime requests");
          setData(null);
          return;
        }
        setData(result.data);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to load overtime requests");
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
          <h1>Overtime Requests</h1>
          <p className="muted">Submit and track your overtime approvals.</p>
        </div>
      </div>

      <OvertimeRequestForm
        onSubmit={async (payload) => {
          const result = await requestOvertime(payload);
          if (!result.ok) {
            setError(result.error ?? "Overtime request failed");
            return;
          }
          load();
        }}
      />

      <section className="card row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <div className="row">
          <label>
            <span className="muted">Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
        </div>
        <button className="secondary-btn" type="button" onClick={load}>Refresh</button>
      </section>

      {loading ? <LoadingState label="Loading overtime requests..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}
      {!loading && !error && data && data.rows.length === 0 ? (
        <EmptyState title="No overtime requests" subtitle="Submit a new request to get started." />
      ) : null}
      {!loading && !error && data && data.rows.length > 0 ? (
        <OvertimeHistoryTable rows={data.rows} />
      ) : null}
    </div>
  );
};
