-- ============================================
-- Migration: 104_employee_sensitive_data.sql
-- Purpose: Sensitive employee identifiers and banking data (restricted access)
-- Scope: employee_sensitive_data table + RLS + indexes + triggers
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: Enabled + forced; manage_employees only
-- Financial Impact: None
-- ============================================

create table if not exists public.employee_sensitive_data (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  national_id text,
  passport_number text,
  passport_expiry date,
  visa_status text,
  tax_id text,
  bank_name text,
  bank_account_number text,
  bank_iban text,
  bank_branch text,
  bank_swift text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

create unique index if not exists employee_sensitive_data_company_employee_uniq
  on public.employee_sensitive_data (company_id, employee_id);

create index if not exists employee_sensitive_data_company_id_idx
  on public.employee_sensitive_data (company_id)
  where is_deleted = false;

create index if not exists employee_sensitive_data_employee_id_idx
  on public.employee_sensitive_data (employee_id)
  where is_deleted = false;

alter table public.employee_sensitive_data enable row level security;
alter table public.employee_sensitive_data force row level security;

drop policy if exists employee_sensitive_data_select on public.employee_sensitive_data;
drop policy if exists employee_sensitive_data_insert on public.employee_sensitive_data;
drop policy if exists employee_sensitive_data_update on public.employee_sensitive_data;

create policy employee_sensitive_data_select on public.employee_sensitive_data
  for select
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and public.current_user_has_permission('manage_employees')
  );

create policy employee_sensitive_data_insert on public.employee_sensitive_data
  for insert
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_employees')
  );

create policy employee_sensitive_data_update on public.employee_sensitive_data
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

create or replace function public.validate_employee_sensitive_data_company()
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

drop trigger if exists trg_employee_sensitive_data_company_guard on public.employee_sensitive_data;
create trigger trg_employee_sensitive_data_company_guard
  before insert or update on public.employee_sensitive_data
  for each row execute function public.validate_employee_sensitive_data_company();

drop trigger if exists trg_employee_sensitive_data_updated_at on public.employee_sensitive_data;
create trigger trg_employee_sensitive_data_updated_at
  before update on public.employee_sensitive_data
  for each row execute function public.set_updated_at();
