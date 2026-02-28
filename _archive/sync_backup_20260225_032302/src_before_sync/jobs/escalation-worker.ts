import { createServerSupabaseClient } from '../lib/supabase';
import { defaultLogger, type CronJobContext } from '../lib/types';

export async function handleEscalationWorker(ctx: CronJobContext) {
  const logger = ctx.logger ?? defaultLogger;
  const supabase = createServerSupabaseClient(ctx.accessToken);

  logger.info('escalation-worker started', { companyId: ctx.companyId, requestId: ctx.requestId });

  const thresholdHours = 24;
  const threshold = new Date(Date.now() - thresholdHours * 60 * 60 * 1000).toISOString();

  const { data: pendingLeave, error: leaveError } = await supabase
    .from('leave_requests')
    .select('id, employee_id, created_at, status')
    .eq('company_id', ctx.companyId)
    .eq('is_deleted', false)
    .eq('status', 'pending')
    .lte('created_at', threshold)
    .limit(100);

  if (leaveError) {
    logger.error('Failed to fetch pending leave requests for escalation', { error: leaveError.message });
    throw leaveError;
  }

  let notificationsCreated = 0;
  for (const req of pendingLeave ?? []) {
    const notify = await supabase.from('notifications').insert({
      company_id: ctx.companyId,
      recipient_profile_id: null,
      type: 'approval_escalation',
      title: 'Approval escalation required',
      message: `Leave request ${req.id} is pending beyond threshold`,
      reference_type: 'leave_request',
      reference_id: req.id,
    });

    if (notify.error) {
      logger.warn('Failed to enqueue escalation notification', { requestId: req.id, error: notify.error.message });
      continue;
    }

    notificationsCreated += 1;
  }

  logger.info('escalation-worker completed', {
    companyId: ctx.companyId,
    thresholdHours,
    notificationsCreated,
  });

  return { ok: true, notificationsCreated };
}

// TODO: Extend to attendance_correction_requests and shift_swap_requests escalation chains with configurable thresholds.