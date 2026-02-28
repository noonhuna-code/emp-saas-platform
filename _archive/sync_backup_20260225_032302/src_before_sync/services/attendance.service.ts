import type {
  AttendanceCorrectionPayload,
  AuthContext,
  ClockInPayload,
  ClockInResult,
  ClockOutResult,
  ServiceResult,
} from '../lib/types';

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

async function assertEmployeeBelongsToCompany(ctx: AuthContext, employeeId: string) {
  const { data, error } = await ctx.supabase
    .from('employees')
    .select('id, company_id, is_deleted')
    .eq('id', employeeId)
    .eq('company_id', ctx.companyId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Employee not found in current company scope');
  return data;
}

export async function clockIn(
  ctx: AuthContext,
  employeeId: string,
  payload: ClockInPayload = {}
): Promise<ServiceResult<ClockInResult>> {
  const logger = ctx.logger ?? console;
  try {
    await assertEmployeeBelongsToCompany(ctx, employeeId);

    const attendanceDate = todayIsoDate();
    const checkInAt = payload.occurredAt ?? new Date().toISOString();

    const { data: duplicate, error: duplicateError } = await ctx.supabase
      .from('attendance_records')
      .select('id, status, check_in')
      .eq('company_id', ctx.companyId)
      .eq('employee_id', employeeId)
      .eq('attendance_date', attendanceDate)
      .eq('is_deleted', false)
      .maybeSingle();

    if (duplicateError) throw duplicateError;
    if (duplicate?.check_in) {
      return { ok: false, error: 'Employee is already clocked in for today' };
    }

    const { error: shiftError } = await ctx.supabase.rpc('get_effective_shift_for_employee', {
      p_employee_id: employeeId,
      p_date: attendanceDate,
    });

    if (shiftError) {
      logger.warn('Shift lookup failed; attendance insert may fail if shift snapshot is required', {
        error: shiftError.message,
        employeeId,
      });
    }

    if (duplicate?.id) {
      const { data, error } = await ctx.supabase
        .from('attendance_records')
        .update({ check_in: checkInAt, updated_at: new Date().toISOString() })
        .eq('id', duplicate.id)
        .eq('company_id', ctx.companyId)
        .eq('is_deleted', false)
        .select('id, attendance_date, status, check_in')
        .single();

      if (error) throw error;

      return {
        ok: true,
        data: {
          attendanceId: data.id,
          attendanceDate: data.attendance_date,
          status: data.status,
          checkIn: data.check_in,
        },
      };
    }

    const { data, error } = await ctx.supabase
      .from('attendance_records')
      .insert({
        company_id: ctx.companyId,
        employee_id: employeeId,
        attendance_date: attendanceDate,
        check_in: checkInAt,
        status: 'pending',
      })
      .select('id, attendance_date, status, check_in')
      .single();

    if (error) throw error;

    logger.info('Clock-in recorded', { employeeId, attendanceId: data.id, attendanceDate });

    return {
      ok: true,
      data: {
        attendanceId: data.id,
        attendanceDate: data.attendance_date,
        status: data.status,
        checkIn: data.check_in,
      },
    };
  } catch (error) {
    logger.error('Clock-in failed', { employeeId, error: (error as Error).message });
    return { ok: false, error: (error as Error).message };
  }
}

export async function clockOut(
  ctx: AuthContext,
  employeeId: string
): Promise<ServiceResult<ClockOutResult>> {
  const logger = ctx.logger ?? console;
  try {
    await assertEmployeeBelongsToCompany(ctx, employeeId);

    const { data: openAttendance, error: fetchError } = await ctx.supabase
      .from('attendance_records')
      .select('id, company_id, check_in, check_out, status, work_minutes, overtime_minutes')
      .eq('company_id', ctx.companyId)
      .eq('employee_id', employeeId)
      .eq('is_deleted', false)
      .is('check_out', null)
      .order('attendance_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!openAttendance) {
      return { ok: false, error: 'No open attendance record found' };
    }

    const checkOutAt = new Date().toISOString();
    const { error: updateError } = await ctx.supabase
      .from('attendance_records')
      .update({ check_out: checkOutAt, updated_at: checkOutAt })
      .eq('id', openAttendance.id)
      .eq('company_id', ctx.companyId)
      .eq('is_deleted', false);

    if (updateError) throw updateError;

    const { error: calcError } = await ctx.supabase.rpc('calculate_attendance_status', {
      p_attendance_id: openAttendance.id,
    });

    if (calcError) {
      logger.warn('Attendance status recalculation failed after clock-out', {
        attendanceId: openAttendance.id,
        error: calcError.message,
      });
    }

    const { data: refreshed, error: refreshError } = await ctx.supabase
      .from('attendance_records')
      .select('id, check_out, status, work_minutes, overtime_minutes')
      .eq('id', openAttendance.id)
      .eq('company_id', ctx.companyId)
      .eq('is_deleted', false)
      .single();

    if (refreshError) throw refreshError;

    const notificationInsert = await ctx.supabase.from('notifications').insert({
      company_id: ctx.companyId,
      recipient_profile_id: null,
      type: 'attendance_clock_out',
      title: 'Attendance clock-out recorded',
      message: `Clock-out captured for employee ${employeeId}`,
      reference_type: 'attendance_record',
      reference_id: openAttendance.id,
    });

    if (notificationInsert.error) {
      logger.warn('Notification enqueue stub failed', { error: notificationInsert.error.message });
    }

    return {
      ok: true,
      data: {
        attendanceId: refreshed.id,
        checkOut: refreshed.check_out,
        status: refreshed.status,
        workMinutes: refreshed.work_minutes,
        overtimeMinutes: refreshed.overtime_minutes,
      },
    };
  } catch (error) {
    logger.error('Clock-out failed', { employeeId, error: (error as Error).message });
    return { ok: false, error: (error as Error).message };
  }
}

export async function requestAttendanceCorrection(
  ctx: AuthContext,
  recordId: string,
  payload: AttendanceCorrectionPayload
): Promise<ServiceResult<{ requestId: string; status: string }>> {
  const logger = ctx.logger ?? console;
  try {
    const { data: attendance, error: attendanceError } = await ctx.supabase
      .from('attendance_records')
      .select('id, company_id, employee_id, is_deleted')
      .eq('id', recordId)
      .eq('company_id', ctx.companyId)
      .eq('is_deleted', false)
      .single();

    if (attendanceError) throw attendanceError;

    const { data, error } = await ctx.supabase
      .from('attendance_correction_requests')
      .insert({
        company_id: ctx.companyId,
        attendance_id: attendance.id,
        requested_check_in: payload.requestedCheckIn ?? null,
        requested_check_out: payload.requestedCheckOut ?? null,
        reason: payload.reason,
        status: 'pending',
      })
      .select('id, status')
      .single();

    if (error) throw error;

    const notification = await ctx.supabase.from('notifications').insert({
      company_id: ctx.companyId,
      recipient_profile_id: null,
      type: 'attendance_correction_requested',
      title: 'Attendance correction request pending',
      message: `Correction requested for attendance record ${attendance.id}`,
      reference_type: 'attendance_correction_request',
      reference_id: data.id,
    });

    if (notification.error) {
      logger.warn('Manager notification enqueue stub failed', { error: notification.error.message, requestId: data.id });
    }

    return { ok: true, data: { requestId: data.id, status: data.status } };
  } catch (error) {
    logger.error('Attendance correction request failed', { recordId, error: (error as Error).message });
    return { ok: false, error: (error as Error).message };
  }
}