-- ============================================
-- Migration: 47_ledger_reconciliation_patch.sql
-- Purpose: Ledger safety and reconciliation hardening (verification function, insert lock guards, immutability triggers, index coverage)
-- Scope: Salary ledger and employee salary ledger functions, triggers, indexes
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: None (preserves existing policies)
-- Financial Impact: Strengthens ledger immutability and lock enforcement
-- ============================================

create index if not exists salary_ledger_company_payroll_entry_idx
  on public.salary_ledger (company_id, payroll_entry_id)
  where is_deleted = false;

create index if not exists salary_ledger_company_employee_created_at_idx
  on public.salary_ledger (company_id, employee_id, created_at)
  where is_deleted = false;

create index if not exists employee_salary_ledger_company_payroll_run_idx
  on public.employee_salary_ledger (company_id, payroll_run_id)
  where is_deleted = false;

create or replace function public.verify_salary_ledger_reconciliation(p_company_id uuid)
returns table (
  issue_code text,
  entity_type text,
  entity_id uuid,
  details jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('row_security','off', true);

  return query
  with salary_ledger_by_entry as (
    select
      sl.company_id,
      sl.payroll_entry_id,
      coalesce(sum(sl.credit - sl.debit), 0)::numeric as ledger_net
    from public.salary_ledger sl
    where sl.company_id = p_company_id
      and sl.is_deleted = false
    group by sl.company_id, sl.payroll_entry_id
  ), employee_ledger_by_run as (
    select
      esl.company_id,
      esl.payroll_run_id,
      coalesce(sum(case when esl.entry_type = 'earning' then esl.amount else -esl.amount end), 0)::numeric as ledger_net
    from public.employee_salary_ledger esl
    where esl.company_id = p_company_id
      and esl.is_deleted = false
    group by esl.company_id, esl.payroll_run_id
  ), payroll_entries_by_run as (
    select
      pe.company_id,
      pe.payroll_run_id,
      coalesce(sum(pe.net_salary), 0)::numeric as payroll_net
    from public.payroll_entries pe
    where pe.company_id = p_company_id
      and pe.is_deleted = false
    group by pe.company_id, pe.payroll_run_id
  )
  select * from (
    select
      'salary_ledger_vs_payroll_entry_net_mismatch'::text as issue_code,
      'payroll_entries'::text as entity_type,
      pe.id as entity_id,
      jsonb_build_object(
        'payroll_entry_net', pe.net_salary,
        'salary_ledger_net', coalesce(slbe.ledger_net, 0),
        'delta', (coalesce(pe.net_salary, 0) - coalesce(slbe.ledger_net, 0))
      ) as details
    from public.payroll_entries pe
    left join salary_ledger_by_entry slbe
      on slbe.payroll_entry_id = pe.id
     and slbe.company_id = pe.company_id
    where pe.company_id = p_company_id
      and pe.is_deleted = false
      and coalesce(pe.net_salary, 0) <> coalesce(slbe.ledger_net, 0)

    union all

    select
      'employee_salary_ledger_vs_payroll_run_net_mismatch',
      'payroll_runs',
      pr.id,
      jsonb_build_object(
        'payroll_run_id', pr.id,
        'payroll_entries_net', coalesce(perun.payroll_net, 0),
        'employee_salary_ledger_net', coalesce(elrun.ledger_net, 0),
        'delta', (coalesce(perun.payroll_net, 0) - coalesce(elrun.ledger_net, 0))
      )
    from public.payroll_runs pr
    left join payroll_entries_by_run perun
      on perun.payroll_run_id = pr.id
     and perun.company_id = pr.company_id
    left join employee_ledger_by_run elrun
      on elrun.payroll_run_id = pr.id
     and elrun.company_id = pr.company_id
    where pr.company_id = p_company_id
      and pr.is_deleted = false
      and coalesce(perun.payroll_net, 0) <> coalesce(elrun.ledger_net, 0)
  ) issues;
end;
$$;

create or replace function public.validate_salary_ledger_insert_lock_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_entry_company_id uuid;
  v_payroll_month_id uuid;
  v_payroll_run_id uuid;
  v_month_locked boolean;
  v_run_locked boolean;
begin
  select pe.company_id, pe.payroll_month_id, pe.payroll_run_id
    into v_entry_company_id, v_payroll_month_id, v_payroll_run_id
    from public.payroll_entries pe
   where pe.id = new.payroll_entry_id
     and pe.is_deleted = false;

  if v_entry_company_id is null then
    raise exception 'Payroll entry not found for salary ledger insert';
  end if;

  if v_entry_company_id <> new.company_id then
    raise exception 'Salary ledger company_id must match payroll entry company_id';
  end if;

  if v_payroll_month_id is not null then
    select pm.is_locked
      into v_month_locked
      from public.payroll_months pm
     where pm.id = v_payroll_month_id
       and pm.is_deleted = false;

    if coalesce(v_month_locked, false) then
      raise exception 'Cannot insert salary ledger entry for locked payroll month';
    end if;
  end if;

  if v_payroll_run_id is not null then
    select pr.locked
      into v_run_locked
      from public.payroll_runs pr
     where pr.id = v_payroll_run_id
       and pr.is_deleted = false;

    if coalesce(v_run_locked, false) then
      raise exception 'Cannot insert salary ledger entry for locked payroll run';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.validate_employee_salary_ledger_insert_lock_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_run_company_id uuid;
  v_run_locked boolean;
begin
  select pr.company_id, pr.locked
    into v_run_company_id, v_run_locked
    from public.payroll_runs pr
   where pr.id = new.payroll_run_id
     and pr.is_deleted = false;

  if v_run_company_id is null then
    raise exception 'Payroll run not found for employee salary ledger insert';
  end if;

  if v_run_company_id <> new.company_id then
    raise exception 'Employee salary ledger company_id must match payroll run company_id';
  end if;

  if coalesce(v_run_locked, false) then
    raise exception 'Cannot insert employee salary ledger entry for locked payroll run';
  end if;

  return new;
end;
$$;

create or replace function public.block_update_employee_salary_ledger()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Updating employee salary ledger is not allowed';
end;
$$;

create or replace function public.block_delete_employee_salary_ledger()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Deleting employee salary ledger is not allowed';
end;
$$;

drop trigger if exists trg_salary_ledger_insert_lock_guard on public.salary_ledger;
create trigger trg_salary_ledger_insert_lock_guard
  before insert on public.salary_ledger
  for each row execute function public.validate_salary_ledger_insert_lock_guard();

drop trigger if exists trg_employee_salary_ledger_insert_lock_guard on public.employee_salary_ledger;
create trigger trg_employee_salary_ledger_insert_lock_guard
  before insert on public.employee_salary_ledger
  for each row execute function public.validate_employee_salary_ledger_insert_lock_guard();

drop trigger if exists trg_employee_salary_ledger_block_update on public.employee_salary_ledger;
create trigger trg_employee_salary_ledger_block_update
  before update on public.employee_salary_ledger
  for each row execute function public.block_update_employee_salary_ledger();

drop trigger if exists trg_employee_salary_ledger_block_delete on public.employee_salary_ledger;
create trigger trg_employee_salary_ledger_block_delete
  before delete on public.employee_salary_ledger
  for each row execute function public.block_delete_employee_salary_ledger();