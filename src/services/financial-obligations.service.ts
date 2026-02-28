import type { ServiceContext, ServiceResult } from "../lib/types";
import {
  hasFinancialObligationCapability,
  requireFinancialObligationCapability
} from "../lib/financial-obligation-capabilities";
import { requirePlanFeature } from "../lib/entitlements";

export type FinancialObligationType = "advance" | "loan";

export type FinancialObligationRequestInput = {
  employeeId?: string;
  amount: number;
  termMonths?: number | null;
  currencyCode: string;
  reason?: string;
  termsSnapshot?: Record<string, unknown> | null;
};

export type FinancialObligationRequestRow = {
  id: string;
  companyId: string;
  employeeId: string;
  obligationType: FinancialObligationType;
  status: string;
  requestedAmount: number;
  requestedTermMonths: number | null;
  currencyCode: string;
  reason: string | null;
  rejectionReason: string | null;
  reviewedByProfileId: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  employeeName?: string | null;
};

export type FinancialObligationRequestFilters = {
  status?: string[];
  obligationType?: FinancialObligationType;
  employeeId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
};

export type SubmitFinancialObligationRequestResult = {
  requestId: string;
  status: string;
};

export type ApproveFinancialObligationRequestResult = {
  requestId: string;
  requestStatus: string;
  obligationId: string;
  obligationStatus: string;
  scheduleCount: number;
  outstandingBalance: number;
};

export type RejectFinancialObligationRequestResult = {
  requestId: string;
  status: string;
};

export type FinancialObligationInstallmentRow = {
  id: string;
  year: number;
  month: number;
  scheduledAmount: number;
  appliedAmount: number;
  remainingAmount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type FinancialObligationLedgerRow = {
  id: string;
  eventType: string;
  amount: number;
  balanceBefore: number | null;
  balanceAfter: number | null;
  referenceType: string | null;
  referenceId: string | null;
  requestId: string | null;
  obligationId: string | null;
  actorProfileId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type FinancialObligationStatusHistoryRow = {
  id: string;
  entityScope: "request" | "obligation";
  oldStatus: string | null;
  newStatus: string;
  reason: string | null;
  requestId: string | null;
  obligationId: string | null;
  actorProfileId: string;
  createdAt: string;
};

export type FinancialObligationDetail = {
  obligation: {
    id: string;
    companyId: string;
    employeeId: string;
    employeeName: string | null;
    sourceRequestId: string | null;
    obligationType: FinancialObligationType;
    obligationStatus: string;
    currencyCode: string;
    principalRequested: number | null;
    principalApproved: number;
    outstandingBalance: number;
    termMonthsRequested: number | null;
    termMonthsApproved: number | null;
    createdAt: string;
    updatedAt: string;
  };
  sourceRequest: FinancialObligationRequestRow | null;
  installments: FinancialObligationInstallmentRow[];
  ledger: {
    rows: FinancialObligationLedgerRow[];
    limit: number;
    offset: number;
  };
  statusHistory: FinancialObligationStatusHistoryRow[];
};

const sanitizeFinanceError = (message: string, fallback: string): string => {
  if (!message) return fallback;
  const lower = message.toLowerCase();
  if (message === "UNAUTHENTICATED" || lower.includes("jwt")) return "Authentication required";
  if (message === "TENANT_RESOLUTION_FAILED") return "Permission denied";
  if (message === "EMPLOYEE_NOT_FOUND") return "Employee not found";
  if (message === "FINANCIAL_OBLIGATION_REQUEST_NOT_FOUND") return "Financial obligation request not found";
  if (message === "FINANCIAL_OBLIGATION_NOT_FOUND") return "Financial obligation not found";
  if (message === "APPROVAL_NOT_PENDING") return "Financial obligation request already processed";
  if (message === "INVALID_REQUEST_INPUT") return "Invalid request input";
  if (message === "INVALID_APPROVED_AMOUNT") return "Invalid approved amount";
  if (message === "INVALID_TERM") return "Invalid term";
  if (message === "REQUEST_LOCK_CONFLICT") return "Financial obligation request is being processed";
  if (message === "OBLIGATION_CREATE_FAILED") return "Financial obligation approval failed";
  if (message === "REQUEST_SUBMIT_FAILED") return "Financial obligation request submission failed";
  if (message === "Permission denied") return "Permission denied";
  if (lower.includes("permission")) return "Permission denied";
  return fallback;
};

const normalizeType = (type: string): FinancialObligationType | null => {
  if (type === "advance" || type === "loan") return type;
  return null;
};

const applyLimitOffset = <T>(query: T, limit?: number, offset?: number): T => {
  if (typeof limit !== "number" || limit <= 0) return query;
  const safeLimit = Math.min(Math.max(limit, 1), 200);
  const safeOffset = Math.max(offset ?? 0, 0);
  return (query as any).range(safeOffset, safeOffset + safeLimit - 1) as T;
};

const mapRequestRow = (row: any): FinancialObligationRequestRow => {
  const employee = row.employees as
    | { user_profiles?: { full_name?: string | null } | null }
    | null;

  return {
    id: row.id as string,
    companyId: row.company_id as string,
    employeeId: row.employee_id as string,
    obligationType: row.obligation_type as FinancialObligationType,
    status: row.status as string,
    requestedAmount: Number(row.requested_amount ?? 0),
    requestedTermMonths:
      typeof row.requested_term_months === "number" ? (row.requested_term_months as number) : null,
    currencyCode: row.currency_code as string,
    reason: (row.reason as string | null) ?? null,
    rejectionReason: (row.rejection_reason as string | null) ?? null,
    reviewedByProfileId: (row.reviewed_by_profile_id as string | null) ?? null,
    reviewedAt: (row.reviewed_at as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    employeeName: employee?.user_profiles?.full_name ?? null
  };
};

const mapInstallmentRow = (row: any): FinancialObligationInstallmentRow => ({
  id: row.id as string,
  year: Number(row.year ?? 0),
  month: Number(row.month ?? 0),
  scheduledAmount: Number(row.scheduled_amount ?? 0),
  appliedAmount: Number(row.applied_amount ?? 0),
  remainingAmount: Number(row.remaining_amount ?? 0),
  status: row.status as string,
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string
});

const mapLedgerRow = (row: any): FinancialObligationLedgerRow => ({
  id: row.id as string,
  eventType: row.event_type as string,
  amount: Number(row.amount ?? 0),
  balanceBefore: row.balance_before == null ? null : Number(row.balance_before),
  balanceAfter: row.balance_after == null ? null : Number(row.balance_after),
  referenceType: (row.reference_type as string | null) ?? null,
  referenceId: (row.reference_id as string | null) ?? null,
  requestId: (row.request_id as string | null) ?? null,
  obligationId: (row.obligation_id as string | null) ?? null,
  actorProfileId: (row.actor_profile_id as string | null) ?? null,
  metadata: (row.metadata_json as Record<string, unknown> | null) ?? null,
  createdAt: row.created_at as string
});

const mapStatusHistoryRow = (row: any): FinancialObligationStatusHistoryRow => ({
  id: row.id as string,
  entityScope: row.entity_scope as "request" | "obligation",
  oldStatus: (row.old_status as string | null) ?? null,
  newStatus: row.new_status as string,
  reason: (row.reason as string | null) ?? null,
  requestId: (row.request_id as string | null) ?? null,
  obligationId: (row.obligation_id as string | null) ?? null,
  actorProfileId: row.actor_profile_id as string,
  createdAt: row.created_at as string
});

const resolveCurrentEmployeeId = async (ctx: ServiceContext): Promise<string | null> => {
  try {
    const { data, error } = await ctx.supabase.rpc("current_user_employee_id");
    if (!error && data) return data as string;
  } catch {
    // fall back to direct lookup below
  }

  const { data } = await ctx.supabase
    .from("employees")
    .select("id")
    .eq("company_id", ctx.companyId)
    .eq("user_profile_id", ctx.userProfileId)
    .is("is_deleted", false)
    .maybeSingle();

  return data?.id ?? null;
};

const canReviewType = (ctx: ServiceContext, type: FinancialObligationType): boolean => {
  if (type === "advance") return hasFinancialObligationCapability(ctx, "review_salary_advance");
  return hasFinancialObligationCapability(ctx, "review_loan_requests");
};

const requireReviewForType = (ctx: ServiceContext, type: FinancialObligationType): void => {
  if (!canReviewType(ctx, type)) throw new Error("Permission denied");
};

const requireObligationApprovalAuthority = (ctx: ServiceContext): void => {
  requireFinancialObligationCapability(ctx, "manage_obligation_creation");
};

const canViewCompanyObligations = (ctx: ServiceContext): boolean => {
  return (
    hasFinancialObligationCapability(ctx, "review_salary_advance") ||
    hasFinancialObligationCapability(ctx, "review_loan_requests") ||
    hasFinancialObligationCapability(ctx, "manage_obligation_creation")
  );
};

const ensureSelfOrAuthorizedSubmitter = async (ctx: ServiceContext, employeeId: string): Promise<void> => {
  const currentEmployeeId = await resolveCurrentEmployeeId(ctx);
  if (currentEmployeeId && currentEmployeeId === employeeId) return;
  requireObligationApprovalAuthority(ctx);
};

const requireFinancialObligationEntitlement = async (ctx: ServiceContext): Promise<void> => {
  await requirePlanFeature(ctx, "feature.financial_obligations_loans_advances");
};

export const submitObligationRequest = async (
  ctx: ServiceContext,
  obligationTypeInput: string,
  payload: FinancialObligationRequestInput
): Promise<ServiceResult<SubmitFinancialObligationRequestResult>> => {
  try {
    await requireFinancialObligationEntitlement(ctx);
    const obligationType = normalizeType(obligationTypeInput);
    if (!obligationType) {
      return { ok: false, error: "Invalid obligation type" };
    }

    if (obligationType === "advance") {
      requireFinancialObligationCapability(ctx, "request_salary_advance");
    } else {
      requireFinancialObligationCapability(ctx, "request_loan");
    }

    let employeeId = (payload.employeeId ?? "").trim();
    if (!employeeId) {
      employeeId = (await resolveCurrentEmployeeId(ctx)) ?? "";
      if (!employeeId) {
        return { ok: false, error: "Employee record not found" };
      }
    }

    await ensureSelfOrAuthorizedSubmitter(ctx, employeeId);

    if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
      return { ok: false, error: "Invalid request amount" };
    }
    if (obligationType === "loan" && (!payload.termMonths || payload.termMonths <= 0)) {
      return { ok: false, error: "Loan term is required" };
    }
    if (payload.termMonths != null && payload.termMonths <= 0) {
      return { ok: false, error: "Invalid term" };
    }

    const currencyCode = payload.currencyCode?.trim().toUpperCase();
    if (!currencyCode) {
      return { ok: false, error: "Currency code is required" };
    }

    const { data, error } = await ctx.supabase.rpc("submit_financial_obligation_request_atomic", {
      p_employee_id: employeeId,
      p_obligation_type: obligationType,
      p_requested_amount: payload.amount,
      p_requested_term_months: payload.termMonths ?? null,
      p_currency_code: currencyCode,
      p_reason: payload.reason?.trim() || null,
      p_terms_snapshot_json: payload.termsSnapshot ?? null
    });

    if (error) {
      return {
        ok: false,
        error: sanitizeFinanceError(error.message, "Financial obligation request submission failed")
      };
    }

    const result = (data as { request_id?: string; status?: string } | null) ?? null;
    if (!result?.request_id) {
      return { ok: false, error: "Financial obligation request submission failed" };
    }

    return {
      ok: true,
      data: {
        requestId: result.request_id,
        status: result.status ?? "submitted"
      }
    };
  } catch (err) {
    return {
      ok: false,
      error: sanitizeFinanceError(err instanceof Error ? err.message : "", "Financial obligation request submission failed")
    };
  }
};

export const submitFinancialObligationRequest = submitObligationRequest;

export const listMyFinancialObligationRequests = async (
  ctx: ServiceContext,
  filters: Omit<FinancialObligationRequestFilters, "employeeId" | "obligationType" | "dateFrom" | "dateTo"> = {}
): Promise<ServiceResult<{ requests: FinancialObligationRequestRow[] }>> => {
  try {
    await requireFinancialObligationEntitlement(ctx);
    requireFinancialObligationCapability(ctx, "view_own_obligations");

    const employeeId = await resolveCurrentEmployeeId(ctx);
    if (!employeeId) {
      return { ok: false, error: "Employee record not found" };
    }

    let query = ctx.supabase
      .from("financial_obligation_requests")
      .select(
        "id, company_id, employee_id, obligation_type, status, requested_amount, requested_term_months, currency_code, reason, rejection_reason, reviewed_by_profile_id, reviewed_at, created_at, updated_at, employees!financial_obligation_requests_employee_id_fkey(user_profiles(full_name))"
      )
      .eq("company_id", ctx.companyId)
      .eq("employee_id", employeeId)
      .eq("employees.is_deleted", false);

    if (filters.status?.length) {
      query = query.in("status", filters.status);
    }

    query = applyLimitOffset(query, filters.limit, filters.offset);
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) {
      return { ok: false, error: sanitizeFinanceError(error.message, "Financial obligation request history failed") };
    }

    return { ok: true, data: { requests: (data ?? []).map(mapRequestRow) } };
  } catch (err) {
    return {
      ok: false,
      error: sanitizeFinanceError(err instanceof Error ? err.message : "", "Financial obligation request history failed")
    };
  }
};

export const listObligationRequests = async (
  ctx: ServiceContext,
  filters: FinancialObligationRequestFilters = {}
): Promise<ServiceResult<{ requests: FinancialObligationRequestRow[] }>> => {
  try {
    await requireFinancialObligationEntitlement(ctx);
    const requestedType = filters.obligationType;
    if (requestedType) {
      requireReviewForType(ctx, requestedType);
    } else if (!canViewCompanyObligations(ctx)) {
      throw new Error("Permission denied");
    }

    let query = ctx.supabase
      .from("financial_obligation_requests")
      .select(
        "id, company_id, employee_id, obligation_type, status, requested_amount, requested_term_months, currency_code, reason, rejection_reason, reviewed_by_profile_id, reviewed_at, created_at, updated_at, employees!financial_obligation_requests_employee_id_fkey(user_profiles(full_name))"
      )
      .eq("company_id", ctx.companyId)
      .eq("employees.is_deleted", false);

    if (filters.employeeId) {
      query = query.eq("employee_id", filters.employeeId);
    }

    if (filters.status?.length) {
      query = query.in("status", filters.status);
    } else {
      query = query.in("status", ["submitted", "under_review"]);
    }

    if (filters.obligationType) {
      query = query.eq("obligation_type", filters.obligationType);
    }
    if (filters.dateFrom) {
      query = query.gte("created_at", filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte("created_at", filters.dateTo);
    }

    query = applyLimitOffset(query, filters.limit, filters.offset);
    const { data, error } = await query.order("created_at", { ascending: true });

    if (error) {
      return { ok: false, error: sanitizeFinanceError(error.message, "Financial obligation review queue failed") };
    }

    const rows = (data ?? []).map(mapRequestRow);
    const filteredRows = rows.filter((row) => canReviewType(ctx, row.obligationType));
    return { ok: true, data: { requests: filteredRows } };
  } catch (err) {
    return {
      ok: false,
      error: sanitizeFinanceError(err instanceof Error ? err.message : "", "Financial obligation review queue failed")
    };
  }
};

export const listReviewFinancialObligationRequests = listObligationRequests;

export const approveObligationRequest = async (
  ctx: ServiceContext,
  requestId: string,
  payload: { principalApproved: number; termMonthsApproved?: number | null }
): Promise<ServiceResult<ApproveFinancialObligationRequestResult>> => {
  try {
    await requireFinancialObligationEntitlement(ctx);
    requireObligationApprovalAuthority(ctx);

    if (!requestId?.trim()) {
      return { ok: false, error: "Financial obligation request id is required" };
    }
    if (!Number.isFinite(payload.principalApproved) || payload.principalApproved <= 0) {
      return { ok: false, error: "Invalid approved amount" };
    }
    if (payload.termMonthsApproved != null && payload.termMonthsApproved <= 0) {
      return { ok: false, error: "Invalid term" };
    }

    const { data, error } = await ctx.supabase.rpc("approve_financial_obligation_request_atomic", {
      p_request_id: requestId.trim(),
      p_principal_approved: payload.principalApproved,
      p_term_months_approved: payload.termMonthsApproved ?? null
    });

    if (error) {
      return {
        ok: false,
        error: sanitizeFinanceError(error.message, "Financial obligation approval failed")
      };
    }

    const result =
      (data as {
        request_id?: string;
        request_status?: string;
        obligation_id?: string;
        obligation_status?: string;
        schedule_count?: number;
        outstanding_balance?: number;
      } | null) ?? null;

    if (!result?.request_id || !result?.obligation_id) {
      return { ok: false, error: "Financial obligation approval failed" };
    }

    return {
      ok: true,
      data: {
        requestId: result.request_id,
        requestStatus: result.request_status ?? "approved",
        obligationId: result.obligation_id,
        obligationStatus: result.obligation_status ?? "approved_pending_disbursement",
        scheduleCount: Number(result.schedule_count ?? 0),
        outstandingBalance: Number(result.outstanding_balance ?? 0)
      }
    };
  } catch (err) {
    return {
      ok: false,
      error: sanitizeFinanceError(err instanceof Error ? err.message : "", "Financial obligation approval failed")
    };
  }
};

export const approveFinancialObligationRequest = approveObligationRequest;

export const rejectObligationRequest = async (
  ctx: ServiceContext,
  requestId: string,
  reason?: string
): Promise<ServiceResult<RejectFinancialObligationRequestResult>> => {
  try {
    await requireFinancialObligationEntitlement(ctx);
    requireObligationApprovalAuthority(ctx);

    if (!requestId?.trim()) {
      return { ok: false, error: "Financial obligation request id is required" };
    }

    const { data, error } = await ctx.supabase.rpc("reject_financial_obligation_request_atomic", {
      p_request_id: requestId.trim(),
      p_rejection_reason: reason?.trim() || null
    });

    if (error) {
      return {
        ok: false,
        error: sanitizeFinanceError(error.message, "Financial obligation rejection failed")
      };
    }

    const result = (data as { request_id?: string; status?: string } | null) ?? null;
    if (!result?.request_id) {
      return { ok: false, error: "Financial obligation rejection failed" };
    }

    return {
      ok: true,
      data: {
        requestId: result.request_id,
        status: result.status ?? "rejected"
      }
    };
  } catch (err) {
    return {
      ok: false,
      error: sanitizeFinanceError(err instanceof Error ? err.message : "", "Financial obligation rejection failed")
    };
  }
};

export const rejectFinancialObligationRequest = rejectObligationRequest;

export const getObligationDetail = async (
  ctx: ServiceContext,
  obligationId: string,
  options: { ledgerLimit?: number; ledgerOffset?: number } = {}
): Promise<ServiceResult<FinancialObligationDetail>> => {
  try {
    await requireFinancialObligationEntitlement(ctx);
    if (!obligationId?.trim()) {
      return { ok: false, error: "Financial obligation id is required" };
    }

    const { data: obligationRow, error: obligationError } = await ctx.supabase
      .from("financial_obligations")
      .select(
        "id, company_id, employee_id, source_request_id, obligation_type, obligation_status, currency_code, principal_requested, principal_approved, outstanding_balance, term_months_requested, term_months_approved, created_at, updated_at"
      )
      .eq("company_id", ctx.companyId)
      .eq("id", obligationId.trim())
      .maybeSingle();

    if (obligationError) {
      return { ok: false, error: sanitizeFinanceError(obligationError.message, "Failed to load financial obligation") };
    }
    if (!obligationRow) {
      return { ok: false, error: "Financial obligation not found" };
    }

    const employeeId = obligationRow.employee_id as string;
    if (!canViewCompanyObligations(ctx)) {
      requireFinancialObligationCapability(ctx, "view_own_obligations");
      const currentEmployeeId = await resolveCurrentEmployeeId(ctx);
      if (!currentEmployeeId || currentEmployeeId !== employeeId) {
        return { ok: false, error: "Permission denied" };
      }
    }

    const [
      employeeResult,
      requestResult,
      installmentsResult,
      ledgerResult,
      historyResult
    ] = await Promise.all([
      ctx.supabase
        .from("employees")
        .select("id, user_profiles!employees_user_profile_id_fkey(full_name)")
        .eq("company_id", ctx.companyId)
        .eq("id", employeeId)
        .is("is_deleted", false)
        .maybeSingle(),
      obligationRow.source_request_id
        ? ctx.supabase
            .from("financial_obligation_requests")
            .select(
              "id, company_id, employee_id, obligation_type, status, requested_amount, requested_term_months, currency_code, reason, rejection_reason, reviewed_by_profile_id, reviewed_at, created_at, updated_at, employees!financial_obligation_requests_employee_id_fkey(user_profiles(full_name))"
            )
            .eq("company_id", ctx.companyId)
            .eq("id", obligationRow.source_request_id as string)
            .eq("employees.is_deleted", false)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null } as any),
      ctx.supabase
        .from("financial_obligation_installments")
        .select(
          "id, year, month, scheduled_amount, applied_amount, remaining_amount, status, created_at, updated_at"
        )
        .eq("company_id", ctx.companyId)
        .eq("obligation_id", obligationId.trim())
        .order("year", { ascending: true })
        .order("month", { ascending: true }),
      applyLimitOffset(
        ctx.supabase
          .from("financial_obligation_ledger")
          .select(
            "id, event_type, amount, balance_before, balance_after, reference_type, reference_id, request_id, obligation_id, actor_profile_id, metadata_json, created_at"
          )
          .eq("company_id", ctx.companyId)
          .or(
            obligationRow.source_request_id
              ? `obligation_id.eq.${obligationId.trim()},request_id.eq.${obligationRow.source_request_id as string}`
              : `obligation_id.eq.${obligationId.trim()}`
          )
          .order("created_at", { ascending: false }),
        options.ledgerLimit ?? 50,
        options.ledgerOffset ?? 0
      ),
      ctx.supabase
        .from("financial_obligation_status_history")
        .select(
          "id, entity_scope, old_status, new_status, reason, request_id, obligation_id, actor_profile_id, created_at"
        )
        .eq("company_id", ctx.companyId)
        .or(
          obligationRow.source_request_id
            ? `obligation_id.eq.${obligationId.trim()},request_id.eq.${obligationRow.source_request_id as string}`
            : `obligation_id.eq.${obligationId.trim()}`
        )
        .order("created_at", { ascending: false })
    ]);

    if (employeeResult.error) {
      return { ok: false, error: sanitizeFinanceError(employeeResult.error.message, "Failed to load obligation employee") };
    }
    if (requestResult.error) {
      return { ok: false, error: sanitizeFinanceError(requestResult.error.message, "Failed to load obligation request") };
    }
    if (installmentsResult.error) {
      return { ok: false, error: sanitizeFinanceError(installmentsResult.error.message, "Failed to load obligation installments") };
    }
    if (ledgerResult.error) {
      return { ok: false, error: sanitizeFinanceError(ledgerResult.error.message, "Failed to load obligation ledger") };
    }
    if (historyResult.error) {
      return { ok: false, error: sanitizeFinanceError(historyResult.error.message, "Failed to load obligation status history") };
    }

    const employeeName =
      ((employeeResult.data as any)?.user_profiles?.full_name as string | null | undefined) ?? null;

    return {
      ok: true,
      data: {
        obligation: {
          id: obligationRow.id as string,
          companyId: obligationRow.company_id as string,
          employeeId,
          employeeName,
          sourceRequestId: (obligationRow.source_request_id as string | null) ?? null,
          obligationType: obligationRow.obligation_type as FinancialObligationType,
          obligationStatus: obligationRow.obligation_status as string,
          currencyCode: obligationRow.currency_code as string,
          principalRequested:
            obligationRow.principal_requested == null ? null : Number(obligationRow.principal_requested),
          principalApproved: Number(obligationRow.principal_approved ?? 0),
          outstandingBalance: Number(obligationRow.outstanding_balance ?? 0),
          termMonthsRequested:
            typeof obligationRow.term_months_requested === "number"
              ? (obligationRow.term_months_requested as number)
              : null,
          termMonthsApproved:
            typeof obligationRow.term_months_approved === "number"
              ? (obligationRow.term_months_approved as number)
              : null,
          createdAt: obligationRow.created_at as string,
          updatedAt: obligationRow.updated_at as string
        },
        sourceRequest: requestResult.data ? mapRequestRow(requestResult.data as any) : null,
        installments: (installmentsResult.data ?? []).map(mapInstallmentRow),
        ledger: {
          rows: (ledgerResult.data ?? []).map(mapLedgerRow),
          limit: Math.min(Math.max(options.ledgerLimit ?? 50, 1), 200),
          offset: Math.max(options.ledgerOffset ?? 0, 0)
        },
        statusHistory: (historyResult.data ?? []).map(mapStatusHistoryRow)
      }
    };
  } catch (err) {
    return {
      ok: false,
      error: sanitizeFinanceError(err instanceof Error ? err.message : "", "Failed to load financial obligation")
    };
  }
};
