"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { cleanupIdempotencyExpired, fetchMonitoringOverview, fetchSecurityAuditTimeline } from "@/lib/client/api";
import type {
  MonitoringOverview,
  SecurityAuditTimelineEventType,
  SecurityAuditTimelineRow,
} from "@/lib/types/monitoring";
import {
  DashboardRail,
  FeatureCallout,
  PageContainer,
  PageHeader,
  StatCard,
  StatGrid,
  SurfacePanel,
  WorkspaceModuleGrid,
} from "@/components/dashboard-v2/PagePrimitives";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusChip } from "@/components/ui/StatusChip";

const TIMELINE_FILTERS: Array<{ key: "all" | SecurityAuditTimelineEventType; label: string }> = [
  { key: "all", label: "All events" },
  { key: "login", label: "Logins" },
  { key: "account_lock", label: "Account locks" },
  { key: "mfa_trigger", label: "MFA triggers" },
];

const TIMELINE_LIMITS = [25, 50, 100] as const;

const formatStamp = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const formatDetails = (details: Record<string, unknown> | null) => {
  if (!details) return "No extra details recorded.";
  return JSON.stringify(details, null, 2);
};

const resolveTimelineTone = (eventType: SecurityAuditTimelineEventType) => {
  switch (eventType) {
    case "account_lock":
      return "danger" as const;
    case "mfa_trigger":
      return "warning" as const;
    case "login":
    default:
      return "info" as const;
  }
};

const formatEventLabel = (eventType: SecurityAuditTimelineEventType) => {
  switch (eventType) {
    case "account_lock":
      return "Account lock";
    case "mfa_trigger":
      return "MFA trigger";
    case "login":
    default:
      return "Login";
  }
};

export const MonitoringPageClient = () => {
  const [overview, setOverview] = useState<MonitoringOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cleanupStatus, setCleanupStatus] = useState<string | null>(null);
  const [cleanupBusy, setCleanupBusy] = useState(false);

  const [timelineRows, setTimelineRows] = useState<SecurityAuditTimelineRow[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [timelineFilter, setTimelineFilter] = useState<"all" | SecurityAuditTimelineEventType>("all");
  const [timelineLimit, setTimelineLimit] = useState<(typeof TIMELINE_LIMITS)[number]>(50);

  const loadOverview = useCallback(async () => {
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
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTimeline = useCallback(async () => {
    setTimelineLoading(true);
    setTimelineError(null);
    try {
      const result = await fetchSecurityAuditTimeline({
        limit: timelineLimit,
        eventType: timelineFilter === "all" ? undefined : timelineFilter,
      });
      if (!result.ok || !result.data) {
        setTimelineRows([]);
        setTimelineError(result.error ?? "Unable to load security audit timeline");
      } else {
        setTimelineRows(result.data.rows);
      }
    } catch (err) {
      setTimelineRows([]);
      setTimelineError(err instanceof Error ? err.message : "Unable to load security audit timeline");
    } finally {
      setTimelineLoading(false);
    }
  }, [timelineFilter, timelineLimit]);

  const loadAll = useCallback(async () => {
    await Promise.all([loadOverview(), loadTimeline()]);
  }, [loadOverview, loadTimeline]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    void loadTimeline();
  }, [loadTimeline]);

  const handleCleanup = async () => {
    setCleanupBusy(true);
    setCleanupStatus(null);

    try {
      const result = await cleanupIdempotencyExpired();
      if (!result.ok || !result.data) {
        setCleanupStatus(result.error ?? "Cleanup failed");
      } else {
        setCleanupStatus(`Marked ${result.data.expired} keys as expired.`);
        await loadOverview();
      }
    } catch (err) {
      setCleanupStatus(err instanceof Error ? err.message : "Cleanup failed");
    } finally {
      setCleanupBusy(false);
    }
  };

  const stats = useMemo(() => {
    return {
      breaches: overview?.rateLimitBreaches.length ?? 0,
      conflicts: overview?.idempotencyConflicts.reduce((sum, row) => sum + row.count, 0) ?? 0,
      failures: overview?.approvalFailures.reduce((sum, row) => sum + row.count, 0) ?? 0,
      generatedAt: overview?.generated_at ?? "-",
    };
  }, [overview]);

  const timelineUnavailable = timelineError === "Feature disabled by current plan";
  const workspaceModules = [
    {
      title: "Monitoring overview",
      description: "Track request pressure, approval failures, and integrity issues from the main operations monitor.",
      href: "/app/monitoring",
      label: "Overview",
      metric: `${stats.breaches + stats.conflicts + stats.failures} signals`,
      highlights: ["Integrity", "Queue health", "Operator ready"],
    },
    {
      title: "Security audit timeline",
      description: "Inspect audit events around login, account locks, and MFA movement without leaving the monitor.",
      href: "/app/monitoring",
      label: "Audit",
      metric: timelineFilter === "all" ? `${timelineRows.length} rows` : timelineFilter.replace("_", " "),
      highlights: ["Login", "Account lock", "MFA trigger"],
    },
    {
      title: "Approval recovery lane",
      description: "When failures affect real work, move directly into the approvals queue to restore operational flow.",
      href: "/app/approvals",
      label: "Recovery",
      metric: `${stats.failures} failures`,
      highlights: ["Approvals", "Workflow", "Escalation"],
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        eyebrow="System Monitor"
        title="Operational security and workflow integrity"
        description="Keep rate-limit pressure, idempotency conflicts, approval workflow failures, and governance audit signals visible in one review surface for IT and platform operations."
        chips={["Integrity", "Operator ready", "Queue health", "Tenant safe"]}
        actions={(
          <button type="button" className="secondary-btn" onClick={() => void loadAll()}>
            Refresh
          </button>
        )}
      />

      <FeatureCallout
        badge="Operational health"
        title="A calm monitoring surface for the signals that matter first."
        description="This workspace stays focused on integrity problems that can affect approvals, billing-safe mutations, tenant-wide request pressure, and governance review without burying operators under decorative telemetry."
      />

      <StatGrid>
        <StatCard label="Rate-limit breaches" value={stats.breaches} hint="Threshold exceedances in the last 24 hours" />
        <StatCard label="Integrity conflicts" value={stats.conflicts} hint="Idempotency collisions currently recorded" />
        <StatCard label="Approval failures" value={stats.failures} hint="Workflow endpoints failing in the last 24 hours" />
        <StatCard label="Last generated" value={stats.generatedAt === "-" ? "-" : formatStamp(stats.generatedAt)} hint="Most recent monitoring snapshot" />
      </StatGrid>

      <SurfacePanel
        title="Workspace modules"
        description="TailAdmin-style monitoring modules for overview, audit review, and operational recovery."
      >
        <WorkspaceModuleGrid modules={workspaceModules} />
      </SurfacePanel>

      {cleanupStatus ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
          {cleanupStatus}
        </div>
      ) : null}

      {loading ? <LoadingState label="Loading monitoring overview..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}

      {!loading && overview ? (
        <>
          <DashboardRail>
            <SurfacePanel
              title="System signals"
              description="Current operational pressure across rate limiting, request integrity, and approval endpoints."
              actions={(
                <button type="button" className="secondary-btn" onClick={handleCleanup} disabled={cleanupBusy}>
                  {cleanupBusy ? "Cleaning..." : "Mark expired keys"}
                </button>
              )}
            >
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusChip label={`${overview.rateLimitBreaches.length} breach records`} tone={overview.rateLimitBreaches.length > 0 ? "warning" : "success"} />
                  <StatusChip label={`${overview.idempotencyConflicts.length} conflict endpoints`} tone={overview.idempotencyConflicts.length > 0 ? "warning" : "success"} />
                  <StatusChip label={`${overview.approvalFailures.length} approval endpoints`} tone={overview.approvalFailures.length > 0 ? "danger" : "success"} />
                </div>

                <div className="grid gap-4 xl:grid-cols-3">
                  <div className="space-y-3 rounded-[22px] border border-slate-200/80 bg-slate-50/70 p-4">
                    <h3 className="text-sm font-semibold text-slate-950">Rate-limit breaches</h3>
                    {overview.rateLimitBreaches.length === 0 ? (
                      <EmptyState title="No breaches detected" subtitle="Thresholds are currently stable." compact />
                    ) : (
                      overview.rateLimitBreaches.map((row) => (
                        <div key={`${row.endpoint}-${row.window_start}`} className="rounded-2xl border border-slate-200 bg-white/80 p-3">
                          <p className="text-sm font-semibold text-slate-950">{row.endpoint}</p>
                          <p className="text-xs text-slate-500">{formatStamp(row.window_start)}</p>
                          <p className="mt-2 text-sm text-slate-600">{row.request_count} requests in the breached window</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="space-y-3 rounded-[22px] border border-slate-200/80 bg-slate-50/70 p-4">
                    <h3 className="text-sm font-semibold text-slate-950">Idempotency conflicts</h3>
                    {overview.idempotencyConflicts.length === 0 ? (
                      <EmptyState title="No conflicts detected" subtitle="No duplicate request collisions were recorded." compact />
                    ) : (
                      overview.idempotencyConflicts.map((row) => (
                        <div key={row.endpoint} className="rounded-2xl border border-slate-200 bg-white/80 p-3">
                          <p className="text-sm font-semibold text-slate-950">{row.endpoint}</p>
                          <p className="mt-2 text-sm text-slate-600">{row.count} conflict events</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="space-y-3 rounded-[22px] border border-slate-200/80 bg-slate-50/70 p-4">
                    <h3 className="text-sm font-semibold text-slate-950">Approval failures</h3>
                    {overview.approvalFailures.length === 0 ? (
                      <EmptyState title="No failures detected" subtitle="Approval endpoints are currently healthy." compact />
                    ) : (
                      overview.approvalFailures.map((row) => (
                        <div key={row.endpoint} className="rounded-2xl border border-slate-200 bg-white/80 p-3">
                          <p className="text-sm font-semibold text-slate-950">{row.endpoint}</p>
                          <p className="mt-2 text-sm text-slate-600">{row.count} failed requests</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </SurfacePanel>

            <SurfacePanel title="Operator notes" description="How to use this surface during review and incident response.">
              <div className="space-y-3 text-sm leading-6 text-slate-600">
                <p>Start with approval failures when the queue is blocked, then move to integrity conflicts that could indicate duplicate client submissions or retry storms.</p>
                <p>Rate-limit breaches are usually the next priority because they affect user experience before they become a data problem.</p>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Generated {formatStamp(overview.generated_at)}</p>
              </div>
            </SurfacePanel>
          </DashboardRail>

          <SurfacePanel
            title="Security audit timeline"
            description="Tenant-scoped governance events for login activity, account locks, and MFA triggers."
            actions={(
              <div className="flex flex-wrap items-center gap-2">
                {TIMELINE_LIMITS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={value === timelineLimit ? "primary-btn" : "secondary-btn"}
                    onClick={() => setTimelineLimit(value)}
                  >
                    Latest {value}
                  </button>
                ))}
              </div>
            )}
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {TIMELINE_FILTERS.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    className={filter.key === timelineFilter ? "primary-btn" : "secondary-btn"}
                    onClick={() => setTimelineFilter(filter.key)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {timelineLoading ? <LoadingState label="Loading security audit timeline..." /> : null}

              {!timelineLoading && timelineUnavailable ? (
                <EmptyState
                  title="Timeline unavailable on current plan"
                  subtitle="This governance timeline follows the current audit export entitlement. The rest of monitoring remains available."
                  compact
                />
              ) : null}

              {!timelineLoading && !timelineUnavailable && timelineError ? <ErrorState message={timelineError} /> : null}

              {!timelineLoading && !timelineError && timelineRows.length === 0 ? (
                <EmptyState
                  title="No audit events found"
                  subtitle="No governance events matched the current filter and time window."
                  compact
                />
              ) : null}

              {!timelineLoading && !timelineError && timelineRows.length > 0 ? (
                <div className="space-y-3">
                  {timelineRows.map((row) => (
                    <div key={`${row.eventType}-${row.createdAt}-${row.profileId ?? "none"}`} className="rounded-[22px] border border-slate-200/80 bg-white/90 p-4 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusChip label={formatEventLabel(row.eventType)} tone={resolveTimelineTone(row.eventType)} compact />
                            {row.riskScore !== null ? <StatusChip label={`Risk ${row.riskScore}`} tone={row.riskScore >= 80 ? "danger" : row.riskScore >= 60 ? "warning" : "info"} compact /> : null}
                          </div>
                          <p className="text-sm font-semibold text-slate-950">{row.summary}</p>
                          <p className="text-xs text-slate-500">{formatStamp(row.createdAt)}</p>
                        </div>
                        {row.profileId ? (
                          <p className="text-xs text-slate-500">Profile {row.profileId}</p>
                        ) : (
                          <p className="text-xs text-slate-400">No profile linked</p>
                        )}
                      </div>

                      <details className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                        <summary className="cursor-pointer text-sm font-medium text-slate-700">Inspect event details</summary>
                        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-xs leading-6 text-slate-600">
                          {formatDetails(row.details)}
                        </pre>
                      </details>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </SurfacePanel>
        </>
      ) : null}
    </PageContainer>
  );
};
