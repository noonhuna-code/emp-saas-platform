-- ============================================
-- Migration: 49_employee_manager_history.sql
-- Purpose: Append-only employee manager history tracking with tenant-safe enforcement
-- Scope: employee_manager_history table, RLS, triggers, manager change logging
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: Adds RLS for new table only
-- Financial Impact: None
-- ============================================

create table if not exists public.employee_manager_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  previous_manager_id uuid references public.employees(id) on delete set null,
  new_manager_id uuid references public.employees(id) on delete set null,
  changed_at timestamptz not null default now(),
  change_reason text,
  created_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

create index if not exists employee_manager_history_company_id_idx
  on public.employee_manager_history (company_id)
  where is_deleted = false;

create index if not exists employee_manager_history_employee_id_idx
  on public.employee_manager_history (employee_id)
  where is_deleted = false;

create index if not exists employee_manager_history_previous_manager_id_idx
  on public.employee_manager_history (previous_manager_id)
  where is_deleted = false;

create index if not exists employee_manager_history_new_manager_id_idx
  on public.employee_manager_history (new_manager_id)
  where is_deleted = false;

create index if not exists employee_manager_history_company_employee_changed_at_idx
  on public.employee_manager_history (company_id, employee_id, changed_at)
  where is_deleted = false;

alter table public.employee_manager_history enable row level security;
alter table public.employee_manager_history force row level security;

drop policy if exists employee_manager_history_select on public.employee_manager_history;
drop policy if exists employee_manager_history_insert on public.employee_manager_history;
drop policy if exists employee_manager_history_update on public.employee_manager_history;
drop policy if exists employee_manager_history_delete on public.employee_manager_history;

create policy employee_manager_history_select on public.employee_manager_history
  for select
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
  );

create policy employee_manager_history_insert on public.employee_manager_history
  for insert
  with check (
    company_id = public.current_user_company_id()
    and employee_id in (select * from public.current_user_scope_employee_ids())
    and public.current_user_has_permission('manage_employees')
  );

create or replace function public.validate_employee_manager_history_company()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_employee_company_id uuid;
  v_prev_manager_company_id uuid;
  v_new_manager_company_id uuid;
begin
  select e.company_id
    into v_employee_company_id
    from public.employees e
   where e.id = new.employee_id;

  perform public.validate_company_consistency(new.company_id, v_employee_company_id);

  if new.previous_manager_id is not null then
    select e.company_id
      into v_prev_manager_company_id
      from public.employees e
     where e.id = new.previous_manager_id;

    perform public.validate_company_consistency(new.company_id, v_prev_manager_company_id);
  end if;

  if new.new_manager_id is not null then
    select e.company_id
      into v_new_manager_company_id
      from public.employees e
     where e.id = new.new_manager_id;

    perform public.validate_company_consistency(new.company_id, v_new_manager_company_id);
  end if;

  return new;
end;
$$;

create or replace function public.block_update_employee_manager_history()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Updating employee manager history is not allowed';
end;
$$;

create or replace function public.block_delete_employee_manager_history()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Deleting employee manager history is not allowed';
end;
$$;

create or replace function public.log_employee_manager_history()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_actor_profile_id uuid;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if new.manager_id is not distinct from old.manager_id then
    return new;
  end if;

  select up.id
    into v_actor_profile_id
    from public.user_profiles up
   where up.user_id = auth.uid()
     and up.is_deleted = false
   limit 1;

  insert into public.employee_manager_history (
    company_id,
    employee_id,
    previous_manager_id,
    new_manager_id,
    changed_at,
    change_reason,
    created_at,
    created_by,
    is_deleted
  ) values (
    new.company_id,
    new.id,
    old.manager_id,
    new.manager_id,
    now(),
    'manager_id_change',
    now(),
    v_actor_profile_id,
    false
  );

  return new;
end;
$$;

drop trigger if exists trg_employee_manager_history_company_guard on public.employee_manager_history;
create trigger trg_employee_manager_history_company_guard
  before insert or update on public.employee_manager_history
  for each row execute function public.validate_employee_manager_history_company();

drop trigger if exists trg_employee_manager_history_block_update on public.employee_manager_history;
create trigger trg_employee_manager_history_block_update
  before update on public.employee_manager_history
  for each row execute function public.block_update_employee_manager_history();

drop trigger if exists trg_employee_manager_history_block_delete on public.employee_manager_history;
create trigger trg_employee_manager_history_block_delete
  before delete on public.employee_manager_history
  for each row execute function public.block_delete_employee_manager_history();

drop trigger if exists trg_employees_manager_history_log on public.employees;
create trigger trg_employees_manager_history_log
  after update on public.employees
  for each row execute function public.log_employee_manager_history();
