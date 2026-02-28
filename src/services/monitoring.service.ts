import type { ServiceContext, ServiceResult } from "../lib/types";
import { requirePermission } from "../lib/auth-wrapper";
import { markExpiredIdempotency } from "../lib/idempotency";
import { requirePlanFeature } from "../lib/entitlements";

export type RateLimitBreach = {
  endpoint: string;
  window_start: string;
  request_count: number;
};

export type IdempotencyConflict = {
  endpoint: string;
  count: number;
};

export type ApprovalFailure = {
  endpoint: string;
  count: number;
};

export type MonitoringOverview = {
  rateLimitBreaches: RateLimitBreach[];
  idempotencyConflicts: IdempotencyConflict[];
  approvalFailures: ApprovalFailure[];
  generated_at: string;
};

export type SlaBacklog = {
  leave_pending: number;
  attendance_pending: number;
  total_pending: number;
};

export type SlaFailure = {
  failure_count: number;
  last_failure_at: string | null;
};

export type SlaAuthLock = {
  lock_count: number;
  last_lock_at: string | null;
};

export type SlaConflicts = {
  conflict_count: number;
  last_conflict_at: string | null;
};

export type SlaLatency = {
  p95_duration_ms: number | null;
};

export type MonitoringSlaOverview = {
  approval_backlog: SlaBacklog;
  payroll_failures_30d: SlaFailure;
  auth_lock_events_24h: SlaAuthLock;
  idempotency_conflicts_24h: SlaConflicts;
  request_latency_p95: SlaLatency;
  generated_at: string;
};

const aggregateByEndpoint = (rows: Array<{ endpoint: string | null }>): IdempotencyConflict[] => {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    if (!row.endpoint) return;
    counts.set(row.endpoint, (counts.get(row.endpoint) ?? 0) + 1);
  });
  return Array.from(counts.entries()).map(([endpoint, count]) => ({ endpoint, count }));
};

const requireSecurityIntelligenceEntitlement = async (ctx: ServiceContext): Promise<void> => {
  await requirePlanFeature(ctx, "feature.security_intelligence");
};

export const getMonitoringOverview = async (
  ctx: ServiceContext,
  {
    sinceHours = 24,
    rateLimitThreshold = 100,
    maxRows = 200
  }: { sinceHours?: number; rateLimitThreshold?: number; maxRows?: number } = {}
): Promise<ServiceResult<MonitoringOverview>> => {
  try {
    await requireSecurityIntelligenceEntitlement(ctx);
    requirePermission("manage_company", ctx);

    const sinceIso = new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString();

    const { data: rateLimitRows, error: rateLimitError } = await ctx.supabase
      .from("api_rate_limits")
      .select("endpoint, window_start, request_count")
      .eq("company_id", ctx.companyId)
      .gte("window_start", sinceIso)
      .gte("request_count", rateLimitThreshold)
      .order("window_start", { ascending: false })
      .limit(maxRows);

    if (rateLimitError) {
      return { ok: false, error: "Failed to load rate limit breaches" };
    }

    const idempotentEndpoints = [
      "/api/leave/apply",
      "/api/leave/review/approve",
      "/api/attendance/approve"
    ];

    const { data: idempotencyRows, error: idempotencyError } = await ctx.supabase
      .from("v_request_traces_all")
      .select("endpoint, status_code, created_at")
      .eq("company_id", ctx.companyId)
      .eq("status_code", 409)
      .gte("created_at", sinceIso)
      .in("endpoint", idempotentEndpoints)
      .limit(maxRows);

    if (idempotencyError) {
      return { ok: false, error: "Failed to load idempotency conflicts" };
    }

    const approvalEndpoints = ["/api/leave/review/approve", "/api/attendance/approve"];

    const { data: approvalRows, error: approvalError } = await ctx.supabase
      .from("v_request_traces_all")
      .select("endpoint, status_code, created_at")
      .eq("company_id", ctx.companyId)
      .gte("status_code", 400)
      .gte("created_at", sinceIso)
      .in("endpoint", approvalEndpoints)
      .limit(maxRows);

    if (approvalError) {
      return { ok: false, error: "Failed to load approval failures" };
    }

    const approvalFailures = aggregateByEndpoint(approvalRows ?? []).map((row) => ({
      endpoint: row.endpoint,
      count: row.count
    }));

    return {
      ok: true,
      data: {
        rateLimitBreaches: (rateLimitRows ?? []) as RateLimitBreach[],
        idempotencyConflicts: aggregateByEndpoint(idempotencyRows ?? []),
        approvalFailures,
        generated_at: new Date().toISOString()
      }
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Monitoring query failed" };
  }
};

export const cleanupExpiredIdempotency = async (
  ctx: ServiceContext,
  endpoint?: string
): Promise<ServiceResult<{ expired: number }>> => {
  try {
    await requireSecurityIntelligenceEntitlement(ctx);
    requirePermission("manage_company", ctx);
    const result = await markExpiredIdempotency(ctx, endpoint);
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    return { ok: true, data: { expired: result.expired } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Cleanup failed" };
  }
};

export const getMonitoringSlaOverview = async (ctx: ServiceContext): Promise<ServiceResult<MonitoringSlaOverview>> => {
  try {
    await requireSecurityIntelligenceEntitlement(ctx);
    const allowed = ctx.permissions.includes("manage_employees") || ctx.permissions.includes("manage_roles");
    if (!allowed) {
      throw new Error("Missing permission: manage_employees");
    }

    const [backlog, payrollFailures, authLocks, conflicts, latency] = await Promise.all([
      ctx.supabase
        .from("v_approval_backlog")
        .select("leave_pending, attendance_pending, total_pending, company_id")
        .eq("company_id", ctx.companyId)
        .maybeSingle(),
      ctx.supabase
        .from("v_payroll_failures_30d")
        .select("failure_count, last_failure_at, company_id")
        .eq("company_id", ctx.companyId)
        .maybeSingle(),
      ctx.supabase
        .from("v_auth_lock_events_24h")
        .select("lock_count, last_lock_at, company_id")
        .eq("company_id", ctx.companyId)
        .maybeSingle(),
      ctx.supabase
        .from("v_idempotency_conflicts_24h")
        .select("conflict_count, last_conflict_at, company_id")
        .eq("company_id", ctx.companyId)
        .maybeSingle(),
      ctx.supabase
        .from("v_request_latency_p95")
        .select("p95_duration_ms, company_id")
        .eq("company_id", ctx.companyId)
        .maybeSingle()
    ]);

    if (backlog.error) return { ok: false, error: "Failed to load approval backlog" };
    if (payrollFailures.error) return { ok: false, error: "Failed to load payroll failures" };
    if (authLocks.error) return { ok: false, error: "Failed to load auth lock events" };
    if (conflicts.error) return { ok: false, error: "Failed to load idempotency conflicts" };
    if (latency.error) return { ok: false, error: "Failed to load request latency" };

    return {
      ok: true,
      data: {
        approval_backlog: {
          leave_pending: backlog.data?.leave_pending ?? 0,
          attendance_pending: backlog.data?.attendance_pending ?? 0,
          total_pending: backlog.data?.total_pending ?? 0
        },
        payroll_failures_30d: {
          failure_count: payrollFailures.data?.failure_count ?? 0,
          last_failure_at: payrollFailures.data?.last_failure_at ?? null
        },
        auth_lock_events_24h: {
          lock_count: authLocks.data?.lock_count ?? 0,
          last_lock_at: authLocks.data?.last_lock_at ?? null
        },
        idempotency_conflicts_24h: {
          conflict_count: conflicts.data?.conflict_count ?? 0,
          last_conflict_at: conflicts.data?.last_conflict_at ?? null
        },
        request_latency_p95: {
          p95_duration_ms: latency.data?.p95_duration_ms ?? null
        },
        generated_at: new Date().toISOString()
      }
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "SLA query failed" };
  }
};
