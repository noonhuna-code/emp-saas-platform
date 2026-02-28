-- ============================================
-- Migration: 103_employee_profile_personal_details.sql
-- Purpose: Personal/contact details for employee profiles
-- Scope: employee_personal_details table + RLS + indexes + triggers
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: Enabled + forced; policies added
-- Financial Impact: None
-- ============================================

create table if not exists public.employee_personal_details (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  date_of_birth date,
  gender text,
  marital_status text,
  nationality text,
  phone_number text,
  alternate_phone text,
  official_email text,
  personal_email text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,
  national_id_masked text,
  passport_number_masked text,
  tax_id_masked text,
  bank_account_masked text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

create unique index if not exists employee_personal_details_company_employee_uniq
  on public.employee_personal_details (company_id, employee_id);

create index if not exists employee_personal_details_company_id_idx
  on public.employee_personal_details (company_id)
  where is_deleted = false;

create index if not exists employee_personal_details_employee_id_idx
  on public.employee_personal_details (employee_id)
  where is_deleted = false;

alter table public.employee_personal_details enable row level security;
alter table public.employee_personal_details force row level security;

drop policy if exists employee_personal_details_select on public.employee_personal_details;
drop policy if exists employee_personal_details_insert on public.employee_personal_details;
drop policy if exists employee_personal_details_update on public.employee_personal_details;

create policy employee_personal_details_select on public.employee_personal_details
  for select
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
  );

create policy employee_personal_details_insert on public.employee_personal_details
  for insert
  with check (
    company_id = public.current_user_company_id()
    and (
      employee_id = public.current_user_employee_id()
      or public.current_user_has_permission('manage_employees')
    )
  );

create policy employee_personal_details_update on public.employee_personal_details
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

create or replace function public.validate_employee_personal_details_company()
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

drop trigger if exists trg_employee_personal_details_company_guard on public.employee_personal_details;
create trigger trg_employee_personal_details_company_guard
  before insert or update on public.employee_personal_details
  for each row execute function public.validate_employee_personal_details_company();

drop trigger if exists trg_employee_personal_details_updated_at on public.employee_personal_details;
create trigger trg_employee_personal_details_updated_at
  before update on public.employee_personal_details
  for each row execute function public.set_updated_at();
