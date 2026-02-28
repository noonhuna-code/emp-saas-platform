-- ============================================
-- Migration: 60c_approve_attendance_correction_atomic_structured.sql
-- Purpose: Structured error version of approve_attendance_correction_atomic
-- Scope: SECURITY INVOKER function only (no schema/RLS changes)
-- Non-destructive: YES
-- Idempotent: YES (CREATE OR REPLACE)
-- RLS Impact: None (RLS remains enforced; no bypass)
-- ============================================

create or replace function public.approve_attendance_correction_atomic(
  p_correction_id uuid,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_rowcount integer;
  v_attendance_rowcount integer;
  v_actor_profile_id uuid;
  v_correction record;
  v_company_id uuid;
begin
  if p_correction_id is null or p_actor_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'APPROVAL_NOT_PENDING',
      detail = 'Correction id or actor missing';
  end if;

  if auth.uid() is null then
    raise exception using
      errcode = 'P0001',
      message = 'UNAUTHENTICATED',
      detail = 'Authenticated session required';
  end if;

  if auth.uid() <> p_actor_id then
    raise exception using
      errcode = 'P0001',
      message = 'ACTOR_MISMATCH',
      detail = 'Actor does not match authenticated user';
  end if;

  select up.id, up.company_id
    into v_actor_profile_id, v_company_id
    from public.user_profiles up
   where up.user_id = p_actor_id
     and up.is_deleted = false
   limit 1;

  if v_actor_profile_id is null or v_company_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'TENANT_RESOLUTION_FAILED',
      detail = 'Tenant resolution failed';
  end if;

  update public.attendance_correction_requests
     set status = 'approved',
         reviewed_by = v_actor_profile_id,
         reviewed_at = now(),
         updated_by = v_actor_profile_id
   where id = p_correction_id
     and company_id = v_company_id
     and status = 'pending'
     and is_deleted = false
  returning id,
            company_id,
            attendance_id,
            requested_check_in,
            requested_check_out,
            reason,
            rejection_reason,
            status,
            reviewed_by,
            reviewed_at,
            created_at
    into v_correction;

  get diagnostics v_rowcount = row_count;
  if v_rowcount <> 1 then
    raise exception using
      errcode = 'P0001',
      message = 'APPROVAL_NOT_PENDING',
      detail = 'Correction is not in pending state or not found';
  end if;

  update public.attendance_records
     set check_in = coalesce(v_correction.requested_check_in, check_in),
         check_out = coalesce(v_correction.requested_check_out, check_out)
   where id = v_correction.attendance_id
     and company_id = v_company_id
     and is_deleted = false;

  get diagnostics v_attendance_rowcount = row_count;
  if v_attendance_rowcount <> 1 then
    raise exception using
      errcode = 'P0001',
      message = 'ATTENDANCE_NOT_FOUND',
      detail = 'Attendance record missing';
  end if;

  insert into public.approval_audit_log (
    company_id,
    entity_type,
    entity_id,
    actor_profile_id,
    action
  ) values (
    v_company_id,
    'attendance',
    p_correction_id,
    v_actor_profile_id,
    'approve'
  );

  perform public.calculate_attendance_status(v_correction.attendance_id);

  return to_jsonb(v_correction);
end;
$$;
