-- ============================================
-- Migration: 62_payroll_immutability.sql
-- Purpose: Prevent updates/deletes on locked payroll runs and entries
-- Scope: New guard trigger + triggers on payroll_runs/payroll_entries
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: None
-- ============================================

create or replace function public.prevent_payroll_modification()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_locked boolean;
  v_run_id uuid;
begin
  if tg_table_name = 'payroll_runs' then
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

drop trigger if exists trg_payroll_runs_lock_guard on public.payroll_runs;
create trigger trg_payroll_runs_lock_guard
  before update or delete on public.payroll_runs
  for each row execute function public.prevent_payroll_modification();

drop trigger if exists trg_payroll_entries_lock_guard on public.payroll_entries;
create trigger trg_payroll_entries_lock_guard
  before update or delete on public.payroll_entries
  for each row execute function public.prevent_payroll_modification();
