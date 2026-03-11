"use client";

import { useCallback, useEffect, useState } from "react";
import { cleanupIdempotencyExpired, fetchMonitoringOverview } from "@/lib/client/api";
import type { MonitoringOverview } from "@/lib/types/monitoring";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";

export const MonitoringPageClient = () => {
  const [overview, setOverview] = useState<MonitoringOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cleanupStatus, setCleanupStatus] = useState<string | null>(null);
  const [cleanupBusy, setCleanupBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMonitoringOverview();
      if (!result.ok || !result.data) {
        setError(result.error ?? "Unable to load monitoring overview");
        setOverview(null);
      } else {
        setOverview(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load monitoring overview");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCleanup = async () => {
    setCleanupBusy(true);
    setCleanupStatus(null);
    try {
      const result = await cleanupIdempotencyExpired();
      if (!result.ok || !result.data) {
        setCleanupStatus(result.error ?? "Cleanup failed");
      } else {
        setCleanupStatus(`Marked ${result.data.expired} keys as expired`);
        await load();
      }
    } catch (err) {
      setCleanupStatus(err instanceof Error ? err.message : "Cleanup failed");
    } finally {
      setCleanupBusy(false);
    }
  };

  return (
    <div className="page-wrap stack">
      <section className="card stack">
        <h1 style={{ margin: 0 }}>Monitoring</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>
          Operational signals for rate limiting, idempotency conflicts, and approval errors.
        </p>
      </section>

      {loading ? <LoadingState label="Loading monitoring data..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}

      {!loading && overview ? (
        <>
          <section className="card stack">
            <div className="row-between">
              <h2 style={{ margin: 0 }}>Rate limit breaches (24h)</h2>
              <span className="muted">{overview.rateLimitBreaches.length} records</span>
            </div>
            {overview.rateLimitBreaches.length === 0 ? (
              <p className="muted">No breaches detected.</p>
            ) : (
              <ul className="list">
                {overview.rateLimitBreaches.map((row) => (
                  <li key={`${row.endpoint}-${row.window_start}`}>
                    <strong>{row.endpoint}</strong> — {row.request_count} requests @{" "}
                    {new Date(row.window_start).toLocaleString()}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card stack">
            <div className="row-between">
              <h2 style={{ margin: 0 }}>Idempotency conflicts (24h)</h2>
              <button className="button" onClick={handleCleanup} disabled={cleanupBusy}>
                {cleanupBusy ? "Cleaning..." : "Mark expired keys"}
              </button>
            </div>
            {cleanupStatus ? <p className="muted">{cleanupStatus}</p> : null}
            {overview.idempotencyConflicts.length === 0 ? (
              <p className="muted">No conflicts detected.</p>
            ) : (
              <ul className="list">
                {overview.idempotencyConflicts.map((row) => (
                  <li key={row.endpoint}>
                    <strong>{row.endpoint}</strong> — {row.count} conflicts
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card stack">
            <div className="row-between">
              <h2 style={{ margin: 0 }}>Approval failures (24h)</h2>
              <span className="muted">{overview.approvalFailures.length} endpoints</span>
            </div>
            {overview.approvalFailures.length === 0 ? (
              <p className="muted">No approval failures detected.</p>
            ) : (
              <ul className="list">
                {overview.approvalFailures.map((row) => (
                  <li key={row.endpoint}>
                    <strong>{row.endpoint}</strong> — {row.count} failures
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
};
