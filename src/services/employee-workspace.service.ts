import { createClient } from "@supabase/supabase-js";
import type { ServiceContext, ServiceResult } from "../lib/types";
import { requirePlanFeature } from "../lib/entitlements";
import { classifyAttendanceDayState, type AttendancePayrollImpact } from "./attendance.service";
import { getAccessibleEmployeeScope } from "./access-scope.service";

export type WorkspaceResourceRow = {
  id: string;
  title: string;
  resource_type: string;
  summary: string | null;
  link_url: string | null;
  file_url: string | null;
  created_at: string;
};

export type WorkspaceNoteRow = {
  id: string;
  title: string;
  body: string;
  file_url: string | null;
  file_name: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
};

export type WorkspaceChatRow = {
  id: string;
  sender_employee_id: string;
  recipient_employee_id: string;
  sender_name: string | null;
  recipient_name: string | null;
  message_text: string;
  created_at: string;
  direction: "in" | "out";
};

export type WorkspaceContactRow = {
  employee_id: string;
  full_name: string | null;
  employee_code: string | null;
  designation: string | null;
  department_name: string | null;
  team_name: string | null;
  avatar_url: string | null;
  is_team_lead: boolean;
  is_self: boolean;
};

export type WorkspaceNotificationRow = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  reference_type: string | null;
  reference_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

export type WorkspaceCalendarEventRow = {
  id: string;
  type: "holiday" | "leave" | "shift" | "attendance";
  title: string;
  status: string | null;
  payroll_impact: AttendancePayrollImpact | null;
  source: "company" | "pakistan_estimated" | "leave" | "shift" | "attendance";
};

export type WorkspaceCalendarFinalStatusCode =
  | "OFF"
  | "HOLIDAY"
  | "GO"
  | "PGO"
  | "AL"
  | "SL"
  | "CL"
  | "ML"
  | "UNPAID"
  | "P"
  | "PLATE"
  | "A"
  | "EMPTY";

export type WorkspaceCalendarResolvedStatusRow = {
  final_status_code: WorkspaceCalendarFinalStatusCode;
  final_status_label: string;
  holiday_name: string | null;
  leave_type: string | null;
  attendance_present: boolean;
  late_flag: boolean;
  shift_end_passed: boolean;
  priority_used: 1 | 2 | 3 | 4 | 5 | 6;
  detail_title: string | null;
  detail_subtitle: string | null;
};

export type WorkspaceCalendarDayRow = {
  date: string;
  is_today: boolean;
  events: WorkspaceCalendarEventRow[];
  resolved_status: WorkspaceCalendarResolvedStatusRow;
};

export type WorkspaceOfficialHolidayRow = {
  date: string;
  name: string;
  source: "company" | "pakistan_estimated";
};

export type WorkspaceCalendarSummaryRow = {
  entitled_leaves: number;
  used_leaves: number;
  remaining_leaves: number;
  approved_leave_days: number;
  pending_leave_days: number;
  assigned_shift_days: number;
  holidays: number;
};

export type WorkspaceCalendarRow = {
  month: string;
  range_start: string;
  range_end: string;
  timezone: string;
  company_name: string | null;
  team_lead_name: string | null;
  summary: WorkspaceCalendarSummaryRow;
  official_holidays: WorkspaceOfficialHolidayRow[];
  company_updates: WorkspaceResourceRow[];
  days: WorkspaceCalendarDayRow[];
};

const PAKISTAN_RECURRING_PUBLIC_HOLIDAYS = [
  { monthDay: "02-05", name: "Kashmir Day" },
  { monthDay: "03-23", name: "Pakistan Day" },
  { monthDay: "05-01", name: "Labour Day" },
  { monthDay: "08-14", name: "Independence Day" },
  { monthDay: "12-25", name: "Quaid-e-Azam Day / Christmas" }
] as const;

const PAKISTAN_ESTIMATED_HOLIDAYS: Record<number, Array<{ date: string; name: string }>> = {
  2024: [
    { date: "2024-04-10", name: "Eid ul Fitr (estimated)" },
    { date: "2024-04-11", name: "Eid ul Fitr Holiday (estimated)" },
    { date: "2024-04-12", name: "Eid ul Fitr Holiday (estimated)" },
    { date: "2024-06-17", name: "Eid ul Adha (estimated)" },
    { date: "2024-06-18", name: "Eid ul Adha Holiday (estimated)" },
    { date: "2024-07-16", name: "Ashura (estimated)" },
    { date: "2024-07-17", name: "Ashura Holiday (estimated)" },
    { date: "2024-09-16", name: "Eid Milad-un-Nabi (estimated)" }
  ],
  2025: [
    { date: "2025-03-31", name: "Eid ul Fitr (estimated)" },
    { date: "2025-04-01", name: "Eid ul Fitr Holiday (estimated)" },
    { date: "2025-04-02", name: "Eid ul Fitr Holiday (estimated)" },
    { date: "2025-06-07", name: "Eid ul Adha (estimated)" },
    { date: "2025-06-08", name: "Eid ul Adha Holiday (estimated)" },
    { date: "2025-06-09", name: "Eid ul Adha Holiday (estimated)" },
    { date: "2025-07-05", name: "Ashura (estimated)" },
    { date: "2025-07-06", name: "Ashura Holiday (estimated)" },
    { date: "2025-09-05", name: "Eid Milad-un-Nabi (estimated)" }
  ],
  2026: [
    { date: "2026-02-18", name: "Ramadan start (estimated)" },
    { date: "2026-03-20", name: "Eid ul Fitr (estimated)" },
    { date: "2026-03-21", name: "Eid ul Fitr Holiday (estimated)" },
    { date: "2026-03-22", name: "Eid ul Fitr Holiday (estimated)" },
    { date: "2026-05-27", name: "Eid ul Adha (estimated)" },
    { date: "2026-05-28", name: "Eid ul Adha Holiday (estimated)" },
    { date: "2026-05-29", name: "Eid ul Adha Holiday (estimated)" },
    { date: "2026-06-15", name: "Ashura (estimated)" },
    { date: "2026-06-16", name: "Ashura Holiday (estimated)" },
    { date: "2026-08-26", name: "Eid Milad-un-Nabi (estimated)" }
  ],
  2027: [
    { date: "2027-03-09", name: "Eid ul Fitr (estimated)" },
    { date: "2027-03-10", name: "Eid ul Fitr Holiday (estimated)" },
    { date: "2027-03-11", name: "Eid ul Fitr Holiday (estimated)" },
    { date: "2027-05-17", name: "Eid ul Adha (estimated)" },
    { date: "2027-05-18", name: "Eid ul Adha Holiday (estimated)" },
    { date: "2027-05-19", name: "Eid ul Adha Holiday (estimated)" },
    { date: "2027-06-04", name: "Ashura (estimated)" },
    { date: "2027-06-05", name: "Ashura Holiday (estimated)" },
    { date: "2027-08-16", name: "Eid Milad-un-Nabi (estimated)" }
  ]
};

const getPakistanPublicHolidays = (year: number): Array<{ date: string; name: string }> => [
  ...PAKISTAN_RECURRING_PUBLIC_HOLIDAYS.map((holiday) => ({
    date: `${year}-${holiday.monthDay}`,
    name: holiday.name
  })),
  ...(PAKISTAN_ESTIMATED_HOLIDAYS[year] ?? [])
];

const sanitizeError = (message: string | undefined, fallback: string): string => {
  if (!message) return fallback;
  const lower = message.toLowerCase();
  if (message === "UNAUTHENTICATED" || lower.includes("jwt")) return "Authentication required";
  if (lower.includes("permission") || lower.includes("not allowed")) return "Permission denied";
  return fallback;
};

const getAdminEnv = (key: string): string => process.env[key] ?? "";

const createWorkspaceReadClient = () => {
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

const toDateText = (date: Date): string => date.toISOString().slice(0, 10);

const parseMonthWindow = (monthParam?: string): { month: string; rangeStart: string; rangeEnd: string; year: number } => {
  const raw = (monthParam ?? "").trim();
  const monthRegex = /^\d{4}-\d{2}$/;
  const source = monthRegex.test(raw) ? raw : toDateText(new Date()).slice(0, 7);

  const [yearText, monthText] = source.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;

  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0));

  return {
    month: source,
    rangeStart: toDateText(start),
    rangeEnd: toDateText(end),
    year
  };
};

const enumerateDates = (startDate: string, endDate: string): string[] => {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start > end) {
    return [];
  }

  const dates: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(toDateText(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
};

const calendarEventPriority = (event: WorkspaceCalendarEventRow): number => {
  if (event.status === "go_active") return 0;
  if (event.type === "attendance" && ["present", "late", "on_break", "clocked_out"].includes(event.status ?? "")) return 1;
  if (event.status === "absent") return 2;
  if (event.type === "leave") return 3;
  if (event.status === "go_applied" || event.type === "holiday") return 4;
  if (event.type === "shift") return 5;
  if (event.status === "off_day") return 6;
  return 7;
};

const getTimezoneSnapshot = (timezone: string): { dateText: string; minutes: number } => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });

  const parts = formatter.formatToParts(new Date());
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const year = lookup.year ?? "1970";
  const month = lookup.month ?? "01";
  const day = lookup.day ?? "01";
  const hour = Number(lookup.hour ?? "0");
  const minute = Number(lookup.minute ?? "0");

  return {
    dateText: `${year}-${month}-${day}`,
    minutes: hour * 60 + minute
  };
};

const parseTimeToMinutes = (time: string | null | undefined): number | null => {
  if (!time) return null;
  const match = /^(\d{2}):(\d{2})/.exec(time.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

const getIsoMinutesInTimezone = (value: string | null | undefined, timezone: string): number | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return null;
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });
  const parts = formatter.formatToParts(parsed);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Number(lookup.hour ?? "0") * 60 + Number(lookup.minute ?? "0");
};

const isSundayDate = (dateText: string): boolean => new Date(`${dateText}T00:00:00.000Z`).getUTCDay() === 0;

const hasAttendancePresentTruth = (attendance: any): boolean =>
  Boolean(attendance?.check_in) || Boolean(attendance?.check_out) || Number(attendance?.work_minutes ?? 0) > 0;

const isLateAttendance = (attendance: any, shiftStartTime: string | null | undefined, timezone: string): boolean => {
  if (!hasAttendancePresentTruth(attendance)) return false;
  const status = String(attendance?.status ?? "").trim().toLowerCase();
  if (status === "late") return true;
  if (Number(attendance?.late_minutes ?? 0) > 0) return true;

  const checkInMinutes = getIsoMinutesInTimezone((attendance?.check_in as string | null | undefined) ?? null, timezone);
  const shiftStartMinutes = parseTimeToMinutes(shiftStartTime);
  if (checkInMinutes === null || shiftStartMinutes === null) return false;
  return checkInMinutes > shiftStartMinutes + 5;
};

const compactHolidayName = (title: string): string => {
  const normalized = title.trim().replace(/\s*\(estimated\)\s*/gi, "").trim();
  const lower = normalized.toLowerCase();

  if (lower.includes("eid ul fitr")) return "Eid ul Fitr";
  if (lower.includes("eid ul adha")) return "Eid ul Adha";
  if (lower.includes("ashura")) return "Ashura";
  if (lower.includes("eid milad")) return "Eid Milad";
  if (lower.includes("ramadan")) return "Ramadan";
  if (lower.includes("pakistan day")) return "Pakistan Day";
  if (lower.includes("kashmir day")) return "Kashmir Day";
  if (lower.includes("labour day")) return "Labour Day";
  if (lower.includes("independence day")) return "Independence Day";
  if (lower.includes("quaid-e-azam")) return "Quaid Day";
  if (lower.includes("christmas")) return "Christmas";

  return normalized;
};

const mapLeaveStatus = (
  leave: { name: string | null; is_paid: boolean } | null
): Pick<WorkspaceCalendarResolvedStatusRow, "final_status_code" | "final_status_label" | "leave_type"> | null => {
  if (!leave) return null;
  const rawName = leave.name?.trim() ?? "Approved Leave";
  const normalized = rawName.toLowerCase();

  if (!leave.is_paid || normalized.includes("unpaid")) {
    return {
      final_status_code: "UNPAID",
      final_status_label: "Unpaid",
      leave_type: rawName
    };
  }

  if (normalized.includes("annual")) {
    return { final_status_code: "AL", final_status_label: "AL", leave_type: rawName };
  }

  if (normalized.includes("sick")) {
    return { final_status_code: "SL", final_status_label: "SL", leave_type: rawName };
  }

  if (normalized.includes("casual")) {
    return { final_status_code: "CL", final_status_label: "CL", leave_type: rawName };
  }

  if (normalized.includes("maternity")) {
    return { final_status_code: "ML", final_status_label: "ML", leave_type: rawName };
  }

  return {
    final_status_code: "AL",
    final_status_label: rawName,
    leave_type: rawName
  };
};

const resolveCalendarDayStatus = (input: {
  date: string;
  timezone: string;
  holiday: WorkspaceOfficialHolidayRow | null;
  leaveRequest: { id: string; name: string | null; is_paid: boolean; status: string } | null;
  attendance: any | null;
  shift: { id: string; title: string; start_time: string | null; end_time: string | null } | null;
}): WorkspaceCalendarResolvedStatusRow => {
  const { date, timezone, holiday, leaveRequest, attendance, shift } = input;
  const timezoneNow = getTimezoneSnapshot(timezone);
  const attendancePresent = hasAttendancePresentTruth(attendance);
  const lateFlag = isLateAttendance(attendance, shift?.start_time, timezone);
  const goAssigned = String(attendance?.status ?? "").trim().toLowerCase() === "holiday";
  const explicitAbsent = String(attendance?.status ?? "").trim().toLowerCase() === "absent";
  const shiftEndMinutes = parseTimeToMinutes(shift?.end_time);
  const shiftEndPassed =
    Boolean(shift?.id) &&
    (date < timezoneNow.dateText ||
      (date === timezoneNow.dateText && shiftEndMinutes !== null && timezoneNow.minutes >= shiftEndMinutes));

  if (isSundayDate(date)) {
    return {
      final_status_code: "OFF",
      final_status_label: "Off Day",
      holiday_name: null,
      leave_type: null,
      attendance_present: attendancePresent,
      late_flag: lateFlag,
      shift_end_passed: shiftEndPassed,
      priority_used: 1,
      detail_title: "Sunday Off Day",
      detail_subtitle: "Sunday takes precedence over leave, attendance, and holidays."
    };
  }

  if (holiday) {
    if (goAssigned && attendancePresent) {
      return {
        final_status_code: "PGO",
        final_status_label: "P (GO)",
        holiday_name: holiday.name,
        leave_type: null,
        attendance_present: true,
        late_flag: lateFlag,
        shift_end_passed: shiftEndPassed,
        priority_used: 2,
        detail_title: holiday.name,
        detail_subtitle: "Worked on an approved Gazette / govt holiday."
      };
    }

    if (goAssigned) {
      return {
        final_status_code: "GO",
        final_status_label: "GO",
        holiday_name: holiday.name,
        leave_type: null,
        attendance_present: false,
        late_flag: false,
        shift_end_passed: shiftEndPassed,
        priority_used: 2,
        detail_title: holiday.name,
        detail_subtitle: "Gazette / govt holiday off approved by seniors."
      };
    }

    return {
      final_status_code: "HOLIDAY",
      final_status_label: compactHolidayName(holiday.name),
      holiday_name: holiday.name,
      leave_type: null,
      attendance_present: attendancePresent,
      late_flag: lateFlag,
      shift_end_passed: shiftEndPassed,
      priority_used: 2,
      detail_title: holiday.name,
      detail_subtitle: holiday.source === "pakistan_estimated" ? "Estimated Pakistan public holiday." : "Company / govt holiday."
    };
  }

  const leaveStatus = mapLeaveStatus(leaveRequest);
  if (leaveStatus) {
    const leaveRequestStatus = String(leaveRequest?.status ?? "").trim().toLowerCase();
    return {
      final_status_code: leaveStatus.final_status_code,
      final_status_label: leaveStatus.final_status_label,
      holiday_name: null,
      leave_type: leaveStatus.leave_type,
      attendance_present: attendancePresent,
      late_flag: lateFlag,
      shift_end_passed: shiftEndPassed,
      priority_used: 3,
      detail_title: leaveStatus.leave_type,
      detail_subtitle:
        leaveRequestStatus === "approved" ? "Approved leave from backend truth." : "Pending leave from backend truth."
    };
  }

  if (attendancePresent) {
    return {
      final_status_code: lateFlag ? "PLATE" : "P",
      final_status_label: lateFlag ? "P (Late)" : "P",
      holiday_name: null,
      leave_type: null,
      attendance_present: true,
      late_flag: lateFlag,
      shift_end_passed: shiftEndPassed,
      priority_used: 4,
      detail_title: lateFlag ? "Present (Late)" : "Present",
      detail_subtitle: lateFlag ? "Clock-in exists and late flag is present." : "Clock-in exists for this working day."
    };
  }

  if (explicitAbsent || shiftEndPassed || date < timezoneNow.dateText) {
    return {
      final_status_code: "A",
      final_status_label: "A",
      holiday_name: null,
      leave_type: null,
      attendance_present: false,
      late_flag: false,
      shift_end_passed: shiftEndPassed,
      priority_used: 5,
      detail_title: "Absent",
      detail_subtitle: explicitAbsent
        ? "Explicitly marked absent in attendance truth."
        : shiftEndPassed
          ? "Shift end passed with no leave and no valid clock-in."
          : "Past working day with no leave and no valid clock-in."
    };
  }

  return {
    final_status_code: "EMPTY",
    final_status_label: "",
    holiday_name: null,
    leave_type: null,
    attendance_present: false,
    late_flag: false,
    shift_end_passed: false,
    priority_used: 6,
    detail_title: shift?.title ?? null,
    detail_subtitle: shift?.id ? "Assigned shift with no resolved attendance yet." : null
  };
};

const clampDateRange = (
  startDate: string,
  endDate: string,
  windowStart: string,
  windowEnd: string
): { start: string; end: string } | null => {
  const start = startDate >= windowStart ? startDate : windowStart;
  const end = endDate <= windowEnd ? endDate : windowEnd;
  if (start > end) return null;
  return { start, end };
};

const resolveCurrentEmployeeId = async (ctx: ServiceContext): Promise<string | null> => {
  try {
    const { data, error } = await ctx.supabase.rpc("current_user_employee_id");
    if (!error && data) return data as string;
  } catch {
    // fallback below
  }

  const { data } = await ctx.supabase
    .from("employees")
    .select("id")
    .eq("company_id", ctx.companyId)
    .eq("user_profile_id", ctx.userProfileId)
    .is("is_deleted", false)
    .maybeSingle();

  return (data?.id as string | undefined) ?? null;
};

const requireWorkspaceAccess = async (ctx: ServiceContext): Promise<string> => {
  await requirePlanFeature(ctx, "feature.core_employee_management");
  const employeeId = await resolveCurrentEmployeeId(ctx);
  if (!employeeId) throw new Error("Employee record not found");
  return employeeId;
};

export const listWorkspaceResources = async (
  ctx: ServiceContext,
  limit = 30
): Promise<ServiceResult<{ rows: WorkspaceResourceRow[] }>> => {
  try {
    await requireWorkspaceAccess(ctx);
    const safeLimit = Math.max(1, Math.min(limit, 100));

    const { data, error } = await ctx.supabase
      .from("company_resources")
      .select("id, title, resource_type, summary, link_url, file_url, created_at")
      .eq("company_id", ctx.companyId)
      .eq("is_active", true)
      .is("is_deleted", false)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(safeLimit);

    if (error) return { ok: false, error: sanitizeError(error.message, "Unable to load resources") };

    return {
      ok: true,
      data: {
        rows: (data ?? []).map((row) => ({
          id: row.id as string,
          title: row.title as string,
          resource_type: row.resource_type as string,
          summary: (row.summary as string | null) ?? null,
          link_url: (row.link_url as string | null) ?? null,
          file_url: (row.file_url as string | null) ?? null,
          created_at: row.created_at as string
        }))
      }
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to load resources" };
  }
};

export const listWorkspaceNotes = async (
  ctx: ServiceContext,
  limit = 30
): Promise<ServiceResult<{ employeeId: string; rows: WorkspaceNoteRow[] }>> => {
  try {
    const employeeId = await requireWorkspaceAccess(ctx);
    const safeLimit = Math.max(1, Math.min(limit, 100));

    const { data, error } = await ctx.supabase
      .from("employee_workspace_notes")
      .select("id, title, body, file_url, file_name, is_pinned, created_at, updated_at")
      .eq("company_id", ctx.companyId)
      .eq("employee_id", employeeId)
      .is("is_deleted", false)
      .order("is_pinned", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(safeLimit);

    if (error) return { ok: false, error: sanitizeError(error.message, "Unable to load notes") };

    return {
      ok: true,
      data: {
        employeeId,
        rows: (data ?? []).map((row) => ({
          id: row.id as string,
          title: row.title as string,
          body: row.body as string,
          file_url: (row.file_url as string | null) ?? null,
          file_name: (row.file_name as string | null) ?? null,
          is_pinned: Boolean(row.is_pinned),
          created_at: row.created_at as string,
          updated_at: row.updated_at as string
        }))
      }
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to load notes" };
  }
};

export const createWorkspaceNote = async (
  ctx: ServiceContext,
  payload: {
    title: string;
    body: string;
    fileUrl?: string | null;
    fileName?: string | null;
    isPinned?: boolean;
  }
): Promise<ServiceResult<{ id: string }>> => {
  try {
    const employeeId = await requireWorkspaceAccess(ctx);

    const title = payload.title?.trim();
    const body = payload.body?.trim();
    if (!title || !body) return { ok: false, error: "Title and body are required" };

    const { data, error } = await ctx.supabase
      .from("employee_workspace_notes")
      .insert({
        company_id: ctx.companyId,
        employee_id: employeeId,
        title,
        body,
        file_url: payload.fileUrl?.trim() || null,
        file_name: payload.fileName?.trim() || null,
        is_pinned: Boolean(payload.isPinned),
        created_by: ctx.userProfileId,
        updated_by: ctx.userProfileId
      })
      .select("id")
      .single();

    if (error || !data) {
      return { ok: false, error: sanitizeError(error?.message, "Unable to create note") };
    }

    return { ok: true, data: { id: data.id as string } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to create note" };
  }
};

export const updateWorkspaceNote = async (
  ctx: ServiceContext,
  noteId: string,
  payload: {
    title: string;
    body: string;
    fileUrl?: string | null;
    fileName?: string | null;
    isPinned?: boolean;
  }
): Promise<ServiceResult<{ id: string }>> => {
  try {
    const employeeId = await requireWorkspaceAccess(ctx);
    const title = payload.title?.trim();
    const body = payload.body?.trim();
    if (!title || !body) return { ok: false, error: "Title and body are required" };

    const { data, error } = await ctx.supabase
      .from("employee_workspace_notes")
      .update({
        title,
        body,
        file_url: payload.fileUrl?.trim() || null,
        file_name: payload.fileName?.trim() || null,
        is_pinned: Boolean(payload.isPinned),
        updated_by: ctx.userProfileId,
      })
      .eq("company_id", ctx.companyId)
      .eq("employee_id", employeeId)
      .eq("id", noteId)
      .is("is_deleted", false)
      .select("id")
      .single();

    if (error || !data) {
      return { ok: false, error: sanitizeError(error?.message, "Unable to update note") };
    }

    return { ok: true, data: { id: data.id as string } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to update note" };
  }
};

export const deleteWorkspaceNote = async (
  ctx: ServiceContext,
  noteId: string
): Promise<ServiceResult<{ id: string }>> => {
  try {
    const employeeId = await requireWorkspaceAccess(ctx);
    const { data, error } = await ctx.supabase
      .from("employee_workspace_notes")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: ctx.userProfileId,
        updated_by: ctx.userProfileId,
      })
      .eq("company_id", ctx.companyId)
      .eq("employee_id", employeeId)
      .eq("id", noteId)
      .is("is_deleted", false)
      .select("id")
      .single();

    if (error || !data) {
      return { ok: false, error: sanitizeError(error?.message, "Unable to delete note") };
    }

    return { ok: true, data: { id: data.id as string } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to delete note" };
  }
};

export const listWorkspaceChatMessages = async (
  ctx: ServiceContext,
  filters: { peerEmployeeId?: string; limit?: number } = {}
): Promise<ServiceResult<{ employeeId: string; rows: WorkspaceChatRow[] }>> => {
  try {
    await requirePlanFeature(ctx, "feature.core_notifications");
    const employeeId = await requireWorkspaceAccess(ctx);
    const safeLimit = Math.max(1, Math.min(filters.limit ?? 50, 200));
    const readClient = createWorkspaceReadClient();

    let query = readClient
      .from("employee_chat_messages")
      .select("id, sender_employee_id, recipient_employee_id, message_text, created_at")
      .eq("company_id", ctx.companyId)
      .or(`sender_employee_id.eq.${employeeId},recipient_employee_id.eq.${employeeId}`)
      .is("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(safeLimit);

    if (filters.peerEmployeeId) {
      query = query.or(
        `and(sender_employee_id.eq.${employeeId},recipient_employee_id.eq.${filters.peerEmployeeId}),and(sender_employee_id.eq.${filters.peerEmployeeId},recipient_employee_id.eq.${employeeId})`
      );
    }

    const { data, error } = await query;
    if (error) return { ok: false, error: sanitizeError(error.message, "Unable to load chat") };

    const participantIds = Array.from(
      new Set((data ?? []).flatMap((row) => [row.sender_employee_id, row.recipient_employee_id]).filter(Boolean))
    ) as string[];

    const participantRows = participantIds.length
      ? await readClient
          .from("employees")
          .select("id, user_profiles(full_name)")
          .eq("company_id", ctx.companyId)
          .in("id", participantIds)
          .is("is_deleted", false)
      : { data: [] as any[] };

    const nameByEmployeeId = new Map<string, string | null>(
      (participantRows.data ?? []).map((row: any) => [row.id as string, (row.user_profiles?.full_name as string | null) ?? null])
    );

    return {
      ok: true,
      data: {
        employeeId,
        rows: (data ?? []).map((row) => ({
          id: row.id as string,
          sender_employee_id: row.sender_employee_id as string,
          recipient_employee_id: row.recipient_employee_id as string,
          sender_name: nameByEmployeeId.get(row.sender_employee_id as string) ?? null,
          recipient_name: nameByEmployeeId.get(row.recipient_employee_id as string) ?? null,
          message_text: row.message_text as string,
          created_at: row.created_at as string,
          direction: (row.sender_employee_id as string) === employeeId ? "out" : "in"
        }))
      }
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to load chat" };
  }
};

export const sendWorkspaceChatMessage = async (
  ctx: ServiceContext,
  payload: {
    recipientEmployeeId: string;
    message: string;
  }
): Promise<ServiceResult<{ id: string }>> => {
  try {
    await requirePlanFeature(ctx, "feature.core_notifications");
    const senderEmployeeId = await requireWorkspaceAccess(ctx);
    const recipientEmployeeId = payload.recipientEmployeeId?.trim();
    const messageText = payload.message?.trim();

    if (!recipientEmployeeId) return { ok: false, error: "Recipient is required" };
    if (!messageText) return { ok: false, error: "Message is required" };
    if (recipientEmployeeId === senderEmployeeId) return { ok: false, error: "You cannot message yourself" };

    const [scope, recipientResult, existingThreadResult] = await Promise.all([
      getAccessibleEmployeeScope(ctx),
      ctx.supabase
        .from("employees")
        .select("id")
        .eq("company_id", ctx.companyId)
        .eq("id", recipientEmployeeId)
        .is("is_deleted", false)
        .maybeSingle(),
      ctx.supabase
        .from("employee_chat_messages")
        .select("id")
        .eq("company_id", ctx.companyId)
        .is("is_deleted", false)
        .or(
          `and(sender_employee_id.eq.${senderEmployeeId},recipient_employee_id.eq.${recipientEmployeeId}),and(sender_employee_id.eq.${recipientEmployeeId},recipient_employee_id.eq.${senderEmployeeId})`
        )
        .limit(1)
    ]);

    if (!recipientResult.data?.id) {
      return { ok: false, error: "Recipient is unavailable" };
    }

    const canMessageRecipient =
      scope.broadAccess ||
      scope.ids.has(recipientEmployeeId) ||
      Boolean(existingThreadResult.data && existingThreadResult.data.length > 0);

    if (!canMessageRecipient) {
      return { ok: false, error: "Recipient is outside your current chat scope" };
    }

    const { data, error } = await ctx.supabase
      .from("employee_chat_messages")
      .insert({
        company_id: ctx.companyId,
        sender_employee_id: senderEmployeeId,
        recipient_employee_id: recipientEmployeeId,
        message_text: messageText,
        created_by: ctx.userProfileId
      })
      .select("id")
      .single();

    if (error || !data) {
      return { ok: false, error: sanitizeError(error?.message, "Unable to send message") };
    }

    return { ok: true, data: { id: data.id as string } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to send message" };
  }
};

export const listWorkspaceContacts = async (
  ctx: ServiceContext,
  limit = 200
): Promise<ServiceResult<{ employeeId: string; rows: WorkspaceContactRow[] }>> => {
  try {
    const employeeId = await requireWorkspaceAccess(ctx);
    const safeLimit = Math.max(1, Math.min(limit, 500));
    const readClient = createWorkspaceReadClient();

    const { data: currentEmployee, error: currentError } = await readClient
      .from("employees")
      .select("id, manager_id, department_id, team_id")
      .eq("company_id", ctx.companyId)
      .eq("id", employeeId)
      .is("is_deleted", false)
      .maybeSingle();

    if (currentError || !currentEmployee?.id) {
      return { ok: false, error: sanitizeError(currentError?.message, "Unable to resolve employee scope") };
    }

    const [scope, existingThreadRows, teamPeerRows] = await Promise.all([
      getAccessibleEmployeeScope(ctx),
      readClient
        .from("employee_chat_messages")
        .select("sender_employee_id, recipient_employee_id")
        .eq("company_id", ctx.companyId)
        .or(`sender_employee_id.eq.${employeeId},recipient_employee_id.eq.${employeeId}`)
        .is("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(safeLimit),
      currentEmployee.team_id
        ? readClient
            .from("employees")
            .select("id")
            .eq("company_id", ctx.companyId)
            .eq("team_id", currentEmployee.team_id as string)
            .is("is_deleted", false)
            .limit(safeLimit)
        : Promise.resolve({ data: [] as Array<{ id: string }>, error: null }),
    ]);

    const eligibleEmployeeIds = new Set<string>([employeeId]);
    if (currentEmployee.manager_id) {
      eligibleEmployeeIds.add(currentEmployee.manager_id as string);
    }
    if (!scope.broadAccess) {
      for (const id of scope.ids) {
        eligibleEmployeeIds.add(id);
      }
    }
    for (const row of existingThreadRows.data ?? []) {
      const senderId = row.sender_employee_id as string | null;
      const recipientId = row.recipient_employee_id as string | null;
      if (senderId && senderId !== employeeId) eligibleEmployeeIds.add(senderId);
      if (recipientId && recipientId !== employeeId) eligibleEmployeeIds.add(recipientId);
    }
    for (const row of teamPeerRows.data ?? []) {
      if (row.id) eligibleEmployeeIds.add(row.id as string);
    }

    const contactsQuery = readClient
      .from("employees")
      .select(
        "id, employee_code, designation, user_profile_id, department_id, team_id, user_profiles(full_name, avatar_url), departments(name), teams(name)"
      )
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false)
      .order("created_at", { ascending: true })
      .limit(safeLimit);

    const { data, error } = scope.broadAccess
      ? await contactsQuery
      : await contactsQuery.in("id", Array.from(eligibleEmployeeIds));

    if (error) return { ok: false, error: sanitizeError(error.message, "Unable to load contacts") };

    const managerId = (currentEmployee.manager_id as string | null) ?? null;
    const currentTeamId = (currentEmployee.team_id as string | null) ?? null;
    const recentPeerOrder = new Map<string, number>();
    let peerPriority = 0;
    for (const row of existingThreadRows.data ?? []) {
      const otherEmployeeId =
        (row.sender_employee_id as string) === employeeId
          ? (row.recipient_employee_id as string)
          : (row.sender_employee_id as string);
      if (!recentPeerOrder.has(otherEmployeeId)) {
        recentPeerOrder.set(otherEmployeeId, peerPriority++);
      }
    }

    const contacts = (data ?? []).map((row: any) => {
      const rowTeamId = (row.team_id as string | null) ?? null;
      const isSelf = (row.id as string) === employeeId;
      const isTeamLead = managerId !== null && (row.id as string) === managerId;
      const isTeamPeer = currentTeamId !== null && rowTeamId === currentTeamId;
      const recentPeerRank = recentPeerOrder.get(row.id as string);
      return {
        employee_id: row.id as string,
        full_name: (row.user_profiles?.full_name as string | null) ?? null,
        employee_code: (row.employee_code as string | null) ?? null,
        designation: (row.designation as string | null) ?? null,
        department_name: (row.departments?.name as string | null) ?? null,
        team_name: (row.teams?.name as string | null) ?? null,
        avatar_url: (row.user_profiles?.avatar_url as string | null) ?? null,
        is_team_lead: isTeamLead,
        is_self: isSelf,
        priority: isSelf ? 0 : recentPeerRank !== undefined ? 1 : isTeamLead ? 2 : isTeamPeer ? 3 : 4,
        recentPeerRank: recentPeerRank ?? Number.MAX_SAFE_INTEGER,
      };
    });

    contacts.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.recentPeerRank !== b.recentPeerRank) return a.recentPeerRank - b.recentPeerRank;
      return (a.full_name ?? "").localeCompare(b.full_name ?? "");
    });

    return {
      ok: true,
      data: {
        employeeId,
        rows: contacts.map(({ priority, recentPeerRank, ...contact }) => contact)
      }
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to load contacts" };
  }
};

export const listWorkspaceNotifications = async (
  ctx: ServiceContext,
  options: { limit?: number; unreadOnly?: boolean } = {}
): Promise<ServiceResult<{ rows: WorkspaceNotificationRow[] }>> => {
  try {
    await requirePlanFeature(ctx, "feature.core_notifications");
    await requireWorkspaceAccess(ctx);
    const safeLimit = Math.max(1, Math.min(options.limit ?? 50, 200));

    let query = ctx.supabase
      .from("notifications")
      .select("id, type, title, message, reference_type, reference_id, is_read, read_at, created_at")
      .eq("company_id", ctx.companyId)
      .eq("recipient_profile_id", ctx.userProfileId)
      .is("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(safeLimit);

    if (options.unreadOnly) {
      query = query.eq("is_read", false);
    }

    const { data, error } = await query;
    if (error) return { ok: false, error: sanitizeError(error.message, "Unable to load notifications") };

    return {
      ok: true,
      data: {
        rows: (data ?? []).map((row) => ({
          id: row.id as string,
          type: row.type as string,
          title: row.title as string,
          message: (row.message as string | null) ?? null,
          reference_type: (row.reference_type as string | null) ?? null,
          reference_id: (row.reference_id as string | null) ?? null,
          is_read: Boolean(row.is_read),
          read_at: (row.read_at as string | null) ?? null,
          created_at: row.created_at as string
        }))
      }
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to load notifications" };
  }
};

export const markWorkspaceNotificationsRead = async (
  ctx: ServiceContext,
  payload: { ids?: string[] } = {}
): Promise<ServiceResult<{ updated: number }>> => {
  try {
    await requirePlanFeature(ctx, "feature.core_notifications");
    await requireWorkspaceAccess(ctx);

    const ids = Array.from(new Set((payload.ids ?? []).map((id) => id.trim()).filter(Boolean)));
    let query = ctx.supabase
      .from("notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
        updated_by: ctx.userProfileId
      })
      .eq("company_id", ctx.companyId)
      .eq("recipient_profile_id", ctx.userProfileId)
      .eq("is_read", false)
      .is("is_deleted", false);

    if (ids.length > 0) {
      query = query.in("id", ids);
    }

    const { data, error } = await query.select("id");
    if (error) return { ok: false, error: sanitizeError(error.message, "Unable to update notifications") };

    return {
      ok: true,
      data: { updated: (data ?? []).length }
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to update notifications" };
  }
};

export const getWorkspaceCalendar = async (
  ctx: ServiceContext,
  monthParam?: string
): Promise<ServiceResult<WorkspaceCalendarRow>> => {
  try {
    await requirePlanFeature(ctx, "feature.core_attendance");
    let leaveFeatureEnabled = true;
    try {
      await requirePlanFeature(ctx, "feature.core_leave_management");
    } catch {
      leaveFeatureEnabled = false;
    }
    const employeeId = await requireWorkspaceAccess(ctx);
    const readClient = createWorkspaceReadClient();
    const { month, rangeStart, rangeEnd, year } = parseMonthWindow(monthParam);

    const leavePromise = leaveFeatureEnabled
      ? readClient
          .from("leave_requests")
          .select("id, start_date, end_date, status, leave_types(name, is_paid)")
          .eq("company_id", ctx.companyId)
          .eq("employee_id", employeeId)
          .in("status", ["pending", "approved"])
          .lte("start_date", rangeEnd)
          .gte("end_date", rangeStart)
          .is("is_deleted", false)
      : Promise.resolve({ data: [] as any[], error: null });

    const leaveBalancePromise = leaveFeatureEnabled
      ? readClient
          .from("leave_balances")
          .select("entitled_days, used_days")
          .eq("company_id", ctx.companyId)
          .eq("employee_id", employeeId)
          .eq("year", year)
          .is("is_deleted", false)
      : Promise.resolve({ data: [] as any[], error: null });

    const [
      employeeResult,
      companyResult,
      settingsResult,
      holidayResult,
      leaveResult,
      leaveBalanceResult,
      shiftResult,
      attendanceResult,
      updatesResult
    ] = await Promise.all([
      readClient
        .from("employees")
        .select("id, manager_id")
        .eq("company_id", ctx.companyId)
        .eq("id", employeeId)
        .is("is_deleted", false)
        .maybeSingle(),
      readClient
        .from("companies")
        .select("id, name")
        .eq("id", ctx.companyId)
        .is("is_deleted", false)
        .maybeSingle(),
      readClient
        .from("company_settings")
        .select("timezone")
        .eq("company_id", ctx.companyId)
        .is("is_deleted", false)
        .maybeSingle(),
      readClient
        .from("company_holidays")
        .select("id, holiday_date, name")
        .eq("company_id", ctx.companyId)
        .eq("is_active", true)
        .gte("holiday_date", rangeStart)
        .lte("holiday_date", rangeEnd)
        .is("is_deleted", false)
        .order("holiday_date", { ascending: true }),
      leavePromise,
      leaveBalancePromise,
      readClient
        .from("employee_shift_assignments")
        .select("id, shift_template_id, effective_from, effective_to, shift_templates(name, start_time, end_time)")
        .eq("company_id", ctx.companyId)
        .eq("employee_id", employeeId)
        .lte("effective_from", rangeEnd)
        .or(`effective_to.is.null,effective_to.gte.${rangeStart}`)
        .is("is_deleted", false),
      readClient
        .from("attendance_records")
        .select("id, attendance_date, status, check_in, check_out, work_minutes, late_minutes")
        .eq("company_id", ctx.companyId)
        .eq("employee_id", employeeId)
        .gte("attendance_date", rangeStart)
        .lte("attendance_date", rangeEnd)
        .is("is_deleted", false),
      readClient
        .from("company_resources")
        .select("id, title, resource_type, summary, link_url, file_url, created_at")
        .eq("company_id", ctx.companyId)
        .eq("is_active", true)
        .in("resource_type", ["announcement", "policy", "sop"])
        .is("is_deleted", false)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(10)
    ]);

    if (employeeResult.error || !employeeResult.data?.id) {
      return { ok: false, error: sanitizeError(employeeResult.error?.message, "Employee record not found") };
    }

    const holidayRows = holidayResult.error ? [] : holidayResult.data ?? [];
    const leaveRows = leaveResult.error ? [] : leaveResult.data ?? [];
    const leaveBalanceRows = leaveBalanceResult.error ? [] : leaveBalanceResult.data ?? [];
    const shiftRows = shiftResult.error ? [] : shiftResult.data ?? [];
    const attendanceRows = attendanceResult.error ? [] : attendanceResult.data ?? [];
    const updateRows = updatesResult.error ? [] : updatesResult.data ?? [];
    const timezone = (settingsResult.data?.timezone as string | null) ?? "Asia/Karachi";
    const today = getTimezoneSnapshot(timezone).dateText;

    const managerId = (employeeResult.data.manager_id as string | null) ?? null;
    let teamLeadName: string | null = null;

    if (managerId) {
      const managerResult = await readClient
        .from("employees")
        .select("id, user_profile_id")
        .eq("company_id", ctx.companyId)
        .eq("id", managerId)
        .is("is_deleted", false)
        .maybeSingle();

      if (managerResult.data?.user_profile_id) {
        const profileResult = await readClient
          .from("user_profiles")
          .select("full_name")
          .eq("company_id", ctx.companyId)
          .eq("id", managerResult.data.user_profile_id as string)
          .is("is_deleted", false)
          .maybeSingle();

        teamLeadName = (profileResult.data?.full_name as string | null) ?? null;
      }
    }

    const dayMap = new Map<string, WorkspaceCalendarEventRow[]>();
    for (const date of enumerateDates(rangeStart, rangeEnd)) {
      dayMap.set(date, []);
    }

    const officialHolidayMap = new Map<string, WorkspaceOfficialHolidayRow>();
    holidayRows.forEach((row) => {
      const date = row.holiday_date as string;
      officialHolidayMap.set(date, {
        date,
        name: row.name as string,
        source: "company"
      });
    });

    for (const holiday of getPakistanPublicHolidays(year)) {
      if (holiday.date < rangeStart || holiday.date > rangeEnd) continue;
      if (officialHolidayMap.has(holiday.date)) continue;
      officialHolidayMap.set(holiday.date, {
        date: holiday.date,
        name: holiday.name,
        source: "pakistan_estimated"
      });
    }

    let approvedLeaveDays = 0;
    let pendingLeaveDays = 0;
    const leaveByDate = new Map<
      string,
      {
        id: string;
        name: string | null;
        is_paid: boolean;
        status: string;
      }
    >();
    leaveRows.forEach((row: any) => {
      const status = row.status as string;
      const clamped = clampDateRange(row.start_date as string, row.end_date as string, rangeStart, rangeEnd);
      if (!clamped) return;
      const dates = enumerateDates(clamped.start, clamped.end);
      if (status === "approved") approvedLeaveDays += dates.length;
      if (status === "pending") pendingLeaveDays += dates.length;

      for (const date of dates) {
        const existing = leaveByDate.get(date);
        if (!existing || existing.status !== "approved") {
          leaveByDate.set(date, {
            id: row.id as string,
            name: (row.leave_types?.name as string | null) ?? null,
            is_paid: row.leave_types?.is_paid !== false,
            status
          });
        }
      }
    });

    const assignedShiftByDate = new Map<
      string,
      { id: string; title: string; start_time: string | null; end_time: string | null }
    >();
    shiftRows.forEach((row: any) => {
      const shiftStart = row.effective_from as string;
      const shiftEnd = (row.effective_to as string | null) ?? rangeEnd;
      const clamped = clampDateRange(shiftStart, shiftEnd, rangeStart, rangeEnd);
      if (!clamped) return;
      const shiftName = (row.shift_templates?.name as string | null) ?? "Assigned shift";
      const shiftStartTime = (row.shift_templates?.start_time as string | null) ?? null;
      const shiftEndTime = (row.shift_templates?.end_time as string | null) ?? null;
      const shiftTime = `${shiftStartTime ?? "-"}-${shiftEndTime ?? "-"}`;
      for (const date of enumerateDates(clamped.start, clamped.end)) {
        if (!assignedShiftByDate.has(date)) {
          assignedShiftByDate.set(date, {
            id: row.id as string,
            title: `${shiftName} (${shiftTime})`,
            start_time: shiftStartTime,
            end_time: shiftEndTime
          });
        }
      }
    });

    const attendanceByDate = new Map<string, any>();
    attendanceRows.forEach((row: any) => {
      const date = row.attendance_date as string;
      if (!attendanceByDate.has(date)) {
        attendanceByDate.set(date, row);
      }
    });

    for (const date of enumerateDates(rangeStart, rangeEnd)) {
      const dayEvents = dayMap.get(date);
      if (!dayEvents) continue;

      const holiday = officialHolidayMap.get(date);
      const leaveRequest = leaveByDate.get(date) ?? null;
      const attendance = attendanceByDate.get(date) ?? null;
      const shift = assignedShiftByDate.get(date) ?? null;
      const goAssigned = (attendance?.status ?? "").toLowerCase() === "holiday";
      const attendancePresent = hasAttendancePresentTruth(attendance);

      const derived = classifyAttendanceDayState({
        attendanceDate: date,
        holiday: holiday ? { id: `holiday:${date}`, name: holiday.name, date } : null,
        goAssigned,
        leave: leaveRequest
          ? {
              request_id: leaveRequest.id,
              leave_type_id: null,
              leave_type_name: leaveRequest.name,
              is_paid: leaveRequest.is_paid,
              start_date: date,
              end_date: date,
              status: leaveRequest.status
            }
          : null,
        explicitAbsent: (attendance?.status ?? "").toLowerCase() === "absent",
        shiftAssigned: Boolean(shift?.id),
        attendanceStatus: (attendance?.status as string | null) ?? null,
        hasCheckIn: Boolean(attendance?.check_in),
        hasCheckOut: Boolean(attendance?.check_out),
        isOnBreak: false,
        workMinutes: (attendance?.work_minutes as number | null) ?? null,
        lateMinutes: (attendance?.late_minutes as number | null) ?? null,
        attendanceCheckIn: (attendance?.check_in as string | null) ?? null,
        shiftStartTime: shift?.start_time ?? null
      });

      const resolvedStatus = resolveCalendarDayStatus({
        date,
        timezone,
        holiday: holiday ?? null,
        leaveRequest,
        attendance,
        shift
      });

      if (shift?.id) {
        dayEvents.push({
          id: `shift:${shift.id}:${date}`,
          type: "shift",
          title: shift.title,
          status: "assigned",
          payroll_impact: "normal_pay",
          source: "shift"
        });
      }

      if (holiday) {
        dayEvents.push({
          id: `holiday:${date}`,
          type: "holiday",
          title:
            derived.dayState === "go_active"
              ? `${holiday.name} - GO Active`
              : derived.dayState === "go_applied"
                ? `${holiday.name} - GO`
                : holiday.name,
          status: derived.dayState === "go_active" || derived.dayState === "go_applied" ? derived.dayState : "holiday",
          payroll_impact: derived.payrollImpact,
          source: holiday.source
        });

        const holidayEvent = dayEvents[dayEvents.length - 1];
        if (holidayEvent?.id === `holiday:${date}`) {
          holidayEvent.title = holiday.name;
          holidayEvent.status = goAssigned ? (attendancePresent ? "go_active" : "go_applied") : "holiday";
          holidayEvent.payroll_impact =
            goAssigned && attendancePresent
              ? "extra_pay_go_active"
              : goAssigned
                ? "extra_pay_go_applied"
                : null;
        }
      }

      if (leaveRequest) {
        dayEvents.push({
          id: `leave:${leaveRequest.id}:${date}`,
          type: "leave",
          title: `${leaveRequest.name ?? "Leave"}${leaveRequest.status === "pending" ? " (Pending)" : ""}`,
          status: leaveRequest.status,
          payroll_impact: derived.payrollImpact,
          source: "leave"
        });
      }

      const shouldShowAttendanceEvent = Boolean(attendance?.id) || resolvedStatus.final_status_code === "A";

      if (!leaveRequest && !holiday && shouldShowAttendanceEvent) {
        dayEvents.push({
          id: `attendance:${attendance?.id ?? date}`,
          type: "attendance",
          title:
            resolvedStatus.final_status_code === "A"
              ? "Absent"
              : resolvedStatus.final_status_code === "PLATE"
                ? "Present (Late)"
                : "Present",
          status:
            resolvedStatus.final_status_code === "A"
              ? "absent"
              : resolvedStatus.final_status_code === "PLATE"
                ? "late"
                : "present",
          payroll_impact: resolvedStatus.final_status_code === "A" ? "no_pay_absent" : "normal_pay",
          source: "attendance"
        });
      }
    }

    const days: WorkspaceCalendarDayRow[] = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, events]) => ({
        date,
        is_today: date === today,
        events: events.sort((left, right) => {
          const priority = calendarEventPriority(left) - calendarEventPriority(right);
          if (priority !== 0) return priority;
          return left.type.localeCompare(right.type);
        }),
        resolved_status: resolveCalendarDayStatus({
          date,
          timezone,
          holiday: officialHolidayMap.get(date) ?? null,
          leaveRequest: leaveByDate.get(date) ?? null,
          attendance: attendanceByDate.get(date) ?? null,
          shift: assignedShiftByDate.get(date) ?? null
        })
      }));

    const entitledLeaves = leaveBalanceRows.reduce((sum, row) => sum + Number(row.entitled_days ?? 0), 0);
    const usedLeaves = leaveBalanceRows.reduce((sum, row) => sum + Number(row.used_days ?? 0), 0);

    return {
      ok: true,
      data: {
        month,
        range_start: rangeStart,
        range_end: rangeEnd,
        timezone,
        company_name: (companyResult.data?.name as string | null) ?? null,
        team_lead_name: teamLeadName,
        summary: {
          entitled_leaves: entitledLeaves,
          used_leaves: usedLeaves,
          remaining_leaves: Math.max(0, entitledLeaves - usedLeaves),
          approved_leave_days: leaveFeatureEnabled ? approvedLeaveDays : 0,
          pending_leave_days: leaveFeatureEnabled ? pendingLeaveDays : 0,
          assigned_shift_days: assignedShiftByDate.size,
          holidays: officialHolidayMap.size
        },
        official_holidays: Array.from(officialHolidayMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
        company_updates: updateRows.map((row) => ({
          id: row.id as string,
          title: row.title as string,
          resource_type: row.resource_type as string,
          summary: (row.summary as string | null) ?? null,
          link_url: (row.link_url as string | null) ?? null,
          file_url: (row.file_url as string | null) ?? null,
          created_at: row.created_at as string
        })),
        days
      }
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to load workspace calendar" };
  }
};
