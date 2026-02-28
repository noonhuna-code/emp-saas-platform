import type { ServiceContext, ServiceResult } from "../lib/types";
import { requireCompany } from "../lib/auth-wrapper";
import { hasCapability, requirePayrollCapability } from "../lib/payroll-capabilities";
import { getPlanLimit, requirePlanFeature } from "../lib/entitlements";

const sanitizeError = (message: string, fallback: string): string => {
  if (!message) return fallback;
  if (message === "UNAUTHENTICATED" || message.includes("JWT")) return "Authentication required";
  if (message === "TENANT_RESOLUTION_FAILED" || message === "TENANT_MISMATCH") return "Permission denied";
  if (message === "INVALID_INPUT") return "Invalid payroll period";
  if (message === "PAYROLL_RUN_FINALIZE_FAILED") return "Payroll run finalization failed";
  if (message === "PAYROLL_RUN_NOT_FOUND") return "Payroll run not found";
  if (message === "PAYROLL_RUN_NOT_FINALIZED") return "Payroll run must be finalized before marking as paid";
  if (message === "PAYROLL_RUN_NOT_PAID") return "Payroll run must be paid before archiving";
  if (message === "PAYROLL_LOCKED_IMMUTABLE") return "Payroll is locked and cannot be modified";
  if (message === "PAYROLL_RUN_NOT_READY") return "Payroll run must be locked and finalized before payslip delivery";
  if (message === "PAYSLIP_NOT_FOUND") return "Payslip not found";
  if (message === "PAYSLIP_EMAIL_RECIPIENT_NOT_FOUND") return "Employee user account not found";
  if (message === "PAYSLIP_EMAIL_QUEUE_FAILED") return "Unable to queue payslip email";
  return fallback;
};

const DEFAULT_PAYSLIP_PAGE_SIZE = 20;
const MAX_PAYSLIP_PAGE_SIZE = 100;
const DEFAULT_DELIVERY_PAGE_SIZE = 25;
const MAX_DELIVERY_PAGE_SIZE = 100;

const getCurrentMonthWindowUtc = (): { from: string; to: string } => {
  const now = new Date();
  const fromDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
  const toDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
  return { from: fromDate.toISOString(), to: toDate.toISOString() };
};

const requirePayrollRunsEntitlement = async (ctx: ServiceContext): Promise<void> => {
  await requirePlanFeature(ctx, "feature.payroll_runs");
};

const requirePayslipHistoryEntitlement = async (ctx: ServiceContext): Promise<void> => {
  await requirePlanFeature(ctx, "feature.payslip_history_detail");
};

const requirePayslipDispatchEntitlement = async (ctx: ServiceContext): Promise<void> => {
  await requirePlanFeature(ctx, "feature.payslip_email_dispatch");
};

const getMonthlyDispatchUsage = async (ctx: ServiceContext): Promise<number> => {
  const window = getCurrentMonthWindowUtc();
  const { count, error } = await ctx.supabase
    .from("payroll_payslip_email_dispatches")
    .select("id", { count: "exact", head: true })
    .eq("company_id", ctx.companyId)
    .gte("created_at", window.from)
    .lt("created_at", window.to);
  if (error) {
    throw new Error("Unable to validate payslip dispatch limit");
  }
  return count ?? 0;
};

const ensurePayslipDispatchLimit = async (
  ctx: ServiceContext,
  requestedCount = 1
): Promise<{ limit: number | null; used: number; remaining: number | null }> => {
  const limit = await getPlanLimit(ctx, "limit.payslip_emails_per_month_max");
  const used = await getMonthlyDispatchUsage(ctx);
  if (limit === null) {
    return { limit, used, remaining: null };
  }
  const remaining = Math.max(0, limit - used);
  if (requestedCount > remaining) {
    throw new Error("Payslip email monthly limit reached");
  }
  return { limit, used, remaining };
};

const ensurePayrollRunLimit = async (ctx: ServiceContext): Promise<void> => {
  const limit = await getPlanLimit(ctx, "limit.payroll_runs_per_month_max");
  if (limit === null) return;
  const window = getCurrentMonthWindowUtc();
  const { count, error } = await ctx.supabase
    .from("payroll_runs")
    .select("id", { count: "exact", head: true })
    .eq("company_id", ctx.companyId)
    .is("is_deleted", false)
    .gte("created_at", window.from)
    .lt("created_at", window.to);

  if (error) {
    throw new Error("Unable to validate payroll run monthly limit");
  }
  if ((count ?? 0) >= limit) {
    throw new Error("Payroll run monthly limit reached");
  }
};

const resolveCurrentEmployeeId = async (ctx: ServiceContext): Promise<string | null> => {
  const { data: employee } = await ctx.supabase
    .from("employees")
    .select("id")
    .eq("company_id", ctx.companyId)
    .eq("user_profile_id", ctx.userProfileId)
    .is("is_deleted", false)
    .maybeSingle();

  return employee?.id ?? null;
};

const getPayslipViewerScope = async (
  ctx: ServiceContext
): Promise<{ mode: "manage_payroll" } | { mode: "self"; employeeId: string } | null> => {
  if (hasCapability(ctx, "view_all_payslips")) {
    return { mode: "manage_payroll" };
  }

  const employeeId = await resolveCurrentEmployeeId(ctx);
  if (!employeeId) {
    return null;
  }

  return { mode: "self", employeeId };
};

const normalizePayslipPaging = (options?: { page?: number; pageSize?: number }) => {
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.min(MAX_PAYSLIP_PAGE_SIZE, Math.max(1, options?.pageSize ?? DEFAULT_PAYSLIP_PAGE_SIZE));
  return { page, pageSize };
};

const normalizeDeliveryPaging = (options?: { page?: number; pageSize?: number }) => {
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.min(MAX_DELIVERY_PAGE_SIZE, Math.max(1, options?.pageSize ?? DEFAULT_DELIVERY_PAGE_SIZE));
  return { page, pageSize };
};

const toPeriodString = (year: number, month: number): string => `${year}-${String(month).padStart(2, "0")}`;

export type PayrollRunListRow = {
  id: string;
  company_id: string;
  month: number;
  year: number;
  start_date: string;
  end_date: string;
  status: string;
  locked: boolean;
  locked_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type PayrollRunDetailEntryRow = {
  id: string;
  employee_id: string;
  employee_code: string | null;
  employee_name: string | null;
  base_salary: number | null;
  base_salary_snapshot: number | null;
  total_earnings: number | null;
  total_allowances: number | null;
  total_deductions: number | null;
  net_salary: number | null;
  is_processed: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type PayrollRunDetail = {
  run: PayrollRunListRow;
  entries: PayrollRunDetailEntryRow[];
  summary: {
    headcount: number;
    processedCount: number;
    totalEarnings: number;
    totalAllowances: number;
    totalDeductions: number;
    totalNet: number;
  };
};

export type PayslipHistoryRow = {
  entryId: string;
  payrollRunId: string;
  period: string;
  employeeId: string;
  employeeName: string;
  netSalary: number;
  status: string;
  isLocked: boolean;
  processedAt: string;
};

export type PayslipHistoryResponse = {
  rows: PayslipHistoryRow[];
  page: number;
  pageSize: number;
  hasMore: boolean;
  viewerScope: "manage_payroll" | "self";
};

export type PayslipDetail = {
  entryId: string;
  period: string;
  employee: {
    id: string;
    name: string;
    code?: string;
  };
  earnings: {
    label: string;
    amount: number;
  }[];
  deductions: {
    label: string;
    amount: number;
  }[];
  totals: {
    gross: number;
    deductions: number;
    net: number;
  };
  status: string;
  isLocked: boolean;
  processedAt: string;
};

export type PayrollLifecycleState =
  | "DRAFT"
  | "PROCESSING"
  | "CALCULATED"
  | "FINALIZED"
  | "LOCKED"
  | "PAID"
  | "ARCHIVED";

export type PayrollLifecycleMetadata = {
  currentState: PayrollLifecycleState;
  isMutable: boolean;
  isFinanciallyCommitted: boolean;
  isLocked: boolean;
  isVisibleToEmployees: boolean;
};

export type PayrollRunTimeline = {
  runId: string;
  lifecycle: {
    createdAt: string | null;
    calculatedAt?: string | null;
    finalizedAt?: string | null;
    lockedAt?: string | null;
    paidAt?: string | null;
  };
  currentState: PayrollLifecycleState;
  stateMetadata: PayrollLifecycleMetadata;
  actorHistory: Array<{ action: string; performedBy: string | null; timestamp: string }>;
};

export type PayrollRunLifecycleMutation = {
  payrollRunId: string;
  status: "paid" | "archived";
};

export type PayslipEmailDispatchResult = {
  queueId: string;
  entryId: string;
  payrollRunId?: string;
  queueStatus?: "queued" | "existing_pending";
};

export type PayrollRunDeliveryStatusRow = {
  dispatchId: string;
  queueId: string;
  entryId: string;
  employeeId: string;
  employeeName: string;
  employeeCode?: string | null;
  queueStatus: string;
  retryCount: number;
  queuedAt: string;
  updatedAt: string;
  queuedBy: string | null;
};

export type PayrollRunDeliveryStatus = {
  runId: string;
  period: string;
  runStatus: string;
  isLocked: boolean;
  summary: {
    entriesTotal: number;
    entriesWithDispatch: number;
    pendingEntries: number;
    sentEntries: number;
    failedEntries: number;
    totalDispatchAttempts: number;
  };
  rows: PayrollRunDeliveryStatusRow[];
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export type PayrollRunPayslipEmailBulkQueueResult = {
  runId: string;
  queued: number;
  alreadyQueued: number;
  failed: number;
  totalEntries: number;
  processedEntries: number;
  errors: Array<{ entryId: string; message: string }>;
};

type PayrollLifecycleSource = {
  status?: string | null;
  locked?: boolean | null;
};

const resolveLifecycleState = (run: PayrollLifecycleSource): PayrollLifecycleState => {
  const status = (run.status ?? "").toLowerCase();
  const locked = Boolean(run.locked);

  if (status === "paid") return "PAID";
  if (status === "archived") return "ARCHIVED";
  if (locked) return "LOCKED";
  if (status === "finalized") return "FINALIZED";
  if (status === "calculated" || status === "partial") return "CALCULATED";
  if (status === "processing") return "PROCESSING";
  return "DRAFT";
};

export const getPayrollLifecycleMetadata = (run: PayrollLifecycleSource): PayrollLifecycleMetadata => {
  const currentState = resolveLifecycleState(run);

  const lockedStates = new Set<PayrollLifecycleState>(["FINALIZED", "LOCKED", "PAID", "ARCHIVED"]);
  const committedStates = new Set<PayrollLifecycleState>(["FINALIZED", "LOCKED", "PAID", "ARCHIVED"]);
  const visibleStates = new Set<PayrollLifecycleState>(["FINALIZED", "LOCKED", "PAID", "ARCHIVED"]);

  return {
    currentState,
    isMutable: !(currentState === "FINALIZED" || currentState === "LOCKED" || currentState === "PAID" || currentState === "ARCHIVED"),
    isFinanciallyCommitted: committedStates.has(currentState),
    isLocked: lockedStates.has(currentState),
    isVisibleToEmployees: visibleStates.has(currentState)
  };
};

export const listPayrollRuns = async (
  ctx: ServiceContext,
  companyId: string,
  options: { status?: string; limit?: number } = {}
): Promise<ServiceResult<{ rows: PayrollRunListRow[] }>> => {
  try {
    await requirePayrollRunsEntitlement(ctx);
    requirePayrollCapability(ctx, "view_payroll_runs");
    requireCompany(companyId, ctx);

    const normalizedLimit = Math.min(Math.max(options.limit ?? 24, 1), 100);

    let query = ctx.supabase
      .from("payroll_runs")
      .select("id, company_id, month, year, start_date, end_date, status, locked, locked_at, created_at, updated_at")
      .eq("company_id", companyId)
      .is("is_deleted", false)
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(normalizedLimit);

    if (options.status) {
      query = query.eq("status", options.status);
    }

    const { data, error } = await query;

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Unable to load payroll runs") };
    }

    return { ok: true, data: { rows: (data ?? []) as PayrollRunListRow[] } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unable to load payroll runs" };
  }
};

export const getPayslipHistory = async (
  ctx: ServiceContext,
  options: { page?: number; pageSize?: number } = {}
): Promise<ServiceResult<PayslipHistoryResponse>> => {
  try {
    await requirePayslipHistoryEntitlement(ctx);
    const viewerScope = await getPayslipViewerScope(ctx);
    if (!viewerScope) {
      return { ok: false, error: "Permission denied" };
    }

    const { page, pageSize } = normalizePayslipPaging(options);
    const from = (page - 1) * pageSize;
    const to = from + pageSize;

    let entryQuery = ctx.supabase
      .from("payroll_entries")
      .select("id, company_id, payroll_run_id, employee_id, net_salary, is_processed, created_at, updated_at")
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (viewerScope.mode === "self") {
      entryQuery = entryQuery.eq("employee_id", viewerScope.employeeId);
    }

    const { data: entryRows, error: entryError } = await entryQuery;
    if (entryError) {
      return { ok: false, error: sanitizeError(entryError.message, "Unable to load payslips") };
    }

    type PayrollEntryHistoryRaw = {
      id: string;
      company_id: string;
      payroll_run_id: string;
      employee_id: string;
      net_salary?: number | null;
      is_processed?: boolean | null;
      created_at?: string | null;
      updated_at?: string | null;
    };

    const fetchedEntries = (entryRows ?? []) as PayrollEntryHistoryRaw[];
    const hasMore = fetchedEntries.length > pageSize;
    const pagedEntries = hasMore ? fetchedEntries.slice(0, pageSize) : fetchedEntries;

    if (pagedEntries.length === 0) {
      return {
        ok: true,
        data: {
          rows: [],
          page,
          pageSize,
          hasMore: false,
          viewerScope: viewerScope.mode
        }
      };
    }

    const runIds = Array.from(new Set(pagedEntries.map((row) => row.payroll_run_id).filter(Boolean)));
    const employeeIds = Array.from(new Set(pagedEntries.map((row) => row.employee_id).filter(Boolean)));

    const [runsResult, employeesResult] = await Promise.all([
      ctx.supabase
        .from("payroll_runs")
        .select("id, company_id, year, month, status, locked, locked_at, created_at, updated_at")
        .eq("company_id", ctx.companyId)
        .is("is_deleted", false)
        .in("id", runIds),
      ctx.supabase
        .from("employees")
        .select("id, company_id, employee_code, user_profiles(full_name)")
        .eq("company_id", ctx.companyId)
        .is("is_deleted", false)
        .in("id", employeeIds)
    ]);

    if (runsResult.error) {
      return { ok: false, error: sanitizeError(runsResult.error.message, "Unable to load payslips") };
    }
    if (employeesResult.error) {
      return { ok: false, error: sanitizeError(employeesResult.error.message, "Unable to load payslips") };
    }

    type PayrollRunLite = {
      id: string;
      company_id: string;
      year: number;
      month: number;
      status: string;
      locked: boolean;
      locked_at?: string | null;
      created_at?: string | null;
      updated_at?: string | null;
    };

    type EmployeeLite = {
      id: string;
      company_id: string;
      employee_code?: string | null;
      user_profiles?: { full_name?: string | null } | { full_name?: string | null }[] | null;
    };

    const runById = new Map<string, PayrollRunLite>(
      ((runsResult.data ?? []) as PayrollRunLite[]).map((row) => [row.id, row])
    );

    const employeeById = new Map<string, { employee_code: string | null; full_name: string | null }>();
    for (const row of (employeesResult.data ?? []) as EmployeeLite[]) {
      const profile = Array.isArray(row.user_profiles) ? row.user_profiles[0] ?? null : row.user_profiles ?? null;
      employeeById.set(row.id, {
        employee_code: row.employee_code ?? null,
        full_name: profile?.full_name ?? null
      });
    }

    const rows: PayslipHistoryRow[] = pagedEntries
      .map((entry) => {
        const run = runById.get(entry.payroll_run_id);
        if (!run) {
          return null;
        }
        const employee = employeeById.get(entry.employee_id);
        const processedAt =
          run.locked_at ??
          entry.updated_at ??
          entry.created_at ??
          run.updated_at ??
          run.created_at ??
          "";

        return {
          entryId: entry.id,
          payrollRunId: entry.payroll_run_id,
          period: toPeriodString(run.year, run.month),
          employeeId: entry.employee_id,
          employeeName: employee?.full_name ?? "Employee",
          netSalary: Number(entry.net_salary ?? 0),
          status: run.status,
          isLocked: Boolean(run.locked),
          processedAt
        };
      })
      .filter((row): row is PayslipHistoryRow => Boolean(row));

    return {
      ok: true,
      data: {
        rows,
        page,
        pageSize,
        hasMore,
        viewerScope: viewerScope.mode
      }
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unable to load payslips" };
  }
};

export const getPayslipDetail = async (
  ctx: ServiceContext,
  entryId: string
): Promise<ServiceResult<PayslipDetail>> => {
  try {
    await requirePayslipHistoryEntitlement(ctx);
    const viewerScope = await getPayslipViewerScope(ctx);
    if (!viewerScope) {
      return { ok: false, error: "Permission denied" };
    }

    let entryQuery = ctx.supabase
      .from("payroll_entries")
      .select(
        "id, company_id, payroll_run_id, employee_id, base_salary, base_salary_snapshot, total_earnings, total_allowances, total_deductions, net_salary, is_processed, created_at, updated_at"
      )
      .eq("id", entryId)
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false);

    if (viewerScope.mode === "self") {
      entryQuery = entryQuery.eq("employee_id", viewerScope.employeeId);
    }

    const { data: entry, error: entryError } = await entryQuery.maybeSingle();
    if (entryError) {
      return { ok: false, error: sanitizeError(entryError.message, "Unable to load payslip") };
    }
    if (!entry) {
      return { ok: false, error: "Payslip not found" };
    }

    const [{ data: run, error: runError }, { data: employee, error: employeeError }] = await Promise.all([
      ctx.supabase
        .from("payroll_runs")
        .select("id, company_id, year, month, status, locked, locked_at, created_at, updated_at")
        .eq("id", entry.payroll_run_id)
        .eq("company_id", ctx.companyId)
        .is("is_deleted", false)
        .maybeSingle(),
      ctx.supabase
        .from("employees")
        .select("id, company_id, employee_code, user_profiles(full_name)")
        .eq("id", entry.employee_id)
        .eq("company_id", ctx.companyId)
        .is("is_deleted", false)
        .maybeSingle()
    ]);

    if (runError) {
      return { ok: false, error: sanitizeError(runError.message, "Unable to load payslip") };
    }
    if (employeeError) {
      return { ok: false, error: sanitizeError(employeeError.message, "Unable to load payslip") };
    }
    if (!run || !employee) {
      return { ok: false, error: "Payslip not found" };
    }

    const employeeProfile = Array.isArray(employee.user_profiles)
      ? employee.user_profiles[0] ?? null
      : employee.user_profiles ?? null;

    const baseSnapshot = Number(entry.base_salary_snapshot ?? entry.base_salary ?? 0);
    const totalAllowances = Number(entry.total_allowances ?? 0);
    const totalEarnings = Number(entry.total_earnings ?? 0);
    const totalDeductions = Number(entry.total_deductions ?? 0);
    const totalNet = Number(entry.net_salary ?? 0);

    const knownEarnings = baseSnapshot + totalAllowances;
    const otherEarnings = Math.max(0, Number((totalEarnings - knownEarnings).toFixed(2)));

    const earnings: Array<{ label: string; amount: number }> = [
      { label: "Base Salary (Snapshot)", amount: baseSnapshot },
      { label: "Allowances", amount: totalAllowances }
    ];
    if (otherEarnings > 0) {
      earnings.push({ label: "Other Earnings", amount: otherEarnings });
    }

    const deductions: Array<{ label: string; amount: number }> = [
      { label: "Total Deductions", amount: totalDeductions }
    ];

    const processedAt =
      run.locked_at ??
      entry.updated_at ??
      entry.created_at ??
      run.updated_at ??
      run.created_at ??
      "";

    return {
      ok: true,
      data: {
        entryId: entry.id,
        period: toPeriodString(run.year, run.month),
        employee: {
          id: employee.id,
          name: employeeProfile?.full_name ?? "Employee",
          code: employee.employee_code ?? undefined
        },
        earnings,
        deductions,
        totals: {
          gross: totalEarnings,
          deductions: totalDeductions,
          net: totalNet
        },
        status: run.status,
        isLocked: Boolean(run.locked),
        processedAt
      }
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unable to load payslip" };
  }
};

export const getPayrollRunDetail = async (
  ctx: ServiceContext,
  companyId: string,
  runId: string
): Promise<ServiceResult<PayrollRunDetail>> => {
  try {
    await requirePayrollRunsEntitlement(ctx);
    requirePayrollCapability(ctx, "view_payroll_entries");
    requireCompany(companyId, ctx);

    const { data: run, error: runError } = await ctx.supabase
      .from("payroll_runs")
      .select("id, company_id, month, year, start_date, end_date, status, locked, locked_at, created_at, updated_at")
      .eq("id", runId)
      .eq("company_id", companyId)
      .is("is_deleted", false)
      .maybeSingle();

    if (runError) {
      return { ok: false, error: sanitizeError(runError.message, "Unable to load payroll run") };
    }

    if (!run) {
      return { ok: false, error: "Payroll run not found" };
    }

    const { data: entryRows, error: entryError } = await ctx.supabase
      .from("payroll_entries")
      .select(
        "id, employee_id, base_salary, base_salary_snapshot, total_earnings, total_allowances, total_deductions, net_salary, is_processed, created_at, updated_at, employees!payroll_entries_employee_id_fkey(employee_code, user_profiles(full_name))"
      )
      .eq("company_id", companyId)
      .eq("payroll_run_id", runId)
      .is("is_deleted", false)
      .order("created_at", { ascending: true });

    if (entryError) {
      return { ok: false, error: sanitizeError(entryError.message, "Unable to load payroll entries") };
    }

    type RawEntry = {
      id: string;
      employee_id: string;
      base_salary?: number | null;
      base_salary_snapshot?: number | null;
      total_earnings?: number | null;
      total_allowances?: number | null;
      total_deductions?: number | null;
      net_salary?: number | null;
      is_processed?: boolean | null;
      created_at?: string | null;
      updated_at?: string | null;
      employees?: {
        employee_code?: string | null;
        user_profiles?: { full_name?: string | null } | { full_name?: string | null }[] | null;
      } | {
        employee_code?: string | null;
        user_profiles?: { full_name?: string | null } | { full_name?: string | null }[] | null;
      }[] | null;
    };

    const entries: PayrollRunDetailEntryRow[] = ((entryRows ?? []) as RawEntry[]).map((row) => {
      const employee = Array.isArray(row.employees) ? row.employees[0] ?? null : row.employees ?? null;
      const nestedProfile = employee?.user_profiles;
      const profile = Array.isArray(nestedProfile) ? nestedProfile[0] ?? null : nestedProfile ?? null;

      return {
        id: row.id,
        employee_id: row.employee_id,
        employee_code: employee?.employee_code ?? null,
        employee_name: profile?.full_name ?? null,
        base_salary: row.base_salary ?? null,
        base_salary_snapshot: row.base_salary_snapshot ?? null,
        total_earnings: row.total_earnings ?? null,
        total_allowances: row.total_allowances ?? null,
        total_deductions: row.total_deductions ?? null,
        net_salary: row.net_salary ?? null,
        is_processed: Boolean(row.is_processed),
        created_at: row.created_at ?? null,
        updated_at: row.updated_at ?? null
      };
    });

    const summary = entries.reduce(
      (acc, row) => {
        acc.headcount += 1;
        if (row.is_processed) acc.processedCount += 1;
        acc.totalEarnings += Number(row.total_earnings ?? 0);
        acc.totalAllowances += Number(row.total_allowances ?? 0);
        acc.totalDeductions += Number(row.total_deductions ?? 0);
        acc.totalNet += Number(row.net_salary ?? 0);
        return acc;
      },
      {
        headcount: 0,
        processedCount: 0,
        totalEarnings: 0,
        totalAllowances: 0,
        totalDeductions: 0,
        totalNet: 0
      }
    );

    return {
      ok: true,
      data: {
        run: run as PayrollRunListRow,
        entries,
        summary
      }
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unable to load payroll run detail" };
  }
};

export const getPayrollRunTimeline = async (
  ctx: ServiceContext,
  runId: string
): Promise<ServiceResult<PayrollRunTimeline>> => {
  try {
    await requirePayrollRunsEntitlement(ctx);
    if (!hasCapability(ctx, "view_payroll_audit") && !ctx.permissions.includes("manage_payroll")) {
      return { ok: false, error: "Permission denied" };
    }

    const { data: run, error: runError } = await ctx.supabase
      .from("payroll_runs")
      .select("id, company_id, status, locked, created_at, updated_at, locked_at, created_by, updated_by, locked_by")
      .eq("id", runId)
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false)
      .maybeSingle();

    if (runError) {
      return { ok: false, error: sanitizeError(runError.message, "Unable to load payroll timeline") };
    }

    if (!run) {
      return { ok: false, error: "Payroll run not found" };
    }

    type TimelineRunRow = {
      id: string;
      company_id: string;
      status?: string | null;
      locked?: boolean | null;
      created_at?: string | null;
      updated_at?: string | null;
      locked_at?: string | null;
      created_by?: string | null;
      updated_by?: string | null;
      locked_by?: string | null;
    };

    const runRow = run as TimelineRunRow;
    const metadata = getPayrollLifecycleMetadata(runRow);

    const actorIds = Array.from(
      new Set([runRow.created_by, runRow.updated_by, runRow.locked_by].filter((value): value is string => Boolean(value)))
    );

    const actorNameById = new Map<string, string>();
    if (actorIds.length > 0) {
      const { data: actors, error: actorError } = await ctx.supabase
        .from("user_profiles")
        .select("id, full_name")
        .eq("company_id", ctx.companyId)
        .is("is_deleted", false)
        .in("id", actorIds);

      if (actorError) {
        return { ok: false, error: sanitizeError(actorError.message, "Unable to load payroll timeline") };
      }

      for (const actor of (actors ?? []) as Array<{ id: string; full_name?: string | null }>) {
        actorNameById.set(actor.id, actor.full_name ?? "Unknown");
      }
    }

    const status = (runRow.status ?? "").toLowerCase();
    const lifecycle = {
      createdAt: runRow.created_at ?? null,
      calculatedAt:
        status === "calculated" || status === "partial" || status === "finalized" || status === "paid"
          ? (runRow.updated_at ?? null)
          : null,
      finalizedAt:
        status === "finalized" || status === "paid" || Boolean(runRow.locked)
          ? (runRow.locked_at ?? runRow.updated_at ?? null)
          : null,
      lockedAt: runRow.locked_at ?? null,
      paidAt: status === "paid" ? (runRow.updated_at ?? runRow.locked_at ?? null) : null
    };

    const actorHistory: Array<{ action: string; performedBy: string | null; timestamp: string }> = [];

    if (runRow.created_at) {
      actorHistory.push({
        action: "created",
        performedBy: runRow.created_by ? (actorNameById.get(runRow.created_by) ?? null) : null,
        timestamp: runRow.created_at
      });
    }

    if (lifecycle.calculatedAt && lifecycle.calculatedAt !== runRow.created_at) {
      actorHistory.push({
        action: "calculated",
        performedBy: runRow.updated_by ? (actorNameById.get(runRow.updated_by) ?? null) : null,
        timestamp: lifecycle.calculatedAt
      });
    }

    if (lifecycle.finalizedAt) {
      actorHistory.push({
        action: "finalized",
        performedBy: runRow.locked_by
          ? (actorNameById.get(runRow.locked_by) ?? null)
          : runRow.updated_by
            ? (actorNameById.get(runRow.updated_by) ?? null)
            : null,
        timestamp: lifecycle.finalizedAt
      });
    }

    if (lifecycle.lockedAt) {
      actorHistory.push({
        action: "locked",
        performedBy: runRow.locked_by ? (actorNameById.get(runRow.locked_by) ?? null) : null,
        timestamp: lifecycle.lockedAt
      });
    }

    if (lifecycle.paidAt) {
      actorHistory.push({
        action: "paid",
        performedBy: runRow.updated_by ? (actorNameById.get(runRow.updated_by) ?? null) : null,
        timestamp: lifecycle.paidAt
      });
    }

    if (status === "archived" && runRow.updated_at) {
      actorHistory.push({
        action: "archived",
        performedBy: runRow.updated_by ? (actorNameById.get(runRow.updated_by) ?? null) : null,
        timestamp: runRow.updated_at
      });
    }

    actorHistory.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    return {
      ok: true,
      data: {
        runId: runRow.id,
        lifecycle,
        currentState: metadata.currentState,
        stateMetadata: metadata,
        actorHistory
      }
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unable to load payroll timeline" };
  }
};

export const runPayroll = async (
  ctx: ServiceContext,
  companyId: string,
  month: { year: number; month: number }
): Promise<ServiceResult<{ payrollRunId: string }>> => {
  try {
    await requirePayrollRunsEntitlement(ctx);
    requirePayrollCapability(ctx, "initiate_payroll_run");
    requireCompany(companyId, ctx);
    await ensurePayrollRunLimit(ctx);

    const { data, error } = await ctx.supabase.rpc("run_payroll_atomic", {
      p_year: month.year,
      p_month: month.month,
      p_company_id: companyId
    });

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Payroll run failed") };
    }

    const payrollRunId = (data as { payroll_run_id?: string } | null)?.payroll_run_id;
    if (!payrollRunId) {
      return { ok: false, error: "Payroll run failed" };
    }

    return { ok: true, data: { payrollRunId } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Payroll run error" };
  }
};

export const markPayrollRunPaid = async (
  ctx: ServiceContext,
  companyId: string,
  runId: string
): Promise<ServiceResult<PayrollRunLifecycleMutation>> => {
  try {
    await requirePayrollRunsEntitlement(ctx);
    requirePayrollCapability(ctx, "mark_payroll_paid");
    requireCompany(companyId, ctx);

    const { data, error } = await ctx.supabase.rpc("mark_payroll_run_paid_atomic", {
      p_run_id: runId
    });

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Unable to mark payroll run as paid") };
    }

    const payload = data as { payroll_run_id?: string; status?: string } | null;
    if (!payload?.payroll_run_id || payload.status !== "paid") {
      return { ok: false, error: "Unable to mark payroll run as paid" };
    }

    return {
      ok: true,
      data: {
        payrollRunId: payload.payroll_run_id,
        status: "paid"
      }
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unable to mark payroll run as paid" };
  }
};

export const archivePayrollRun = async (
  ctx: ServiceContext,
  companyId: string,
  runId: string
): Promise<ServiceResult<PayrollRunLifecycleMutation>> => {
  try {
    await requirePayrollRunsEntitlement(ctx);
    requirePayrollCapability(ctx, "archive_payroll_run");
    requireCompany(companyId, ctx);

    const { data, error } = await ctx.supabase.rpc("archive_payroll_run_atomic", {
      p_run_id: runId
    });

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Unable to archive payroll run") };
    }

    const payload = data as { payroll_run_id?: string; status?: string } | null;
    if (!payload?.payroll_run_id || payload.status !== "archived") {
      return { ok: false, error: "Unable to archive payroll run" };
    }

    return {
      ok: true,
      data: {
        payrollRunId: payload.payroll_run_id,
        status: "archived"
      }
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unable to archive payroll run" };
  }
};

export const queuePayslipEmailDispatch = async (
  ctx: ServiceContext,
  entryId: string
): Promise<ServiceResult<PayslipEmailDispatchResult>> => {
  try {
    await requirePayslipDispatchEntitlement(ctx);
    requirePayrollCapability(ctx, "view_all_payslips");
    await ensurePayslipDispatchLimit(ctx, 1);

    // Align with existing email_queue RLS insert policy (manage_employees required).
    if (!ctx.permissions.includes("manage_employees")) {
      return { ok: false, error: "Permission denied" };
    }

    const { data, error } = await ctx.supabase.rpc("enqueue_payslip_email_atomic", {
      p_payroll_entry_id: entryId
    });

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Unable to queue payslip email") };
    }

    const payload = data as {
      queue_id?: string;
      entry_id?: string;
      payroll_run_id?: string;
      status?: string;
    } | null;

    if (!payload?.queue_id || !payload?.entry_id) {
      return { ok: false, error: "Unable to queue payslip email" };
    }

    return {
      ok: true,
      data: {
        queueId: payload.queue_id,
        entryId: payload.entry_id,
        payrollRunId: payload.payroll_run_id,
        queueStatus: payload.status === "existing_pending" ? "existing_pending" : "queued"
      }
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unable to queue payslip email" };
  }
};

export const queuePayrollRunPayslipEmails = async (
  ctx: ServiceContext,
  companyId: string,
  runId: string
): Promise<ServiceResult<PayrollRunPayslipEmailBulkQueueResult>> => {
  try {
    await requirePayslipDispatchEntitlement(ctx);
    requirePayrollCapability(ctx, "view_all_payslips");
    requireCompany(companyId, ctx);

    if (!ctx.permissions.includes("manage_employees")) {
      return { ok: false, error: "Permission denied" };
    }

    const { data: run, error: runError } = await ctx.supabase
      .from("payroll_runs")
      .select("id, company_id, status, locked")
      .eq("id", runId)
      .eq("company_id", companyId)
      .is("is_deleted", false)
      .maybeSingle();

    if (runError) {
      return { ok: false, error: sanitizeError(runError.message, "Unable to queue payslip emails") };
    }
    if (!run) {
      return { ok: false, error: "Payroll run not found" };
    }

    const runStatus = String((run as { status?: string | null }).status ?? "").toLowerCase();
    if (!Boolean((run as { locked?: boolean | null }).locked) || !["finalized", "paid", "archived"].includes(runStatus)) {
      return { ok: false, error: "Payroll run must be locked and finalized before payslip delivery" };
    }

    const { data: entries, error: entriesError } = await ctx.supabase
      .from("payroll_entries")
      .select("id, company_id, is_processed")
      .eq("company_id", companyId)
      .eq("payroll_run_id", runId)
      .is("is_deleted", false)
      .order("created_at", { ascending: true });

    if (entriesError) {
      return { ok: false, error: sanitizeError(entriesError.message, "Unable to queue payslip emails") };
    }

    type BulkEntry = { id: string; is_processed?: boolean | null };
    const entryRows = (entries ?? []) as BulkEntry[];
    const dispatchLimitState = await ensurePayslipDispatchLimit(ctx, 0);
    let remainingDispatches = dispatchLimitState.remaining;

    let queued = 0;
    let alreadyQueued = 0;
    let failed = 0;
    let processedEntries = 0;
    const errors: Array<{ entryId: string; message: string }> = [];

    for (const entry of entryRows) {
      if (Boolean(entry.is_processed)) processedEntries += 1;

      if (remainingDispatches !== null && remainingDispatches <= 0) {
        failed += 1;
        errors.push({
          entryId: entry.id,
          message: "Payslip email monthly limit reached"
        });
        continue;
      }

      const { data, error } = await ctx.supabase.rpc("enqueue_payslip_email_atomic", {
        p_payroll_entry_id: entry.id
      });

      if (error) {
        failed += 1;
        errors.push({
          entryId: entry.id,
          message: sanitizeError(error.message, "Unable to queue payslip email")
        });
        continue;
      }

      const payload = data as { status?: string } | null;
      if (payload?.status === "existing_pending") {
        alreadyQueued += 1;
      } else {
        queued += 1;
        if (remainingDispatches !== null) {
          remainingDispatches = Math.max(0, remainingDispatches - 1);
        }
      }
    }

    return {
      ok: true,
      data: {
        runId,
        queued,
        alreadyQueued,
        failed,
        totalEntries: entryRows.length,
        processedEntries,
        errors: errors.slice(0, 20)
      }
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unable to queue payslip emails" };
  }
};

export const getPayrollRunDeliveryStatus = async (
  ctx: ServiceContext,
  companyId: string,
  runId: string,
  options: { page?: number; pageSize?: number } = {}
): Promise<ServiceResult<PayrollRunDeliveryStatus>> => {
  try {
    await requirePayslipDispatchEntitlement(ctx);
    if (!hasCapability(ctx, "view_payroll_entries") && !hasCapability(ctx, "view_payroll_audit")) {
      return { ok: false, error: "Permission denied" };
    }
    requireCompany(companyId, ctx);

    const { page, pageSize } = normalizeDeliveryPaging(options);

    const { data: run, error: runError } = await ctx.supabase
      .from("payroll_runs")
      .select("id, company_id, year, month, status, locked")
      .eq("id", runId)
      .eq("company_id", companyId)
      .is("is_deleted", false)
      .maybeSingle();

    if (runError) {
      return { ok: false, error: sanitizeError(runError.message, "Unable to load payroll delivery status") };
    }
    if (!run) {
      return { ok: false, error: "Payroll run not found" };
    }

    const { data: entries, error: entriesError } = await ctx.supabase
      .from("payroll_entries")
      .select("id, company_id, employee_id")
      .eq("company_id", companyId)
      .eq("payroll_run_id", runId)
      .is("is_deleted", false);

    if (entriesError) {
      return { ok: false, error: sanitizeError(entriesError.message, "Unable to load payroll delivery status") };
    }

    type EntryRow = { id: string; employee_id: string };
    const entryRows = (entries ?? []) as EntryRow[];
    const employeeIds = Array.from(new Set(entryRows.map((row) => row.employee_id)));

    const [employeesResult, dispatchesResult] = await Promise.all([
      employeeIds.length > 0
        ? ctx.supabase
            .from("employees")
            .select("id, company_id, employee_code, user_profiles(full_name)")
            .eq("company_id", companyId)
            .is("is_deleted", false)
            .in("id", employeeIds)
        : Promise.resolve({ data: [], error: null }),
      ctx.supabase
        .from("payroll_payslip_email_dispatches")
        .select("id, company_id, payroll_run_id, payroll_entry_id, email_queue_id, queued_by_profile_id, created_at")
        .eq("company_id", companyId)
        .eq("payroll_run_id", runId)
        .order("created_at", { ascending: false })
    ]);

    if (employeesResult.error) {
      return { ok: false, error: sanitizeError(employeesResult.error.message, "Unable to load payroll delivery status") };
    }
    if (dispatchesResult.error) {
      return { ok: false, error: sanitizeError(dispatchesResult.error.message, "Unable to load payroll delivery status") };
    }

    type DispatchRow = {
      id: string;
      payroll_entry_id: string;
      email_queue_id: string;
      queued_by_profile_id: string;
      created_at: string;
    };

    const dispatchRows = (dispatchesResult.data ?? []) as DispatchRow[];
    const queueIds = Array.from(new Set(dispatchRows.map((row) => row.email_queue_id)));
    const actorIds = Array.from(new Set(dispatchRows.map((row) => row.queued_by_profile_id).filter(Boolean)));

    const [queueResult, actorResult] = await Promise.all([
      queueIds.length > 0
        ? ctx.supabase
            .from("email_queue")
            .select("id, company_id, status, retry_count, created_at, updated_at")
            .eq("company_id", companyId)
            .is("is_deleted", false)
            .in("id", queueIds)
        : Promise.resolve({ data: [], error: null }),
      actorIds.length > 0
        ? ctx.supabase
            .from("user_profiles")
            .select("id, full_name")
            .eq("company_id", companyId)
            .is("is_deleted", false)
            .in("id", actorIds)
        : Promise.resolve({ data: [], error: null })
    ]);

    if (queueResult.error) {
      return { ok: false, error: sanitizeError(queueResult.error.message, "Unable to load payroll delivery status") };
    }
    if (actorResult.error) {
      return { ok: false, error: sanitizeError(actorResult.error.message, "Unable to load payroll delivery status") };
    }

    type EmployeeRow = {
      id: string;
      employee_code?: string | null;
      user_profiles?: { full_name?: string | null } | Array<{ full_name?: string | null }> | null;
    };

    const employeeById = new Map<string, { code: string | null; name: string }>();
    for (const employee of (employeesResult.data ?? []) as EmployeeRow[]) {
      const raw = employee.user_profiles;
      const profile = Array.isArray(raw) ? raw[0] ?? null : raw ?? null;
      employeeById.set(employee.id, {
        code: employee.employee_code ?? null,
        name: profile?.full_name ?? "Employee"
      });
    }

    const queueById = new Map<string, { status: string; retryCount: number; updatedAt: string }>();
    for (const row of (queueResult.data ?? []) as Array<{
      id: string;
      status?: string | null;
      retry_count?: number | null;
      updated_at?: string | null;
      created_at?: string | null;
    }>) {
      queueById.set(row.id, {
        status: row.status ?? "unknown",
        retryCount: Number(row.retry_count ?? 0),
        updatedAt: row.updated_at ?? row.created_at ?? ""
      });
    }

    const actorById = new Map<string, string>();
    for (const row of (actorResult.data ?? []) as Array<{ id: string; full_name?: string | null }>) {
      actorById.set(row.id, row.full_name ?? "Unknown");
    }

    const entryToEmployeeId = new Map(entryRows.map((row) => [row.id, row.employee_id]));

    const allRows = dispatchRows.reduce<PayrollRunDeliveryStatusRow[]>((acc, dispatch) => {
      const queue = queueById.get(dispatch.email_queue_id);
      if (!queue) return acc;

      const employeeId = entryToEmployeeId.get(dispatch.payroll_entry_id) ?? "";
      const employeeMeta = employeeById.get(employeeId);

      acc.push({
        dispatchId: dispatch.id,
        queueId: dispatch.email_queue_id,
        entryId: dispatch.payroll_entry_id,
        employeeId,
        employeeName: employeeMeta?.name ?? "Employee",
        employeeCode: employeeMeta?.code ?? null,
        queueStatus: queue.status,
        retryCount: queue.retryCount,
        queuedAt: dispatch.created_at,
        updatedAt: queue.updatedAt,
        queuedBy: actorById.get(dispatch.queued_by_profile_id) ?? null
      });

      return acc;
    }, []);

    const latestByEntry = new Map<string, PayrollRunDeliveryStatusRow>();
    for (const row of allRows) {
      if (!latestByEntry.has(row.entryId)) {
        latestByEntry.set(row.entryId, row);
      }
    }

    let pendingEntries = 0;
    let sentEntries = 0;
    let failedEntries = 0;
    for (const row of latestByEntry.values()) {
      const key = row.queueStatus.toLowerCase();
      if (key === "sent") sentEntries += 1;
      else if (key === "failed") failedEntries += 1;
      else pendingEntries += 1;
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize;

    return {
      ok: true,
      data: {
        runId,
        period: toPeriodString((run as { year: number }).year, (run as { month: number }).month),
        runStatus: String((run as { status?: string | null }).status ?? "unknown"),
        isLocked: Boolean((run as { locked?: boolean | null }).locked),
        summary: {
          entriesTotal: entryRows.length,
          entriesWithDispatch: latestByEntry.size,
          pendingEntries,
          sentEntries,
          failedEntries,
          totalDispatchAttempts: allRows.length
        },
        rows: allRows.slice(from, to),
        page,
        pageSize,
        hasMore: allRows.length > to
      }
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unable to load payroll delivery status" };
  }
};
