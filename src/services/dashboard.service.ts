import type { ServiceContext, ServiceResult } from "../lib/types";
import { requirePermission } from "../lib/auth-wrapper";
import { requireAnyPlanFeature } from "../lib/entitlements";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type EmployeeDashboardData = {
  workspace: {
    employee: {
      id: string;
      employee_code: string | null;
      full_name: string | null;
      avatar_url: string | null;
      designation: string | null;
      department_name: string | null;
      team_name: string | null;
    };
    teamLead: {
      employee_id: string;
      full_name: string | null;
      email: string | null;
      phone?: string | null;
    } | null;
    manager: {
      employee_id: string;
      full_name: string | null;
      phone?: string | null;
    } | null;
    department: {
      id: string;
      name: string;
      main_contact_label: string | null;
      main_contact_email: string | null;
      main_contact_phone: string | null;
    } | null;
    company: {
      id: string;
      name: string;
      slug: string;
    } | null;
    counts: {
      notes: number;
      files: number;
      resources: number;
      sops: number;
      unreadNotifications: number;
      activeLoans: number;
      openLoanRequests: number;
      chatMessages: number;
    };
    resources: Array<{
      id: string;
      title: string;
      resource_type: string;
      summary: string | null;
      link_url: string | null;
      file_url: string | null;
      created_at: string;
    }>;
    notes: Array<{
      id: string;
      title: string;
      body: string;
      file_url: string | null;
      file_name: string | null;
      is_pinned: boolean;
      updated_at: string;
    }>;
    chat: Array<{
      id: string;
      sender_employee_id: string;
      recipient_employee_id: string;
      sender_name: string | null;
      recipient_name: string | null;
      message_text: string;
      created_at: string;
      direction: "in" | "out";
    }>;
    loanRequests: Array<{
      id: string;
      obligation_type: string;
      status: string;
      requested_amount: number;
      currency_code: string;
      created_at: string;
    }>;
  };
  attendanceToday: {
    status: string;
    checkIn?: string | null;
    checkOut?: string | null;
    workMinutes?: number | null;
    overtimeMinutes?: number | null;
    lateMinutes?: number | null;
    isOnBreak: boolean;
  } | null;
  leaveBalances: Array<{
    leave_type_id: string;
    year: number;
    entitled_days: number;
    used_days: number;
  }>;
  upcomingShifts: Array<{
    shift_name: string;
    start_time: string;
    end_time: string;
    timezone: string;
    effective_from: string;
    effective_to?: string | null;
  }>;
  recentPayslips: Array<{
    id: string;
    generated_at: string;
    net_salary: number | null;
  }>;
  notifications: Array<{
    id: string;
    title: string;
    message?: string | null;
    created_at: string;
    is_read: boolean;
  }>;
  securityStatus: {
    lastRiskScore: number | null;
    lastLoginAt: string | null;
  };
  profileCompletenessScore: number | null;
};

export type ManagerDashboardData = {
  teamAttendanceHeatmap: Array<{
    date: string;
    present: number;
    absent: number;
    onLeave: number;
  }>;
  pendingLeaveApprovals: number;
  pendingOvertimeApprovals: number;
  teamReliabilityScore: number | null;
  quickSearch: Array<{ id: string; full_name: string; designation?: string | null }>
};

export type AdminDashboardData = {
  headcount: { total: number; active: number };
  attendanceRate: number | null;
  leaveUtilization: number | null;
  payrollSnapshot: { runId: string; status: string; totalNet: number } | null;
  securityAlerts: Array<{ id: string; lock_reason: string; created_at: string }>;
  departmentBreakdown: Array<{ department: string; count: number }>;
};

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
      persistSession: false,
    },
  });
};

const resolveCurrentEmployeeId = async (ctx: ServiceContext): Promise<string | null> => {
  try {
    const { data, error } = await ctx.supabase.rpc("current_user_employee_id");
    if (!error && data) {
      return data as string;
    }
  } catch {
    // fallback
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

const computeAttendanceStatus = (record: {
  check_in?: string | null;
  check_out?: string | null;
} | null, isOnBreak: boolean): string => {
  if (!record?.check_in) return "not_clocked_in";
  if (record.check_in && !record.check_out) return isOnBreak ? "on_break" : "clocked_in";
  if (record.check_in && record.check_out) return "clocked_out";
  return "not_clocked_in";
};

const requireDashboardEntitlement = async (ctx: ServiceContext): Promise<void> => {
  await requireAnyPlanFeature(ctx, ["feature.analytics_standard", "feature.analytics_advanced"]);
};

const EMPLOYEE_DASHBOARD_CACHE_TTL_MS = 45000;
type EmployeeDashboardCacheEntry = {
  ts: number;
  data: EmployeeDashboardData;
};
const EMPLOYEE_DASHBOARD_CACHE = new Map<string, EmployeeDashboardCacheEntry>();

export const getEmployeeDashboard = async (ctx: ServiceContext, options?: { includeCollections?: boolean }): Promise<ServiceResult<EmployeeDashboardData>> => {
  try {
    await requireDashboardEntitlement(ctx);
    const admin = createSupabaseAdminClient();
    const employeeId = await resolveCurrentEmployeeId(ctx);
    if (!employeeId) {
      return { ok: false, error: "Employee record not found" };
    }

    const includeCollections = options?.includeCollections ?? true;

    const cacheKey = `${ctx.companyId}:${ctx.userProfileId}:${employeeId}:${includeCollections ? "full" : "trim"}`;
    const cachedEntry = EMPLOYEE_DASHBOARD_CACHE.get(cacheKey);
    if (cachedEntry && Date.now() - cachedEntry.ts < EMPLOYEE_DASHBOARD_CACHE_TTL_MS) {
      return { ok: true, data: cachedEntry.data };
    }

    const today = new Date().toISOString().slice(0, 10);
    const [attendanceRecord, leaveBalances, employeeRecord, companyInfo] = await Promise.all([
      ctx.supabase
        .from("attendance_records")
        .select("id, check_in, check_out, work_minutes, overtime_minutes, late_minutes")
        .eq("company_id", ctx.companyId)
        .eq("employee_id", employeeId)
        .eq("attendance_date", today)
        .is("is_deleted", false)
        .maybeSingle(),
      ctx.supabase
        .from("leave_balances")
        .select("leave_type_id, year, entitled_days, used_days")
        .eq("company_id", ctx.companyId)
        .eq("employee_id", employeeId)
        .order("year", { ascending: false }),
      ctx.supabase
        .from("employees")
        .select("id, employee_code, designation, manager_id, department_id, team_id, user_profile_id")
        .eq("company_id", ctx.companyId)
        .eq("id", employeeId)
        .is("is_deleted", false)
        .maybeSingle(),
      ctx.supabase
        .from("companies")
        .select("id, name, slug")
        .eq("id", ctx.companyId)
        .is("is_deleted", false)
        .maybeSingle()
    ]);

      const employeeProfile = employeeRecord.data?.user_profile_id
        ? await admin
            .from("user_profiles")
            .select("id, full_name, avatar_url")
            .eq("company_id", ctx.companyId)
          .eq("id", employeeRecord.data.user_profile_id as string)
          .is("is_deleted", false)
          .maybeSingle()
      : { data: null };

      const department = employeeRecord.data?.department_id
        ? await admin
            .from("departments")
            .select("id, name, main_contact_label, main_contact_email, main_contact_phone")
            .eq("company_id", ctx.companyId)
          .eq("id", employeeRecord.data.department_id as string)
          .is("is_deleted", false)
          .maybeSingle()
      : { data: null };

      const team = employeeRecord.data?.team_id
        ? await admin
            .from("teams")
            .select("id, name")
            .eq("company_id", ctx.companyId)
          .eq("id", employeeRecord.data.team_id as string)
          .is("is_deleted", false)
          .maybeSingle()
      : { data: null };

      const teamLeadEmployee = employeeRecord.data?.manager_id
        ? await admin
            .from("employees")
            .select("id, user_profile_id, manager_id")
            .eq("company_id", ctx.companyId)
          .eq("id", employeeRecord.data.manager_id as string)
          .is("is_deleted", false)
          .maybeSingle()
      : { data: null };

      const teamLeadProfile = teamLeadEmployee.data?.user_profile_id
        ? await admin
            .from("user_profiles")
            .select("id, full_name")
            .eq("company_id", ctx.companyId)
          .eq("id", teamLeadEmployee.data.user_profile_id as string)
          .is("is_deleted", false)
          .maybeSingle()
      : { data: null };

      const teamLeadPersonal = teamLeadEmployee.data?.id
        ? await admin
            .from("employee_personal_details")
            .select("phone")
            .eq("company_id", ctx.companyId)
            .eq("employee_id", teamLeadEmployee.data.id as string)
            .maybeSingle()
        : { data: null };

      const managerEmployee = teamLeadEmployee.data?.manager_id
        ? await admin
            .from("employees")
            .select("id, user_profile_id")
            .eq("company_id", ctx.companyId)
            .eq("id", teamLeadEmployee.data.manager_id as string)
            .is("is_deleted", false)
            .maybeSingle()
        : { data: null };

      const managerProfile = managerEmployee.data?.user_profile_id
        ? await admin
            .from("user_profiles")
            .select("id, full_name")
            .eq("company_id", ctx.companyId)
            .eq("id", managerEmployee.data.user_profile_id as string)
            .is("is_deleted", false)
            .maybeSingle()
        : { data: null };

      const managerPersonal = managerEmployee.data?.id
        ? await admin
            .from("employee_personal_details")
            .select("phone")
            .eq("company_id", ctx.companyId)
            .eq("employee_id", managerEmployee.data.id as string)
            .maybeSingle()
        : { data: null };

    const myNotesPromise = includeCollections
      ? ctx.supabase
          .from("employee_workspace_notes")
          .select("id, title, body, file_url, file_name, is_pinned, updated_at")
          .eq("company_id", ctx.companyId)
          .eq("employee_id", employeeId)
          .is("is_deleted", false)
          .order("is_pinned", { ascending: false })
          .order("updated_at", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] as any[] });

    const noteCountPromise = includeCollections
      ? ctx.supabase
          .from("employee_workspace_notes")
          .select("id", { head: true, count: "exact" })
          .eq("company_id", ctx.companyId)
          .eq("employee_id", employeeId)
          .is("is_deleted", false)
      : Promise.resolve({ count: 0 } as any);

    const noteFilesCountPromise = includeCollections
      ? ctx.supabase
          .from("employee_workspace_notes")
          .select("id", { head: true, count: "exact" })
          .eq("company_id", ctx.companyId)
          .eq("employee_id", employeeId)
          .not("file_url", "is", null)
          .is("is_deleted", false)
      : Promise.resolve({ count: 0 } as any);

    const employeeDocumentCountPromise = includeCollections
      ? ctx.supabase
          .from("employee_documents")
          .select("id", { head: true, count: "exact" })
          .eq("company_id", ctx.companyId)
          .eq("employee_id", employeeId)
          .is("is_deleted", false)
      : Promise.resolve({ count: 0 } as any);

    const resourcesPromise = includeCollections
      ? ctx.supabase
          .from("company_resources")
          .select("id, title, resource_type, summary, link_url, file_url, created_at")
          .eq("company_id", ctx.companyId)
          .eq("is_active", true)
          .is("is_deleted", false)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false })
          .limit(6)
      : Promise.resolve({ data: [] as any[] });

    const resourcesCountPromise = includeCollections
      ? ctx.supabase
          .from("company_resources")
          .select("id", { head: true, count: "exact" })
          .eq("company_id", ctx.companyId)
          .eq("is_active", true)
          .is("is_deleted", false)
      : Promise.resolve({ count: 0 } as any);

    const sopCountPromise = includeCollections
      ? ctx.supabase
          .from("company_resources")
          .select("id", { head: true, count: "exact" })
          .eq("company_id", ctx.companyId)
          .eq("is_active", true)
          .eq("resource_type", "sop")
          .is("is_deleted", false)
      : Promise.resolve({ count: 0 } as any);

    const unreadNotificationsPromise = ctx.supabase
      .from("notifications")
      .select("id", { head: true, count: "exact" })
      .eq("company_id", ctx.companyId)
      .eq("recipient_profile_id", ctx.userProfileId)
      .eq("is_read", false)
      .is("is_deleted", false);

    const openLoanRequestsPromise = includeCollections
      ? ctx.supabase
          .from("financial_obligation_requests")
          .select("id", { head: true, count: "exact" })
          .eq("company_id", ctx.companyId)
          .eq("employee_id", employeeId)
          .in("status", ["submitted", "under_review", "approved"])
          .order("created_at", { ascending: false })
      : Promise.resolve({ count: 0 } as any);

    const activeLoansPromise = includeCollections
      ? ctx.supabase
          .from("financial_obligations")
          .select("id", { head: true, count: "exact" })
          .eq("company_id", ctx.companyId)
          .eq("employee_id", employeeId)
          .in("obligation_status", ["approved_pending_disbursement", "disbursed_active", "repayment_in_progress"])
      : Promise.resolve({ count: 0 } as any);

    const myLoanRequestsPromise = includeCollections
      ? ctx.supabase
          .from("financial_obligation_requests")
          .select("id, obligation_type, status, requested_amount, currency_code, created_at")
          .eq("company_id", ctx.companyId)
          .eq("employee_id", employeeId)
          .order("created_at", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] as any[] });

    const recentChatPromise = includeCollections
      ? ctx.supabase
          .from("employee_chat_messages")
          .select("id, sender_employee_id, recipient_employee_id, message_text, created_at")
          .eq("company_id", ctx.companyId)
          .or(`sender_employee_id.eq.${employeeId},recipient_employee_id.eq.${employeeId}`)
          .is("is_deleted", false)
          .order("created_at", { ascending: false })
          .limit(8)
      : Promise.resolve({ data: [] as any[] });

    const chatMessageCountPromise = includeCollections
      ? ctx.supabase
          .from("employee_chat_messages")
          .select("id", { head: true, count: "exact" })
          .eq("company_id", ctx.companyId)
          .or(`sender_employee_id.eq.${employeeId},recipient_employee_id.eq.${employeeId}`)
          .is("is_deleted", false)
      : Promise.resolve({ count: 0 } as any);

    const assignmentsPromise = ctx.supabase
      .from("employee_shift_assignments")
      .select("shift_template_id, effective_from, effective_to")
      .eq("company_id", ctx.companyId)
      .eq("employee_id", employeeId)
      .is("is_deleted", false)
      .lte("effective_from", today)
      .order("effective_from", { ascending: false })
      .limit(3);

    const [
      myNotes,
      noteCountResult,
      noteFilesCountResult,
      employeeDocumentCountResult,
      resources,
      resourcesCountResult,
      sopCountResult,
      unreadNotificationsResult,
      openLoanRequestsResult,
      activeLoansResult,
      myLoanRequests,
      recentChat,
      chatMessageCountResult,
      assignments
    ] = await Promise.all([
      myNotesPromise,
      noteCountPromise,
      noteFilesCountPromise,
      employeeDocumentCountPromise,
      resourcesPromise,
      resourcesCountPromise,
      sopCountPromise,
      unreadNotificationsPromise,
      openLoanRequestsPromise,
      activeLoansPromise,
      myLoanRequestsPromise,
      recentChatPromise,
      chatMessageCountPromise,
      assignmentsPromise
    ]);

    const shiftTemplateIds = Array.from(
      new Set((assignments.data ?? []).map((row) => row.shift_template_id).filter(Boolean))
    ) as string[];

    const shiftTemplates = shiftTemplateIds.length
      ? await ctx.supabase
          .from("shift_templates")
          .select("id, name, start_time, end_time, timezone")
          .eq("company_id", ctx.companyId)
          .in("id", shiftTemplateIds)
          .is("is_deleted", false)
      : { data: [] };

    const templatesById = new Map(
      (shiftTemplates.data ?? []).map((template) => [template.id, template])
    );

    const upcomingShifts = (assignments.data ?? []).map((assignment) => {
      const template = templatesById.get(assignment.shift_template_id);
      return {
        shift_name: template?.name ?? "Shift",
        start_time: template?.start_time ?? "",
        end_time: template?.end_time ?? "",
        timezone: template?.timezone ?? "UTC",
        effective_from: assignment.effective_from,
        effective_to: assignment.effective_to ?? null
      };
    });
    const [payslips, notifications, lastLogin, profileCompleteness] = await Promise.all([
      ctx.supabase
        .from("payslips")
        .select("id, generated_at, snapshot_json")
        .eq("company_id", ctx.companyId)
        .eq("employee_id", employeeId)
        .is("is_deleted", false)
        .order("generated_at", { ascending: false })
        .limit(3),
      ctx.supabase
        .from("notifications")
        .select("id, title, message, created_at, is_read")
        .eq("company_id", ctx.companyId)
        .eq("recipient_profile_id", ctx.userProfileId)
        .is("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(3),
      ctx.supabase
        .from("login_events")
        .select("risk_score, created_at")
        .eq("company_id", ctx.companyId)
        .eq("profile_id", ctx.userProfileId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      ctx.supabase.rpc("calculate_employee_profile_completeness", {
        p_employee_id: employeeId
      })
    ]);

    const participantIds = includeCollections
      ? Array.from(
          new Set(
            (recentChat.data ?? []).flatMap((row) => [row.sender_employee_id, row.recipient_employee_id]).filter(Boolean)
          )
        )
      : [];

    const chatParticipants = includeCollections && participantIds.length
      ? await ctx.supabase
          .from("employees")
          .select("id, user_profile_id, user_profiles(full_name)")
          .eq("company_id", ctx.companyId)
          .in("id", participantIds)
          .is("is_deleted", false)
      : { data: [] };

    const participantNameByEmployeeId = new Map<string, string | null>(
      (chatParticipants.data ?? []).map((row: any) => [row.id as string, (row.user_profiles?.full_name as string | null) ?? null])
    );

    const breakRecord = attendanceRecord.data?.id
      ? await ctx.supabase
          .from("attendance_breaks")
          .select("id")
          .eq("company_id", ctx.companyId)
          .eq("attendance_id", attendanceRecord.data.id as string)
          .is("break_end", null)
          .is("is_deleted", false)
          .limit(1)
          .maybeSingle()
      : { data: null };

    const isOnBreak = Boolean(breakRecord.data?.id);
    const record = attendanceRecord.data;

    const dataPayload: EmployeeDashboardData = {
        workspace: {
          employee: {
            id: employeeId,
            employee_code: (employeeRecord.data?.employee_code as string | null) ?? null,
            full_name: (employeeProfile.data?.full_name as string | null) ?? null,
            avatar_url: (employeeProfile.data?.avatar_url as string | null) ?? null,
            designation: (employeeRecord.data?.designation as string | null) ?? null,
            department_name: (department.data?.name as string | null) ?? null,
            team_name: (team.data?.name as string | null) ?? null
          },
          teamLead: teamLeadEmployee.data?.id
            ? {
                employee_id: teamLeadEmployee.data.id as string,
                full_name: (teamLeadProfile.data?.full_name as string | null) ?? null,
                email: null,
                phone: (teamLeadPersonal.data?.phone as string | null) ?? null
              }
            : null,
          manager: managerEmployee.data?.id
            ? {
                employee_id: managerEmployee.data.id as string,
                full_name: (managerProfile.data?.full_name as string | null) ?? null,
                phone: (managerPersonal.data?.phone as string | null) ?? null
              }
            : null,
          department: department.data
            ? {
                id: department.data.id as string,
                name: department.data.name as string,
                main_contact_label: (department.data.main_contact_label as string | null) ?? null,
                main_contact_email: (department.data.main_contact_email as string | null) ?? null,
                main_contact_phone: (department.data.main_contact_phone as string | null) ?? null
              }
            : null,
          company: companyInfo.data
            ? {
                id: companyInfo.data.id as string,
                name: companyInfo.data.name as string,
                slug: companyInfo.data.slug as string
              }
            : null,
          counts: {
            notes: noteCountResult.count ?? 0,
            files: (noteFilesCountResult.count ?? 0) + (employeeDocumentCountResult.count ?? 0),
            resources: resourcesCountResult.count ?? 0,
            sops: sopCountResult.count ?? 0,
            unreadNotifications: unreadNotificationsResult.count ?? 0,
            activeLoans: activeLoansResult.count ?? 0,
            openLoanRequests: openLoanRequestsResult.count ?? 0,
            chatMessages: chatMessageCountResult.count ?? 0
          },
          resources: (resources.data ?? []).map((row) => ({
            id: row.id as string,
            title: row.title as string,
            resource_type: row.resource_type as string,
            summary: (row.summary as string | null) ?? null,
            link_url: (row.link_url as string | null) ?? null,
            file_url: (row.file_url as string | null) ?? null,
            created_at: row.created_at as string
          })),
          notes: (myNotes.data ?? []).map((row) => ({
            id: row.id as string,
            title: row.title as string,
            body: row.body as string,
            file_url: (row.file_url as string | null) ?? null,
            file_name: (row.file_name as string | null) ?? null,
            is_pinned: Boolean(row.is_pinned),
            updated_at: row.updated_at as string
          })),
          chat: (recentChat.data ?? []).map((row) => ({
            id: row.id as string,
            sender_employee_id: row.sender_employee_id as string,
            recipient_employee_id: row.recipient_employee_id as string,
            sender_name: participantNameByEmployeeId.get(row.sender_employee_id as string) ?? null,
            recipient_name: participantNameByEmployeeId.get(row.recipient_employee_id as string) ?? null,
            message_text: row.message_text as string,
            created_at: row.created_at as string,
            direction: (row.sender_employee_id as string) === employeeId ? ("out" as const) : ("in" as const)
          })),
          loanRequests: (myLoanRequests.data ?? []).map((row) => ({
            id: row.id as string,
            obligation_type: row.obligation_type as string,
            status: row.status as string,
            requested_amount: Number(row.requested_amount ?? 0),
            currency_code: row.currency_code as string,
            created_at: row.created_at as string
          }))
        },
        attendanceToday: record
          ? {
              status: computeAttendanceStatus(record, isOnBreak),
              checkIn: record.check_in,
              checkOut: record.check_out,
              workMinutes: record.work_minutes,
              overtimeMinutes: record.overtime_minutes,
              lateMinutes: record.late_minutes,
              isOnBreak
            }
          : null,
        leaveBalances: (leaveBalances.data ?? []) as EmployeeDashboardData["leaveBalances"],
        upcomingShifts,
        recentPayslips: (payslips.data ?? []).map((row) => ({
          id: row.id,
          generated_at: row.generated_at,
          net_salary: typeof row.snapshot_json?.net_salary === "number" ? row.snapshot_json.net_salary : null
        })),
        notifications: (notifications.data ?? []) as EmployeeDashboardData["notifications"],
        securityStatus: {
          lastRiskScore: lastLogin.data?.risk_score ?? null,
          lastLoginAt: lastLogin.data?.created_at ?? null
        },
        profileCompletenessScore:
          typeof profileCompleteness.data === "number" ? Math.round(profileCompleteness.data) : null
      };

    EMPLOYEE_DASHBOARD_CACHE.set(cacheKey, { ts: Date.now(), data: dataPayload });

    return {
      ok: true,
      data: dataPayload
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Employee dashboard failed" };
  }
};

export const getManagerDashboard = async (ctx: ServiceContext): Promise<ServiceResult<ManagerDashboardData>> => {
  try {
    await requireDashboardEntitlement(ctx);
    if (!ctx.permissions.includes("manage_attendance") && !ctx.permissions.includes("manage_employees")) {
      return { ok: false, error: "Permission denied" };
    }

    const managerId = await resolveCurrentEmployeeId(ctx);
    if (!managerId) {
      return { ok: false, error: "Employee record not found" };
    }

    const { data: directReports } = await ctx.supabase
      .from("employees")
      .select("id, designation, user_profile_id")
      .eq("company_id", ctx.companyId)
      .eq("manager_id", managerId)
      .is("is_deleted", false);

    const reportIds = (directReports ?? []).map((row) => row.id);
    if (reportIds.length === 0) {
      return {
        ok: true,
        data: {
          teamAttendanceHeatmap: [],
          pendingLeaveApprovals: 0,
          pendingOvertimeApprovals: 0,
          teamReliabilityScore: null,
          quickSearch: []
        }
      };
    }

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 6);
    const fromText = fromDate.toISOString().slice(0, 10);
    const toText = new Date().toISOString().slice(0, 10);

    const attendanceRows = await ctx.supabase
      .from("attendance_records")
      .select("attendance_date, status")
      .eq("company_id", ctx.companyId)
      .in("employee_id", reportIds)
      .gte("attendance_date", fromText)
      .lte("attendance_date", toText)
      .is("is_deleted", false);

    const heatmapMap = new Map<string, { present: number; absent: number; onLeave: number }>();
    (attendanceRows.data ?? []).forEach((row) => {
      const dateKey = row.attendance_date;
      if (!heatmapMap.has(dateKey)) {
        heatmapMap.set(dateKey, { present: 0, absent: 0, onLeave: 0 });
      }
      const bucket = heatmapMap.get(dateKey);
      if (!bucket) return;
      if (row.status === "absent") bucket.absent += 1;
      else if (row.status === "on_leave") bucket.onLeave += 1;
      else bucket.present += 1;
    });

    const teamAttendanceHeatmap = Array.from(heatmapMap.entries()).map(([date, counts]) => ({
      date,
      present: counts.present,
      absent: counts.absent,
      onLeave: counts.onLeave
    }));

    const pendingLeave = await ctx.supabase
      .from("leave_requests")
      .select("id", { count: "exact", head: true })
      .eq("company_id", ctx.companyId)
      .eq("status", "pending")
      .in("employee_id", reportIds)
      .is("is_deleted", false);

    const pendingOvertime = await ctx.supabase
      .from("overtime_requests")
      .select("id", { count: "exact", head: true })
      .eq("company_id", ctx.companyId)
      .eq("status", "pending")
      .in("employee_id", reportIds)
      .is("is_deleted", false);

    const reliabilityRows = await ctx.supabase
      .from("v_employee_reliability_metrics_90d")
      .select("employee_id, reliability_score")
      .eq("company_id", ctx.companyId)
      .in("employee_id", reportIds);

    const reliabilityScores = (reliabilityRows.data ?? []).map((row) => Number(row.reliability_score ?? 0));
    const teamReliabilityScore = reliabilityScores.length
      ? Math.round(reliabilityScores.reduce((a, b) => a + b, 0) / reliabilityScores.length)
      : null;

    const profileRows = await ctx.supabase
      .from("user_profiles")
      .select("id, full_name")
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false)
      .in("id", (directReports ?? []).map((row) => row.user_profile_id));

    const profileById = new Map((profileRows.data ?? []).map((row) => [row.id, row.full_name]));

    const quickSearch = (directReports ?? []).map((row) => ({
      id: row.id,
      full_name: profileById.get(row.user_profile_id) ?? "Employee",
      designation: row.designation
    }));

    return {
      ok: true,
      data: {
        teamAttendanceHeatmap,
        pendingLeaveApprovals: pendingLeave.count ?? 0,
        pendingOvertimeApprovals: pendingOvertime.count ?? 0,
        teamReliabilityScore,
        quickSearch
      }
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Manager dashboard failed" };
  }
};

export const getAdminDashboard = async (ctx: ServiceContext): Promise<ServiceResult<AdminDashboardData>> => {
  try {
    await requireDashboardEntitlement(ctx);
    requirePermission("manage_company", ctx);

    const [employees, activeEmployees] = await Promise.all([
      ctx.supabase
        .from("employees")
        .select("id", { count: "exact", head: true })
        .eq("company_id", ctx.companyId)
        .is("is_deleted", false),
      ctx.supabase
        .from("employees")
        .select("id", { count: "exact", head: true })
        .eq("company_id", ctx.companyId)
        .eq("is_active", true)
        .is("is_deleted", false)
    ]);

    const departmentRates = await ctx.supabase
      .from("mv_department_attendance_rate")
      .select("attendance_percentage")
      .eq("company_id", ctx.companyId);

    const attendanceRate = departmentRates.data && departmentRates.data.length > 0
      ? Number(
          (
            departmentRates.data.reduce((acc, row) => acc + Number(row.attendance_percentage ?? 0), 0) /
            departmentRates.data.length
          ).toFixed(2)
        )
      : null;

    const leaveBalances = await ctx.supabase
      .from("leave_balances")
      .select("entitled_days, used_days")
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false);

    const totalEntitled = (leaveBalances.data ?? []).reduce((acc, row) => acc + Number(row.entitled_days ?? 0), 0);
    const totalUsed = (leaveBalances.data ?? []).reduce((acc, row) => acc + Number(row.used_days ?? 0), 0);
    const leaveUtilization = totalEntitled > 0 ? Number(((totalUsed / totalEntitled) * 100).toFixed(2)) : null;

    const latestPayrollRun = await ctx.supabase
      .from("payroll_runs")
      .select("id, status, year, month")
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false)
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(1)
      .maybeSingle();

    let payrollSnapshot: AdminDashboardData["payrollSnapshot"] = null;
    if (latestPayrollRun.data?.id) {
      const payrollEntries = await ctx.supabase
        .from("payroll_entries")
        .select("net_salary")
        .eq("company_id", ctx.companyId)
        .eq("payroll_run_id", latestPayrollRun.data.id)
        .is("is_deleted", false);

      const totalNet = (payrollEntries.data ?? []).reduce((acc, row) => acc + Number(row.net_salary ?? 0), 0);
      payrollSnapshot = {
        runId: latestPayrollRun.data.id,
        status: latestPayrollRun.data.status,
        totalNet
      };
    }

    const securityAlerts = await ctx.supabase
      .from("account_lock_events")
      .select("id, lock_reason, created_at")
      .eq("company_id", ctx.companyId)
      .order("created_at", { ascending: false })
      .limit(5);

    const departments = await ctx.supabase
      .from("departments")
      .select("id, name")
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false);

    const employeesByDept = await ctx.supabase
      .from("employees")
      .select("id, department_id")
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false);

    const departmentMap = new Map((departments.data ?? []).map((dept) => [dept.id, dept.name]));
    const counts = new Map<string, number>();
    (employeesByDept.data ?? []).forEach((row) => {
      const key = row.department_id ?? "unassigned";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    const departmentBreakdown = Array.from(counts.entries()).map(([deptId, count]) => ({
      department: departmentMap.get(deptId) ?? "Unassigned",
      count
    }));

    return {
      ok: true,
      data: {
        headcount: {
          total: employees.count ?? 0,
          active: activeEmployees.count ?? 0
        },
        attendanceRate,
        leaveUtilization,
        payrollSnapshot,
        securityAlerts: (securityAlerts.data ?? []) as AdminDashboardData["securityAlerts"],
        departmentBreakdown
      }
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Admin dashboard failed" };
  }
};





