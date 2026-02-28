import type { ServiceContext, ServiceResult } from "../lib/types";
import { requirePermission, assertEmployeeScope } from "../lib/auth-wrapper";
import { requirePlanFeature } from "../lib/entitlements";

export type OvertimeRequestInput = {
  attendance_id?: string | null;
  request_date: string;
  requested_minutes: number;
  reason: string;
};

export type OvertimeRequestRow = {
  id: string;
  company_id: string;
  employee_id: string;
  attendance_id?: string | null;
  request_date: string;
  requested_minutes: number;
  reason: string;
  status: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
  created_at?: string | null;
};

export type OvertimeListFilters = {
  employeeId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
};

const resolveCurrentEmployeeId = async (ctx: ServiceContext): Promise<string | null> => {
  try {
    const { data, error } = await ctx.supabase.rpc("current_user_employee_id");
    if (!error && data) {
      return data as string;
    }
  } catch {
    // fall through
  }

  const { data: employee } = await ctx.supabase
    .from("employees")
    .select("id")
    .eq("company_id", ctx.companyId)
    .eq("user_profile_id", ctx.userProfileId)
    .is("is_deleted", false)
    .maybeSingle();

  return employee?.id ?? null;
};

const ensureSelfOrManageAttendance = async (ctx: ServiceContext, employeeId: string): Promise<boolean> => {
  if (ctx.permissions.includes("manage_attendance")) return true;
  const currentEmployeeId = await resolveCurrentEmployeeId(ctx);
  if (!currentEmployeeId || currentEmployeeId !== employeeId) {
    throw new Error("Permission denied");
  }
  return true;
};

const requireOvertimeEntitlement = async (ctx: ServiceContext): Promise<void> => {
  await requirePlanFeature(ctx, "feature.core_attendance");
};

export const requestOvertime = async (
  ctx: ServiceContext,
  employeeId: string,
  payload: OvertimeRequestInput
): Promise<ServiceResult<OvertimeRequestRow>> => {
  try {
    await requireOvertimeEntitlement(ctx);
    await ensureSelfOrManageAttendance(ctx, employeeId);
    assertEmployeeScope(employeeId, ctx);

    const { data, error } = await ctx.supabase
      .from("overtime_requests")
      .insert({
        company_id: ctx.companyId,
        employee_id: employeeId,
        attendance_id: payload.attendance_id ?? null,
        request_date: payload.request_date,
        requested_minutes: payload.requested_minutes,
        reason: payload.reason,
        status: "pending",
        created_by: ctx.userProfileId,
        updated_by: ctx.userProfileId
      })
      .select("*")
      .single();

    if (error || !data) {
      return { ok: false, error: error?.message ?? "Overtime request failed" };
    }

    return { ok: true, data: data as OvertimeRequestRow };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Overtime request failed" };
  }
};

export const listOvertimeRequests = async (
  ctx: ServiceContext,
  filters: OvertimeListFilters = {}
): Promise<ServiceResult<{ rows: OvertimeRequestRow[] }>> => {
  try {
    await requireOvertimeEntitlement(ctx);
    let employeeId = filters.employeeId;
    if (!ctx.permissions.includes("manage_attendance")) {
      employeeId = (await resolveCurrentEmployeeId(ctx)) ?? undefined;
      if (!employeeId) {
        return { ok: false, error: "Employee record not found" };
      }
    }

    let query = ctx.supabase
      .from("overtime_requests")
      .select("*")
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false)
      .order("created_at", { ascending: false });

    if (employeeId) {
      query = query.eq("employee_id", employeeId);
    }
    if (filters.status) {
      query = query.eq("status", filters.status);
    }
    if (filters.dateFrom) {
      query = query.gte("request_date", filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte("request_date", filters.dateTo);
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, data: { rows: (data ?? []) as OvertimeRequestRow[] } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Overtime list failed" };
  }
};

export const approveOvertimeRequest = async (
  ctx: ServiceContext,
  requestId: string
): Promise<ServiceResult<OvertimeRequestRow>> => {
  try {
    await requireOvertimeEntitlement(ctx);
    requirePermission("manage_attendance", ctx);

    const { data, error } = await ctx.supabase
      .from("overtime_requests")
      .update({
        status: "approved",
        reviewed_by: ctx.userProfileId,
        reviewed_at: new Date().toISOString()
      })
      .eq("id", requestId)
      .eq("company_id", ctx.companyId)
      .eq("status", "pending")
      .is("is_deleted", false)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return { ok: false, error: error?.message ?? "Overtime approval failed" };
    }

    return { ok: true, data: data as OvertimeRequestRow };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Overtime approval failed" };
  }
};

export const rejectOvertimeRequest = async (
  ctx: ServiceContext,
  requestId: string,
  reason: string
): Promise<ServiceResult<OvertimeRequestRow>> => {
  try {
    await requireOvertimeEntitlement(ctx);
    requirePermission("manage_attendance", ctx);

    if (!reason || reason.trim().length === 0) {
      return { ok: false, error: "Rejection reason required" };
    }

    const { data, error } = await ctx.supabase
      .from("overtime_requests")
      .update({
        status: "rejected",
        rejection_reason: reason.trim(),
        reviewed_by: ctx.userProfileId,
        reviewed_at: new Date().toISOString()
      })
      .eq("id", requestId)
      .eq("company_id", ctx.companyId)
      .eq("status", "pending")
      .is("is_deleted", false)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return { ok: false, error: error?.message ?? "Overtime rejection failed" };
    }

    return { ok: true, data: data as OvertimeRequestRow };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Overtime rejection failed" };
  }
};
