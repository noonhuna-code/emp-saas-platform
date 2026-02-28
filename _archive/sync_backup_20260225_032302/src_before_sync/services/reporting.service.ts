import type { AuthContext, DateRange, ServiceResult } from '../lib/types';

function sameCompany(ctx: AuthContext, companyId: string) {
  if (ctx.companyId !== companyId) {
    throw new Error('Cross-company report access denied');
  }
}

export async function getPayrollSummary(
  ctx: AuthContext,
  companyId: string,
  month: { year: number; month: number }
): Promise<ServiceResult<Record<string, unknown>>> {
  try {
    sameCompany(ctx, companyId);

    const { data: payrollMonth, error: payrollMonthError } = await ctx.supabase
      .from('payroll_months')
      .select('id, year, month')
      .eq('company_id', companyId)
      .eq('year', month.year)
      .eq('month', month.month)
      .eq('is_deleted', false)
      .single();

    if (payrollMonthError) throw payrollMonthError;

    const { data: entries, error: entriesError } = await ctx.supabase
      .from('payroll_entries')
      .select('employee_id, base_salary_snapshot, total_allowances, total_deductions, net_salary')
      .eq('company_id', companyId)
      .eq('payroll_month_id', payrollMonth.id)
      .eq('is_deleted', false);

    if (entriesError) throw entriesError;

    const rows = entries ?? [];
    const totalGross = rows.reduce((s, r) => s + Number(r.base_salary_snapshot ?? 0) + Number(r.total_allowances ?? 0), 0);
    const totalDeductions = rows.reduce((s, r) => s + Number(r.total_deductions ?? 0), 0);
    const totalNet = rows.reduce((s, r) => s + Number(r.net_salary ?? 0), 0);

    const { data: overtimeRows, error: overtimeError } = await ctx.supabase
      .from('attendance_records')
      .select('overtime_minutes')
      .eq('company_id', companyId)
      .eq('is_deleted', false)
      .gte('attendance_date', `${month.year}-${String(month.month).padStart(2, '0')}-01`)
      .lte('attendance_date', `${month.year}-${String(month.month).padStart(2, '0')}-31`);

    if (overtimeError) throw overtimeError;
    const overtimeMinutes = (overtimeRows ?? []).reduce((s, r) => s + Number(r.overtime_minutes ?? 0), 0);

    return {
      ok: true,
      data: {
        companyId,
        year: month.year,
        month: month.month,
        headcount: rows.length,
        totalGross,
        totalDeductions,
        totalNet,
        overtimeCost: 0,
        overtimeMinutes,
      },
    };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export async function getAttendanceVariance(
  ctx: AuthContext,
  companyId: string,
  range: DateRange
): Promise<ServiceResult<Record<string, unknown>>> {
  try {
    sameCompany(ctx, companyId);

    const { data, error } = await ctx.supabase
      .from('attendance_records')
      .select('employee_id, status, overtime_minutes')
      .eq('company_id', companyId)
      .eq('is_deleted', false)
      .gte('attendance_date', range.startDate)
      .lte('attendance_date', range.endDate);

    if (error) throw error;

    const rows = data ?? [];
    const lateCount = rows.filter((r) => r.status === 'late').length;
    const absentCount = rows.filter((r) => r.status === 'absent').length;
    const totalWorking = rows.filter((r) => ['present', 'late', 'half_day', 'absent'].includes(String(r.status))).length;
    const overtimeHours = rows.reduce((s, r) => s + Number(r.overtime_minutes ?? 0), 0) / 60;

    const { data: deptRows, error: deptError } = await ctx.supabase
      .from('attendance_records')
      .select('status, employees!inner(department_id)')
      .eq('company_id', companyId)
      .eq('is_deleted', false)
      .gte('attendance_date', range.startDate)
      .lte('attendance_date', range.endDate);

    if (deptError) throw deptError;

    return {
      ok: true,
      data: {
        lateCount,
        absenceRatio: totalWorking > 0 ? absentCount / totalWorking : 0,
        overtimeHours,
        departmentBreakdown: deptRows ?? [],
      },
    };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export async function getLeaveLiability(
  ctx: AuthContext,
  companyId: string
): Promise<ServiceResult<Record<string, unknown>>> {
  try {
    sameCompany(ctx, companyId);

    const { data: balances, error } = await ctx.supabase
      .from('leave_balances')
      .select('employee_id, leave_type_id, remaining_days')
      .eq('company_id', companyId)
      .eq('is_deleted', false);

    if (error) throw error;

    const totalUnusedLeave = (balances ?? []).reduce((s, r) => s + Number(r.remaining_days ?? 0), 0);

    return {
      ok: true,
      data: {
        companyId,
        totalUnusedLeave,
        estimatedFinancialLiability: 0,
        expiringLeave: [],
      },
    };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export async function getLedgerExport(
  ctx: AuthContext,
  companyId: string,
  filters: { startDate?: string; endDate?: string; employeeId?: string }
): Promise<ServiceResult<Array<Record<string, unknown>>>> {
  try {
    sameCompany(ctx, companyId);

    let query = ctx.supabase
      .from('employee_salary_ledger')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_deleted', false)
      .order('entry_date', { ascending: true });

    if (filters.employeeId) query = query.eq('employee_id', filters.employeeId);
    if (filters.startDate) query = query.gte('entry_date', filters.startDate);
    if (filters.endDate) query = query.lte('entry_date', filters.endDate);

    const { data, error } = await query;
    if (error) throw error;
    return { ok: true, data: (data ?? []) as Array<Record<string, unknown>> };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export async function getExecutiveDashboard(
  ctx: AuthContext,
  companyId: string
): Promise<ServiceResult<Record<string, unknown>>> {
  try {
    sameCompany(ctx, companyId);

    const [employeeCountRes, payrollMonthRes, leaveRes] = await Promise.all([
      ctx.supabase.from('employees').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_deleted', false),
      ctx.supabase.from('payroll_months').select('id, year, month, status').eq('company_id', companyId).eq('is_deleted', false).order('year', { ascending: false }).order('month', { ascending: false }).limit(2),
      ctx.supabase.from('leave_requests').select('status').eq('company_id', companyId).eq('is_deleted', false),
    ]);

    if (employeeCountRes.error) throw employeeCountRes.error;
    if (payrollMonthRes.error) throw payrollMonthRes.error;
    if (leaveRes.error) throw leaveRes.error;

    return {
      ok: true,
      data: {
        headcount: employeeCountRes.count ?? 0,
        payrollGrowthPercent: 0,
        costPerEmployee: 0,
        departmentPayrollRanking: [],
        leaveUtilizationRate: 0,
        payrollPeriods: payrollMonthRes.data ?? [],
      },
    };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}