import type { ServiceContext, ServiceResult } from "../lib/types";
import { requirePermission } from "../lib/auth-wrapper";
import { requireAnyPlanFeature } from "../lib/entitlements";

export type EmployeeDashboardData = {
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

export const getEmployeeDashboard = async (ctx: ServiceContext): Promise<ServiceResult<EmployeeDashboardData>> => {
  try {
    await requireDashboardEntitlement(ctx);
    const employeeId = await resolveCurrentEmployeeId(ctx);
    if (!employeeId) {
      return { ok: false, error: "Employee record not found" };
    }

    const today = new Date().toISOString().slice(0, 10);

    const attendanceRecord = await ctx.supabase
      .from("attendance_records")
      .select("id, check_in, check_out, work_minutes, overtime_minutes, late_minutes")
      .eq("company_id", ctx.companyId)
      .eq("employee_id", employeeId)
      .eq("attendance_date", today)
      .is("is_deleted", false)
      .maybeSingle();

    const breakRecord = attendanceRecord.data?.id
      ? await ctx.supabase
          .from("attendance_breaks")
          .select("id")
          .eq("company_id", ctx.companyId)
          .eq("attendance_id", attendanceRecord.data.id)
          .is("break_end", null)
          .is("is_deleted", false)
          .limit(1)
          .maybeSingle()
      : { data: null };

    const leaveBalances = await ctx.supabase
      .from("leave_balances")
      .select("leave_type_id, year, entitled_days, used_days")
      .eq("company_id", ctx.companyId)
      .eq("employee_id", employeeId)
      .order("year", { ascending: false });

    const assignments = await ctx.supabase
      .from("employee_shift_assignments")
      .select("shift_template_id, effective_from, effective_to")
      .eq("company_id", ctx.companyId)
      .eq("employee_id", employeeId)
      .is("is_deleted", false)
      .lte("effective_from", today)
      .order("effective_from", { ascending: false })
      .limit(3);

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

    const payslips = await ctx.supabase
      .from("payslips")
      .select("id, generated_at, snapshot_json")
      .eq("company_id", ctx.companyId)
      .eq("employee_id", employeeId)
      .is("is_deleted", false)
      .order("generated_at", { ascending: false })
      .limit(3);

    const notifications = await ctx.supabase
      .from("notifications")
      .select("id, title, message, created_at, is_read")
      .eq("company_id", ctx.companyId)
      .eq("recipient_profile_id", ctx.userProfileId)
      .is("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(5);

    const lastLogin = await ctx.supabase
      .from("login_events")
      .select("risk_score, created_at")
      .eq("company_id", ctx.companyId)
      .eq("profile_id", ctx.userProfileId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const profileCompleteness = await ctx.supabase.rpc("calculate_employee_profile_completeness", {
      p_employee_id: employeeId
    });

    const isOnBreak = Boolean(breakRecord.data?.id);
    const record = attendanceRecord.data;

    return {
      ok: true,
      data: {
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
      }
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
