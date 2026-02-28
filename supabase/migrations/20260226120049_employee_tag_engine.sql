-- ============================================
-- Migration: 50_employee_tag_engine.sql
-- Purpose: Employee tag taxonomy and tenant-safe tag assignment engine
-- Scope: employee_tags, employee_tag_assignments, RLS, consistency trigger
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: Adds RLS for new tables only
-- Financial Impact: None
-- ============================================

create table if not exists public.employee_tags (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  tag_key text not null,
  name text not null,
  description text,
  color_hex text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

create unique index if not exists employee_tags_company_tag_key_uniq
  on public.employee_tags (company_id, tag_key)
  where is_deleted = false;

create unique index if not exists employee_tags_company_name_uniq
  on public.employee_tags (company_id, name)
  where is_deleted = false;

create index if not exists employee_tags_company_id_idx
  on public.employee_tags (company_id)
  where is_deleted = false;

create table if not exists public.employee_tag_assignments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  employee_tag_id uuid not null references public.employee_tags(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references public.user_profiles(id) on delete restrict,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

create unique index if not exists employee_tag_assignments_company_employee_tag_uniq
  on public.employee_tag_assignments (company_id, employee_id, employee_tag_id)
  where is_deleted = false;

create index if not exists employee_tag_assignments_company_id_idx
  on public.employee_tag_assignments (company_id)
  where is_deleted = false;

create index if not exists employee_tag_assignments_employee_id_idx
  on public.employee_tag_assignments (employee_id)
  where is_deleted = false;

create index if not exists employee_tag_assignments_employee_tag_id_idx
  on public.employee_tag_assignments (employee_tag_id)
  where is_deleted = false;

create index if not exists employee_tag_assignments_company_employee_idx
  on public.employee_tag_assignments (company_id, employee_id)
  where is_deleted = false;

alter table public.employee_tags enable row level security;
alter table public.employee_tags force row level security;

alter table public.employee_tag_assignments enable row level security;
alter table public.employee_tag_assignments force row level security;

drop policy if exists employee_tags_select on public.employee_tags;
drop policy if exists employee_tags_insert on public.employee_tags;
drop policy if exists employee_tags_update on public.employee_tags;
drop policy if exists employee_tags_delete on public.employee_tags;

drop policy if exists employee_tag_assignments_select on public.employee_tag_assignments;
drop policy if exists employee_tag_assignments_insert on public.employee_tag_assignments;
drop policy if exists employee_tag_assignments_update on public.employee_tag_assignments;
drop policy if exists employee_tag_assignments_delete on public.employee_tag_assignments;

create policy employee_tags_select on public.employee_tags
  for select
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
  );

create policy employee_tags_insert on public.employee_tags
  for insert
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_employees')
  );

create policy employee_tags_update on public.employee_tags
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and public.current_user_has_permission('manage_employees')
  )
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_employees')
  );

create policy employee_tag_assignments_select on public.employee_tag_assignments
  for select
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
  );

create policy employee_tag_assignments_insert on public.employee_tag_assignments
  for insert
  with check (
    company_id = public.current_user_company_id()
    and employee_id in (select * from public.current_user_scope_employee_ids())
    and public.current_user_has_permission('manage_employees')
  );

create policy employee_tag_assignments_update on public.employee_tag_assignments
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
    and public.current_user_has_permission('manage_employees')
  )
  with check (
    company_id = public.current_user_company_id()
    and employee_id in (select * from public.current_user_scope_employee_ids())
    and public.current_user_has_permission('manage_employees')
  );

create or replace function public.validate_employee_tag_assignment_company()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_employee_company_id uuid;
  v_tag_company_id uuid;
begin
  select e.company_id
    into v_employee_company_id
    from public.employees e
   where e.id = new.employee_id
     and e.is_deleted = false;

  perform public.validate_company_consistency(new.company_id, v_employee_company_id);

  select t.company_id
    into v_tag_company_id
    from public.employee_tags t
   where t.id = new.employee_tag_id
     and t.is_deleted = false;

  perform public.validate_company_consistency(new.company_id, v_tag_company_id);

  return new;
end;
$$;

drop trigger if exists trg_employee_tags_updated_at on public.employee_tags;
create trigger trg_employee_tags_updated_at
  before update on public.employee_tags
  for each row execute function public.set_updated_at();

drop trigger if exists trg_employee_tag_assignments_updated_at on public.employee_tag_assignments;
create trigger trg_employee_tag_assignments_updated_at
  before update on public.employee_tag_assignments
  for each row execute function public.set_updated_at();

drop trigger if exists trg_employee_tag_assignments_company_guard on public.employee_tag_assignments;
create trigger trg_employee_tag_assignments_company_guard
  before insert or update on public.employee_tag_assignments
  for each row execute function public.validate_employee_tag_assignment_company();

