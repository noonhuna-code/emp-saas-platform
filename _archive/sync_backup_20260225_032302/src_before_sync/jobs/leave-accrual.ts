import { createServerSupabaseClient } from '../lib/supabase';
import { defaultLogger, type CronJobContext } from '../lib/types';

export async function handleLeaveAccrualJob(ctx: CronJobContext) {
  const logger = ctx.logger ?? defaultLogger;
  const supabase = createServerSupabaseClient(ctx.accessToken);

  logger.info('leave-accrual job started', { companyId: ctx.companyId, requestId: ctx.requestId });

  const { data, error } = await supabase.rpc('process_monthly_leave_accrual', {
    company_uuid: ctx.companyId,
  });

  if (error) {
    logger.error('Leave accrual processing failed', { companyId: ctx.companyId, error: error.message });
    throw error;
  }

  logger.info('leave-accrual job completed', { companyId: ctx.companyId, result: data ?? null });
  return { ok: true, result: data ?? null };
}

// TODO: Wire to monthly cron schedule and define retry/dead-letter strategy for failed company runs.