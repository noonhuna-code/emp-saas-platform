-- ============================================
-- Migration: 20260226120155_payroll_lifecycle_atomic.sql
-- Purpose: Add atomic payroll lifecycle mutations (mark paid/archive) with audit trail
-- Scope: payroll status constraint extension, immutability exception patch, new SECURITY INVOKER RPCs
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: None (relies on existing RLS)
-- ============================================

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'payroll_runs_status_chk'
      and conrelid = 'public.payroll_runs'::regclass
  ) then
    alter table public.payroll_runs
      drop constraint payroll_runs_status_chk;
  end if;

  alter table public.payroll_runs
    add constraint payroll_runs_status_chk
    check (status in ('draft','processing','finalized','paid','partial','archived'));
end $$;

create or replace function public.prevent_payroll_modification()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_locked boolean;
  v_run_id uuid;
  v_allowed_locked_status_transition boolean := false;
begin
  if tg_table_name = 'payroll_runs' then
    if tg_op = 'UPDATE' and old.locked = true then
      v_allowed_locked_status_transition :=
        old.company_id = new.company_id
        and old.id = new.id
        and coalesce(old.month, 0) = coalesce(new.month, 0)
        and coalesce(old.year, 0) = coalesce(new.year, 0)
        and old.start_date is not distinct from new.start_date
        and old.end_date is not distinct from new.end_date
        and old.locked = new.locked
        and old.locked_at is not distinct from new.locked_at
        and old.locked_by is not distinct from new.locked_by
        and old.created_at is not distinct from new.created_at
        and old.created_by is not distinct from new.created_by
        and old.is_deleted = new.is_deleted
        and old.deleted_at is not distinct from new.deleted_at
        and old.deleted_by is not distinct from new.deleted_by
        and (
          (old.status = 'finalized' and new.status = 'paid')
          or (old.status = 'paid' and new.status = 'archived')
        );

      if not v_allowed_locked_status_transition then
        raise exception using
          errcode = 'P0001',
          message = 'PAYROLL_LOCKED_IMMUTABLE';
      end if;

      return new;
    end if;

    if old.locked = true then
      raise exception using
        errcode = 'P0001',
        message = 'PAYROLL_LOCKED_IMMUTABLE';
    end if;

    if tg_op = 'DELETE' then
      return old;
    end if;

    return new;
  end if;

  v_run_id := old.payroll_run_id;

  select pr.locked
    into v_locked
    from public.payroll_runs pr
   where pr.id = v_run_id
     and pr.company_id = old.company_id
     and pr.is_deleted = false
   limit 1;

  if v_locked is true then
    raise exception using
      errcode = 'P0001',
      message = 'PAYROLL_LOCKED_IMMUTABLE';
  end if;

  if tg_op = 'UPDATE' and new.payroll_run_id is distinct from old.payroll_run_id then
    select pr.locked
      into v_locked
      from public.payroll_runs pr
     where pr.id = new.payroll_run_id
       and pr.company_id = old.company_id
       and pr.is_deleted = false
     limit 1;

    if v_locked is true then
      raise exception using
        errcode = 'P0001',
        message = 'PAYROLL_LOCKED_IMMUTABLE';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create or replace function public.mark_payroll_run_paid_atomic(
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
     set status = 'paid',
         updated_at = now(),
         updated_by = v_actor_profile_id
   where id = p_run_id
     and company_id = v_company_id
     and is_deleted = false
     and locked = true
     and status = 'finalized';

  get diagnostics v_rowcount = row_count;
  if v_rowcount <> 1 then
    raise exception using errcode = 'P0001', message = 'PAYROLL_RUN_NOT_FINALIZED';
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
    'mark_paid'
  );

  return jsonb_build_object(
    'payroll_run_id', p_run_id,
    'status', 'paid'
  );
end;
$$;
