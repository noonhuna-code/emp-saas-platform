-- ============================================
-- Migration: 46_payroll_integrity_patch.sql
-- Purpose: Payroll stability hardening (auto-lock scheduler, integrity checks, reconciliation validation, salary revision audit log)
-- Scope: Payroll functions, triggers, audit log table, indexes, RLS for new audit table
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: Adds RLS only for salary_revision_audit_log
-- Financial Impact: Preserves immutability and adds auditability
-- ============================================

create table if not exists public.salary_revision_audit_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  salary_structure_id uuid not null references public.salary_structures(id) on delete restrict,
  employee_id uuid references public.employees(id) on delete restrict,
  action text not null,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'salary_revision_audit_log_action_chk'
       AND conrelid = 'public.salary_revision_audit_log'::regclass
  ) THEN
    ALTER TABLE public.salary_revision_audit_log
      ADD CONSTRAINT salary_revision_audit_log_action_chk
      CHECK (action in ('insert','update','status_change','activation','superseded'));
  END IF;
END $$;

create index if not exists salary_revision_audit_log_company_id_idx
  on public.salary_revision_audit_log (company_id)
  where is_deleted = false;

create index if not exists salary_revision_audit_log_salary_structure_id_idx
  on public.salary_revision_audit_log (salary_structure_id)
  where is_deleted = false;

create index if not exists salary_revision_audit_log_employee_id_idx
  on public.salary_revision_audit_log (employee_id)
  where is_deleted = false;

create index if not exists salary_revision_audit_log_company_created_at_idx
  on public.salary_revision_audit_log (company_id, created_at)
  where is_deleted = false;

alter table public.salary_revision_audit_log enable row level security;
alter table public.salary_revision_audit_log force row level security;

drop policy if exists salary_revision_audit_log_select on public.salary_revision_audit_log;
drop policy if exists salary_revision_audit_log_insert on public.salary_revision_audit_log;
drop policy if exists salary_revision_audit_log_update on public.salary_revision_audit_log;
drop policy if exists salary_revision_audit_log_delete on public.salary_revision_audit_log;

create policy salary_revision_audit_log_select on public.salary_revision_audit_log
  for select
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and (
      public.current_user_has_permission('manage_payroll')
      or public.current_user_has_permission('approve_salary')
    )
  );

create policy salary_revision_audit_log_insert on public.salary_revision_audit_log
  for insert
  with check (
    company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_payroll')
      or public.current_user_has_permission('approve_salary')
    )
  );

create or replace function public.log_salary_revision_audit()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_actor uuid;
  v_action text;
  v_old_payload jsonb;
  v_new_payload jsonb;
  v_old_business jsonb;
  v_new_business jsonb;
begin
  select up.id
    into v_actor
    from public.user_profiles up
   where up.user_id = auth.uid()
     and up.is_deleted = false
   limit 1;

  if tg_op = 'INSERT' then
    v_new_payload := to_jsonb(new);
    insert into public.salary_revision_audit_log (
      company_id,
      salary_structure_id,
      employee_id,
      action,
      old_values,
      new_values,
      created_by,
      is_deleted
    ) values (
      new.company_id,
      new.id,
      new.employee_id,
      'insert',
      null,
      v_new_payload,
      v_actor,
      false
    );
    return new;
  end if;

  v_old_payload := to_jsonb(old);
  v_new_payload := to_jsonb(new);
  v_old_business := ((((((v_old_payload - 'updated_at') - 'updated_by') - 'created_at') - 'created_by') - 'deleted_at') - 'deleted_by');
  v_new_business := ((((((v_new_payload - 'updated_at') - 'updated_by') - 'created_at') - 'created_by') - 'deleted_at') - 'deleted_by');

  if v_old_business is not distinct from v_new_business then
    return new;
  end if;

  if new.status is distinct from old.status then
    if new.status = 'active' then
      v_action := 'activation';
    elsif new.status = 'superseded' then
      v_action := 'superseded';
    else
      v_action := 'status_change';
    end if;
  else
    v_action := 'update';
  end if;

  insert into public.salary_revision_audit_log (
    company_id,
    salary_structure_id,
    employee_id,
    action,
    old_values,
    new_values,
    created_by,
    is_deleted
  ) values (
    new.company_id,
    new.id,
    new.employee_id,
    v_action,
    v_old_payload,
    v_new_payload,
    v_actor,
    false
  );

  return new;
end;
$$;

drop trigger if exists trg_salary_structures_revision_audit on public.salary_structures;
create trigger trg_salary_structures_revision_audit
  after insert or update on public.salary_structures
  for each row execute function public.log_salary_revision_audit();

create or replace function public.auto_lock_payroll_scheduler()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_locked_months integer := 0;
  v_locked_runs integer := 0;
begin
  perform set_config('row_security','off', true);

  with locked_months as (
    update public.payroll_months pm
       set is_locked = true
     where pm.is_deleted = false
       and pm.status = 'finalized'
       and coalesce(pm.is_locked, false) = false
    returning 1
  )
  select count(*) into v_locked_months from locked_months;

  with locked_runs as (
    update public.payroll_runs pr
       set locked = true,
           locked_at = coalesce(pr.locked_at, now()),
           updated_at = now()
     where pr.is_deleted = false
       and pr.status = 'finalized'
       and coalesce(pr.locked, false) = false
    returning 1
  )
  select count(*) into v_locked_runs from locked_runs;

  return jsonb_build_object(
    'locked_payroll_months', coalesce(v_locked_months, 0),
    'locked_payroll_runs', coalesce(v_locked_runs, 0)
  );
end;
$$;

create or replace function public.payroll_integrity_check(
  p_company_id uuid,
  p_year integer default null,
  p_month integer default null
)
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
  with scoped_entries as (
    select pe.*
      from public.payroll_entries pe
     where pe.company_id = p_company_id
       and pe.is_deleted = false
  ), month_scope as (
    select pm.id
      from public.payroll_months pm
     where pm.company_id = p_company_id
       and pm.is_deleted = false
       and (p_year is null or pm.year = p_year)
       and (p_month is null or pm.month = p_month)
  )
  select * from (
    select
      'payroll_month_finalized_unlocked'::text as issue_code,
      'payroll_months'::text as entity_type,
      pm.id as entity_id,
      jsonb_build_object('year', pm.year, 'month', pm.month, 'status', pm.status, 'is_locked', pm.is_locked) as details
    from public.payroll_months pm
    where pm.company_id = p_company_id
      and pm.is_deleted = false
      and (p_year is null or pm.year = p_year)
      and (p_month is null or pm.month = p_month)
      and pm.status = 'finalized'
      and coalesce(pm.is_locked, false) = false

    union all

    select
      'payroll_entry_employee_company_mismatch',
      'payroll_entries',
      pe.id,
      jsonb_build_object('payroll_entry_company_id', pe.company_id, 'employee_company_id', e.company_id, 'employee_id', pe.employee_id)
    from scoped_entries pe
    join public.employees e on e.id = pe.employee_id
    where e.is_deleted = false
      and e.company_id <> pe.company_id

    union all

    select
      'payroll_entry_month_company_mismatch',
      'payroll_entries',
      pe.id,
      jsonb_build_object('payroll_entry_company_id', pe.company_id, 'payroll_month_company_id', pm.company_id, 'payroll_month_id', pe.payroll_month_id)
    from scoped_entries pe
    join public.payroll_months pm on pm.id = pe.payroll_month_id
    where pe.payroll_month_id is not null
      and pm.is_deleted = false
      and pm.company_id <> pe.company_id
      and (p_year is null or pm.year = p_year)
      and (p_month is null or pm.month = p_month)

    union all

    select
      'payroll_entry_run_company_mismatch',
      'payroll_entries',
      pe.id,
      jsonb_build_object('payroll_entry_company_id', pe.company_id, 'payroll_run_company_id', pr.company_id, 'payroll_run_id', pe.payroll_run_id)
    from scoped_entries pe
    join public.payroll_runs pr on pr.id = pe.payroll_run_id
    where pr.is_deleted = false
      and pr.company_id <> pe.company_id

    union all

    select
      'payroll_entry_net_mismatch',
      'payroll_entries',
      pe.id,
      jsonb_build_object(
        'net_salary', pe.net_salary,
        'expected_net',
        case
          when pe.base_salary_snapshot is not null or pe.total_allowances is not null
            then (coalesce(pe.base_salary_snapshot, pe.base_salary, 0) + coalesce(pe.total_allowances, 0) - coalesce(pe.total_deductions, 0))
          else (coalesce(pe.total_earnings, 0) - coalesce(pe.total_deductions, 0))
        end
      )
    from scoped_entries pe
    left join public.payroll_months pm on pm.id = pe.payroll_month_id
    where (
        case
          when pe.base_salary_snapshot is not null or pe.total_allowances is not null
            then (coalesce(pe.base_salary_snapshot, pe.base_salary, 0) + coalesce(pe.total_allowances, 0) - coalesce(pe.total_deductions, 0))
          else (coalesce(pe.total_earnings, 0) - coalesce(pe.total_deductions, 0))
        end
      ) is distinct from pe.net_salary
      and (pe.payroll_month_id is null or pe.payroll_month_id in (select id from month_scope))
  ) issues;
end;
$$;

create or replace function public.validate_payroll_reconciliation(p_payroll_month_id uuid)
returns table (
  payroll_month_id uuid,
  payroll_entries_count integer,
  payroll_entries_net numeric,
  salary_ledger_net numeric,
  delta numeric,
  is_balanced boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('row_security','off', true);

  return query
  with pe as (
    select
      pe.id,
      pe.net_salary
    from public.payroll_entries pe
    where pe.payroll_month_id = p_payroll_month_id
      and pe.is_deleted = false
  ), sl as (
    select
      sl.payroll_entry_id,
      sum(sl.credit - sl.debit) as ledger_net
    from public.salary_ledger sl
    join pe on pe.id = sl.payroll_entry_id
    where sl.is_deleted = false
    group by sl.payroll_entry_id
  )
  select
    p_payroll_month_id,
    count(pe.id)::int,
    coalesce(sum(pe.net_salary), 0)::numeric,
    coalesce(sum(sl.ledger_net), 0)::numeric,
    (coalesce(sum(pe.net_salary), 0) - coalesce(sum(sl.ledger_net), 0))::numeric as delta,
    (coalesce(sum(pe.net_salary), 0) = coalesce(sum(sl.ledger_net), 0)) as is_balanced
  from pe
  left join sl on sl.payroll_entry_id = pe.id;
end;
$$;

create or replace function public.validate_payroll_entry_lock_hardening()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_month_locked boolean;
  v_run_locked boolean;
begin
  if new.payroll_month_id is not null then
    select pm.is_locked
      into v_month_locked
      from public.payroll_months pm
     where pm.id = new.payroll_month_id
       and pm.is_deleted = false;

    if coalesce(v_month_locked, false) then
      raise exception 'Payroll month is locked';
    end if;
  end if;

  if new.payroll_run_id is not null then
    select pr.locked
      into v_run_locked
      from public.payroll_runs pr
     where pr.id = new.payroll_run_id
       and pr.is_deleted = false;

    if coalesce(v_run_locked, false) then
      raise exception 'Payroll run is locked';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_payroll_entries_lock_hardening on public.payroll_entries;
create trigger trg_payroll_entries_lock_hardening
  before insert or update on public.payroll_entries
  for each row execute function public.validate_payroll_entry_lock_hardening();

-- Cron support example (Supabase pg_cron):
-- select cron.schedule(
--   'payroll_auto_lock_scheduler',
--   '10 * * * *',
--   $$select public.auto_lock_payroll_scheduler();$$
-- );