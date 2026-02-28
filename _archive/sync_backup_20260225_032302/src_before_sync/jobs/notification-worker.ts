import { createServerSupabaseClient } from '../lib/supabase';
import { defaultLogger, type CronJobContext } from '../lib/types';

export async function handleNotificationWorker(ctx: CronJobContext) {
  const logger = ctx.logger ?? defaultLogger;
  const supabase = createServerSupabaseClient(ctx.accessToken);

  logger.info('notification-worker started', { companyId: ctx.companyId, requestId: ctx.requestId });

  const { data: queueRows, error } = await supabase
    .from('email_queue')
    .select('id, recipient_user_id, subject, body, status, retry_count')
    .eq('company_id', ctx.companyId)
    .eq('is_deleted', false)
    .in('status', ['pending', 'failed'])
    .lt('retry_count', 5)
    .order('created_at', { ascending: true })
    .limit(50);

  if (error) {
    logger.error('Failed to fetch email queue', { error: error.message });
    throw error;
  }

  let sent = 0;
  let failed = 0;

  for (const item of queueRows ?? []) {
    try {
      logger.info('Simulated email dispatch', {
        queueId: item.id,
        recipientUserId: item.recipient_user_id,
        subject: item.subject,
      });

      // TODO: Integrate real SMTP/provider adapter. Keep this worker as orchestration only.
      const { error: updateError } = await supabase
        .from('email_queue')
        .update({ status: 'sent', updated_at: new Date().toISOString() })
        .eq('id', item.id)
        .eq('company_id', ctx.companyId)
        .eq('is_deleted', false);

      if (updateError) throw updateError;
      sent += 1;
    } catch (dispatchError) {
      failed += 1;
      const retryCount = Number(item.retry_count ?? 0) + 1;
      const { error: failUpdateError } = await supabase
        .from('email_queue')
        .update({ status: 'failed', retry_count: retryCount, updated_at: new Date().toISOString() })
        .eq('id', item.id)
        .eq('company_id', ctx.companyId)
        .eq('is_deleted', false);

      if (failUpdateError) {
        logger.error('Failed to update email queue retry status', { queueId: item.id, error: failUpdateError.message });
      }

      logger.warn('Simulated email dispatch failed', {
        queueId: item.id,
        error: (dispatchError as Error).message,
        retryCount,
      });
    }
  }

  logger.info('notification-worker completed', { companyId: ctx.companyId, sent, failed });
  return { ok: true, sent, failed };
}

// TODO: Attach cron schedule and backoff strategy; consider distributed lock if multiple workers run in parallel.