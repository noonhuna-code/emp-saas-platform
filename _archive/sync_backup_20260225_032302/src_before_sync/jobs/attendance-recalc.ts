import { createServerSupabaseClient } from '../lib/supabase';
import { defaultLogger, type CronJobContext } from '../lib/types';

export async function handleAttendanceRecalcJob(ctx: CronJobContext) {
  const logger = ctx.logger ?? defaultLogger;
  const supabase = createServerSupabaseClient(ctx.accessToken);

  logger.info('attendance-recalc job started', { companyId: ctx.companyId, requestId: ctx.requestId });

  const { error: autoAbsentError } = await supabase.rpc('auto_mark_absent');
  if (autoAbsentError) {
    logger.error('auto_mark_absent failed', { error: autoAbsentError.message, companyId: ctx.companyId });
    throw autoAbsentError;
  }

  const { data: openRows, error: openRowsError } = await supabase
    .from('attendance_records')
    .select('id')
    .eq('company_id', ctx.companyId)
    .eq('is_deleted', false)
    .is('check_out', null)
    .lt('attendance_date', new Date().toISOString().slice(0, 10));

  if (openRowsError) {
    logger.error('Failed to find open attendance rows', { error: openRowsError.message });
    throw openRowsError;
  }

  for (const row of openRows ?? []) {
    const { error } = await supabase.rpc('calculate_attendance_status', { p_attendance_id: row.id });
    if (error) {
      logger.warn('calculate_attendance_status failed for open row', { attendanceId: row.id, error: error.message });
    }
  }

  logger.info('attendance-recalc job completed', {
    companyId: ctx.companyId,
    recalculatedOpenRows: (openRows ?? []).length,
  });

  return { ok: true, recalculatedOpenRows: (openRows ?? []).length };
}

// TODO: Wire this handler to Supabase Edge Functions scheduler (cron) at 23:59 company-local or UTC strategy.