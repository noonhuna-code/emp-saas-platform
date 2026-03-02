import type { SupabaseClient } from "@supabase/supabase-js";
import type { ServiceContext, ServiceResult } from "../lib/types";
import { assertEmployeeScope, requirePermission } from "../lib/auth-wrapper";
import { requirePlanFeature } from "../lib/entitlements";

export type ClockInPayload = {
  deviceId?: string;
  source?: string;
};

export type AttendanceCorrectionRequestPayload = {
  requested_clock_in?: string | null;
  requested_clock_out?: string | null;
  reason: string;
  note?: string | null;
};

export type AttendanceCorrectionListFilters = {
  employeeId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
};

export type AttendanceCorrectionReviewRow = {
  id: string;
  company_id: string;
  attendance_id: string;
  requested_check_in?: string | null;
  requested_check_out?: string | null;
  reason: string;
  rejection_reason?: string | null;
  status: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at?: string | null;
  attendance: {
    id: string;
    employee_id: string;
    attendance_date?: string | null;
    check_in?: string | null;
    check_out?: string | null;
  } | null;
  employee: {
    id: string;
    user_profile_id?: string | null;
    full_name?: string | null;
    department_id?: string | null;
    team_id?: string | null;
  } | null;
};

export type AttendanceTodayRecord = {
  id: string;
  attendance_date: string;
  check_in: string | null;
  check_out: string | null;
  status: string | null;
  work_minutes: number | null;
  overtime_minutes: number | null;
  late_minutes: number | null;
  shift_start_time: string | null;
  shift_end_time: string | null;
  early_logout: boolean | null;
  missing_logout: boolean | null;
  is_locked: boolean;
  correction_status: string | null;
};

export type AttendanceTodayResponse = {
  employeeId: string;
  todayDate: string;
  currentStatus: "not_clocked_in" | "clocked_in" | "on_break" | "clocked_out";
  isOnBreak: boolean;
  record: AttendanceTodayRecord | null;
};

export type AttendanceHistoryRow = {
  id: string;
  attendance_date: string;
  shift_start_time: string | null;
  shift_end_time: string | null;
  check_in: string | null;
  check_out: string | null;
  status: string | null;
  work_minutes: number | null;
  overtime_minutes: number | null;
  late_minutes: number | null;
  is_late: boolean;
  is_absent: boolean;
  is_locked: boolean;
  correction_status: string | null;
  latest_correction_id: string | null;
};

export type AttendanceHistoryResponse = {
  employeeId: string;
  rows: AttendanceHistoryRow[];
  page: number;
  pageSize: number;
  total: number;
};

export type TeamAttendanceRow = {
  employee_id: string;
  employee_name?: string | null;
  department_id?: string | null;
  attendance_date: string;
  status: string | null;
  check_in: string | null;
  check_out: string | null;
  work_minutes: number | null;
  overtime_minutes: number | null;
  late_minutes?: number | null;
};

export type TeamAttendanceResponse = {
  date: string;
  rows: TeamAttendanceRow[];
};

export type AttendanceHistoryFilters = {
  page?: number;
  pageSize?: number;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
};

export type TeamAttendanceFilters = {
  status?: string;
  departmentId?: string;
};

type AttendanceRecordForCorrection = {
  id: string;
  employee_id: string;
  attendance_date?: string | null;
  is_night_shift?: boolean | null;
  check_in?: string | null;
  check_out?: string | null;
};

type AttendanceCorrectionRow = {
  id: string;
  company_id: string;
  attendance_id: string;
  requested_check_in?: string | null;
  requested_check_out?: string | null;
  reason: string;
  rejection_reason?: string | null;
  status: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at?: string | null;
};

const MAX_REVIEW_LIMIT = 200;

const getActorProfileId = async (
  client: SupabaseClient,
  ctx: ServiceContext
): Promise<string | null> => {
  const { data: actorProfile, error } = await client
    .from("user_profiles")
    .select("id")
    .eq("user_id", ctx.userId)
    .eq("company_id", ctx.companyId)
    .is("is_deleted", false)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (actorProfile?.id as string | undefined) ?? null;
};

const resolveCurrentEmployeeId = async (
  client: SupabaseClient,
  ctx: ServiceContext
): Promise<string | null> => {
  const profileId = await getActorProfileId(client, ctx);
  if (!profileId) {
    return null;
  }

  const { data: employee, error } = await client
    .from("employees")
    .select("id")
    .eq("company_id", ctx.companyId)
    .eq("user_profile_id", profileId)
    .is("is_deleted", false)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (employee?.id as string | undefined) ?? null;
};

const normalizeCorrectionRequestInput = (
  reasonOrPayload: string | AttendanceCorrectionRequestPayload
): AttendanceCorrectionRequestPayload => {
  if (typeof reasonOrPayload === "string") {
    return {
      reason: reasonOrPayload
    };
  }

  return {
    requested_clock_in: reasonOrPayload.requested_clock_in ?? null,
    requested_clock_out: reasonOrPayload.requested_clock_out ?? null,
    reason: reasonOrPayload.reason,
    note: reasonOrPayload.note ?? null
  };
};

const composeStoredCorrectionReason = (payload: AttendanceCorrectionRequestPayload): string => {
  const reason = payload.reason.trim();
  const note = payload.note?.trim();

  if (!note) {
    return reason;
  }

  // Schema has no dedicated note column; preserve note content in the reason text.
  return `${reason}\n\nNote: ${note}`;
};

const parseTimestampOrNull = (value?: string | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid requested correction timestamp");
  }
  return parsed;
};

const toIsoDateUtc = (value: Date): string => value.toISOString().slice(0, 10);

const addUtcDate = (dateText: string, days: number): string => {
  const base = new Date(`${dateText}T00:00:00.000Z`);
  if (Number.isNaN(base.getTime())) {
    return dateText;
  }
  base.setUTCDate(base.getUTCDate() + days);
  return toIsoDateUtc(base);
};

const validateRequestedCorrectionTimes = (
  attendance: AttendanceRecordForCorrection,
  payload: AttendanceCorrectionRequestPayload
): void => {
  const requestedIn = parseTimestampOrNull(payload.requested_clock_in);
  const requestedOut = parseTimestampOrNull(payload.requested_clock_out);

  if (requestedIn && requestedOut && requestedOut.getTime() <= requestedIn.getTime()) {
    throw new Error("Requested clock-out must be later than requested clock-in");
  }

  if (!attendance.attendance_date) {
    return;
  }

  const allowedDates = new Set<string>([attendance.attendance_date]);
  if (attendance.is_night_shift) {
    allowedDates.add(addUtcDate(attendance.attendance_date, 1));
  }

  if (requestedIn && !allowedDates.has(toIsoDateUtc(requestedIn))) {
    throw new Error("Requested clock-in is outside the attendance record date");
  }

  if (requestedOut && !allowedDates.has(toIsoDateUtc(requestedOut))) {
    throw new Error("Requested clock-out is outside the attendance record date");
  }
};

const normalizeReviewLimit = (limit?: number): number => {
  if (!limit || Number.isNaN(limit)) {
    return 100;
  }
  return Math.max(1, Math.min(MAX_REVIEW_LIMIT, Math.floor(limit)));
};

const mapCorrectionStatusError = (status: string): string => {
  return status === "pending"
    ? "Correction is pending"
    : `Correction already ${status}`;
};

const sanitizeError = (message: string | undefined, fallback: string): string => {
  if (!message) return fallback;
  if (message === "UNAUTHENTICATED" || message.includes("JWT")) return "Authentication required";
  if (message === "ACTOR_MISMATCH" || message === "TENANT_RESOLUTION_FAILED") return "Permission denied";
  if (message === "APPROVAL_NOT_PENDING") return "Correction already processed";
  if (message === "ATTENDANCE_NOT_FOUND") return "Attendance record not found";
  if (message === "INVALID_STATE_TRANSITION") return "Invalid state transition";
  if (message.toLowerCase().includes("permission")) return "Permission denied";
  return fallback;
};

const requireAttendanceEntitlement = async (ctx: ServiceContext): Promise<void> => {
  await requirePlanFeature(ctx, "feature.core_attendance");
};

const requireSelfAttendanceAccess = (ctx: ServiceContext): void => {
  if (ctx.permissions.includes("manage_attendance") || ctx.permissions.includes("view_attendance")) {
    return;
  }
  requirePermission("manage_attendance", ctx);
};

const ensureSelfOrManageAttendance = async (
  ctx: ServiceContext,
  employeeId: string
): Promise<void> => {
  if (ctx.permissions.includes("manage_attendance")) {
    return;
  }

  if (!ctx.permissions.includes("view_attendance")) {
    requirePermission("manage_attendance", ctx);
  }

  const currentEmployeeId = await resolveCurrentEmployeeId(ctx.supabase, ctx);
  if (!currentEmployeeId || currentEmployeeId !== employeeId) {
    throw new Error("Permission denied");
  }
};

const loadCorrectionForReview = async (
  client: SupabaseClient,
  ctx: ServiceContext,
  correctionId: string
): Promise<ServiceResult<AttendanceCorrectionRow>> => {
  const { data, error } = await client
    .from("attendance_correction_requests")
    .select(
      "id, company_id, attendance_id, requested_check_in, requested_check_out, reason, rejection_reason, status, reviewed_by, reviewed_at, created_at"
    )
    .eq("id", correctionId)
    .eq("company_id", ctx.companyId)
    .is("is_deleted", false)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data) {
    return { ok: false, error: "Correction not found" };
  }

  return { ok: true, data: data as AttendanceCorrectionRow };
};

const applyAttendanceStatusRecalculation = async (
  client: SupabaseClient,
  ctx: ServiceContext,
  attendanceId: string
): Promise<void> => {
  try {
    const { error } = await client.rpc("calculate_attendance_status", { p_attendance_id: attendanceId });
    if (error) {
      ctx.logger.warn("Attendance status recalculation RPC failed", {
        attendanceId,
        error: error.message
      });
    }
  } catch (err) {
    ctx.logger.warn("Attendance status recalculation RPC threw", {
      attendanceId,
      error: err instanceof Error ? err.message : "unknown"
    });
  }
};

export const getAttendanceToday = async (
  ctx: ServiceContext
): Promise<ServiceResult<AttendanceTodayResponse>> => {
  try {
    await requireAttendanceEntitlement(ctx);
    requireSelfAttendanceAccess(ctx);

    const employeeId = await resolveCurrentEmployeeId(ctx.supabase, ctx);
    if (!employeeId) {
      return { ok: false, error: "Employee record not found" };
    }

    const today = new Date().toISOString().slice(0, 10);

    const { data: record, error: recordError } = await ctx.supabase
      .from("attendance_records")
      .select(
        "id, attendance_date, check_in, check_out, status, work_minutes, overtime_minutes, late_minutes, shift_start_time, shift_end_time, early_logout, missing_logout"
      )
      .eq("company_id", ctx.companyId)
      .eq("employee_id", employeeId)
      .eq("attendance_date", today)
      .is("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recordError) {
      return { ok: false, error: "Unable to load attendance status" };
    }

    if (!record?.id) {
      return {
        ok: true,
        data: {
          employeeId,
          todayDate: today,
          currentStatus: "not_clocked_in",
          isOnBreak: false,
          record: null
        }
      };
    }

    const { data: openBreak, error: breakError } = await ctx.supabase
      .from("attendance_breaks")
      .select("id")
      .eq("company_id", ctx.companyId)
      .eq("attendance_id", record.id)
      .is("break_end", null)
      .is("is_deleted", false)
      .limit(1)
      .maybeSingle();

    if (breakError) {
      return { ok: false, error: "Unable to load attendance status" };
    }

    const { data: correctionRows } = await ctx.supabase
      .from("attendance_correction_requests")
      .select("status, created_at")
      .eq("company_id", ctx.companyId)
      .eq("attendance_id", record.id)
      .is("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(1);

    const latestCorrection = (correctionRows ?? [])[0] as { status?: string | null } | undefined;
    const isOnBreak = Boolean(openBreak?.id);

    let currentStatus: AttendanceTodayResponse["currentStatus"] = "not_clocked_in";
    if (record.check_in && !record.check_out) {
      currentStatus = isOnBreak ? "on_break" : "clocked_in";
    } else if (record.check_in && record.check_out) {
      currentStatus = "clocked_out";
    }

    const payload: AttendanceTodayResponse = {
      employeeId,
      todayDate: today,
      currentStatus,
      isOnBreak,
      record: {
        id: record.id,
        attendance_date: record.attendance_date,
        check_in: record.check_in ?? null,
        check_out: record.check_out ?? null,
        status: record.status ?? null,
        work_minutes: record.work_minutes ?? null,
        overtime_minutes: record.overtime_minutes ?? null,
        late_minutes: record.late_minutes ?? null,
        shift_start_time: record.shift_start_time ?? null,
        shift_end_time: record.shift_end_time ?? null,
        early_logout: record.early_logout ?? null,
        missing_logout: record.missing_logout ?? null,
        is_locked: false,
        correction_status: latestCorrection?.status ?? null
      }
    };

    return { ok: true, data: payload };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Attendance status lookup error" };
  }
};

export const getAttendanceHistory = async (
  ctx: ServiceContext,
  filters: AttendanceHistoryFilters = {}
): Promise<ServiceResult<AttendanceHistoryResponse>> => {
  try {
    await requireAttendanceEntitlement(ctx);
    requireSelfAttendanceAccess(ctx);

    const employeeId = await resolveCurrentEmployeeId(ctx.supabase, ctx);
    if (!employeeId) {
      return { ok: false, error: "Employee record not found" };
    }

    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
    const dateFrom = filters.dateFrom ?? "";
    const dateTo = filters.dateTo ?? "";
    const statusFilter = (filters.status ?? "").trim().toLowerCase();

    let query = ctx.supabase
      .from("attendance_records")
      .select(
        "id, attendance_date, shift_start_time, shift_end_time, check_in, check_out, status, work_minutes, overtime_minutes, late_minutes",
        { count: "exact" }
      )
      .eq("company_id", ctx.companyId)
      .eq("employee_id", employeeId)
      .is("is_deleted", false);

    if (dateFrom) {
      query = query.gte("attendance_date", dateFrom);
    }
    if (dateTo) {
      query = query.lte("attendance_date", dateTo);
    }
    if (statusFilter && statusFilter !== "corrected") {
      query = query.eq("status", statusFilter);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const shouldFilterCorrected = statusFilter === "corrected";
    let dataQuery = query.order("attendance_date", { ascending: false });
    if (!shouldFilterCorrected) {
      dataQuery = dataQuery.range(from, to);
    }

    const { data, error, count } = await dataQuery;

    if (error) {
      return { ok: false, error: "Unable to load attendance history" };
    }

    const attendanceRows = (data ?? []) as Array<{
      id: string;
      attendance_date: string;
      shift_start_time?: string | null;
      shift_end_time?: string | null;
      check_in?: string | null;
      check_out?: string | null;
      status?: string | null;
      work_minutes?: number | null;
      overtime_minutes?: number | null;
      late_minutes?: number | null;
    }>;

    const attendanceIds = attendanceRows.map((row) => row.id);
    const latestCorrectionByAttendanceId = new Map<string, { id: string; status?: string | null }>();

    if (attendanceIds.length > 0) {
      const { data: correctionRows } = await ctx.supabase
        .from("attendance_correction_requests")
        .select("id, attendance_id, status, created_at")
        .eq("company_id", ctx.companyId)
        .is("is_deleted", false)
        .in("attendance_id", attendanceIds)
        .order("created_at", { ascending: false });

      for (const row of (correctionRows ?? []) as Array<{ id: string; attendance_id: string; status?: string | null }>) {
        if (!latestCorrectionByAttendanceId.has(row.attendance_id)) {
          latestCorrectionByAttendanceId.set(row.attendance_id, row);
        }
      }
    }

    let rows: AttendanceHistoryRow[] = attendanceRows.map((row) => {
      const latestCorrection = latestCorrectionByAttendanceId.get(row.id);
      const normalizedStatus = row.status ?? null;
      const lateMinutes = row.late_minutes ?? null;

      return {
        id: row.id,
        attendance_date: row.attendance_date,
        shift_start_time: row.shift_start_time ?? null,
        shift_end_time: row.shift_end_time ?? null,
        check_in: row.check_in ?? null,
        check_out: row.check_out ?? null,
        status: normalizedStatus,
        work_minutes: row.work_minutes ?? null,
        overtime_minutes: row.overtime_minutes ?? null,
        late_minutes: lateMinutes,
        is_late: (lateMinutes ?? 0) > 0 || normalizedStatus === "late",
        is_absent: normalizedStatus === "absent",
        is_locked: false,
        correction_status: latestCorrection?.status ?? null,
        latest_correction_id: latestCorrection?.id ?? null
      };
    });

    let total = count ?? rows.length;
    if (shouldFilterCorrected) {
      const filtered = rows.filter((row) => row.correction_status === "approved");
      total = filtered.length;
      rows = filtered.slice(from, from + pageSize);
    }

    return {
      ok: true,
      data: {
        employeeId,
        rows,
        page,
        pageSize,
        total
      }
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Attendance history lookup error" };
  }
};

export const listTeamAttendanceToday = async (
  ctx: ServiceContext,
  filters: TeamAttendanceFilters = {}
): Promise<ServiceResult<TeamAttendanceResponse>> => {
  try {
    await requireAttendanceEntitlement(ctx);
    requirePermission("manage_attendance", ctx);

    const today = new Date().toISOString().slice(0, 10);
    let query = ctx.supabase
      .from("attendance_records")
      .select(
        "id, employee_id, attendance_date, status, check_in, check_out, work_minutes, overtime_minutes, late_minutes, employees!attendance_records_employee_id_fkey(id, department_id, user_profile_id, user_profiles(full_name, avatar_url))"
      )
      .eq("company_id", ctx.companyId)
      .eq("attendance_date", today)
      .is("is_deleted", false);

    if (filters.status) {
      query = query.eq("status", filters.status);
    }
    if (filters.departmentId) {
      query = query.eq("employees.department_id", filters.departmentId);
    }

    const { data: rows, error } = await query.order("check_in", { ascending: true });
    if (error) {
      return { ok: false, error: "Unable to load team attendance" };
    }

    const mappedRows = (rows ?? []).map((row: any) => {
      const employee = row.employees as {
        user_profiles?: { full_name?: string | null } | null;
        department_id?: string | null;
      } | null;
      return {
        employee_id: row.employee_id as string,
        employee_name: employee?.user_profiles?.full_name ?? null,
        department_id: employee?.department_id ?? null,
        attendance_date: row.attendance_date as string,
        status: row.status as string | null,
        check_in: row.check_in as string | null,
        check_out: row.check_out as string | null,
        work_minutes: row.work_minutes as number | null,
        overtime_minutes: row.overtime_minutes as number | null,
        late_minutes: row.late_minutes as number | null
      } satisfies TeamAttendanceRow;
    });

    return { ok: true, data: { date: today, rows: mappedRows } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Team attendance lookup error" };
  }
};

export const clockIn = async (
  ctx: ServiceContext,
  employeeId: string,
  payload: ClockInPayload = {}
): Promise<ServiceResult<{ attendanceId: string }>> => {
  try {
    await requireAttendanceEntitlement(ctx);
    await ensureSelfOrManageAttendance(ctx, employeeId);
    assertEmployeeScope(employeeId, ctx);

    const today = new Date().toISOString().slice(0, 10);

    const { data: existing } = await ctx.supabase
      .from("attendance_records")
      .select("id")
      .eq("company_id", ctx.companyId)
      .eq("employee_id", employeeId)
      .eq("attendance_date", today)
      .is("is_deleted", false)
      .maybeSingle();

    if (existing?.id) {
      return { ok: false, error: "Already clocked in for today" };
    }

    const { data: assignment } = await ctx.supabase
      .from("employee_shift_assignments")
      .select("shift_template_id, effective_from, effective_to")
      .eq("employee_id", employeeId)
      .eq("company_id", ctx.companyId)
      .lte("effective_from", today)
      .or(`effective_to.is.null,effective_to.gte.${today}`)
      .is("is_deleted", false)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!assignment?.shift_template_id) {
      return { ok: false, error: "No active shift assignment" };
    }

    const { data: shift, error: shiftError } = await ctx.supabase
      .from("shift_templates")
      .select(
        "id, start_time, end_time, timezone, grace_minutes, auto_absent_after_minutes, min_half_day_minutes, min_full_day_minutes, is_night_shift"
      )
      .eq("id", assignment.shift_template_id)
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false)
      .maybeSingle();

    if (shiftError || !shift) {
      return { ok: false, error: shiftError?.message ?? "Shift template not found" };
    }

    const { data, error } = await ctx.supabase
      .from("attendance_records")
      .insert({
        company_id: ctx.companyId,
        employee_id: employeeId,
        attendance_date: today,
        shift_template_id: shift.id,
        shift_start_time: shift.start_time,
        shift_end_time: shift.end_time,
        shift_timezone: shift.timezone ?? "UTC",
        grace_minutes: shift.grace_minutes,
        auto_absent_after_minutes: shift.auto_absent_after_minutes,
        min_half_day_minutes: shift.min_half_day_minutes,
        min_full_day_minutes: shift.min_full_day_minutes,
        is_night_shift: shift.is_night_shift ?? false,
        check_in: new Date().toISOString(),
        status: "pending",
        approval_status: "none"
      })
      .select("id")
      .single();

    if (error || !data) {
      return { ok: false, error: error?.message ?? "Clock-in failed" };
    }

    return { ok: true, data: { attendanceId: data.id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Clock-in error" };
  }
};

export const clockOut = async (
  ctx: ServiceContext,
  employeeId: string
): Promise<ServiceResult<{ attendanceId: string }>> => {
  try {
    await requireAttendanceEntitlement(ctx);
    await ensureSelfOrManageAttendance(ctx, employeeId);
    assertEmployeeScope(employeeId, ctx);
    const today = new Date().toISOString().slice(0, 10);

    const { data: record } = await ctx.supabase
      .from("attendance_records")
      .select("id")
      .eq("company_id", ctx.companyId)
      .eq("employee_id", employeeId)
      .eq("attendance_date", today)
      .is("check_out", null)
      .is("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!record?.id) {
      return { ok: false, error: "No open attendance record" };
    }

    const { error: updateError } = await ctx.supabase
      .from("attendance_records")
      .update({
        check_out: new Date().toISOString()
      })
      .eq("id", record.id)
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false);

    if (updateError) {
      return { ok: false, error: updateError.message };
    }

    await applyAttendanceStatusRecalculation(ctx.supabase, ctx, record.id);

    return { ok: true, data: { attendanceId: record.id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Clock-out error" };
  }
};

export function requestAttendanceCorrection(
  ctx: ServiceContext,
  recordId: string,
  reason: string
): Promise<ServiceResult<{ requestId: string }>>;
export function requestAttendanceCorrection(
  ctx: ServiceContext,
  recordId: string,
  payload: AttendanceCorrectionRequestPayload
): Promise<ServiceResult<{ requestId: string }>>;
export async function requestAttendanceCorrection(
  ctx: ServiceContext,
  recordId: string,
  reasonOrPayload: string | AttendanceCorrectionRequestPayload
): Promise<ServiceResult<{ requestId: string }>> {
  try {
    await requireAttendanceEntitlement(ctx);
    requireSelfAttendanceAccess(ctx);

    const payload = normalizeCorrectionRequestInput(reasonOrPayload);
    if (!payload.reason || !payload.reason.trim()) {
      return { ok: false, error: "Correction reason is required" };
    }

    const { data: attendance, error: attendanceError } = await ctx.supabase
      .from("attendance_records")
      .select("id, employee_id, attendance_date, is_night_shift")
      .eq("id", recordId)
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false)
      .maybeSingle();

    if (attendanceError) {
      return { ok: false, error: attendanceError.message };
    }

    if (!attendance?.id) {
      return { ok: false, error: "Attendance record not found" };
    }

    const attendanceEmployeeId = attendance.employee_id as string;
    await ensureSelfOrManageAttendance(ctx, attendanceEmployeeId);
    assertEmployeeScope(attendanceEmployeeId, ctx);
    validateRequestedCorrectionTimes(attendance as AttendanceRecordForCorrection, payload);

    const actorProfileId = await getActorProfileId(ctx.supabase, ctx);
    const storedReason = composeStoredCorrectionReason(payload);

    const { data, error } = await ctx.supabase
      .from("attendance_correction_requests")
      .insert({
        company_id: ctx.companyId,
        attendance_id: recordId,
        requested_check_in: payload.requested_clock_in ?? null,
        requested_check_out: payload.requested_clock_out ?? null,
        reason: storedReason,
        status: "pending",
        created_by: actorProfileId,
        updated_by: actorProfileId
      })
      .select("id")
      .single();

    if (error || !data) {
      return { ok: false, error: error?.message ?? "Request failed" };
    }

    const { data: employee } = await ctx.supabase
      .from("employees")
      .select("manager_id")
      .eq("id", attendance.employee_id)
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false)
      .maybeSingle();

    if (employee?.manager_id) {
      const { data: manager } = await ctx.supabase
        .from("employees")
        .select("user_profile_id")
        .eq("id", employee.manager_id)
        .eq("company_id", ctx.companyId)
        .is("is_deleted", false)
        .maybeSingle();

      if (manager?.user_profile_id) {
        await ctx.supabase.from("notifications").insert({
          company_id: ctx.companyId,
          recipient_profile_id: manager.user_profile_id,
          type: "attendance_correction",
          title: "Attendance correction requested",
          message: storedReason,
          reference_type: "attendance_correction_request",
          reference_id: data.id,
          created_by: actorProfileId,
          updated_by: actorProfileId
        });
      }
    }

    return { ok: true, data: { requestId: data.id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Correction request error" };
  }
}

export const listPendingAttendanceCorrections = async (
  ctx: ServiceContext,
  filters: AttendanceCorrectionListFilters = {}
): Promise<ServiceResult<{ rows: AttendanceCorrectionReviewRow[] }>> => {
  try {
    await requireAttendanceEntitlement(ctx);
    requirePermission("manage_attendance", ctx);

    const reviewLimit = normalizeReviewLimit(filters.limit);

    const { data: correctionRows, error: correctionsError } = await ctx.supabase
      .from("attendance_correction_requests")
      .select(
        "id, company_id, attendance_id, requested_check_in, requested_check_out, reason, rejection_reason, status, reviewed_by, reviewed_at, created_at"
      )
      .eq("company_id", ctx.companyId)
      .eq("status", "pending")
      .is("is_deleted", false)
      .order("created_at", { ascending: true })
      .limit(reviewLimit);

    if (correctionsError) {
      return { ok: false, error: correctionsError.message };
    }

    const corrections = (correctionRows ?? []) as AttendanceCorrectionRow[];
    if (corrections.length === 0) {
      return { ok: true, data: { rows: [] } };
    }

    const attendanceIds = corrections.map((row) => row.attendance_id).filter(Boolean);
    if (attendanceIds.length === 0) {
      return { ok: true, data: { rows: [] } };
    }

    let attendanceQuery = ctx.supabase
      .from("attendance_records")
      .select("id, employee_id, attendance_date, check_in, check_out")
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false)
      .in("id", attendanceIds);

    if (filters.employeeId) {
      attendanceQuery = attendanceQuery.eq("employee_id", filters.employeeId);
    }
    if (filters.dateFrom) {
      attendanceQuery = attendanceQuery.gte("attendance_date", filters.dateFrom);
    }
    if (filters.dateTo) {
      attendanceQuery = attendanceQuery.lte("attendance_date", filters.dateTo);
    }

    const { data: attendanceRows, error: attendanceError } = await attendanceQuery;
    if (attendanceError) {
      return { ok: false, error: attendanceError.message };
    }

    const attendanceById = new Map<string, AttendanceRecordForCorrection>(
      ((attendanceRows ?? []) as AttendanceRecordForCorrection[]).map((row) => [row.id, row])
    );

    const employeeIds = Array.from(
      new Set(
        ((attendanceRows ?? []) as AttendanceRecordForCorrection[])
          .map((row) => row.employee_id)
          .filter((value): value is string => typeof value === "string" && value.length > 0)
      )
    );

    let employeesById = new Map<string, { id: string; user_profile_id?: string | null; department_id?: string | null; team_id?: string | null }>();
    let profilesById = new Map<string, { id: string; full_name?: string | null }>();

    if (employeeIds.length > 0) {
      const { data: employeeRows, error: employeeError } = await ctx.supabase
        .from("employees")
        .select("id, user_profile_id, department_id, team_id")
        .eq("company_id", ctx.companyId)
        .is("is_deleted", false)
        .in("id", employeeIds);

      if (employeeError) {
        return { ok: false, error: employeeError.message };
      }

      const employees = (employeeRows ?? []) as Array<{
        id: string;
        user_profile_id?: string | null;
        department_id?: string | null;
        team_id?: string | null;
      }>;

      employeesById = new Map(employees.map((row) => [row.id, row]));

      const userProfileIds = Array.from(
        new Set(
          employees
            .map((row) => row.user_profile_id)
            .filter((value): value is string => typeof value === "string" && value.length > 0)
        )
      );

      if (userProfileIds.length > 0) {
        const { data: profileRows, error: profileError } = await ctx.supabase
          .from("user_profiles")
          .select("id, full_name")
          .eq("company_id", ctx.companyId)
          .is("is_deleted", false)
          .in("id", userProfileIds);

        if (profileError) {
          return { ok: false, error: profileError.message };
        }

        profilesById = new Map(
          ((profileRows ?? []) as Array<{ id: string; full_name?: string | null }>).map((row) => [row.id, row])
        );
      }
    }

    const mappedRows = corrections
      .map((correction) => {
        const attendance = attendanceById.get(correction.attendance_id);
        if (!attendance) {
          return null;
        }

        const employee = employeesById.get(attendance.employee_id);
        const profile = employee?.user_profile_id ? profilesById.get(employee.user_profile_id) : null;

        return {
          ...correction,
          attendance: {
            id: attendance.id,
            employee_id: attendance.employee_id,
            attendance_date: attendance.attendance_date ?? null,
            check_in: attendance.check_in ?? null,
            check_out: attendance.check_out ?? null
          },
          employee: employee
            ? {
                id: employee.id,
                user_profile_id: employee.user_profile_id ?? null,
                full_name: profile?.full_name ?? null,
                department_id: employee.department_id ?? null,
                team_id: employee.team_id ?? null
              }
            : null
        };
      })
      .filter(
        (
          row
        ): row is {
          attendance: {
            id: string;
            employee_id: string;
            attendance_date: string | null;
            check_in: string | null;
            check_out: string | null;
          };
          employee: {
            id: string;
            user_profile_id: string | null;
            full_name: string | null;
            department_id: string | null;
            team_id: string | null;
          } | null;
        } & AttendanceCorrectionRow => row !== null
      )
      .sort((a, b) => {
        const aTime = new Date(a.created_at ?? 0).getTime();
        const bTime = new Date(b.created_at ?? 0).getTime();
        return aTime - bTime;
      });

    const rows = mappedRows as AttendanceCorrectionReviewRow[];

    return { ok: true, data: { rows } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Attendance correction review list error" };
  }
};

export const approveAttendanceCorrection = async (
  ctx: ServiceContext,
  correctionId: string
): Promise<ServiceResult<{ correction: AttendanceCorrectionRow }>> => {
  try {
    await requireAttendanceEntitlement(ctx);
    requirePermission("manage_attendance", ctx);
    const { data, error } = await ctx.supabase.rpc("approve_attendance_correction_atomic", {
      p_correction_id: correctionId,
      p_actor_id: ctx.userId
    });

    if (error || !data) {
      return { ok: false, error: sanitizeError(error?.message, "Attendance correction approval failed") };
    }

    return {
      ok: true,
      data: {
        correction: data as AttendanceCorrectionRow
      }
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Attendance correction approval error" };
  }
};

const rejectAttendanceCorrectionWithClient = async (
  client: SupabaseClient,
  ctx: ServiceContext,
  correctionId: string,
  reason: string
): Promise<ServiceResult<{ correction: AttendanceCorrectionRow }>> => {
  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    return { ok: false, error: "Rejection reason is required" };
  }

  const actorProfileId = await getActorProfileId(client, ctx);
  const loaded = await loadCorrectionForReview(client, ctx, correctionId);
  if (!loaded.ok) {
    return { ok: false, error: loaded.error };
  }
  if (!loaded.data) {
    return { ok: false, error: "Correction not found" };
  }

  const correction = loaded.data;
  if (correction.status !== "pending") {
    return { ok: false, error: mapCorrectionStatusError(correction.status) };
  }

  const reviewedAt = new Date().toISOString();
  const { data: updatedCorrection, error: updateError } = await client
    .from("attendance_correction_requests")
    .update({
      status: "rejected",
      rejection_reason: trimmedReason,
      reviewed_by: actorProfileId,
      reviewed_at: reviewedAt,
      updated_by: actorProfileId
    })
    .eq("id", correction.id)
    .eq("company_id", ctx.companyId)
    .eq("status", "pending")
    .is("is_deleted", false)
    .select(
      "id, company_id, attendance_id, requested_check_in, requested_check_out, reason, rejection_reason, status, reviewed_by, reviewed_at, created_at"
    )
    .single();

  if (updateError || !updatedCorrection) {
    return { ok: false, error: updateError?.message ?? "Failed to reject correction" };
  }

  return {
    ok: true,
    data: {
      correction: updatedCorrection as AttendanceCorrectionRow
    }
  };
};

export const rejectAttendanceCorrection = async (
  ctx: ServiceContext,
  correctionId: string,
  reason: string
): Promise<ServiceResult<{ correction: AttendanceCorrectionRow }>> => {
  try {
    await requireAttendanceEntitlement(ctx);
    requirePermission("manage_attendance", ctx);

    if (ctx.runInTransaction) {
      return await ctx.runInTransaction(async (client) =>
        rejectAttendanceCorrectionWithClient(client, ctx, correctionId, reason)
      );
    }

    return await rejectAttendanceCorrectionWithClient(ctx.supabase, ctx, correctionId, reason);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Attendance correction rejection error" };
  }
};
