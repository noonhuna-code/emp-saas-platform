import type { ServiceContext, ServiceResult } from "../lib/types";

export const getPayrollSummary = async (
  ctx: ServiceContext,
  companyId: string,
  year: number,
  month: number
): Promise<ServiceResult<Record<string, number>>> => {
  try {
    const { data: run, error: runError } = await ctx.supabase
      .from("payroll_runs")
      .select("id")
      .eq("company_id", companyId)
      .eq("year", year)
      .eq("month", month)
      .is("is_deleted", false)
      .maybeSingle();

    if (runError) {
      return { ok: false, error: runError.message };
    }

    if (!run?.id) {
      return { ok: true, data: { totalGross: 0, totalDeductions: 0, totalNet: 0 } };
    }

    const { data, error } = await ctx.supabase
      .from("payroll_entries")
      .select("total_earnings, total_deductions, net_salary")
      .eq("company_id", companyId)
      .eq("payroll_run_id", run.id)
      .is("is_deleted", false);

    if (error) {
      return { ok: false, error: error.message };
    }

    const totals = (data ?? []).reduce(
      (acc, row) => {
        acc.totalGross += row.total_earnings ?? 0;
        acc.totalDeductions += row.total_deductions ?? 0;
        acc.totalNet += row.net_salary ?? 0;
        return acc;
      },
      { totalGross: 0, totalDeductions: 0, totalNet: 0 }
    );

    return { ok: true, data: totals };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Payroll summary error" };
  }
};

export const getAttendanceVariance = async (
  ctx: ServiceContext,
  companyId: string,
  startDate: string,
  endDate: string
): Promise<ServiceResult<Record<string, unknown>>> => {
  try {
    const { data, error } = await ctx.supabase
      .from("attendance_records")
      .select("status, attendance_date")
      .eq("company_id", companyId)
      .gte("attendance_date", startDate)
      .lte("attendance_date", endDate)
      .is("is_deleted", false);

    if (error) {
      return { ok: false, error: error.message };
    }

    const totals = (data ?? []).reduce(
      (acc, row) => {
        acc.total += 1;
        if (row.status === "late") acc.late += 1;
        if (row.status === "absent") acc.absent += 1;
        return acc;
      },
      { total: 0, late: 0, absent: 0 }
    );

    return { ok: true, data: totals };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Attendance variance error" };
  }
};

export const getLeaveLiability = async (
  ctx: ServiceContext,
  companyId: string
): Promise<ServiceResult<Record<string, number>>> => {
  try {
    const { data, error } = await ctx.supabase
      .from("leave_balances")
      .select("remaining_days")
      .eq("company_id", companyId)
      .is("is_deleted", false);

    if (error) {
      return { ok: false, error: error.message };
    }

    const total = (data ?? []).reduce((acc, row) => acc + (row.remaining_days ?? 0), 0);

    return { ok: true, data: { totalRemainingDays: total } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Leave liability error" };
  }
};
