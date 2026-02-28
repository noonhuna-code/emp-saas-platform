-- ============================================
-- Migration: 54_supervisor_feedback_system.sql
-- Purpose: Direct-manager supervisor feedback records with append-only governance
-- Scope: supervisor_feedback table, immutable triggers, tenant consistency validation, RLS
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: Adds RLS on new table only
-- Financial Impact: None
-- ============================================

create table if not exists public.supervisor_feedback (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  supervisor_employee_id uuid not null references public.employees(id) on delete restrict,
  category text not null,
  feedback_text text not null,
  feedback_date date not null default current_date,
  created_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  constraint supervisor_feedback_category_chk
    check (category in ('positive', 'neutral', 'warning')),
  constraint supervisor_feedback_not_self_chk
    check (employee_id <> supervisor_employee_id)
);

create index if not exists supervisor_feedback_company_id_idx
  on public.supervisor_feedback (company_id);

create index if not exists supervisor_feedback_employee_company_idx
  on public.supervisor_feedback (employee_id, company_id);

create index if not exists supervisor_feedback_company_employee_date_idx
  on public.supervisor_feedback (company_id, employee_id, feedback_date, created_at);

create index if not exists supervisor_feedback_supervisor_employee_id_idx
  on public.supervisor_feedback (supervisor_employee_id);

alter table public.supervisor_feedback enable row level security;
alter table public.supervisor_feedback force row level security;

create or replace function public.validate_supervisor_feedback_company()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_employee_company_id uuid;
  v_supervisor_company_id uuid;
begin
  select e.company_id
    into v_employee_company_id
    from public.employees e
   where e.id = new.employee_id
     and e.is_deleted = false;

  perform public.validate_company_consistency(new.company_id, v_employee_company_id);

  select e.company_id
    into v_supervisor_company_id
    from public.employees e
   where e.id = new.supervisor_employee_id
     and e.is_deleted = false;

  perform public.validate_company_consistency(new.company_id, v_supervisor_company_id);

  return new;
end;
$$;

create or replace function public.validate_supervisor_feedback_insert()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_actor_profile_id uuid;
  v_actor_employee_id uuid;
begin
  v_actor_employee_id := public.current_user_employee_id();

  if v_actor_employee_id is null then
    raise exception 'Authenticated employee context required for supervisor feedback';
  end if;

  if new.supervisor_employee_id is distinct from v_actor_employee_id then
    raise exception 'supervisor_employee_id must match current user employee';
  end if;

  select up.id
    into v_actor_profile_id
    from public.user_profiles up
   where up.user_id = auth.uid()
     and up.is_deleted = false
   limit 1;

  if new.created_by is null then
    new.created_by := v_actor_profile_id;
  elsif v_actor_profile_id is not null and new.created_by <> v_actor_profile_id then
    raise exception 'created_by must match current user profile';
  end if;

  if new.feedback_date is null then
    new.feedback_date := current_date;
  end if;

  return new;
end;
$$;

create or replace function public.block_update_supervisor_feedback()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Updating supervisor feedback is not allowed';
end;
$$;

create or replace function public.block_delete_supervisor_feedback()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Deleting supervisor feedback is not allowed';
end;
$$;

drop trigger if exists trg_supervisor_feedback_company_guard on public.supervisor_feedback;
create trigger trg_supervisor_feedback_company_guard
  before insert on public.supervisor_feedback
  for each row execute function public.validate_supervisor_feedback_company();

drop trigger if exists trg_supervisor_feedback_insert_guard on public.supervisor_feedback;
create trigger trg_supervisor_feedback_insert_guard
  before insert on public.supervisor_feedback
  for each row execute function public.validate_supervisor_feedback_insert();

drop trigger if exists trg_supervisor_feedback_block_update on public.supervisor_feedback;
create trigger trg_supervisor_feedback_block_update
  before update on public.supervisor_feedback
  for each row execute function public.block_update_supervisor_feedback();

drop trigger if exists trg_supervisor_feedback_block_delete on public.supervisor_feedback;
create trigger trg_supervisor_feedback_block_delete
  before delete on public.supervisor_feedback
  for each row execute function public.block_delete_supervisor_feedback();

drop policy if exists supervisor_feedback_select on public.supervisor_feedback;
drop policy if exists supervisor_feedback_insert on public.supervisor_feedback;
drop policy if exists supervisor_feedback_update on public.supervisor_feedback;
drop policy if exists supervisor_feedback_delete on public.supervisor_feedback;

create policy supervisor_feedback_select on public.supervisor_feedback
  for select
  using (
    company_id = public.current_user_company_id()
    and (
      employee_id = public.current_user_employee_id()
      or public.current_user_is_manager_of(employee_id)
      or exists (
        select 1
        from public.user_roles ur
        join public.roles r
          on r.id = ur.role_id
        where ur.user_id = auth.uid()
          and ur.company_id = public.current_user_company_id()
          and r.is_deleted = false
          and (r.company_id = ur.company_id or r.is_system_role = true)
          and r.name = 'Admin'
      )
    )
  );

create policy supervisor_feedback_insert on public.supervisor_feedback
  for insert
  with check (
    company_id = public.current_user_company_id()
    and supervisor_employee_id = public.current_user_employee_id()
    and public.current_user_is_manager_of(employee_id)
  );

