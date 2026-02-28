import type { AuthContext, PayrollRunRequest, PayrollRunSummary, ServiceResult } from '../lib/types';

function requireTransaction(ctx: AuthContext) {
  if (!ctx.runInTransaction) {
    throw new Error('payroll.service requires ctx.runInTransaction for financial transaction boundaries');
  }
  return ctx.runInTransaction;
}

function toNumber(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export async function runPayroll(
  ctx: AuthContext,
  companyId: string,
  monthRequest: PayrollRunRequest
): Promise<ServiceResult<PayrollRunSummary>> {
  const logger = ctx.logger ?? console;

  if (ctx.companyId !== companyId) {
    return { ok: false, error: 'Cross-company payroll execution denied' };
  }

  try {
    const runInTransaction = requireTransaction(ctx);

    return await runInTransaction(async (tx) => {
      const { data: payrollMonth, error: payrollMonthError } = await tx
        .from('payroll_months')
        .select('*')
        .eq('company_id', companyId)
        .eq('year', monthRequest.year)
        .eq('month', monthRequest.month)
        .eq('is_deleted', false)
        .single();

      if (payrollMonthError) throw payrollMonthError;
      if (!payrollMonth) throw new Error('Payroll month not found');
      if (payrollMonth.is_locked) throw new Error('Payroll month is already locked');

      const { data: employees, error: employeesError } = await tx
        .from('employees')
        .select('id, company_id')
        .eq('company_id', companyId)
        .eq('is_deleted', false)
        .eq('employment_status', 'Active');

      if (employeesError) throw employeesError;

      let processedEmployees = 0;
      let totalGross = 0;
      let totalDeductions = 0;
      let totalNet = 0;

      for (const employee of employees ?? []) {
        const { data: assignment, error: assignmentError } = await tx
          .from('employee_salary_assignments')
          .select('id, salary_structure_id, base_salary')
          .eq('company_id', companyId)
          .eq('employee_id', employee.id)
          .eq('is_deleted', false)
          .lte('effective_from', payrollMonth.end_date)
          .or(`effective_to.is.null,effective_to.gte.${payrollMonth.start_date}`)
          .order('effective_from', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (assignmentError) throw assignmentError;
        if (!assignment) {
          logger.warn('Skipping employee without active salary assignment', { employeeId: employee.id });
          continue;
        }

        const { data: salaryStructure, error: salaryStructureError } = await tx
          .from('salary_structures')
          .select('id, status')
          .eq('id', assignment.salary_structure_id)
          .eq('company_id', companyId)
          .eq('is_deleted', false)
          .maybeSingle();

        if (salaryStructureError) throw salaryStructureError;
        if (!salaryStructure || !['approved', 'active'].includes(String(salaryStructure.status ?? ''))) {
          throw new Error(`Salary structure is not approved/active for employee ${employee.id}`);
        }

        const { data: overtimeRows, error: overtimeError } = await tx
          .from('attendance_records')
          .select('overtime_minutes')
          .eq('company_id', companyId)
          .eq('employee_id', employee.id)
          .eq('is_deleted', false)
          .gte('attendance_date', payrollMonth.start_date)
          .lte('attendance_date', payrollMonth.end_date);

        if (overtimeError) throw overtimeError;

        const overtimeMinutes = (overtimeRows ?? []).reduce((sum, row) => sum + toNumber(row.overtime_minutes), 0);
        const overtimeAmount = 0;
        const attendanceDeduction = 0;
        const leaveDeduction = 0;
        const loanDeduction = 0;
        const allowances = 0;
        const baseSalary = toNumber(assignment.base_salary);
        const totalEarnings = baseSalary + allowances + overtimeAmount;
        const deductions = attendanceDeduction + leaveDeduction + loanDeduction;
        const netSalary = totalEarnings - deductions;

        const { data: payrollEntry, error: entryError } = await tx
          .from('payroll_entries')
          .insert({
            company_id: companyId,
            payroll_month_id: payrollMonth.id,
            employee_id: employee.id,
            salary_structure_id: assignment.salary_structure_id,
            base_salary_snapshot: baseSalary,
            total_allowances: allowances + overtimeAmount,
            total_deductions: deductions,
            net_salary: netSalary,
            is_processed: true,
          })
          .select('id')
          .single();

        if (entryError) throw entryError;

        const ledgerInsert = await tx.from('salary_ledger').insert([
          {
            company_id: companyId,
            payroll_entry_id: payrollEntry.id,
            employee_id: employee.id,
            debit: 0,
            credit: netSalary,
            running_balance: 0,
          },
        ]);

        if (ledgerInsert.error) throw ledgerInsert.error;

        processedEmployees += 1;
        totalGross += totalEarnings;
        totalDeductions += deductions;
        totalNet += netSalary;
      }

      const { error: finalizeError } = await tx
        .from('payroll_months')
        .update({
          status: 'finalized',
          is_locked: true,
          finalized_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', payrollMonth.id)
        .eq('company_id', companyId)
        .eq('is_deleted', false)
        .eq('is_locked', false);

      if (finalizeError) throw finalizeError;

      logger.info('Payroll run completed', {
        companyId,
        payrollMonthId: payrollMonth.id,
        processedEmployees,
        totalGross,
        totalDeductions,
        totalNet,
      });

      return {
        ok: true,
        data: {
          payrollMonthId: payrollMonth.id,
          processedEmployees,
          totalGross,
          totalDeductions,
          totalNet,
          locked: true,
        },
      };
    });
  } catch (error) {
    logger.error('Payroll run failed', {
      companyId,
      month: monthRequest.month,
      year: monthRequest.year,
      error: (error as Error).message,
    });
    return { ok: false, error: (error as Error).message };
  }
}