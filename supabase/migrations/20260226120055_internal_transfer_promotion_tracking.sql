-- ============================================
-- Migration: 56_internal_transfer_promotion_tracking.sql
-- Purpose: Append-only employment change history for transfers/promotions/status changes
-- Scope: employment_change_history table, immutable triggers, tenant consistency validation, employees change-log trigger, RLS
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: Adds RLS on new table only
-- Financial Impact: None
-- ============================================

create table if not exists public.employment_change_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  change_kind text not null,
  previous_department_id uuid references public.departments(id) on delete set null,
  new_department_id uuid references public.departments(id) on delete set null,
  previous_designation text,
  new_designation text,
  previous_manager_id uuid references public.employees(id) on delete set null,
  new_manager_id uuid references public.employees(id) on delete set null,
  previous_employment_status text,
  new_employment_status text,
  previous_job_level text,
  new_job_level text,
  changed_at timestamptz not null default now(),
  change_reason text,
  created_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict
);

create index if not exists employment_change_history_company_id_idx
  on public.employment_change_history (company_id);

create index if not exists employment_change_history_employee_id_idx
  on public.employment_change_history (employee_id);

create index if not exists employment_change_history_changed_at_idx
  on public.employment_change_history (changed_at);

create index if not exists employment_change_history_company_employee_changed_at_idx
  on public.employment_change_history (company_id, employee_id, changed_at);

create index if not exists employment_change_history_change_kind_idx
  on public.employment_change_history (change_kind);

alter table public.employment_change_history enable row level security;
alter table public.employment_change_history force row level security;

create or replace function public.validate_employment_change_history_company()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_employee_company_id uuid;
  v_prev_manager_company_id uuid;
  v_new_manager_company_id uuid;
  v_prev_department_company_id uuid;
  v_new_department_company_id uuid;
begin
  select e.company_id
    into v_employee_company_id
    from public.employees e
   where e.id = new.employee_id
     and e.is_deleted = false;

  perform public.validate_company_consistency(new.company_id, v_employee_company_id);

  if new.previous_manager_id is not null then
    select e.company_id
      into v_prev_manager_company_id
      from public.employees e
     where e.id = new.previous_manager_id
       and e.is_deleted = false;

    perform public.validate_company_consistency(new.company_id, v_prev_manager_company_id);
  end if;

  if new.new_manager_id is not null then
    select e.company_id
      into v_new_manager_company_id
      from public.employees e
     where e.id = new.new_manager_id
       and e.is_deleted = false;

    perform public.validate_company_consistency(new.company_id, v_new_manager_company_id);
  end if;

  if new.previous_department_id is not null then
    select d.company_id
      into v_prev_department_company_id
      from public.departments d
     where d.id = new.previous_department_id
       and d.is_deleted = false;

    perform public.validate_company_consistency(new.company_id, v_prev_department_company_id);
  end if;

  if new.new_department_id is not null then
    select d.company_id
      into v_new_department_company_id
      from public.departments d
     where d.id = new.new_department_id
       and d.is_deleted = false;

    perform public.validate_company_consistency(new.company_id, v_new_department_company_id);
  end if;

  return new;
end;
$$;

create or replace function public.block_update_employment_change_history()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Updating employment change history is not allowed';
end;
$$;

create or replace function public.block_delete_employment_change_history()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Deleting employment change history is not allowed';
end;
$$;

create or replace function public.log_employment_change_history()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_actor_profile_id uuid;
  v_change_kind text;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if new.department_id is not distinct from old.department_id
     and new.designation is not distinct from old.designation
     and new.manager_id is not distinct from old.manager_id
     and new.employment_status is not distinct from old.employment_status
     and new.job_level is not distinct from old.job_level then
    return new;
  end if;

  v_change_kind := case
    when new.department_id is distinct from old.department_id and new.job_level is distinct from old.job_level then 'transfer_promotion'
    when new.department_id is distinct from old.department_id then 'department_change'
    when new.job_level is distinct from old.job_level then 'job_level_change'
    when new.designation is distinct from old.designation then 'designation_change'
    when new.manager_id is distinct from old.manager_id then 'manager_change'
    when new.employment_status is distinct from old.employment_status then 'employment_status_change'
    else 'employment_change'
  end;

  select up.id
    into v_actor_profile_id
    from public.user_profiles up
   where up.user_id = auth.uid()
     and up.is_deleted = false
   limit 1;

  insert into public.employment_change_history (
    company_id,
    employee_id,
    change_kind,
    previous_department_id,
    new_department_id,
    previous_designation,
    new_designation,
    previous_manager_id,
    new_manager_id,
    previous_employment_status,
    new_employment_status,
    previous_job_level,
    new_job_level,
    changed_at,
    change_reason,
    created_at,
    created_by
  ) values (
    new.company_id,
    new.id,
    v_change_kind,
    old.department_id,
    new.department_id,
    old.designation,
    new.designation,
    old.manager_id,
    new.manager_id,
    old.employment_status,
    new.employment_status,
    old.job_level,
    new.job_level,
    now(),
    'employees_update_trigger',
    now(),
    v_actor_profile_id
  );

  return new;
end;
$$;

drop trigger if exists trg_employment_change_history_company_guard on public.employment_change_history;
create trigger trg_employment_change_history_company_guard
  before insert on public.employment_change_history
  for each row execute function public.validate_employment_change_history_company();

drop trigger if exists trg_employment_change_history_block_update on public.employment_change_history;
create trigger trg_employment_change_history_block_update
  before update on public.employment_change_history
  for each row execute function public.block_update_employment_change_history();

drop trigger if exists trg_employment_change_history_block_delete on public.employment_change_history;
create trigger trg_employment_change_history_block_delete
  before delete on public.employment_change_history
  for each row execute function public.block_delete_employment_change_history();

drop trigger if exists trg_employees_employment_change_history_log on public.employees;
create trigger trg_employees_employment_change_history_log
  after update on public.employees
  for each row execute function public.log_employment_change_history();

drop policy if exists employment_change_history_select on public.employment_change_history;
drop policy if exists employment_change_history_insert on public.employment_change_history;
drop policy if exists employment_change_history_update on public.employment_change_history;
drop policy if exists employment_change_history_delete on public.employment_change_history;

create policy employment_change_history_select on public.employment_change_history
  for select
  using (
    company_id = public.current_user_company_id()
    and employee_id in (select * from public.current_user_scope_employee_ids())
  );

create policy employment_change_history_insert on public.employment_change_history
  for insert
  with check (
    company_id = public.current_user_company_id()
    and employee_id in (select * from public.current_user_scope_employee_ids())
    and (
      public.current_user_has_permission('manage_employees')
      or public.current_user_is_manager_of(employee_id)
    )
  );

