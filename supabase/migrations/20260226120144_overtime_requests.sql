-- ============================================
-- Migration: 106_overtime_requests.sql
-- Purpose: Overtime request + approval workflow (attendance governance)
-- Scope: overtime_requests table, RLS, indexes, triggers
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: Enabled + forced; self or manage_attendance
-- Financial Impact: None
-- ============================================

create table if not exists public.overtime_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  attendance_id uuid references public.attendance_records(id) on delete restrict,
  request_date date not null,
  requested_minutes integer not null,
  reason text not null,
  status text not null default 'pending',
  reviewed_by uuid references public.user_profiles(id) on delete restrict,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict,
  constraint overtime_requests_status_chk
    check (status in ('pending','approved','rejected','cancelled')),
  constraint overtime_requests_minutes_chk
    check (requested_minutes >= 0)
);

create index if not exists overtime_requests_company_id_idx
  on public.overtime_requests (company_id)
  where is_deleted = false;

create index if not exists overtime_requests_employee_id_idx
  on public.overtime_requests (employee_id)
  where is_deleted = false;

create index if not exists overtime_requests_company_status_idx
  on public.overtime_requests (company_id, status)
  where is_deleted = false;

create index if not exists overtime_requests_request_date_idx
  on public.overtime_requests (request_date);

alter table public.overtime_requests enable row level security;
alter table public.overtime_requests force row level security;

drop policy if exists overtime_requests_select on public.overtime_requests;
drop policy if exists overtime_requests_insert on public.overtime_requests;
drop policy if exists overtime_requests_update on public.overtime_requests;

create policy overtime_requests_select on public.overtime_requests
  for select
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
  );

create policy overtime_requests_insert on public.overtime_requests
  for insert
  with check (
    company_id = public.current_user_company_id()
    and (
      employee_id = public.current_user_employee_id()
      or public.current_user_has_permission('manage_attendance')
    )
  );

create policy overtime_requests_update on public.overtime_requests
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
      or public.current_user_has_permission('manage_attendance')
    )
  );

create or replace function public.validate_overtime_requests_company()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_employee_company uuid;
  v_attendance_company uuid;
begin
  select company_id into v_employee_company
  from public.employees e
  where e.id = new.employee_id
    and e.is_deleted = false;

  perform public.validate_company_consistency(new.company_id, v_employee_company);

  if new.attendance_id is not null then
    select company_id into v_attendance_company
    from public.attendance_records ar
    where ar.id = new.attendance_id
      and ar.is_deleted = false;

    perform public.validate_company_consistency(new.company_id, v_attendance_company);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_overtime_requests_company_guard on public.overtime_requests;
create trigger trg_overtime_requests_company_guard
  before insert or update on public.overtime_requests
  for each row execute function public.validate_overtime_requests_company();

drop trigger if exists trg_overtime_requests_updated_at on public.overtime_requests;
create trigger trg_overtime_requests_updated_at
  before update on public.overtime_requests
  for each row execute function public.set_updated_at();
