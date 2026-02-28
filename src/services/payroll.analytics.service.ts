import type { ServiceContext, ServiceResult } from "../lib/types";
import { requireCompany } from "../lib/auth-wrapper";
import { requirePayrollCapability } from "../lib/payroll-capabilities";
import { requirePlanFeature } from "../lib/entitlements";

export type PayrollAnalyticsRange = {
  months?: number;
};

export type PayrollCostTrendRow = {
  year: number;
  month: number;
  grossTotal: number;
  netTotal: number;
  employeeCount: number;
  deltaFromPrevious: number | null;
  percentGrowth: number | null;
};

export type PayrollDeliveryMetricRow = {
  runId: string;
  year: number;
  month: number;
  totalDispatches: number;
  sent: number;
  failed: number;
  pending: number;
  successRate: number;
  lastActivityAt: string | null;
};

export type PayrollCloseoutLatencyRow = {
  runId: string;
  year: number;
  month: number;
  finalizeToPaidHours: number | null;
  paidToArchivedHours: number | null;
};

export type PayrollCloseoutLatencySummary = {
  avgFinalizeToPaid: number | null;
  avgPaidToArchived: number | null;
  p50FinalizeToPaid: number | null;
  p95FinalizeToPaid: number | null;
};

export type PayrollCloseoutLatencyResponse = {
  rows: PayrollCloseoutLatencyRow[];
  summary: PayrollCloseoutLatencySummary;
};

export type PayrollGrowthMetrics = {
  currentMonthNet: number;
  previousMonthNet: number;
  absoluteDelta: number;
  percentGrowth: number | null;
};

const MAX_RANGE_MONTHS = 24;
const DEFAULT_RANGE_MONTHS = 12;
const PAYROLL_ANALYTICS_STATUSES = ["paid", "archived"] as const;

const sanitizeError = (message: string | undefined, fallback: string): string => {
  if (!message) return fallback;
  const lower = message.toLowerCase();
  if (lower.includes("permission")) return "Permission denied";
  if (lower.includes("jwt") || message === "UNAUTHENTICATED") return "Authentication required";
  if (lower.includes("not found")) return "Payroll run not found";
  return fallback;
};

const normalizeRange = (range?: PayrollAnalyticsRange): { months: number; since: Date } => {
  const months = Math.min(MAX_RANGE_MONTHS, Math.max(1, Math.floor(range?.months ?? DEFAULT_RANGE_MONTHS)));
  const now = new Date();
  const monthStartUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  monthStartUtc.setUTCMonth(monthStartUtc.getUTCMonth() - (months - 1));
  return { months, since: monthStartUtc };
};

const toMonthKey = (year: number, month: number): string => `${year}-${String(month).padStart(2, "0")}`;

const toNumber = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const hoursDiff = (startIso?: string | null, endIso?: string | null): number | null => {
  if (!startIso || !endIso) return null;
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return Number(((end - start) / (1000 * 60 * 60)).toFixed(2));
};

const percentile = (values: number[], p: number): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const clamped = Math.min(1, Math.max(0, p));
  const index = Math.ceil(clamped * sorted.length) - 1;
  const safeIndex = Math.min(sorted.length - 1, Math.max(0, index));
  return Number(sorted[safeIndex]!.toFixed(2));
};

const average = (values: number[]): number | null => {
  if (values.length === 0) return null;
  return Number((values.reduce((acc, value) => acc + value, 0) / values.length).toFixed(2));
};

type RunBaseRow = {
  id: string;
  company_id: string;
  year: number;
  month: number;
  status: string;
  locked?: boolean | null;
  locked_at?: string | null;
  created_at?: string | null;
  start_date?: string | null;
};

const loadScopedPayrollRuns = async (
  ctx: ServiceContext,
  companyId: string,
  range?: PayrollAnalyticsRange
): Promise<ServiceResult<RunBaseRow[]>> => {
  try {
    await requirePlanFeature(ctx, "feature.analytics_advanced");
    requirePayrollCapability(ctx, "view_payroll_analytics");
    requireCompany(companyId, ctx);

    const { since } = normalizeRange(range);

    const { data, error } = await ctx.supabase
      .from("payroll_runs")
      .select("id, company_id, year, month, status, locked, locked_at, created_at, start_date")
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false)
      .in("status", [...PAYROLL_ANALYTICS_STATUSES])
      .gte("start_date", since.toISOString().slice(0, 10))
      .order("year", { ascending: true })
      .order("month", { ascending: true });

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Unable to load payroll analytics") };
    }

    return { ok: true, data: (data ?? []) as RunBaseRow[] };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to load payroll analytics" };
  }
};

export const getPayrollCostTrend = async (
  ctx: ServiceContext,
  companyId: string,
  range?: PayrollAnalyticsRange
): Promise<ServiceResult<PayrollCostTrendRow[]>> => {
  const runsResult = await loadScopedPayrollRuns(ctx, companyId, range);
  if (!runsResult.ok || !runsResult.data) return { ok: false, error: runsResult.error };

  try {
    const runs = runsResult.data;
    if (runs.length === 0) {
      return { ok: true, data: [] };
    }

    const runIds = runs.map((run) => run.id);
    const runMeta = new Map(runs.map((run) => [run.id, run]));

    const { data: entryRows, error: entriesError } = await ctx.supabase
      .from("payroll_entries")
      .select("payroll_run_id, employee_id, total_earnings, net_salary")
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false)
      .in("payroll_run_id", runIds);

    if (entriesError) {
      return { ok: false, error: sanitizeError(entriesError.message, "Unable to load payroll cost trend") };
    }

    const bucketMap = new Map<string, { year: number; month: number; gross: number; net: number; employees: Set<string> }>();

    for (const row of (entryRows ?? []) as Array<{ payroll_run_id: string; employee_id: string; total_earnings?: unknown; net_salary?: unknown }>) {
      const run = runMeta.get(row.payroll_run_id);
      if (!run) continue;
      const key = toMonthKey(run.year, run.month);
      const bucket = bucketMap.get(key) ?? {
        year: run.year,
        month: run.month,
        gross: 0,
        net: 0,
        employees: new Set<string>()
      };
      bucket.gross += toNumber(row.total_earnings);
      bucket.net += toNumber(row.net_salary);
      if (row.employee_id) bucket.employees.add(row.employee_id);
      bucketMap.set(key, bucket);
    }

    const sorted = Array.from(bucketMap.values()).sort((a, b) => (a.year - b.year) || (a.month - b.month));
    const rows: PayrollCostTrendRow[] = [];
    let previousNet: number | null = null;

    for (const bucket of sorted) {
      const netTotal = Number(bucket.net.toFixed(2));
      const delta = previousNet === null ? null : Number((netTotal - previousNet).toFixed(2));
      const pct = previousNet === null || previousNet === 0 ? null : Number((((netTotal - previousNet) / previousNet) * 100).toFixed(2));
      rows.push({
        year: bucket.year,
        month: bucket.month,
        grossTotal: Number(bucket.gross.toFixed(2)),
        netTotal,
        employeeCount: bucket.employees.size,
        deltaFromPrevious: delta,
        percentGrowth: pct
      });
      previousNet = netTotal;
    }

    return { ok: true, data: rows };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to load payroll cost trend" };
  }
};

export const getPayrollDeliveryMetrics = async (
  ctx: ServiceContext,
  companyId: string,
  range?: PayrollAnalyticsRange
): Promise<ServiceResult<PayrollDeliveryMetricRow[]>> => {
  const runsResult = await loadScopedPayrollRuns(ctx, companyId, range);
  if (!runsResult.ok || !runsResult.data) return { ok: false, error: runsResult.error };

  try {
    const runs = runsResult.data;
    if (runs.length === 0) {
      return { ok: true, data: [] };
    }

    const runIds = runs.map((run) => run.id);

    const { data: dispatchRows, error: dispatchError } = await ctx.supabase
      .from("payroll_payslip_email_dispatches")
      .select("id, payroll_run_id, payroll_entry_id, email_queue_id, created_at")
      .eq("company_id", ctx.companyId)
      .in("payroll_run_id", runIds)
      .order("created_at", { ascending: false });

    if (dispatchError) {
      return { ok: false, error: sanitizeError(dispatchError.message, "Unable to load payroll delivery metrics") };
    }

    const queueIds = Array.from(new Set(((dispatchRows ?? []) as Array<{ email_queue_id: string }>).map((row) => row.email_queue_id)));
    const { data: queueRows, error: queueError } = queueIds.length === 0
      ? { data: [], error: null }
      : await ctx.supabase
          .from("email_queue")
          .select("id, status, updated_at, created_at")
          .eq("company_id", ctx.companyId)
          .is("is_deleted", false)
          .in("id", queueIds);

    if (queueError) {
      return { ok: false, error: sanitizeError(queueError.message, "Unable to load payroll delivery metrics") };
    }

    const queueById = new Map<string, { status: string; updatedAt: string | null }>();
    for (const row of (queueRows ?? []) as Array<{ id: string; status?: string | null; updated_at?: string | null; created_at?: string | null }>) {
      queueById.set(row.id, {
        status: (row.status ?? "pending").toLowerCase(),
        updatedAt: row.updated_at ?? row.created_at ?? null
      });
    }

    type LatestEntryStatus = { status: string; activityAt: string | null };
    const latestByRunEntry = new Map<string, LatestEntryStatus>();
    const totalAttemptsByRun = new Map<string, number>();
    const lastActivityByRun = new Map<string, string | null>();

    for (const dispatch of (dispatchRows ?? []) as Array<{
      payroll_run_id: string;
      payroll_entry_id: string;
      email_queue_id: string;
      created_at?: string | null;
    }>) {
      const queue = queueById.get(dispatch.email_queue_id);
      if (!queue) continue;

      totalAttemptsByRun.set(dispatch.payroll_run_id, (totalAttemptsByRun.get(dispatch.payroll_run_id) ?? 0) + 1);

      const activityAt = queue.updatedAt ?? dispatch.created_at ?? null;
      const prevActivity = lastActivityByRun.get(dispatch.payroll_run_id) ?? null;
      if (!prevActivity || (activityAt && activityAt > prevActivity)) {
        lastActivityByRun.set(dispatch.payroll_run_id, activityAt);
      }

      const entryKey = `${dispatch.payroll_run_id}:${dispatch.payroll_entry_id}`;
      if (!latestByRunEntry.has(entryKey)) {
        latestByRunEntry.set(entryKey, { status: queue.status, activityAt });
      }
    }

    const perRunLatestCounts = new Map<string, { sent: number; failed: number; pending: number }>();
    for (const [entryKey, latest] of latestByRunEntry.entries()) {
      const [runId] = entryKey.split(":");
      if (!runId) continue;
      const counts = perRunLatestCounts.get(runId) ?? { sent: 0, failed: 0, pending: 0 };
      if (latest.status === "sent") counts.sent += 1;
      else if (latest.status === "failed") counts.failed += 1;
      else counts.pending += 1;
      perRunLatestCounts.set(runId, counts);
    }

    const rows: PayrollDeliveryMetricRow[] = runs.map((run) => {
      const latest = perRunLatestCounts.get(run.id) ?? { sent: 0, failed: 0, pending: 0 };
      const denominator = latest.sent + latest.failed + latest.pending;
      return {
        runId: run.id,
        year: run.year,
        month: run.month,
        totalDispatches: totalAttemptsByRun.get(run.id) ?? 0,
        sent: latest.sent,
        failed: latest.failed,
        pending: latest.pending,
        successRate: denominator === 0 ? 0 : Number(((latest.sent / denominator) * 100).toFixed(2)),
        lastActivityAt: lastActivityByRun.get(run.id) ?? null
      };
    });

    return { ok: true, data: rows };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to load payroll delivery metrics" };
  }
};

export const getPayrollCloseoutLatency = async (
  ctx: ServiceContext,
  companyId: string,
  range?: PayrollAnalyticsRange
): Promise<ServiceResult<PayrollCloseoutLatencyResponse>> => {
  const runsResult = await loadScopedPayrollRuns(ctx, companyId, range);
  if (!runsResult.ok || !runsResult.data) return { ok: false, error: runsResult.error };

  try {
    const runs = runsResult.data;
    if (runs.length === 0) {
      return {
        ok: true,
        data: {
          rows: [],
          summary: {
            avgFinalizeToPaid: null,
            avgPaidToArchived: null,
            p50FinalizeToPaid: null,
            p95FinalizeToPaid: null
          }
        }
      };
    }

    const runIds = runs.map((run) => run.id);
    const { data: auditRows, error: auditError } = await ctx.supabase
      .from("approval_audit_log")
      .select("entity_id, action, created_at")
      .eq("company_id", ctx.companyId)
      .eq("entity_type", "payroll_run")
      .in("entity_id", runIds)
      .in("action", ["mark_paid", "archive"])
      .order("created_at", { ascending: true });

    if (auditError) {
      return { ok: false, error: sanitizeError(auditError.message, "Unable to load payroll closeout latency") };
    }

    const paidByRun = new Map<string, string>();
    const archivedByRun = new Map<string, string>();
    for (const row of (auditRows ?? []) as Array<{ entity_id: string; action: string; created_at: string }>) {
      if (row.action === "mark_paid" && !paidByRun.has(row.entity_id)) {
        paidByRun.set(row.entity_id, row.created_at);
      }
      if (row.action === "archive" && !archivedByRun.has(row.entity_id)) {
        archivedByRun.set(row.entity_id, row.created_at);
      }
    }

    const rows: PayrollCloseoutLatencyRow[] = runs.map((run) => {
      const paidAt = paidByRun.get(run.id) ?? null;
      const archivedAt = archivedByRun.get(run.id) ?? null;
      return {
        runId: run.id,
        year: run.year,
        month: run.month,
        finalizeToPaidHours: hoursDiff(run.locked_at ?? null, paidAt),
        paidToArchivedHours: hoursDiff(paidAt, archivedAt)
      };
    });

    const finalizeToPaidValues = rows.map((row) => row.finalizeToPaidHours).filter((v): v is number => v !== null);
    const paidToArchivedValues = rows.map((row) => row.paidToArchivedHours).filter((v): v is number => v !== null);

    return {
      ok: true,
      data: {
        rows,
        summary: {
          avgFinalizeToPaid: average(finalizeToPaidValues),
          avgPaidToArchived: average(paidToArchivedValues),
          p50FinalizeToPaid: percentile(finalizeToPaidValues, 0.5),
          p95FinalizeToPaid: percentile(finalizeToPaidValues, 0.95)
        }
      }
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to load payroll closeout latency" };
  }
};

export const getPayrollGrowthMetrics = async (
  ctx: ServiceContext,
  companyId: string,
  range?: PayrollAnalyticsRange
): Promise<ServiceResult<PayrollGrowthMetrics>> => {
  const trendResult = await getPayrollCostTrend(ctx, companyId, range);
  if (!trendResult.ok || !trendResult.data) {
    return { ok: false, error: trendResult.error };
  }

  try {
    const rows = trendResult.data;
    const current = rows.at(-1) ?? null;
    const previous = rows.length >= 2 ? rows[rows.length - 2] : null;

    const currentMonthNet = current?.netTotal ?? 0;
    const previousMonthNet = previous?.netTotal ?? 0;
    const absoluteDelta = Number((currentMonthNet - previousMonthNet).toFixed(2));
    const percentGrowth = previousMonthNet === 0 ? null : Number((((currentMonthNet - previousMonthNet) / previousMonthNet) * 100).toFixed(2));

    return {
      ok: true,
      data: {
        currentMonthNet,
        previousMonthNet,
        absoluteDelta,
        percentGrowth
      }
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to load payroll growth metrics" };
  }
};
