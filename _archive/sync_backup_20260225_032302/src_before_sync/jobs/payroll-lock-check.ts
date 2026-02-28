import { createServerSupabaseClient } from '../lib/supabase';
import { defaultLogger, type CronJobContext } from '../lib/types';

export async function handlePayrollLockCheckJob(ctx: CronJobContext) {
  const logger = ctx.logger ?? defaultLogger;
  const supabase = createServerSupabaseClient(ctx.accessToken);

  logger.info('payroll-lock-check job started', { companyId: ctx.companyId, requestId: ctx.requestId });

  const { data: months, error } = await supabase
    .from('payroll_months')
    .select('id, status, is_locked')
    .eq('company_id', ctx.companyId)
    .eq('is_deleted', false)
    .eq('status', 'finalized')
    .eq('is_locked', false);

  if (error) {
    logger.error('Failed to fetch finalized unlocked payroll months', { error: error.message });
    throw error;
  }

  let lockedCount = 0;
  for (const month of months ?? []) {
    const { error: updateError } = await supabase
      .from('payroll_months')
      .update({ is_locked: true, updated_at: new Date().toISOString() })
      .eq('id', month.id)
      .eq('company_id', ctx.companyId)
      .eq('is_deleted', false)
      .eq('is_locked', false);

    if (updateError) {
      logger.warn('Failed to auto-lock payroll month', { payrollMonthId: month.id, error: updateError.message });
      continue;
    }
    lockedCount += 1;
  }

  logger.info('payroll-lock-check job completed', { companyId: ctx.companyId, lockedCount });
  return { ok: true, lockedCount };
}

// TODO: Schedule monthly post-finalization verification and route exceptions to ops alerts.