import type { AuthContext, LeaveApplyPayload, ServiceResult } from '../lib/types';

function requireTransaction(ctx: AuthContext) {
  if (!ctx.runInTransaction) {
    throw new Error('Transaction runner is required for leave workflow operations');
  }
  return ctx.runInTransaction;
}

export async function applyLeave(
  ctx: AuthContext,
  employeeId: string,
  payload: LeaveApplyPayload
): Promise<ServiceResult<{ requestId: string; status: string }>> {
  const logger = ctx.logger ?? console;

  try {
    const runInTransaction = requireTransaction(ctx);

    return await runInTransaction(async (tx) => {
      const { data: employee, error: employeeError } = await tx
        .from('employees')
        .select('id, company_id, is_deleted')
        .eq('id', employeeId)
        .eq('company_id', ctx.companyId)
        .eq('is_deleted', false)
        .single();

      if (employeeError) throw employeeError;
      if (!employee) throw new Error('Employee not found in current company');

      const { data: overlap, error: overlapError } = await tx
        .from('leave_requests')
        .select('id')
        .eq('company_id', ctx.companyId)
        .eq('employee_id', employeeId)
        .eq('is_deleted', false)
        .in('status', ['pending', 'approved'])
        .lte('start_date', payload.endDate)
        .gte('end_date', payload.startDate)
        .limit(1)
        .maybeSingle();

      if (overlapError) throw overlapError;
      if (overlap) throw new Error('Leave request overlaps existing request');

      const { data: blackout, error: blackoutError } = await tx
        .from('leave_blackout_dates')
        .select('id')
        .eq('company_id', ctx.companyId)
        .eq('is_deleted', false)
        .lte('start_date', payload.endDate)
        .gte('end_date', payload.startDate)
        .limit(1)
        .maybeSingle();

      if (blackoutError && !/relation .* does not exist/i.test(blackoutError.message)) {
        throw blackoutError;
      }
      if (blackout) throw new Error('Leave falls within blackout dates');

      const { data: balance, error: balanceError } = await tx
        .from('leave_balances')
        .select('id, remaining_days')
        .eq('company_id', ctx.companyId)
        .eq('employee_id', employeeId)
        .eq('leave_type_id', payload.leaveTypeId)
        .eq('is_deleted', false)
        .order('year', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (balanceError) throw balanceError;
      if (!balance) throw new Error('Leave balance not found');
      if (Number(balance.remaining_days ?? 0) < Number(payload.totalDays)) {
        throw new Error('Insufficient leave balance');
      }

      const { data: request, error: requestError } = await tx
        .from('leave_requests')
        .insert({
          company_id: ctx.companyId,
          employee_id: employeeId,
          leave_type_id: payload.leaveTypeId,
          start_date: payload.startDate,
          end_date: payload.endDate,
          total_days: payload.totalDays,
          reason: payload.reason ?? null,
          status: 'pending',
          is_half_day: payload.isHalfDay ?? false,
          half_day_type: payload.halfDayType ?? null,
          approval_level: 1,
          final_approved: false,
        })
        .select('id, status')
        .single();

      if (requestError) throw requestError;

      const notifyResult = await tx.from('notifications').insert({
        company_id: ctx.companyId,
        recipient_profile_id: null,
        type: 'leave_request_submitted',
        title: 'Leave request submitted',
        message: `Leave request ${request.id} is pending approval`,
        reference_type: 'leave_request',
        reference_id: request.id,
      });

      if (notifyResult.error) {
        logger.warn('Leave notification enqueue failed', { error: notifyResult.error.message, requestId: request.id });
      }

      return { ok: true, data: { requestId: request.id, status: request.status } };
    });
  } catch (error) {
    logger.error('Apply leave failed', { employeeId, error: (error as Error).message });
    return { ok: false, error: (error as Error).message };
  }
}

export async function approveLeave(
  ctx: AuthContext,
  requestId: string,
  approverId: string
): Promise<ServiceResult<{ requestId: string; status: string }>> {
  const logger = ctx.logger ?? console;

  try {
    const runInTransaction = requireTransaction(ctx);

    return await runInTransaction(async (tx) => {
      const { data: request, error: requestError } = await tx
        .from('leave_requests')
        .select('*')
        .eq('id', requestId)
        .eq('company_id', ctx.companyId)
        .eq('is_deleted', false)
        .single();

      if (requestError) throw requestError;
      if (!request) throw new Error('Leave request not found');
      if (request.status !== 'pending') throw new Error('Leave request is not pending');

      const { data: balance, error: balanceError } = await tx
        .from('leave_balances')
        .select('id, entitled_days, used_days, remaining_days')
        .eq('company_id', ctx.companyId)
        .eq('employee_id', request.employee_id)
        .eq('leave_type_id', request.leave_type_id)
        .eq('is_deleted', false)
        .eq('year', new Date(request.start_date).getUTCFullYear())
        .single();

      if (balanceError) throw balanceError;

      const newUsedDays = Number(balance.used_days ?? 0) + Number(request.total_days ?? 0);

      const { error: balanceUpdateError } = await tx
        .from('leave_balances')
        .update({ used_days: newUsedDays, updated_at: new Date().toISOString() })
        .eq('id', balance.id)
        .eq('company_id', ctx.companyId)
        .eq('is_deleted', false);

      if (balanceUpdateError) throw balanceUpdateError;

      const { error: requestUpdateError } = await tx
        .from('leave_requests')
        .update({
          status: 'approved',
          approved_by: null,
          approved_at: new Date().toISOString(),
          final_approved: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.id)
        .eq('company_id', ctx.companyId)
        .eq('is_deleted', false);

      if (requestUpdateError) throw requestUpdateError;

      const ledgerInsert = await tx.from('leave_ledger').insert({
        company_id: ctx.companyId,
        employee_id: request.employee_id,
        leave_type_id: request.leave_type_id,
        transaction_type: 'used',
        days: Number(request.total_days ?? 0),
        reference_id: request.id,
        transaction_date: request.start_date,
      });

      if (ledgerInsert.error) {
        logger.warn('Leave ledger insert failed', {
          requestId: request.id,
          approverId,
          error: ledgerInsert.error.message,
        });
        throw ledgerInsert.error;
      }

      const notifyResult = await tx.from('notifications').insert({
        company_id: ctx.companyId,
        recipient_profile_id: null,
        type: 'leave_request_approved',
        title: 'Leave approved',
        message: `Leave request ${request.id} was approved`,
        reference_type: 'leave_request',
        reference_id: request.id,
      });

      if (notifyResult.error) {
        logger.warn('Leave approval notification enqueue failed', { error: notifyResult.error.message, requestId: request.id });
      }

      return { ok: true, data: { requestId: request.id, status: 'approved' } };
    });
  } catch (error) {
    logger.error('Approve leave failed', { requestId, approverId, error: (error as Error).message });
    return { ok: false, error: (error as Error).message };
  }
}