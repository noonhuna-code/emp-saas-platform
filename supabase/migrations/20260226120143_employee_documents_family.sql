-- ============================================
-- Migration: 105_employee_documents_family.sql
-- Purpose: Employee documents and family members for profile module
-- Scope: employee_documents + employee_family_members tables, RLS, indexes, triggers
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: Enabled + forced; self or manage_employees
-- Financial Impact: None
-- ============================================

create table if not exists public.employee_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  document_type text not null,
  document_name text,
  document_number text,
  file_url text,
  issued_at date,
  expires_at date,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

create table if not exists public.employee_family_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  full_name text not null,
  relationship text not null,
  date_of_birth date,
  phone_number text,
  is_dependent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

create index if not exists employee_documents_company_id_idx
  on public.employee_documents (company_id)
  where is_deleted = false;

create index if not exists employee_documents_employee_id_idx
  on public.employee_documents (employee_id)
  where is_deleted = false;

create index if not exists employee_family_members_company_id_idx
  on public.employee_family_members (company_id)
  where is_deleted = false;

create index if not exists employee_family_members_employee_id_idx
  on public.employee_family_members (employee_id)
  where is_deleted = false;

alter table public.employee_documents enable row level security;
alter table public.employee_documents force row level security;
alter table public.employee_family_members enable row level security;
alter table public.employee_family_members force row level security;

drop policy if exists employee_documents_select on public.employee_documents;
drop policy if exists employee_documents_insert on public.employee_documents;
drop policy if exists employee_documents_update on public.employee_documents;

drop policy if exists employee_family_members_select on public.employee_family_members;
drop policy if exists employee_family_members_insert on public.employee_family_members;
drop policy if exists employee_family_members_update on public.employee_family_members;

create policy employee_documents_select on public.employee_documents
  for select
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
  );

create policy employee_documents_insert on public.employee_documents
  for insert
  with check (
    company_id = public.current_user_company_id()
    and (
      employee_id = public.current_user_employee_id()
      or public.current_user_has_permission('manage_employees')
    )
  );

create policy employee_documents_update on public.employee_documents
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
  )
  with check (
    company_id = public.current_user_company_id()
    and (
      employee_id = public.current_user_employee_id()
      or public.current_user_has_permission('manage_employees')
    )
  );

create policy employee_family_members_select on public.employee_family_members
  for select
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
  );

create policy employee_family_members_insert on public.employee_family_members
  for insert
  with check (
    company_id = public.current_user_company_id()
    and (
      employee_id = public.current_user_employee_id()
      or public.current_user_has_permission('manage_employees')
    )
  );

create policy employee_family_members_update on public.employee_family_members
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
  )
  with check (
    company_id = public.current_user_company_id()
    and (
      employee_id = public.current_user_employee_id()
      or public.current_user_has_permission('manage_employees')
    )
  );

create or replace function public.validate_employee_documents_company()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_employee_company uuid;
begin
  select company_id into v_employee_company
  from public.employees e
  where e.id = new.employee_id
    and e.is_deleted = false;

  perform public.validate_company_consistency(new.company_id, v_employee_company);
  return new;
end;
$$;

drop trigger if exists trg_employee_documents_company_guard on public.employee_documents;
create trigger trg_employee_documents_company_guard
  before insert or update on public.employee_documents
  for each row execute function public.validate_employee_documents_company();

drop trigger if exists trg_employee_documents_updated_at on public.employee_documents;
create trigger trg_employee_documents_updated_at
  before update on public.employee_documents
  for each row execute function public.set_updated_at();

create or replace function public.validate_employee_family_members_company()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_employee_company uuid;
begin
  select company_id into v_employee_company
  from public.employees e
  where e.id = new.employee_id
    and e.is_deleted = false;

  perform public.validate_company_consistency(new.company_id, v_employee_company);
  return new;
end;
$$;

drop trigger if exists trg_employee_family_members_company_guard on public.employee_family_members;
create trigger trg_employee_family_members_company_guard
  before insert or update on public.employee_family_members
  for each row execute function public.validate_employee_family_members_company();

drop trigger if exists trg_employee_family_members_updated_at on public.employee_family_members;
create trigger trg_employee_family_members_updated_at
  before update on public.employee_family_members
  for each row execute function public.set_updated_at();
