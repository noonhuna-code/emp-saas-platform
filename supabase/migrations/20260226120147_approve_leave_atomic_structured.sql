-- ============================================
-- Migration: 60b_approve_leave_atomic_structured.sql
-- Purpose: Structured error version of approve_leave_atomic
-- Scope: SECURITY INVOKER function only (no schema/RLS changes)
-- Non-destructive: YES
-- Idempotent: YES (CREATE OR REPLACE)
-- RLS Impact: None (RLS remains enforced; no bypass)
-- ============================================

create or replace function public.approve_leave_atomic(
  p_leave_request_id uuid,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_rowcount integer;
  v_request record;
  v_actor_profile_id uuid;
  v_employee_profile_id uuid;
  v_company_id uuid;
begin
  if p_leave_request_id is null or p_actor_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'APPROVAL_NOT_PENDING',
      detail = 'Leave request id or actor missing';
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

  update public.leave_requests
     set status = 'approved',
         approved_at = now(),
         approved_by = v_actor_profile_id,
         updated_by = v_actor_profile_id
   where id = p_leave_request_id
     and company_id = v_company_id
     and status = 'pending'
     and is_deleted = false
  returning id, employee_id, leave_type_id, total_days
    into v_request;

  get diagnostics v_rowcount = row_count;
  if v_rowcount <> 1 then
    raise exception using
      errcode = 'P0001',
      message = 'APPROVAL_NOT_PENDING',
      detail = 'Leave request is not in pending state or not found';
  end if;

  insert into public.approval_audit_log (
    company_id,
    entity_type,
    entity_id,
    actor_profile_id,
    action
  ) values (
    v_company_id,
    'leave',
    p_leave_request_id,
    v_actor_profile_id,
    'approve'
  );

  insert into public.leave_ledger (
    company_id,
    employee_id,
    leave_type_id,
    transaction_type,
    days,
    reference_id,
    transaction_date,
    created_at,
    created_by
  ) values (
    v_company_id,
    v_request.employee_id,
    v_request.leave_type_id,
    'used',
    v_request.total_days,
    p_leave_request_id,
    current_date,
    now(),
    v_actor_profile_id
  );

  select e.user_profile_id
    into v_employee_profile_id
    from public.employees e
   where e.id = v_request.employee_id
     and e.company_id = v_company_id
     and e.is_deleted = false
   limit 1;

  if v_employee_profile_id is not null then
    insert into public.notifications (
      company_id,
      recipient_profile_id,
      type,
      title,
      message,
      reference_type,
      reference_id,
      created_at,
      updated_at,
      created_by,
      updated_by
    ) values (
      v_company_id,
      v_employee_profile_id,
      'leave_approved',
      'Leave approved',
      'Your leave request has been approved',
      'leave_request',
      p_leave_request_id,
      now(),
      now(),
      v_actor_profile_id,
      v_actor_profile_id
    );
  end if;

  return jsonb_build_object('status', 'approved', 'request_id', p_leave_request_id);
end;
$$;
