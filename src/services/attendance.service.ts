import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ServiceContext, ServiceResult } from "../lib/types";
import { assertEmployeeScope, requirePermission } from "../lib/auth-wrapper";
import { requirePlanFeature } from "../lib/entitlements";
import { getAccessibleEmployeeScope } from "./access-scope.service";

export type ClockInPayload = {
  deviceId?: string;
  source?: string;
  geoLatitude?: number;
  geoLongitude?: number;
  geoAccuracy?: number | null;
};

export type ClockOutPayload = {
  source?: string;
  geoLatitude?: number;
  geoLongitude?: number;
  geoAccuracy?: number | null;
};

export type AttendanceBreakPayload = {
  note?: string | null;
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

export type AttendanceDayState =
  | "go_active"
  | "go_applied"
  | "leave_unpaid"
  | "leave_paid"
  | "absent"
  | "off_day"
  | "present"
  | "on_break"
  | "clocked_out"
  | "late";

export type AttendancePayrollImpact =
  | "extra_pay_go_active"
  | "extra_pay_go_applied"
  | "no_pay_unpaid_leave"
  | "no_pay_absent"
  | "paid_leave"
  | "off_day_no_deduction"
  | "normal_pay";

export type AttendanceShiftContext = {
  status: "assigned" | "unassigned" | "off_day";
  assignment_id: string | null;
  shift_template_id: string | null;
  shift_name: string | null;
  start_time: string | null;
  end_time: string | null;
  effective_from: string | null;
  effective_to: string | null;
};

export type AttendanceLeaveContext = {
  request_id: string;
  leave_type_id: string | null;
  leave_type_name: string | null;
  is_paid: boolean;
  start_date: string;
  end_date: string;
  status: string;
};

export type AttendanceHolidayContext = {
  holiday_id: string;
  holiday_name: string;
  holiday_date: string;
  go_state: "go_active" | "go_applied" | null;
};

export type AttendanceLateLoginRequest = {
  exists: boolean;
  status: "pending" | "approved" | "rejected" | null;
  requestId: string | null;
};

export type AttendanceTodayResponse = {
  employeeId: string;
  todayDate: string;
  dayState: AttendanceDayState;
  payrollImpact: AttendancePayrollImpact;
  currentStatus: "not_clocked_in" | "clocked_in" | "on_break" | "clocked_out";
  isOnBreak: boolean;
  shiftContext: AttendanceShiftContext;
  leaveContext: AttendanceLeaveContext | null;
  holidayContext: AttendanceHolidayContext | null;
  lateLoginRequest: AttendanceLateLoginRequest;
  latestGeoEvent: {
    event_type: string;
    latitude: number;
    longitude: number;
    accuracy_meters: number | null;
    source: string | null;
    captured_at: string;
  } | null;
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
  department_name?: string | null;
  team_id?: string | null;
  team_name?: string | null;
  attendance_date: string;
  status: string | null;
  day_state: AttendanceDayState;
  payroll_impact: AttendancePayrollImpact;
  leave_type_name: string | null;
  holiday_name: string | null;
  shift_name: string | null;
  check_in: string | null;
  check_out: string | null;
  work_minutes: number | null;
  overtime_minutes: number | null;
  late_minutes?: number | null;
  late_login_request: AttendanceLateLoginRequest;
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

export type ShiftTemplateRow = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  timezone: string | null;
  is_night_shift: boolean;
};

export type ShiftAssignmentRow = {
  id: string;
  employee_id: string;
  shift_template_id: string;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
};

export type ShiftAssignableEmployeeRow = {
  id: string;
  full_name: string | null;
  employee_code: string | null;
  designation: string | null;
  department_name: string | null;
  team_name: string | null;
  is_direct_report: boolean;
};

export type ShiftSwapRequestRow = {
  id: string;
  employee_id: string;
  employee_name: string | null;
  attendance_date: string;
  old_shift_template_id: string;
  old_shift_name: string | null;
  requested_shift_template_id: string;
  requested_shift_name: string | null;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
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

type AttendanceDayStateClassifierInput = {
  attendanceDate: string;
  holiday: {
    id: string;
    name: string;
    date: string;
  } | null;
  goAssigned: boolean;
  leave: AttendanceLeaveContext | null;
  explicitAbsent: boolean;
  shiftAssigned: boolean;
  attendanceStatus: string | null;
  hasCheckIn: boolean;
  hasCheckOut: boolean;
  isOnBreak: boolean;
  workMinutes: number | null;
  lateMinutes: number | null;
  attendanceCheckIn: string | null;
  shiftStartTime: string | null;
};

type EmployeeAttendanceScopeRow = {
  id: string;
  department_id?: string | null;
  department_name?: string | null;
  team_id?: string | null;
  team_name?: string | null;
  user_profile_id?: string | null;
  employee_name?: string | null;
};

type AttendanceRecordScopeRow = AttendanceTodayRecord & {
  employee_id: string;
};

type EmployeeDayStateSnapshot = {
  employee_id: string;
  employee_name: string | null;
  department_id: string | null;
  department_name: string | null;
  team_id: string | null;
  team_name: string | null;
  attendance_date: string;
  day_state: AttendanceDayState;
  payroll_impact: AttendancePayrollImpact;
  current_status: AttendanceTodayResponse["currentStatus"];
  is_on_break: boolean;
  record: AttendanceTodayRecord | null;
  shift_context: AttendanceShiftContext;
  leave_context: AttendanceLeaveContext | null;
  holiday_context: AttendanceHolidayContext | null;
  late_login_request: AttendanceLateLoginRequest;
  latestGeoEvent: AttendanceTodayResponse["latestGeoEvent"] | null;
};

const currentDateText = (): string => new Date().toISOString().slice(0, 10);

const getAdminEnv = (key: string): string => process.env[key] ?? "";

const createSupabaseAdminClient = (): SupabaseClient => {
  const url = getAdminEnv("SUPABASE_URL") || getAdminEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getAdminEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase admin environment variables");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

const normalizeAttendanceRecord = (
  row: Partial<AttendanceRecordScopeRow> & { id: string; attendance_date: string; employee_id: string }
): AttendanceRecordScopeRow => ({
  id: row.id,
  employee_id: row.employee_id,
  attendance_date: row.attendance_date,
  check_in: row.check_in ?? null,
  check_out: row.check_out ?? null,
  status: row.status ?? null,
  work_minutes: row.work_minutes ?? null,
  overtime_minutes: row.overtime_minutes ?? null,
  late_minutes: row.late_minutes ?? null,
  shift_start_time: row.shift_start_time ?? null,
  shift_end_time: row.shift_end_time ?? null,
  early_logout: row.early_logout ?? null,
  missing_logout: row.missing_logout ?? null,
  is_locked: Boolean(row.is_locked),
  correction_status: row.correction_status ?? null
});

export const deriveAttendanceCurrentStatus = (
  record: Pick<AttendanceTodayRecord, "check_in" | "check_out"> | null,
  isOnBreak: boolean
): AttendanceTodayResponse["currentStatus"] => {
  if (!record?.check_in) return "not_clocked_in";
  if (record.check_in && !record.check_out) {
    return isOnBreak ? "on_break" : "clocked_in";
  }
  if (record.check_in && record.check_out) {
    return "clocked_out";
  }
  return "not_clocked_in";
};

const hasWorkedAttendanceTruth = (
  input: Pick<AttendanceDayStateClassifierInput, "attendanceStatus" | "hasCheckIn" | "workMinutes">
): boolean => {
  if (input.hasCheckIn) return true;
  if ((input.workMinutes ?? 0) > 0) return true;
  return ["present", "late", "half_day", "pending"].includes((input.attendanceStatus ?? "").toLowerCase());
};

const LATE_LOGIN_REASON = "Late Login";

const isLateLoginReason = (reason?: string | null): boolean => {
  const normalized = (reason ?? "").trim().toLowerCase();
  return normalized === LATE_LOGIN_REASON.toLowerCase() || normalized.startsWith(`${LATE_LOGIN_REASON.toLowerCase()}\n`);
};

const parseDateTimeSafe = (value?: string | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parseTimeOnDate = (dateText: string, timeText?: string | null): Date | null => {
  if (!timeText) return null;
  const parsed = new Date(`${dateText}T${timeText}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isLateBeyondPtclThreshold = (
  attendanceDate: string,
  checkIn: string | null,
  shiftStartTime: string | null
): boolean => {
  const actual = parseDateTimeSafe(checkIn);
  const shiftStart = parseTimeOnDate(attendanceDate, shiftStartTime);
  if (!actual || !shiftStart) return false;
  return actual.getTime() > shiftStart.getTime() + 5 * 60 * 1000;
};

export const classifyAttendanceDayState = (
  input: AttendanceDayStateClassifierInput
): {
  dayState: AttendanceDayState;
  payrollImpact: AttendancePayrollImpact;
  currentStatus: AttendanceTodayResponse["currentStatus"];
  holidayGoState: AttendanceHolidayContext["go_state"] | null;
} => {
  const currentStatus = deriveAttendanceCurrentStatus(
    input.hasCheckIn || input.hasCheckOut
      ? {
          check_in: input.hasCheckIn ? "1" : null,
          check_out: input.hasCheckOut ? "1" : null
        }
      : null,
    input.isOnBreak
  );
  const workedHoliday = input.holiday ? hasWorkedAttendanceTruth(input) : false;
  const isLate =
    (input.attendanceStatus ?? "").toLowerCase() === "late"
    || (input.lateMinutes ?? 0) > 0
    || isLateBeyondPtclThreshold(input.attendanceDate, input.attendanceCheckIn, input.shiftStartTime);

  if (input.holiday && workedHoliday) {
    return {
      dayState: "go_active",
      payrollImpact: "extra_pay_go_active",
      currentStatus,
      holidayGoState: "go_active"
    };
  }

  if (input.holiday && input.goAssigned && !workedHoliday) {
    return {
      dayState: "go_applied",
      payrollImpact: "extra_pay_go_applied",
      currentStatus: "not_clocked_in",
      holidayGoState: "go_applied"
    };
  }

  if (input.leave && !input.leave.is_paid) {
    return {
      dayState: "leave_unpaid",
      payrollImpact: "no_pay_unpaid_leave",
      currentStatus: "not_clocked_in",
      holidayGoState: null
    };
  }

  if (input.leave && input.leave.is_paid) {
    return {
      dayState: "leave_paid",
      payrollImpact: "paid_leave",
      currentStatus: "not_clocked_in",
      holidayGoState: null
    };
  }

  if (input.explicitAbsent) {
    return {
      dayState: "absent",
      payrollImpact: "no_pay_absent",
      currentStatus: "not_clocked_in",
      holidayGoState: null
    };
  }

  if (!input.shiftAssigned) {
    return {
      dayState: "off_day",
      payrollImpact: "off_day_no_deduction",
      currentStatus: "not_clocked_in",
      holidayGoState: null
    };
  }

  if (isLate) {
    return {
      dayState: "late",
      payrollImpact: "normal_pay",
      currentStatus,
      holidayGoState: null
    };
  }
  if (currentStatus === "on_break") {
    return { dayState: "on_break", payrollImpact: "normal_pay", currentStatus, holidayGoState: null };
  }
  if (currentStatus === "clocked_out") {
    return { dayState: "clocked_out", payrollImpact: "normal_pay", currentStatus, holidayGoState: null };
  }
  if (currentStatus === "clocked_in") {
    return { dayState: "present", payrollImpact: "normal_pay", currentStatus, holidayGoState: null };
  }

  return {
    dayState: "present",
    payrollImpact: "normal_pay",
    currentStatus: "not_clocked_in",
    holidayGoState: null
  };
};

const buildShiftContext = (shift: {
  id: string;
  shift_template_id: string | null;
  effective_from: string | null;
  effective_to: string | null;
  shift_name: string | null;
  start_time: string | null;
  end_time: string | null;
} | null): AttendanceShiftContext => {
  if (!shift?.id) {
    return {
      status: "off_day",
      assignment_id: null,
      shift_template_id: null,
      shift_name: null,
      start_time: null,
      end_time: null,
      effective_from: null,
      effective_to: null
    };
  }

  return {
    status: "assigned",
    assignment_id: shift.id,
    shift_template_id: shift.shift_template_id,
    shift_name: shift.shift_name,
    start_time: shift.start_time,
    end_time: shift.end_time,
    effective_from: shift.effective_from,
    effective_to: shift.effective_to
  };
};

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

const hasAttendanceActorPermission = (ctx: ServiceContext): boolean => {
  return (
    ctx.permissions.includes("manage_attendance")
    || ctx.permissions.includes("view_attendance")
    || ctx.permissions.includes("approve_attendance")
    || ctx.permissions.includes("override_attendance")
    || ctx.permissions.includes("manage_employees")
  );
};

const hasShiftAssignmentPermission = (ctx: ServiceContext): boolean => {
  return (
    ctx.permissions.includes("manage_employees")
    || ctx.permissions.includes("manage_attendance")
    || ctx.permissions.includes("assign_shifts")
    || ctx.permissions.includes("manage_shifts")
  );
};

const requireSelfAttendanceAccess = async (ctx: ServiceContext): Promise<void> => {
  if (hasAttendanceActorPermission(ctx)) {
    return;
  }

  const currentEmployeeId = await resolveCurrentEmployeeId(ctx.supabase, ctx);
  if (currentEmployeeId) {
    return;
  }

  throw new Error("Missing permission: view_attendance");
};

const ensureSelfOrManageAttendance = async (
  ctx: ServiceContext,
  employeeId: string
): Promise<void> => {
  if (
    ctx.permissions.includes("manage_attendance")
    || ctx.permissions.includes("manage_employees")
    || ctx.permissions.includes("assign_shifts")
    || ctx.permissions.includes("approve_attendance")
    || ctx.permissions.includes("override_attendance")
  ) {
    return;
  }

  const currentEmployeeId = await resolveCurrentEmployeeId(ctx.supabase, ctx);
  if (!currentEmployeeId) {
    throw new Error("Employee record not found");
  }

  if (currentEmployeeId === employeeId) {
    return;
  }

  throw new Error("Permission denied");
};

const loadOpenAttendanceRecordForToday = async (
  client: SupabaseClient,
  ctx: ServiceContext,
  employeeId: string
): Promise<{
  id: string;
  check_in: string | null;
  check_out: string | null;
  is_locked?: boolean | null;
} | null> => {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await client
    .from("attendance_records")
    .select("id, check_in, check_out, is_locked")
    .eq("company_id", ctx.companyId)
    .eq("employee_id", employeeId)
    .eq("attendance_date", today)
    .is("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.id) {
    return null;
  }

  return {
    id: data.id as string,
    check_in: (data.check_in as string | null) ?? null,
    check_out: (data.check_out as string | null) ?? null,
    is_locked: (data.is_locked as boolean | null) ?? null,
  };
};

const loadOpenBreak = async (
  client: SupabaseClient,
  ctx: ServiceContext,
  attendanceId: string
): Promise<{
  id: string;
  break_start: string;
} | null> => {
  const { data, error } = await client
    .from("attendance_breaks")
    .select("id, break_start")
    .eq("company_id", ctx.companyId)
    .eq("attendance_id", attendanceId)
    .is("break_end", null)
    .is("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.id) {
    return null;
  }

  return {
    id: data.id as string,
    break_start: data.break_start as string,
  };
};

const requireShiftSwapReviewAccess = (ctx: ServiceContext): void => {
  if (
    ctx.permissions.includes("manage_attendance")
    || ctx.permissions.includes("manage_employees")
    || ctx.permissions.includes("assign_shifts")
    || ctx.permissions.includes("approve_attendance")
  ) {
    return;
  }
  throw new Error("Permission denied");
};

const parseIsoDate = (value: string): Date | null => {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime())) return null;
  return parsed;
};

const parseGeoNumber = (value: unknown): number | null => {
  if (typeof value !== "number") return null;
  if (!Number.isFinite(value)) return null;
  return value;
};

const recordAttendanceGeoEvent = async (
  ctx: ServiceContext,
  payload: {
    attendanceId: string;
    employeeId: string;
    eventType: "clock_in" | "clock_out";
    source?: string;
    geoLatitude?: number;
    geoLongitude?: number;
    geoAccuracy?: number | null;
  }
): Promise<void> => {
  const writeClient = createSupabaseAdminClient();
  const latitude = parseGeoNumber(payload.geoLatitude);
  const longitude = parseGeoNumber(payload.geoLongitude);
  if (latitude === null || longitude === null) return;

  const actorProfileId = await getActorProfileId(ctx.supabase, ctx);
  if (!actorProfileId) return;

  await writeClient.from("attendance_geo_events").insert({
    company_id: ctx.companyId,
    employee_id: payload.employeeId,
    attendance_id: payload.attendanceId,
    event_type: payload.eventType,
    latitude,
    longitude,
    accuracy_meters: parseGeoNumber(payload.geoAccuracy),
    source: payload.source?.trim() || "web",
    captured_at: new Date().toISOString(),
    created_by: actorProfileId
  });
};

const loadEmployeeScopeRow = async (
  client: SupabaseClient,
  companyId: string,
  employeeId: string
): Promise<{
  id: string;
  manager_id: string | null;
  department_id: string | null;
  team_id: string | null;
} | null> => {
  const { data, error } = await client
    .from("employees")
    .select("id, manager_id, department_id, team_id")
    .eq("company_id", companyId)
    .eq("id", employeeId)
    .is("is_deleted", false)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.id) return null;
  return {
    id: data.id as string,
    manager_id: (data.manager_id as string | null) ?? null,
    department_id: (data.department_id as string | null) ?? null,
    team_id: (data.team_id as string | null) ?? null
  };
};

const ensureHierarchyAssignable = async (ctx: ServiceContext, targetEmployeeId: string): Promise<void> => {
  if (ctx.permissions.includes("manage_employees")) {
    return;
  }

  if (!(ctx.permissions.includes("manage_attendance") || ctx.permissions.includes("assign_shifts") || ctx.permissions.includes("manage_shifts"))) {
    throw new Error("Permission denied");
  }
  const actorEmployeeId = await resolveCurrentEmployeeId(ctx.supabase, ctx);
  if (!actorEmployeeId) {
    throw new Error("Permission denied");
  }
  if (actorEmployeeId === targetEmployeeId) {
    return;
  }

  const [actor, target] = await Promise.all([
    loadEmployeeScopeRow(ctx.supabase, ctx.companyId, actorEmployeeId),
    loadEmployeeScopeRow(ctx.supabase, ctx.companyId, targetEmployeeId)
  ]);

  if (!actor || !target) {
    throw new Error("Employee record not found");
  }

  if (target.manager_id === actor.id) {
    return;
  }

  if (actor.team_id && target.team_id && actor.team_id === target.team_id) {
    return;
  }

  throw new Error("Permission denied");
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
    await requireSelfAttendanceAccess(ctx);

    const employeeId = await resolveCurrentEmployeeId(ctx.supabase, ctx);
    if (!employeeId) {
      return { ok: false, error: "Employee record not found" };
    }

    const today = currentDateText();
    const [snapshot] = await loadEmployeeDateStates(
      ctx,
      [
        {
          id: employeeId,
          employee_name: null,
          department_id: null,
          department_name: null,
          team_id: null,
          team_name: null
        }
      ],
      today,
      { includeGeo: true }
    );

    if (!snapshot) {
      return { ok: false, error: "Unable to load attendance status" };
    }

    const payload: AttendanceTodayResponse = {
      employeeId,
      todayDate: today,
      dayState: snapshot.day_state,
      payrollImpact: snapshot.payroll_impact,
      currentStatus: snapshot.current_status,
      isOnBreak: snapshot.is_on_break,
      shiftContext: snapshot.shift_context,
      leaveContext: snapshot.leave_context,
      holidayContext: snapshot.holiday_context,
      lateLoginRequest: snapshot.late_login_request,
      latestGeoEvent: snapshot.latestGeoEvent ?? null,
      record: snapshot.record
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
    await requireSelfAttendanceAccess(ctx);

    const employeeId = await resolveCurrentEmployeeId(ctx.supabase, ctx);
    if (!employeeId) {
      return { ok: false, error: "Employee record not found" };
    }

    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
    const dateFrom = filters.dateFrom ?? "";
    const dateTo = filters.dateTo ?? "";
    const statusFilter = (filters.status ?? "").trim().toLowerCase();
    const readClient = createSupabaseAdminClient();

    let query = readClient
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
      const { data: correctionRows } = await readClient
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
    if (
      !ctx.permissions.includes("manage_attendance") &&
      !ctx.permissions.includes("manage_employees") &&
      !ctx.permissions.includes("manage_company")
    ) {
      requirePermission("manage_attendance", ctx);
    }

    const today = currentDateText();
    const scope = await getAccessibleEmployeeScope(ctx);
    let employeesQuery = ctx.supabase
      .from("employees")
      .select("id, department_id, team_id, user_profile_id, departments(name), teams(name), user_profiles(full_name)")
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false);

    if (!scope.broadAccess) {
      const scopedIds = Array.from(scope.ids);
      if (scopedIds.length === 0) {
        return { ok: true, data: { date: today, rows: [] } };
      }
      employeesQuery = employeesQuery.in("id", scopedIds);
    }
    if (filters.departmentId) {
      employeesQuery = employeesQuery.eq("department_id", filters.departmentId);
    }

    const { data: employeeRows, error } = await employeesQuery.order("id", { ascending: true });
    if (error) {
      return { ok: false, error: "Unable to load team attendance" };
    }

    const snapshots = await loadEmployeeDateStates(
      ctx,
      ((employeeRows ?? []) as Array<any>).map((row) => ({
        id: row.id as string,
        employee_name: (row.user_profiles?.full_name as string | null) ?? null,
        department_id: (row.department_id as string | null) ?? null,
        department_name: (row.departments?.name as string | null) ?? null,
        team_id: (row.team_id as string | null) ?? null,
        team_name: (row.teams?.name as string | null) ?? null
      })),
      today
    );

    const normalizedStatusFilter = (filters.status ?? "").trim().toLowerCase();
    const mappedRows = snapshots
      .filter((row) => !normalizedStatusFilter || row.day_state === normalizedStatusFilter || (row.record?.status ?? "").toLowerCase() === normalizedStatusFilter)
      .sort((left, right) => {
        const leftName = left.employee_name ?? "";
        const rightName = right.employee_name ?? "";
        return leftName.localeCompare(rightName);
      })
      .map((row) => ({
        employee_id: row.employee_id,
        employee_name: row.employee_name,
        department_id: row.department_id,
        department_name: row.department_name,
        team_id: row.team_id,
        team_name: row.team_name,
        attendance_date: row.attendance_date,
        status: row.record?.status ?? row.day_state,
        day_state: row.day_state,
        payroll_impact: row.payroll_impact,
        leave_type_name: row.leave_context?.leave_type_name ?? null,
        holiday_name: row.holiday_context?.holiday_name ?? null,
        shift_name: row.shift_context.shift_name ?? null,
        check_in: row.record?.check_in ?? null,
        check_out: row.record?.check_out ?? null,
        work_minutes: row.record?.work_minutes ?? null,
        overtime_minutes: row.record?.overtime_minutes ?? null,
        late_minutes: row.record?.late_minutes ?? null,
        late_login_request: row.late_login_request
      } satisfies TeamAttendanceRow));

    return { ok: true, data: { date: today, rows: mappedRows } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Team attendance lookup error" };
  }
};

export const listShiftTemplates = async (
  ctx: ServiceContext
): Promise<ServiceResult<{ rows: ShiftTemplateRow[] }>> => {
  try {
    await requireAttendanceEntitlement(ctx);

    const { data, error } = await ctx.supabase
      .from("shift_templates")
      .select("id, name, start_time, end_time, timezone, is_night_shift")
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false)
      .order("name", { ascending: true });

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Unable to load shift templates") };
    }

    return {
      ok: true,
      data: {
        rows: (data ?? []).map((row) => ({
          id: row.id as string,
          name: row.name as string,
          start_time: row.start_time as string,
          end_time: row.end_time as string,
          timezone: (row.timezone as string | null) ?? null,
          is_night_shift: Boolean(row.is_night_shift)
        }))
      }
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Shift templates lookup failed" };
  }
};

export const listShiftAssignableEmployees = async (
  ctx: ServiceContext,
  limit = 200
): Promise<ServiceResult<{ rows: ShiftAssignableEmployeeRow[] }>> => {
  try {
    await requireAttendanceEntitlement(ctx);
    if (!hasShiftAssignmentPermission(ctx)) {
      return { ok: false, error: "Permission denied" };
    }

    const safeLimit = Math.max(1, Math.min(limit, 500));
    const actorEmployeeId = await resolveCurrentEmployeeId(ctx.supabase, ctx);

    const { data, error } = await ctx.supabase
      .from("employees")
      .select("id, employee_code, designation, manager_id, department_id, team_id, user_profiles(full_name), departments(name), teams(name)")
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false)
      .order("created_at", { ascending: true })
      .limit(safeLimit);

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Unable to load assignable employees") };
    }

    const rows = (data ?? []).map((row: any) => ({
      id: row.id as string,
      full_name: (row.user_profiles?.full_name as string | null) ?? null,
      employee_code: (row.employee_code as string | null) ?? null,
      designation: (row.designation as string | null) ?? null,
      department_name: (row.departments?.name as string | null) ?? null,
      team_name: (row.teams?.name as string | null) ?? null,
      is_direct_report: actorEmployeeId ? (row.manager_id as string | null) === actorEmployeeId : false
    }));

    const filtered = ctx.permissions.includes("manage_employees")
      ? rows
      : rows.filter((row) => row.id === actorEmployeeId || row.is_direct_report);

    return { ok: true, data: { rows: filtered } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Assignable employees lookup failed" };
  }
};

export const listShiftAssignments = async (
  ctx: ServiceContext,
  options: { employeeId?: string; limit?: number } = {}
): Promise<ServiceResult<{ employeeId: string; rows: ShiftAssignmentRow[] }>> => {
  try {
    await requireAttendanceEntitlement(ctx);

    const targetEmployeeId = options.employeeId?.trim() || (await resolveCurrentEmployeeId(ctx.supabase, ctx));
    if (!targetEmployeeId) return { ok: false, error: "Employee record not found" };

    if (ctx.permissions.includes("manage_employees")) {
      assertEmployeeScope(targetEmployeeId, ctx);
    } else if (ctx.permissions.includes("manage_attendance") || ctx.permissions.includes("assign_shifts") || ctx.permissions.includes("manage_shifts")) {
      await ensureHierarchyAssignable(ctx, targetEmployeeId);
      assertEmployeeScope(targetEmployeeId, ctx);
    } else {
      await ensureSelfOrManageAttendance(ctx, targetEmployeeId);
      assertEmployeeScope(targetEmployeeId, ctx);
    }

    const limit = Math.max(1, Math.min(options.limit ?? 20, 100));
    const { data, error } = await ctx.supabase
      .from("employee_shift_assignments")
      .select("id, employee_id, shift_template_id, effective_from, effective_to, created_at")
      .eq("company_id", ctx.companyId)
      .eq("employee_id", targetEmployeeId)
      .is("is_deleted", false)
      .order("effective_from", { ascending: false })
      .limit(limit);

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Unable to load shift assignments") };
    }

    return {
      ok: true,
      data: {
        employeeId: targetEmployeeId,
        rows: (data ?? []).map((row) => ({
          id: row.id as string,
          employee_id: row.employee_id as string,
          shift_template_id: row.shift_template_id as string,
          effective_from: row.effective_from as string,
          effective_to: (row.effective_to as string | null) ?? null,
          created_at: row.created_at as string
        }))
      }
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Shift assignments lookup failed" };
  }
};

export const assignEmployeeShift = async (
  ctx: ServiceContext,
  payload: {
    employeeId: string;
    shiftTemplateId: string;
    effectiveFrom: string;
    effectiveTo?: string | null;
  }
): Promise<ServiceResult<{ assignmentId: string }>> => {
  try {
    await requireAttendanceEntitlement(ctx);
    if (!hasShiftAssignmentPermission(ctx)) {
      return { ok: false, error: "Permission denied" };
    }

    const employeeId = payload.employeeId?.trim();
    const shiftTemplateId = payload.shiftTemplateId?.trim();
    const effectiveFrom = payload.effectiveFrom?.trim();
    const effectiveTo = payload.effectiveTo?.trim() || null;

    if (!employeeId || !shiftTemplateId || !effectiveFrom) {
      return { ok: false, error: "Employee, shift template, and effective date are required" };
    }

    await ensureHierarchyAssignable(ctx, employeeId);
    assertEmployeeScope(employeeId, ctx);
    const actorProfileId = await getActorProfileId(ctx.supabase, ctx);
    if (!actorProfileId) {
      return { ok: false, error: "Actor profile not found" };
    }

    const { data, error } = await ctx.supabase
      .from("employee_shift_assignments")
      .insert({
        company_id: ctx.companyId,
        employee_id: employeeId,
        shift_template_id: shiftTemplateId,
        effective_from: effectiveFrom,
        effective_to: effectiveTo,
        assigned_by: actorProfileId,
        created_by: actorProfileId,
        updated_by: actorProfileId
      })
      .select("id")
      .single();

    if (error || !data) {
      return { ok: false, error: sanitizeError(error?.message, "Unable to assign shift") };
    }

    const { data: employeeRow } = await ctx.supabase
      .from("employees")
      .select("user_profile_id")
      .eq("company_id", ctx.companyId)
      .eq("id", employeeId)
      .is("is_deleted", false)
      .maybeSingle();

    if (employeeRow?.user_profile_id) {
      await ctx.supabase.from("notifications").insert({
        company_id: ctx.companyId,
        recipient_profile_id: employeeRow.user_profile_id,
        type: "shift_assignment",
        title: "Shift assignment updated",
        message: `A new shift assignment is effective from ${effectiveFrom}.`,
        reference_type: "employee_shift_assignment",
        reference_id: data.id as string,
        created_by: actorProfileId,
        updated_by: actorProfileId
      });
    }

    return { ok: true, data: { assignmentId: data.id as string } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Shift assignment failed" };
  }
};

export const listShiftSwapRequests = async (
  ctx: ServiceContext,
  options: { scope?: "mine" | "review"; status?: "pending" | "approved" | "rejected"; limit?: number } = {}
): Promise<ServiceResult<{ scope: "mine" | "review"; rows: ShiftSwapRequestRow[] }>> => {
  try {
    await requireAttendanceEntitlement(ctx);
    const scope = options.scope === "review" ? "review" : "mine";
    const limit = Math.max(1, Math.min(options.limit ?? 100, 250));

    let actorEmployeeId: string | null = null;
    if (scope === "mine") {
      await requireSelfAttendanceAccess(ctx);
      actorEmployeeId = await resolveCurrentEmployeeId(ctx.supabase, ctx);
      if (!actorEmployeeId) {
        return { ok: false, error: "Employee record not found" };
      }
    } else {
      requireShiftSwapReviewAccess(ctx);
    }

    let rows: ShiftSwapRequestRow[] = [];

    if (scope === "mine" && actorEmployeeId) {
      let mineQuery = ctx.supabase
        .from("shift_change_requests")
        .select("id, employee_id, attendance_date, old_shift_template_id, requested_shift_template_id, reason, status, created_at, reviewed_at, reviewed_by")
        .eq("company_id", ctx.companyId)
        .eq("employee_id", actorEmployeeId)
        .is("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (options.status) {
        mineQuery = mineQuery.eq("status", options.status);
      }

      const { data: mineData, error: mineError } = await mineQuery;
      if (mineError) {
        return { ok: false, error: sanitizeError(mineError.message, "Unable to load shift swap requests") };
      }

      const shiftTemplateIds = Array.from(
        new Set(
          (mineData ?? [])
            .flatMap((row) => [row.old_shift_template_id as string | null, row.requested_shift_template_id as string | null])
            .filter((value): value is string => Boolean(value))
        )
      );

      let templateNameById = new Map<string, string>();
      if (shiftTemplateIds.length > 0) {
        const { data: templates, error: templatesError } = await ctx.supabase
          .from("shift_templates")
          .select("id, name")
          .eq("company_id", ctx.companyId)
          .is("is_deleted", false)
          .in("id", shiftTemplateIds);

        if (templatesError) {
          return { ok: false, error: sanitizeError(templatesError.message, "Unable to load shift swap requests") };
        }

        templateNameById = new Map((templates ?? []).map((row) => [row.id as string, row.name as string]));
      }

      rows = (mineData ?? []).map((row) => ({
        id: row.id as string,
        employee_id: row.employee_id as string,
        employee_name: null,
        attendance_date: row.attendance_date as string,
        old_shift_template_id: row.old_shift_template_id as string,
        old_shift_name: templateNameById.get(row.old_shift_template_id as string) ?? null,
        requested_shift_template_id: row.requested_shift_template_id as string,
        requested_shift_name: templateNameById.get(row.requested_shift_template_id as string) ?? null,
        reason: row.reason as string,
        status: (row.status as "pending" | "approved" | "rejected") ?? "pending",
        created_at: row.created_at as string,
        reviewed_at: (row.reviewed_at as string | null) ?? null,
        reviewed_by: (row.reviewed_by as string | null) ?? null
      }));
    } else {
      let reviewQuery = ctx.supabase
        .from("shift_change_requests")
        .select(
          "id, employee_id, attendance_date, old_shift_template_id, requested_shift_template_id, reason, status, created_at, reviewed_at, reviewed_by, employees!shift_change_requests_employee_id_fkey(user_profiles(full_name)), old_shift:shift_templates!shift_change_requests_old_shift_template_id_fkey(name), requested_shift:shift_templates!shift_change_requests_requested_shift_template_id_fkey(name)"
        )
        .eq("company_id", ctx.companyId)
        .is("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (options.status) {
        reviewQuery = reviewQuery.eq("status", options.status);
      }

      const { data: reviewData, error: reviewError } = await reviewQuery;
      if (reviewError) {
        return { ok: false, error: sanitizeError(reviewError.message, "Unable to load shift swap requests") };
      }

      rows = (reviewData ?? []).map((row: any) => ({
        id: row.id as string,
        employee_id: row.employee_id as string,
        employee_name: (row.employees?.user_profiles?.full_name as string | null) ?? null,
        attendance_date: row.attendance_date as string,
        old_shift_template_id: row.old_shift_template_id as string,
        old_shift_name: (row.old_shift?.name as string | null) ?? null,
        requested_shift_template_id: row.requested_shift_template_id as string,
        requested_shift_name: (row.requested_shift?.name as string | null) ?? null,
        reason: row.reason as string,
        status: (row.status as "pending" | "approved" | "rejected") ?? "pending",
        created_at: row.created_at as string,
        reviewed_at: (row.reviewed_at as string | null) ?? null,
        reviewed_by: (row.reviewed_by as string | null) ?? null
      }));
    }

    return { ok: true, data: { scope, rows } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Shift swap lookup failed" };
  }
};

const loadLatestGeoEvent = async (
  client: SupabaseClient,
  ctx: ServiceContext,
  employeeId: string,
  date: string
): Promise<AttendanceTodayResponse["latestGeoEvent"]> => {
  const { data } = await client
    .from("attendance_geo_events")
    .select("event_type, latitude, longitude, accuracy_meters, source, captured_at")
    .eq("company_id", ctx.companyId)
    .eq("employee_id", employeeId)
    .gte("captured_at", `${date}T00:00:00.000Z`)
    .lt("captured_at", `${date}T23:59:59.999Z`)
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return {
    event_type: data.event_type as string,
    latitude: Number(data.latitude ?? 0),
    longitude: Number(data.longitude ?? 0),
    accuracy_meters: (data.accuracy_meters as number | null) ?? null,
    source: (data.source as string | null) ?? null,
    captured_at: data.captured_at as string
  };
};

const loadEmployeeDateStates = async (
  ctx: ServiceContext,
  employeeRows: EmployeeAttendanceScopeRow[],
  date: string,
  { includeGeo = false }: { includeGeo?: boolean } = {}
): Promise<EmployeeDayStateSnapshot[]> => {
  if (employeeRows.length === 0) {
    return [];
  }

  const employeeIds = employeeRows.map((row) => row.id);
  const readClient = createSupabaseAdminClient();

  const [attendanceResult, leaveResult, holidayResult, shiftResult] = await Promise.all([
    readClient
      .from("attendance_records")
      .select(
        "id, employee_id, attendance_date, check_in, check_out, status, work_minutes, overtime_minutes, late_minutes, shift_start_time, shift_end_time, early_logout, missing_logout"
      )
      .eq("company_id", ctx.companyId)
      .eq("attendance_date", date)
      .in("employee_id", employeeIds)
      .is("is_deleted", false)
      .order("created_at", { ascending: false }),
    readClient
      .from("leave_requests")
      .select("id, employee_id, leave_type_id, start_date, end_date, status, leave_types(name, is_paid)")
      .eq("company_id", ctx.companyId)
      .eq("status", "approved")
      .in("employee_id", employeeIds)
      .lte("start_date", date)
      .gte("end_date", date)
      .is("is_deleted", false),
    readClient
      .from("company_holidays")
      .select("id, holiday_date, name")
      .eq("company_id", ctx.companyId)
      .eq("holiday_date", date)
      .eq("is_active", true)
      .is("is_deleted", false)
      .limit(1)
      .maybeSingle(),
    readClient
      .from("employee_shift_assignments")
      .select("id, employee_id, shift_template_id, effective_from, effective_to, shift_templates(name, start_time, end_time)")
      .eq("company_id", ctx.companyId)
      .in("employee_id", employeeIds)
      .lte("effective_from", date)
      .or(`effective_to.is.null,effective_to.gte.${date}`)
      .is("is_deleted", false)
      .order("effective_from", { ascending: false })
  ]);

  if (attendanceResult.error) {
    throw new Error("Unable to load attendance status");
  }
  if (leaveResult.error) {
    throw new Error("Unable to load attendance status");
  }
  if (shiftResult.error) {
    throw new Error("Unable to load attendance status");
  }

  const latestAttendanceByEmployeeId = new Map<string, AttendanceRecordScopeRow>();
  for (const row of (attendanceResult.data ?? []) as Array<{
    id: string;
    employee_id: string;
    attendance_date: string;
    check_in?: string | null;
    check_out?: string | null;
    status?: string | null;
    work_minutes?: number | null;
    overtime_minutes?: number | null;
    late_minutes?: number | null;
    shift_start_time?: string | null;
    shift_end_time?: string | null;
    early_logout?: boolean | null;
    missing_logout?: boolean | null;
  }>) {
    if (!latestAttendanceByEmployeeId.has(row.employee_id)) {
      latestAttendanceByEmployeeId.set(row.employee_id, normalizeAttendanceRecord(row));
    }
  }

  const leaveByEmployeeId = new Map<string, AttendanceLeaveContext>();
  for (const row of (leaveResult.data ?? []) as Array<{
    id: string;
    employee_id: string;
    leave_type_id?: string | null;
    start_date: string;
    end_date: string;
    status: string;
    leave_types?: { name?: string | null; is_paid?: boolean | null } | null;
  }>) {
    if (!leaveByEmployeeId.has(row.employee_id)) {
      leaveByEmployeeId.set(row.employee_id, {
        request_id: row.id as string,
        leave_type_id: (row.leave_type_id as string | null) ?? null,
        leave_type_name: row.leave_types?.name ?? null,
        is_paid: row.leave_types?.is_paid !== false,
        start_date: row.start_date,
        end_date: row.end_date,
        status: row.status
      });
    }
  }

  const shiftByEmployeeId = new Map<
    string,
    {
      id: string;
      shift_template_id: string | null;
      effective_from: string | null;
      effective_to: string | null;
      shift_name: string | null;
      start_time: string | null;
      end_time: string | null;
    }
  >();
  for (const row of (shiftResult.data ?? []) as Array<any>) {
    const employeeId = row.employee_id as string;
    if (!shiftByEmployeeId.has(employeeId)) {
      shiftByEmployeeId.set(employeeId, {
        id: row.id as string,
        shift_template_id: (row.shift_template_id as string | null) ?? null,
        effective_from: (row.effective_from as string | null) ?? null,
        effective_to: (row.effective_to as string | null) ?? null,
        shift_name: (row.shift_templates?.name as string | null) ?? null,
        start_time: (row.shift_templates?.start_time as string | null) ?? null,
        end_time: (row.shift_templates?.end_time as string | null) ?? null
      });
    }
  }

  const attendanceIds = Array.from(latestAttendanceByEmployeeId.values()).map((row) => row.id);
  const [breaksResult, correctionsResult] = await Promise.all([
    attendanceIds.length > 0
      ? readClient
          .from("attendance_breaks")
          .select("attendance_id")
          .eq("company_id", ctx.companyId)
          .in("attendance_id", attendanceIds)
          .is("break_end", null)
          .is("is_deleted", false)
      : Promise.resolve({ data: [], error: null }),
    attendanceIds.length > 0
      ? readClient
          .from("attendance_correction_requests")
          .select("id, attendance_id, status, reason, created_at")
          .eq("company_id", ctx.companyId)
          .in("attendance_id", attendanceIds)
          .is("is_deleted", false)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null })
  ]);

  if (breaksResult.error || correctionsResult.error) {
    throw new Error("Unable to load attendance status");
  }

  const openBreakAttendanceIds = new Set(
    ((breaksResult.data ?? []) as Array<{ attendance_id: string }>).map((row) => row.attendance_id)
  );
  const correctionStatusByAttendanceId = new Map<string, string | null>();
  const lateLoginRequestByAttendanceId = new Map<string, AttendanceLateLoginRequest>();
  for (const row of (correctionsResult.data ?? []) as Array<{ id: string; attendance_id: string; status?: string | null; reason?: string | null }>) {
    if (!correctionStatusByAttendanceId.has(row.attendance_id)) {
      correctionStatusByAttendanceId.set(row.attendance_id, row.status ?? null);
    }
    if (!lateLoginRequestByAttendanceId.has(row.attendance_id) && isLateLoginReason(row.reason)) {
      lateLoginRequestByAttendanceId.set(row.attendance_id, {
        exists: true,
        status: (row.status as "pending" | "approved" | "rejected" | null) ?? null,
        requestId: row.id
      });
    }
  }

  const holiday = holidayResult.data
    ? {
        id: holidayResult.data.id as string,
        name: holidayResult.data.name as string,
        date: holidayResult.data.holiday_date as string
      }
    : null;

  const snapshots = await Promise.all(
    employeeRows.map(async (employee) => {
      const record = latestAttendanceByEmployeeId.get(employee.id) ?? null;
      const isOnBreak = record ? openBreakAttendanceIds.has(record.id) : false;
      const leave = leaveByEmployeeId.get(employee.id) ?? null;
      const shift = shiftByEmployeeId.get(employee.id) ?? null;
      const goAssigned = (record?.status ?? "").toLowerCase() === "holiday";
      const classification = classifyAttendanceDayState({
        attendanceDate: date,
        holiday,
        goAssigned,
        leave,
        explicitAbsent: (record?.status ?? "").toLowerCase() === "absent",
        shiftAssigned: Boolean(shift?.id),
        attendanceStatus: record?.status ?? null,
        hasCheckIn: Boolean(record?.check_in),
        hasCheckOut: Boolean(record?.check_out),
        isOnBreak,
        workMinutes: record?.work_minutes ?? null,
        lateMinutes: record?.late_minutes ?? null,
        attendanceCheckIn: record?.check_in ?? null,
        shiftStartTime: record?.shift_start_time ?? shift?.start_time ?? null
      });

      const latestGeoEvent = includeGeo
        ? await loadLatestGeoEvent(readClient, ctx, employee.id, date)
        : null;

      const normalizedRecord = record
        ? {
            ...record,
            correction_status: correctionStatusByAttendanceId.get(record.id) ?? null,
            is_locked: record.is_locked ?? false
          }
        : null;

      return {
        employee_id: employee.id,
        employee_name: employee.employee_name ?? null,
        department_id: employee.department_id ?? null,
        department_name: employee.department_name ?? null,
        team_id: employee.team_id ?? null,
        team_name: employee.team_name ?? null,
        attendance_date: date,
        day_state: classification.dayState,
        payroll_impact: classification.payrollImpact,
        current_status: classification.currentStatus,
        is_on_break: isOnBreak,
        record: normalizedRecord,
        shift_context: buildShiftContext(shift),
        leave_context: leave,
        holiday_context: holiday
          ? {
              holiday_id: holiday.id,
              holiday_name: holiday.name,
              holiday_date: holiday.date,
              go_state: classification.holidayGoState
            }
          : null,
        late_login_request: normalizedRecord
          ? lateLoginRequestByAttendanceId.get(normalizedRecord.id) ?? { exists: false, status: null, requestId: null }
          : { exists: false, status: null, requestId: null },
        latestGeoEvent
      } satisfies EmployeeDayStateSnapshot;
    })
  );

  return snapshots;
};

export const createShiftSwapRequest = async (
  ctx: ServiceContext,
  payload: {
    attendanceDate: string;
    requestedShiftTemplateId: string;
    reason: string;
  }
): Promise<ServiceResult<{ requestId: string }>> => {
  try {
    await requireAttendanceEntitlement(ctx);
    await requireSelfAttendanceAccess(ctx);
    const employeeId = await resolveCurrentEmployeeId(ctx.supabase, ctx);
    if (!employeeId) return { ok: false, error: "Employee record not found" };

    const attendanceDate = payload.attendanceDate?.trim();
    const requestedShiftTemplateId = payload.requestedShiftTemplateId?.trim();
    const reason = payload.reason?.trim();

    if (!attendanceDate || !requestedShiftTemplateId || !reason) {
      return { ok: false, error: "Attendance date, requested shift, and reason are required" };
    }

    if (!parseIsoDate(attendanceDate)) {
      return { ok: false, error: "Invalid attendance date" };
    }

    const actorProfileId = await getActorProfileId(ctx.supabase, ctx);
    if (!actorProfileId) {
      return { ok: false, error: "Actor profile not found" };
    }

    const { data: currentAssignment, error: assignmentError } = await ctx.supabase
      .from("employee_shift_assignments")
      .select("id, shift_template_id")
      .eq("company_id", ctx.companyId)
      .eq("employee_id", employeeId)
      .lte("effective_from", attendanceDate)
      .or(`effective_to.is.null,effective_to.gte.${attendanceDate}`)
      .is("is_deleted", false)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (assignmentError) {
      return { ok: false, error: sanitizeError(assignmentError.message, "Unable to validate current shift") };
    }
    if (!currentAssignment?.shift_template_id) {
      return { ok: false, error: "No active shift assignment for selected date" };
    }

    if ((currentAssignment.shift_template_id as string) === requestedShiftTemplateId) {
      return { ok: false, error: "Requested shift is same as current shift" };
    }

    const { data: requestedShift, error: requestedShiftError } = await ctx.supabase
      .from("shift_templates")
      .select("id")
      .eq("company_id", ctx.companyId)
      .eq("id", requestedShiftTemplateId)
      .eq("is_active", true)
      .is("is_deleted", false)
      .maybeSingle();

    if (requestedShiftError || !requestedShift?.id) {
      return { ok: false, error: "Requested shift template not found" };
    }

    const { data: pendingExisting } = await ctx.supabase
      .from("shift_change_requests")
      .select("id")
      .eq("company_id", ctx.companyId)
      .eq("employee_id", employeeId)
      .eq("attendance_date", attendanceDate)
      .eq("status", "pending")
      .is("is_deleted", false)
      .limit(1)
      .maybeSingle();

    if (pendingExisting?.id) {
      return { ok: false, error: "A pending shift swap request already exists for this date" };
    }

    const { data, error } = await ctx.supabase
      .from("shift_change_requests")
      .insert({
        company_id: ctx.companyId,
        employee_id: employeeId,
        attendance_date: attendanceDate,
        old_shift_template_id: currentAssignment.shift_template_id as string,
        requested_shift_template_id: requestedShiftTemplateId,
        reason,
        status: "pending",
        requested_by: actorProfileId,
        created_by: actorProfileId,
        updated_by: actorProfileId
      })
      .select("id")
      .single();

    if (error || !data) {
      return { ok: false, error: sanitizeError(error?.message, "Unable to create shift swap request") };
    }

    const { data: actorEmployee } = await ctx.supabase
      .from("employees")
      .select("manager_id, user_profiles(full_name)")
      .eq("company_id", ctx.companyId)
      .eq("id", employeeId)
      .is("is_deleted", false)
      .maybeSingle();

    if (actorEmployee?.manager_id) {
      const { data: manager } = await ctx.supabase
        .from("employees")
        .select("user_profile_id")
        .eq("company_id", ctx.companyId)
        .eq("id", actorEmployee.manager_id as string)
        .is("is_deleted", false)
        .maybeSingle();

      if (manager?.user_profile_id) {
        await ctx.supabase.from("notifications").insert({
          company_id: ctx.companyId,
          recipient_profile_id: manager.user_profile_id as string,
          type: "shift_swap_request",
          title: "Shift swap request submitted",
          message: `${(actorEmployee.user_profiles as { full_name?: string | null } | null)?.full_name ?? "Employee"} requested a shift swap for ${attendanceDate}.`,
          reference_type: "shift_change_request",
          reference_id: data.id as string,
          created_by: actorProfileId,
          updated_by: actorProfileId
        });
      }
    }

    return { ok: true, data: { requestId: data.id as string } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Shift swap request failed" };
  }
};

export const reviewShiftSwapRequest = async (
  ctx: ServiceContext,
  payload: {
    requestId: string;
    decision: "approved" | "rejected";
    note?: string;
  }
): Promise<ServiceResult<{ requestId: string; status: "approved" | "rejected" }>> => {
  try {
    await requireAttendanceEntitlement(ctx);
    requireShiftSwapReviewAccess(ctx);

    const requestId = payload.requestId?.trim();
    const decision = payload.decision;
    const note = payload.note?.trim();
    if (!requestId || (decision !== "approved" && decision !== "rejected")) {
      return { ok: false, error: "Invalid shift swap review payload" };
    }

    const actorProfileId = await getActorProfileId(ctx.supabase, ctx);
    if (!actorProfileId) return { ok: false, error: "Actor profile not found" };

    const { data: requestRow, error: requestError } = await ctx.supabase
      .from("shift_change_requests")
      .select("id, employee_id, attendance_date, requested_shift_template_id, status, reason")
      .eq("company_id", ctx.companyId)
      .eq("id", requestId)
      .is("is_deleted", false)
      .maybeSingle();

    if (requestError) {
      return { ok: false, error: sanitizeError(requestError.message, "Unable to load shift swap request") };
    }
    if (!requestRow?.id) {
      return { ok: false, error: "Shift swap request not found" };
    }
    if ((requestRow.status as string) !== "pending") {
      return { ok: false, error: "Shift swap request already processed" };
    }

    if (decision === "approved") {
      const employeeId = requestRow.employee_id as string;
      const effectiveFrom = requestRow.attendance_date as string;
      const requestedShiftTemplateId = requestRow.requested_shift_template_id as string;

      const { data: existingAssignment, error: existingAssignmentError } = await ctx.supabase
        .from("employee_shift_assignments")
        .select("id, shift_template_id")
        .eq("company_id", ctx.companyId)
        .eq("employee_id", employeeId)
        .eq("effective_from", effectiveFrom)
        .is("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingAssignmentError) {
        return { ok: false, error: sanitizeError(existingAssignmentError.message, "Unable to apply approved shift swap") };
      }

      if (existingAssignment?.id) {
        if ((existingAssignment.shift_template_id as string) !== requestedShiftTemplateId) {
          const { error: updateAssignmentError } = await ctx.supabase
            .from("employee_shift_assignments")
            .update({
              shift_template_id: requestedShiftTemplateId,
              assigned_by: actorProfileId,
              updated_by: actorProfileId
            })
            .eq("company_id", ctx.companyId)
            .eq("id", existingAssignment.id as string)
            .is("is_deleted", false);

          if (updateAssignmentError) {
            return { ok: false, error: sanitizeError(updateAssignmentError.message, "Unable to apply approved shift swap") };
          }
        }
      } else {
        const { error: createAssignmentError } = await ctx.supabase
          .from("employee_shift_assignments")
          .insert({
            company_id: ctx.companyId,
            employee_id: employeeId,
            shift_template_id: requestedShiftTemplateId,
            effective_from: effectiveFrom,
            assigned_by: actorProfileId,
            created_by: actorProfileId,
            updated_by: actorProfileId
          });

        if (createAssignmentError) {
          return { ok: false, error: sanitizeError(createAssignmentError.message, "Unable to apply approved shift swap") };
        }
      }
    }

    const updatedReason = note ? `${requestRow.reason as string}\n\nReview note: ${note}` : (requestRow.reason as string);
    const { error: updateError } = await ctx.supabase
      .from("shift_change_requests")
      .update({
        status: decision,
        reason: updatedReason,
        reviewed_by: actorProfileId,
        reviewed_at: new Date().toISOString(),
        updated_by: actorProfileId
      })
      .eq("company_id", ctx.companyId)
      .eq("id", requestId)
      .eq("status", "pending")
      .is("is_deleted", false);

    if (updateError) {
      return { ok: false, error: sanitizeError(updateError.message, "Unable to update shift swap request") };
    }

    const { data: employeeRow } = await ctx.supabase
      .from("employees")
      .select("user_profile_id")
      .eq("company_id", ctx.companyId)
      .eq("id", requestRow.employee_id as string)
      .is("is_deleted", false)
      .maybeSingle();

    if (employeeRow?.user_profile_id) {
      await ctx.supabase.from("notifications").insert({
        company_id: ctx.companyId,
        recipient_profile_id: employeeRow.user_profile_id as string,
        type: "shift_swap_review",
        title: `Shift swap ${decision}`,
        message: decision === "approved"
          ? "Your shift swap request has been approved and your schedule was updated."
          : "Your shift swap request was rejected.",
        reference_type: "shift_change_request",
        reference_id: requestId,
        created_by: actorProfileId,
        updated_by: actorProfileId
      });
    }

    return { ok: true, data: { requestId, status: decision } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Shift swap review failed" };
  }
};

export const clockIn = async (
  ctx: ServiceContext,
  employeeId: string,
  payload: ClockInPayload = {}
): Promise<ServiceResult<{ attendanceId: string }>> => {
  try {
    await requireAttendanceEntitlement(ctx);
    await requireSelfAttendanceAccess(ctx);
    await ensureSelfOrManageAttendance(ctx, employeeId);
    assertEmployeeScope(employeeId, ctx);
    const writeClient = createSupabaseAdminClient();

    const today = currentDateText();

    const { data: existing } = await writeClient
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

    const [snapshot] = await loadEmployeeDateStates(
      ctx,
      [
        {
          id: employeeId,
          employee_name: null,
          department_id: null,
          department_name: null,
          team_id: null,
          team_name: null
        }
      ],
      today
    );

    if (snapshot?.day_state === "leave_unpaid") {
      return { ok: false, error: "You are on unpaid leave today" };
    }
    if (snapshot?.day_state === "leave_paid") {
      return { ok: false, error: "You are on leave today" };
    }
    if (snapshot?.day_state === "go_applied") {
      return { ok: false, error: "Today is a holiday" };
    }
    if (snapshot?.day_state === "absent") {
      return { ok: false, error: "You are marked absent today" };
    }
    if (snapshot?.day_state === "off_day") {
      return { ok: false, error: "No shift scheduled today" };
    }

    const { data: assignment } = await writeClient
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

    const { data: shift, error: shiftError } = await writeClient
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

    const { data, error } = await writeClient
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

    await recordAttendanceGeoEvent(ctx, {
      attendanceId: data.id as string,
      employeeId,
      eventType: "clock_in",
      source: payload.source,
      geoLatitude: payload.geoLatitude,
      geoLongitude: payload.geoLongitude,
      geoAccuracy: payload.geoAccuracy
    });

    return { ok: true, data: { attendanceId: data.id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Clock-in error" };
  }
};

export const clockOut = async (
  ctx: ServiceContext,
  employeeId: string,
  payload: ClockOutPayload = {}
): Promise<ServiceResult<{ attendanceId: string }>> => {
  try {
    await requireAttendanceEntitlement(ctx);
    await requireSelfAttendanceAccess(ctx);
    await ensureSelfOrManageAttendance(ctx, employeeId);
    assertEmployeeScope(employeeId, ctx);
    const writeClient = createSupabaseAdminClient();
    const today = new Date().toISOString().slice(0, 10);

    const { data: record } = await writeClient
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

    const { error: updateError } = await writeClient
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

    await applyAttendanceStatusRecalculation(writeClient, ctx, record.id);

    await recordAttendanceGeoEvent(ctx, {
      attendanceId: record.id as string,
      employeeId,
      eventType: "clock_out",
      source: payload.source,
      geoLatitude: payload.geoLatitude,
      geoLongitude: payload.geoLongitude,
      geoAccuracy: payload.geoAccuracy
    });

    return { ok: true, data: { attendanceId: record.id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Clock-out error" };
  }
};

export const startBreak = async (
  ctx: ServiceContext,
  employeeId: string,
  _payload: AttendanceBreakPayload = {}
): Promise<ServiceResult<{ breakId: string; attendanceId: string }>> => {
  try {
    await requireAttendanceEntitlement(ctx);
    await ensureSelfOrManageAttendance(ctx, employeeId);
    const writeClient = createSupabaseAdminClient();

    const attendanceRecord = await loadOpenAttendanceRecordForToday(writeClient, ctx, employeeId);
    if (!attendanceRecord?.id || !attendanceRecord.check_in || attendanceRecord.check_out) {
      return { ok: false, error: "No open attendance record" };
    }
    if (attendanceRecord.is_locked) {
      return { ok: false, error: "Attendance record is locked" };
    }

    const openBreak = await loadOpenBreak(writeClient, ctx, attendanceRecord.id);
    if (openBreak?.id) {
      return { ok: false, error: "Already on break" };
    }

    const actorProfileId = await getActorProfileId(ctx.supabase, ctx);
    const now = new Date().toISOString();
    const { data, error } = await writeClient
      .from("attendance_breaks")
      .insert({
        company_id: ctx.companyId,
        attendance_id: attendanceRecord.id,
        break_start: now,
        created_by: actorProfileId,
        updated_by: actorProfileId,
      })
      .select("id")
      .single();

    if (error || !data?.id) {
      return { ok: false, error: error?.message ?? "Unable to start break" };
    }

    return {
      ok: true,
      data: {
        breakId: data.id as string,
        attendanceId: attendanceRecord.id,
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unable to start break" };
  }
};

export const endBreak = async (
  ctx: ServiceContext,
  employeeId: string,
  _payload: AttendanceBreakPayload = {}
): Promise<ServiceResult<{ breakId: string; attendanceId: string }>> => {
  try {
    await requireAttendanceEntitlement(ctx);
    await ensureSelfOrManageAttendance(ctx, employeeId);
    const writeClient = createSupabaseAdminClient();

    const attendanceRecord = await loadOpenAttendanceRecordForToday(writeClient, ctx, employeeId);
    if (!attendanceRecord?.id || !attendanceRecord.check_in || attendanceRecord.check_out) {
      return { ok: false, error: "No open attendance record" };
    }
    if (attendanceRecord.is_locked) {
      return { ok: false, error: "Attendance record is locked" };
    }

    const openBreak = await loadOpenBreak(writeClient, ctx, attendanceRecord.id);
    if (!openBreak?.id) {
      return { ok: false, error: "No active break" };
    }

    const actorProfileId = await getActorProfileId(ctx.supabase, ctx);
    const breakStart = new Date(openBreak.break_start);
    const breakEnd = new Date();
    const breakMinutes = Math.max(0, Math.round((breakEnd.getTime() - breakStart.getTime()) / 60000));

    const { error } = await writeClient
      .from("attendance_breaks")
      .update({
        break_end: breakEnd.toISOString(),
        break_minutes: breakMinutes,
        updated_by: actorProfileId,
      })
      .eq("id", openBreak.id)
      .eq("company_id", ctx.companyId)
      .is("break_end", null)
      .is("is_deleted", false);

    if (error) {
      return { ok: false, error: error.message };
    }

    return {
      ok: true,
      data: {
        breakId: openBreak.id,
        attendanceId: attendanceRecord.id,
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unable to end break" };
  }
};

export const assignGoApplied = async (
  ctx: ServiceContext,
  payload: {
    employeeId: string;
    attendanceDate: string;
    note?: string | null;
  }
): Promise<ServiceResult<{ attendanceId: string }>> => {
  try {
    await requireAttendanceEntitlement(ctx);
    const writeClient = createSupabaseAdminClient();
    if (
      !ctx.permissions.includes("manage_attendance")
      && !ctx.permissions.includes("manage_employees")
      && !ctx.permissions.includes("manage_company")
    ) {
      return { ok: false, error: "Permission denied" };
    }

    const employeeId = payload.employeeId.trim();
    const attendanceDate = payload.attendanceDate.trim();
    if (!employeeId || !attendanceDate || !parseIsoDate(attendanceDate)) {
      return { ok: false, error: "Employee and valid date are required" };
    }

    await ensureHierarchyAssignable(ctx, employeeId);
    assertEmployeeScope(employeeId, ctx);

    const actorProfileId = await getActorProfileId(ctx.supabase, ctx);
    if (!actorProfileId) {
      return { ok: false, error: "Actor profile not found" };
    }

    const { data: holiday, error: holidayError } = await ctx.supabase
      .from("company_holidays")
      .select("id, holiday_date, name")
      .eq("company_id", ctx.companyId)
      .eq("holiday_date", attendanceDate)
      .eq("is_active", true)
      .is("is_deleted", false)
      .maybeSingle();

    if (holidayError) {
      return { ok: false, error: holidayError.message };
    }
    if (!holiday?.id) {
      return { ok: false, error: "GO can only be assigned on an active holiday date" };
    }

    const { data: assignment, error: assignmentError } = await ctx.supabase
      .from("employee_shift_assignments")
      .select("shift_template_id, effective_from, effective_to")
      .eq("company_id", ctx.companyId)
      .eq("employee_id", employeeId)
      .lte("effective_from", attendanceDate)
      .or(`effective_to.is.null,effective_to.gte.${attendanceDate}`)
      .is("is_deleted", false)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (assignmentError) {
      return { ok: false, error: assignmentError.message };
    }
    if (!assignment?.shift_template_id) {
      return { ok: false, error: "GO assignment requires an active shift assignment" };
    }

    const { data: shift, error: shiftError } = await writeClient
      .from("shift_templates")
      .select("id, start_time, end_time, timezone, grace_minutes, auto_absent_after_minutes, min_half_day_minutes, min_full_day_minutes, is_night_shift")
      .eq("company_id", ctx.companyId)
      .eq("id", assignment.shift_template_id)
      .is("is_deleted", false)
      .maybeSingle();

    if (shiftError || !shift?.id) {
      return { ok: false, error: shiftError?.message ?? "Shift template not found" };
    }

    const { data: existingRecord, error: existingRecordError } = await ctx.supabase
      .from("attendance_records")
      .select("id, status, check_in, check_out, work_minutes")
      .eq("company_id", ctx.companyId)
      .eq("employee_id", employeeId)
      .eq("attendance_date", attendanceDate)
      .is("is_deleted", false)
      .maybeSingle();

    if (existingRecordError) {
      return { ok: false, error: existingRecordError.message };
    }

    const workedHoliday = hasWorkedAttendanceTruth({
      attendanceStatus: (existingRecord?.status as string | null) ?? null,
      hasCheckIn: Boolean(existingRecord?.check_in),
      workMinutes: (existingRecord?.work_minutes as number | null) ?? null
    });
    if (workedHoliday) {
      return { ok: false, error: "Employee already worked on this holiday" };
    }

    const overrideReason = payload.note?.trim() || `GO Applied assigned for ${holiday.name as string}`;

    if (existingRecord?.id) {
      const { error: updateError } = await ctx.supabase
        .from("attendance_records")
        .update({
          status: "holiday",
          approval_status: "approved",
          marked_by: actorProfileId,
          override_reason: overrideReason,
          updated_by: actorProfileId
        })
        .eq("id", existingRecord.id)
        .eq("company_id", ctx.companyId)
        .is("is_deleted", false);

      if (updateError) {
        return { ok: false, error: updateError.message };
      }

      return { ok: true, data: { attendanceId: existingRecord.id as string } };
    }

    const { data: insertedRecord, error: insertError } = await ctx.supabase
      .from("attendance_records")
      .insert({
        company_id: ctx.companyId,
        employee_id: employeeId,
        attendance_date: attendanceDate,
        shift_template_id: shift.id,
        shift_start_time: shift.start_time,
        shift_end_time: shift.end_time,
        shift_timezone: shift.timezone ?? "UTC",
        grace_minutes: shift.grace_minutes,
        auto_absent_after_minutes: shift.auto_absent_after_minutes,
        min_half_day_minutes: shift.min_half_day_minutes,
        min_full_day_minutes: shift.min_full_day_minutes,
        is_night_shift: shift.is_night_shift ?? false,
        status: "holiday",
        approval_status: "approved",
        marked_by: actorProfileId,
        override_reason: overrideReason,
        created_by: actorProfileId,
        updated_by: actorProfileId
      })
      .select("id")
      .single();

    if (insertError || !insertedRecord?.id) {
      return { ok: false, error: insertError?.message ?? "Unable to assign GO" };
    }

    return { ok: true, data: { attendanceId: insertedRecord.id as string } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "GO assignment failed" };
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
    await requireSelfAttendanceAccess(ctx);
    const writeClient = createSupabaseAdminClient();

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

    const isLateLoginRequest = isLateLoginReason(payload.reason);
    if (isLateLoginRequest) {
      const [snapshot] = await loadEmployeeDateStates(
        ctx,
        [
          {
            id: attendanceEmployeeId,
            employee_name: null,
            department_id: null,
            department_name: null,
            team_id: null,
            team_name: null
          }
        ],
        attendance.attendance_date as string
      );

      if (!snapshot || snapshot.day_state !== "late") {
        return { ok: false, error: "Late Login is only available after a late clock-in" };
      }

      const { data: existingLateRequests, error: existingLateRequestsError } = await ctx.supabase
        .from("attendance_correction_requests")
        .select("id, reason")
        .eq("company_id", ctx.companyId)
        .eq("attendance_id", recordId)
        .is("is_deleted", false)
        .order("created_at", { ascending: false });

      if (existingLateRequestsError) {
        return { ok: false, error: existingLateRequestsError.message };
      }

      const hasExistingLateLoginRequest = (existingLateRequests ?? []).some((row: { reason?: string | null }) =>
        isLateLoginReason(row.reason)
      );

      if (hasExistingLateLoginRequest) {
        return { ok: false, error: "Late Login request already exists for this day" };
      }
    }

    const actorProfileId = await getActorProfileId(ctx.supabase, ctx);
    const storedReason = composeStoredCorrectionReason(payload);

    const { data, error } = await writeClient
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
