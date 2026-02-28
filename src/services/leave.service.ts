import type { SupabaseClient } from "@supabase/supabase-js";
import type { ServiceContext, ServiceResult } from "../lib/types";
import { assertEmployeeScope, requirePermission } from "../lib/auth-wrapper";
import { requirePlanFeature } from "../lib/entitlements";

export type LeavePayload = {
  leave_type_id: string;
  start_date: string;
  end_date: string;
  reason?: string;
  is_half_day?: boolean;
  half_day_type?: "first_half" | "second_half";
};

export type LeaveBalanceItem = {
  id: string;
  leave_type_id: string;
  year: number;
  entitled_days: number;
  used_days: number;
  remaining_days: number;
  leave_type_name?: string | null;
  leave_type_is_paid?: boolean | null;
};

export type LeaveRequestItem = {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: string;
  reason?: string | null;
  is_half_day: boolean;
  half_day_type?: string | null;
  approval_level?: number | null;
  final_approved?: boolean | null;
  created_at: string;
  updated_at: string;
  approved_at?: string | null;
  employee_name?: string | null;
  employee_avatar_url?: string | null;
  department_id?: string | null;
  leave_type_name?: string | null;
};

export type LeaveRequestFilters = {
  status?: string[];
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
};

export type LeaveReviewFilters = LeaveRequestFilters & {
  employeeId?: string;
};

const sanitizeError = (message: string, fallback: string): string => {
  if (!message) return fallback;
  if (message === "UNAUTHENTICATED" || message.includes("JWT")) return "Authentication required";
  if (message === "ACTOR_MISMATCH" || message === "TENANT_RESOLUTION_FAILED") return "Permission denied";
  if (message === "APPROVAL_NOT_PENDING") return "Leave request already processed";
  if (message === "INVALID_STATE_TRANSITION") return "Invalid state transition";
  if (message.toLowerCase().includes("permission")) return "Permission denied";
  return fallback;
};

const requireLeaveEntitlement = async (ctx: ServiceContext): Promise<void> => {
  await requirePlanFeature(ctx, "feature.core_leave_management");
};

const getActorProfileId = async (
  client: SupabaseClient,
  ctx: ServiceContext
): Promise<string | null> => {
  const { data } = await client
    .from("user_profiles")
    .select("id")
    .eq("user_id", ctx.userId)
    .eq("company_id", ctx.companyId)
    .is("is_deleted", false)
    .maybeSingle();

  return data?.id ?? null;
};

const getActorEmployeeId = async (
  client: SupabaseClient,
  ctx: ServiceContext
): Promise<string | null> => {
  const actorProfileId = await getActorProfileId(client, ctx);

  if (!actorProfileId) {
    return null;
  }

  const { data } = await client
    .from("employees")
    .select("id")
    .eq("company_id", ctx.companyId)
    .eq("user_profile_id", actorProfileId)
    .is("is_deleted", false)
    .maybeSingle();

  return data?.id ?? null;
};

const ensureSelfOrManager = async (
  ctx: ServiceContext,
  employeeId: string
): Promise<{ actorProfileId: string | null; actorEmployeeId: string | null; isSelf: boolean }> => {
  const actorProfileId = await getActorProfileId(ctx.supabase, ctx);
  const actorEmployeeId = await getActorEmployeeId(ctx.supabase, ctx);
  const isSelf = actorEmployeeId !== null && actorEmployeeId === employeeId;

  if (!isSelf) {
    requirePermission("manage_employees", ctx);
  }

  return { actorProfileId, actorEmployeeId, isSelf };
};

const applyDateFilters = (query: any, filters?: LeaveRequestFilters) => {
  if (filters?.status?.length) {
    query = query.in("status", filters.status);
  }
  if (filters?.dateFrom) {
    query = query.gte("start_date", filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte("end_date", filters.dateTo);
  }
  return query;
};

export const applyLeave = async (
  ctx: ServiceContext,
  employeeId: string,
  payload: LeavePayload
): Promise<ServiceResult<{ requestId: string }>> => {
  try {
    await requireLeaveEntitlement(ctx);
    assertEmployeeScope(employeeId, ctx);
    const identity = await ensureSelfOrManager(ctx, employeeId);

    if (payload.is_half_day && !payload.half_day_type) {
      return { ok: false, error: "Half-day type is required" };
    }

    const { data: balance } = await ctx.supabase
      .from("leave_balances")
      .select("remaining_days")
      .eq("company_id", ctx.companyId)
      .eq("employee_id", employeeId)
      .eq("leave_type_id", payload.leave_type_id)
      .is("is_deleted", false)
      .maybeSingle();

    if (!balance) {
      return { ok: false, error: "Leave balance not found" };
    }

    const { data: overlap } = await ctx.supabase
      .from("leave_requests")
      .select("id")
      .eq("company_id", ctx.companyId)
      .eq("employee_id", employeeId)
      .in("status", ["pending", "approved"])
      .lte("start_date", payload.end_date)
      .gte("end_date", payload.start_date)
      .is("is_deleted", false)
      .limit(1)
      .maybeSingle();

    if (overlap?.id) {
      return { ok: false, error: "Overlapping leave request exists" };
    }

    const { data, error } = await ctx.supabase
      .from("leave_requests")
      .insert({
        company_id: ctx.companyId,
        employee_id: employeeId,
        leave_type_id: payload.leave_type_id,
        start_date: payload.start_date,
        end_date: payload.end_date,
        total_days: 0,
        reason: payload.reason ?? null,
        status: "pending",
        is_half_day: payload.is_half_day ?? false,
        half_day_type: payload.half_day_type ?? null,
        applied_by: identity.actorProfileId,
        created_by: identity.actorProfileId,
        updated_by: identity.actorProfileId
      })
      .select("id")
      .single();

    if (error || !data) {
      return { ok: false, error: sanitizeError(error?.message ?? "", "Leave request failed") };
    }

    if (identity.actorProfileId) {
      await ctx.supabase.from("notifications").insert({
        company_id: ctx.companyId,
        recipient_profile_id: identity.actorProfileId,
        type: "leave_request",
        title: "Leave request submitted",
        message: payload.reason ?? "Leave request",
        reference_type: "leave_request",
        reference_id: data.id,
        created_by: identity.actorProfileId,
        updated_by: identity.actorProfileId
      });
    }

    return { ok: true, data: { requestId: data.id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Leave apply error" };
  }
};

export const listLeaveBalances = async (
  ctx: ServiceContext,
  employeeId: string,
  year?: number
): Promise<ServiceResult<{ balances: LeaveBalanceItem[] }>> => {
  try {
    await requireLeaveEntitlement(ctx);
    assertEmployeeScope(employeeId, ctx);
    await ensureSelfOrManager(ctx, employeeId);

    let query = ctx.supabase
      .from("leave_balances")
      .select("id, leave_type_id, year, entitled_days, used_days, remaining_days, leave_types(name, is_paid)")
      .eq("company_id", ctx.companyId)
      .eq("employee_id", employeeId)
      .is("is_deleted", false);

    if (typeof year === "number") {
      query = query.eq("year", year);
    }

    const { data, error } = await query.order("year", { ascending: false });

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Leave balance lookup failed") };
    }

    const balances = (data ?? []).map((row) => ({
      id: row.id as string,
      leave_type_id: row.leave_type_id as string,
      year: row.year as number,
      entitled_days: Number(row.entitled_days ?? 0),
      used_days: Number(row.used_days ?? 0),
      remaining_days: Number(row.remaining_days ?? 0),
      leave_type_name: (row.leave_types as { name?: string } | null)?.name ?? null,
      leave_type_is_paid: (row.leave_types as { is_paid?: boolean } | null)?.is_paid ?? null
    }));

    return { ok: true, data: { balances } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Leave balances error" };
  }
};

export const listLeaveRequests = async (
  ctx: ServiceContext,
  employeeId: string,
  filters?: LeaveRequestFilters
): Promise<ServiceResult<{ requests: LeaveRequestItem[] }>> => {
  try {
    await requireLeaveEntitlement(ctx);
    assertEmployeeScope(employeeId, ctx);
    await ensureSelfOrManager(ctx, employeeId);

    let query = ctx.supabase
      .from("leave_requests")
      .select(
        "id, employee_id, leave_type_id, start_date, end_date, total_days, status, reason, is_half_day, half_day_type, approval_level, final_approved, created_at, updated_at, approved_at, leave_types(name), employees!leave_requests_employee_id_fkey(id, department_id, user_profile_id, user_profiles(full_name, avatar_url))"
      )
      .eq("company_id", ctx.companyId)
      .eq("employee_id", employeeId)
      .is("is_deleted", false);

    query = applyDateFilters(query, filters);

    if (filters?.limit) {
      const offset = filters.offset ?? 0;
      query = query.range(offset, offset + filters.limit - 1);
    }

    const { data, error } = await query.order("start_date", { ascending: false });

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Leave history failed") };
    }

    const requests = (data ?? []).map((row) => {
      const employee = row.employees as {
        user_profiles?: { full_name?: string; avatar_url?: string } | null;
        department_id?: string | null;
      } | null;

      return {
        id: row.id as string,
        employee_id: row.employee_id as string,
        leave_type_id: row.leave_type_id as string,
        start_date: row.start_date as string,
        end_date: row.end_date as string,
        total_days: Number(row.total_days ?? 0),
        status: row.status as string,
        reason: row.reason as string | null,
        is_half_day: Boolean(row.is_half_day),
        half_day_type: row.half_day_type as string | null,
        approval_level: (row.approval_level as number | null) ?? null,
        final_approved: (row.final_approved as boolean | null) ?? null,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        approved_at: row.approved_at as string | null,
        employee_name: employee?.user_profiles?.full_name ?? null,
        employee_avatar_url: employee?.user_profiles?.avatar_url ?? null,
        department_id: employee?.department_id ?? null,
        leave_type_name: (row.leave_types as { name?: string } | null)?.name ?? null
      } satisfies LeaveRequestItem;
    });

    return { ok: true, data: { requests } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Leave history error" };
  }
};

export const listPendingLeaveRequests = async (
  ctx: ServiceContext,
  filters?: LeaveReviewFilters
): Promise<ServiceResult<{ requests: LeaveRequestItem[] }>> => {
  try {
    await requireLeaveEntitlement(ctx);
    requirePermission("manage_employees", ctx);

    let query = ctx.supabase
      .from("leave_requests")
      .select(
        "id, employee_id, leave_type_id, start_date, end_date, total_days, status, reason, is_half_day, half_day_type, approval_level, final_approved, created_at, updated_at, approved_at, leave_types(name), employees!leave_requests_employee_id_fkey(id, department_id, user_profile_id, user_profiles(full_name, avatar_url))"
      )
      .eq("company_id", ctx.companyId)
      .eq("status", "pending")
      .is("is_deleted", false);

    if (filters?.employeeId) {
      query = query.eq("employee_id", filters.employeeId);
    }

    query = applyDateFilters(query, filters);

    if (filters?.limit) {
      const offset = filters.offset ?? 0;
      query = query.range(offset, offset + filters.limit - 1);
    }

    const { data, error } = await query.order("created_at", { ascending: true });

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Pending leave lookup failed") };
    }

    const requests = (data ?? []).map((row) => {
      const employee = row.employees as {
        user_profiles?: { full_name?: string; avatar_url?: string } | null;
        department_id?: string | null;
      } | null;

      return {
        id: row.id as string,
        employee_id: row.employee_id as string,
        leave_type_id: row.leave_type_id as string,
        start_date: row.start_date as string,
        end_date: row.end_date as string,
        total_days: Number(row.total_days ?? 0),
        status: row.status as string,
        reason: row.reason as string | null,
        is_half_day: Boolean(row.is_half_day),
        half_day_type: row.half_day_type as string | null,
        approval_level: (row.approval_level as number | null) ?? null,
        final_approved: (row.final_approved as boolean | null) ?? null,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        approved_at: row.approved_at as string | null,
        employee_name: employee?.user_profiles?.full_name ?? null,
        employee_avatar_url: employee?.user_profiles?.avatar_url ?? null,
        department_id: employee?.department_id ?? null,
        leave_type_name: (row.leave_types as { name?: string } | null)?.name ?? null
      } satisfies LeaveRequestItem;
    });

    return { ok: true, data: { requests } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Pending leave error" };
  }
};

export const listLeaveApprovalHistory = async (
  ctx: ServiceContext,
  filters?: LeaveReviewFilters
): Promise<ServiceResult<{ requests: LeaveRequestItem[] }>> => {
  try {
    await requireLeaveEntitlement(ctx);
    requirePermission("manage_employees", ctx);

    let query = ctx.supabase
      .from("leave_requests")
      .select(
        "id, employee_id, leave_type_id, start_date, end_date, total_days, status, reason, is_half_day, half_day_type, approval_level, final_approved, created_at, updated_at, approved_at, leave_types(name), employees!leave_requests_employee_id_fkey(id, department_id, user_profile_id, user_profiles(full_name, avatar_url))"
      )
      .eq("company_id", ctx.companyId)
      .neq("status", "pending")
      .is("is_deleted", false);

    if (filters?.employeeId) {
      query = query.eq("employee_id", filters.employeeId);
    }

    query = applyDateFilters(query, filters);

    if (filters?.limit) {
      const offset = filters.offset ?? 0;
      query = query.range(offset, offset + filters.limit - 1);
    }

    const { data, error } = await query.order("updated_at", { ascending: false });

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Leave history lookup failed") };
    }

    const requests = (data ?? []).map((row) => {
      const employee = row.employees as {
        user_profiles?: { full_name?: string; avatar_url?: string } | null;
        department_id?: string | null;
      } | null;

      return {
        id: row.id as string,
        employee_id: row.employee_id as string,
        leave_type_id: row.leave_type_id as string,
        start_date: row.start_date as string,
        end_date: row.end_date as string,
        total_days: Number(row.total_days ?? 0),
        status: row.status as string,
        reason: row.reason as string | null,
        is_half_day: Boolean(row.is_half_day),
        half_day_type: row.half_day_type as string | null,
        approval_level: (row.approval_level as number | null) ?? null,
        final_approved: (row.final_approved as boolean | null) ?? null,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        approved_at: row.approved_at as string | null,
        employee_name: employee?.user_profiles?.full_name ?? null,
        employee_avatar_url: employee?.user_profiles?.avatar_url ?? null,
        department_id: employee?.department_id ?? null,
        leave_type_name: (row.leave_types as { name?: string } | null)?.name ?? null
      } satisfies LeaveRequestItem;
    });

    return { ok: true, data: { requests } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Leave approval history error" };
  }
};

export const getTeamLeaveCalendar = async (
  ctx: ServiceContext,
  dateFrom: string,
  dateTo: string
): Promise<ServiceResult<{ requests: LeaveRequestItem[] }>> => {
  try {
    await requireLeaveEntitlement(ctx);
    requirePermission("manage_employees", ctx);

    const { data, error } = await ctx.supabase
      .from("leave_requests")
      .select(
        "id, employee_id, leave_type_id, start_date, end_date, total_days, status, reason, is_half_day, half_day_type, approval_level, final_approved, created_at, updated_at, approved_at, leave_types(name), employees!leave_requests_employee_id_fkey(id, department_id, user_profile_id, user_profiles(full_name, avatar_url))"
      )
      .eq("company_id", ctx.companyId)
      .in("status", ["pending", "approved"])
      .lte("start_date", dateTo)
      .gte("end_date", dateFrom)
      .is("is_deleted", false)
      .order("start_date", { ascending: true });

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Leave calendar lookup failed") };
    }

    const requests = (data ?? []).map((row) => {
      const employee = row.employees as {
        user_profiles?: { full_name?: string; avatar_url?: string } | null;
        department_id?: string | null;
      } | null;

      return {
        id: row.id as string,
        employee_id: row.employee_id as string,
        leave_type_id: row.leave_type_id as string,
        start_date: row.start_date as string,
        end_date: row.end_date as string,
        total_days: Number(row.total_days ?? 0),
        status: row.status as string,
        reason: row.reason as string | null,
        is_half_day: Boolean(row.is_half_day),
        half_day_type: row.half_day_type as string | null,
        approval_level: (row.approval_level as number | null) ?? null,
        final_approved: (row.final_approved as boolean | null) ?? null,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        approved_at: row.approved_at as string | null,
        employee_name: employee?.user_profiles?.full_name ?? null,
        employee_avatar_url: employee?.user_profiles?.avatar_url ?? null,
        department_id: employee?.department_id ?? null,
        leave_type_name: (row.leave_types as { name?: string } | null)?.name ?? null
      } satisfies LeaveRequestItem;
    });

    return { ok: true, data: { requests } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Leave calendar error" };
  }
};

export const approveLeave = async (
  ctx: ServiceContext,
  requestId: string
): Promise<ServiceResult<{ status: string }>> => {
  try {
    await requireLeaveEntitlement(ctx);
    requirePermission("manage_employees", ctx);
    const { data, error } = await ctx.supabase.rpc("approve_leave_atomic", {
      p_leave_request_id: requestId,
      p_actor_id: ctx.userId
    });

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Leave request approval failed") };
    }

    const status = (data as { status?: string } | null)?.status ?? "approved";
    return { ok: true, data: { status } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Leave approval error" };
  }
};

export const rejectLeave = async (
  ctx: ServiceContext,
  requestId: string,
  reason?: string
): Promise<ServiceResult<{ status: string }>> => {
  try {
    await requireLeaveEntitlement(ctx);
    requirePermission("manage_employees", ctx);

    const approverProfileId = await getActorProfileId(ctx.supabase, ctx);

    const { data: request } = await ctx.supabase
      .from("leave_requests")
      .select("id, employee_id, status")
      .eq("id", requestId)
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false)
      .maybeSingle();

    if (!request) {
      return { ok: false, error: "Leave request not found" };
    }

    if (request.status !== "pending") {
      return { ok: false, error: "Leave request already processed" };
    }

    const { data: updated, error } = await ctx.supabase
      .from("leave_requests")
      .update({
        status: "rejected",
        approved_at: new Date().toISOString(),
        approved_by: approverProfileId,
        updated_by: approverProfileId
      })
      .eq("id", requestId)
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (error || !updated) {
      return { ok: false, error: "Leave rejection failed" };
    }

    const { data: employee } = await ctx.supabase
      .from("employees")
      .select("user_profile_id")
      .eq("id", request.employee_id)
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false)
      .maybeSingle();

    if (employee?.user_profile_id) {
      await ctx.supabase.from("notifications").insert({
        company_id: ctx.companyId,
        recipient_profile_id: employee.user_profile_id,
        type: "leave_rejected",
        title: "Leave rejected",
        message: reason ? `Leave rejected: ${reason}` : "Your leave request has been rejected",
        reference_type: "leave_request",
        reference_id: requestId,
        created_by: approverProfileId,
        updated_by: approverProfileId
      });
    }

    return { ok: true, data: { status: "rejected" } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Leave rejection error" };
  }
};

export const cancelLeaveRequest = async (
  ctx: ServiceContext,
  requestId: string,
  employeeId: string
): Promise<ServiceResult<{ status: string }>> => {
  try {
    await requireLeaveEntitlement(ctx);
    assertEmployeeScope(employeeId, ctx);
    const identity = await ensureSelfOrManager(ctx, employeeId);

    const { data: request } = await ctx.supabase
      .from("leave_requests")
      .select("id, status")
      .eq("id", requestId)
      .eq("company_id", ctx.companyId)
      .eq("employee_id", employeeId)
      .is("is_deleted", false)
      .maybeSingle();

    if (!request) {
      return { ok: false, error: "Leave request not found" };
    }

    if (request.status !== "pending") {
      return { ok: false, error: "Only pending requests can be cancelled" };
    }

    const { data: updated, error } = await ctx.supabase
      .from("leave_requests")
      .update({
        status: "cancelled",
        updated_by: identity.actorProfileId
      })
      .eq("id", requestId)
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (error || !updated) {
      return { ok: false, error: "Leave cancellation failed" };
    }

    return { ok: true, data: { status: "cancelled" } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Leave cancellation error" };
  }
};
