-- ============================================
-- Migration: 20260226120156_payroll_archive_atomic.sql
-- Purpose: Add atomic payroll archive RPC with audit trail
-- Scope: New SECURITY INVOKER function only
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: None (relies on existing RLS)
-- ============================================

create or replace function public.archive_payroll_run_atomic(
  p_run_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_company_id uuid;
  v_actor_profile_id uuid;
  v_rowcount integer;
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'UNAUTHENTICATED';
  end if;

  select up.company_id, up.id
    into v_company_id, v_actor_profile_id
    from public.user_profiles up
   where up.user_id = auth.uid()
     and up.is_deleted = false
   limit 1;

  if v_company_id is null or v_actor_profile_id is null then
    raise exception using errcode = 'P0001', message = 'TENANT_RESOLUTION_FAILED';
  end if;

  update public.payroll_runs
     set status = 'archived',
         updated_at = now(),
         updated_by = v_actor_profile_id
   where id = p_run_id
     and company_id = v_company_id
     and is_deleted = false
     and locked = true
     and status = 'paid';

  get diagnostics v_rowcount = row_count;
  if v_rowcount <> 1 then
    raise exception using errcode = 'P0001', message = 'PAYROLL_RUN_NOT_PAID';
  end if;

  insert into public.approval_audit_log (
    company_id,
    entity_type,
    entity_id,
    actor_profile_id,
    action
  ) values (
    v_company_id,
    'payroll_run',
    p_run_id,
    v_actor_profile_id,
    'archive'
  );

  return jsonb_build_object(
    'payroll_run_id', p_run_id,
    'status', 'archived'
  );
end;
$$;

