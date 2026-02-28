-- EMP/supabase/phase1_phase2_company_consistency_patch.sql
-- Purpose: Enforce company_id consistency across FK-linked tables (Phase 1 + Phase 2)
-- Scope: Attendance, Leave, Shift, Payroll (as mapped in requirements)
-- Enforcement strategy: Reusable validation function + per-table triggers with indexed parent lookups
-- Idempotency guarantees: CREATE OR REPLACE FUNCTION, DROP TRIGGER IF EXISTS before CREATE TRIGGER

create or replace function public.validate_company_consistency(
  p_child_company_id uuid,
  p_parent_company_id uuid
) returns void
language plpgsql
set search_path = public
as $$
begin
  if p_parent_company_id is null then
    raise exception 'parent company not found for consistency check';
  end if;

  if p_child_company_id is distinct from p_parent_company_id then
    raise exception 'company consistency violation';
  end if;
end;
$$;

-- ==================================================
-- Attendance
-- ==================================================

create or replace function public.validate_attendance_records_company()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_parent_company_id uuid;
begin
  select company_id into v_parent_company_id
    from public.employees
   where id = new.employee_id
     and is_deleted = false;

  perform public.validate_company_consistency(new.company_id, v_parent_company_id);
  return new;
end;
$$;

drop trigger if exists trg_attendance_records_company_guard on public.attendance_records;
create trigger trg_attendance_records_company_guard
  before insert or update on public.attendance_records
  for each row execute function public.validate_attendance_records_company();

create or replace function public.validate_attendance_breaks_company()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_parent_company_id uuid;
begin
  select company_id into v_parent_company_id
    from public.attendance_records
   where id = new.attendance_id
     and is_deleted = false;

  perform public.validate_company_consistency(new.company_id, v_parent_company_id);
  return new;
end;
$$;

drop trigger if exists trg_attendance_breaks_company_guard on public.attendance_breaks;
create trigger trg_attendance_breaks_company_guard
  before insert or update on public.attendance_breaks
  for each row execute function public.validate_attendance_breaks_company();

create or replace function public.validate_attendance_correction_requests_company()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_parent_company_id uuid;
begin
  select company_id into v_parent_company_id
    from public.attendance_records
   where id = new.attendance_id
     and is_deleted = false;

  perform public.validate_company_consistency(new.company_id, v_parent_company_id);
  return new;
end;
$$;

drop trigger if exists trg_attendance_correction_requests_company_guard on public.attendance_correction_requests;
create trigger trg_attendance_correction_requests_company_guard
  before insert or update on public.attendance_correction_requests
  for each row execute function public.validate_attendance_correction_requests_company();

create or replace function public.validate_attendance_escalations_company()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_parent_company_id uuid;
begin
  select company_id into v_parent_company_id
    from public.attendance_records
   where id = new.attendance_id
     and is_deleted = false;

  perform public.validate_company_consistency(new.company_id, v_parent_company_id);
  return new;
end;
$$;

drop trigger if exists trg_attendance_escalations_company_guard on public.attendance_escalations;
create trigger trg_attendance_escalations_company_guard
  before insert or update on public.attendance_escalations
  for each row execute function public.validate_attendance_escalations_company();

-- ==================================================
-- Leave
-- ==================================================

create or replace function public.validate_leave_balances_company()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_parent_company_id uuid;
begin
  select company_id into v_parent_company_id
    from public.employees
   where id = new.employee_id
     and is_deleted = false;

  perform public.validate_company_consistency(new.company_id, v_parent_company_id);
  return new;
end;
$$;

drop trigger if exists trg_leave_balances_company_guard on public.leave_balances;
create trigger trg_leave_balances_company_guard
  before insert or update on public.leave_balances
  for each row execute function public.validate_leave_balances_company();

create or replace function public.validate_leave_requests_company()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_parent_company_id uuid;
begin
  select company_id into v_parent_company_id
    from public.employees
   where id = new.employee_id
     and is_deleted = false;

  perform public.validate_company_consistency(new.company_id, v_parent_company_id);
  return new;
end;
$$;

drop trigger if exists trg_leave_requests_company_guard on public.leave_requests;
create trigger trg_leave_requests_company_guard
  before insert or update on public.leave_requests
  for each row execute function public.validate_leave_requests_company();

create or replace function public.validate_leave_ledger_company()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_parent_company_id uuid;
begin
  select company_id into v_parent_company_id
    from public.employees
   where id = new.employee_id
     and is_deleted = false;

  perform public.validate_company_consistency(new.company_id, v_parent_company_id);
  return new;
end;
$$;

drop trigger if exists trg_leave_ledger_company_guard on public.leave_ledger;
create trigger trg_leave_ledger_company_guard
  before insert or update on public.leave_ledger
  for each row execute function public.validate_leave_ledger_company();

create or replace function public.validate_leave_accrual_rules_company()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  select company_id into v_company_id
    from public.companies
   where id = new.company_id;

  perform public.validate_company_consistency(new.company_id, v_company_id);
  return new;
end;
$$;

drop trigger if exists trg_leave_accrual_rules_company_guard on public.leave_accrual_rules;
create trigger trg_leave_accrual_rules_company_guard
  before insert or update on public.leave_accrual_rules
  for each row execute function public.validate_leave_accrual_rules_company();

create or replace function public.validate_leave_approval_levels_company()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_parent_company_id uuid;
begin
  select company_id into v_parent_company_id
    from public.leave_types
   where id = new.leave_type_id
     and is_deleted = false;

  if v_parent_company_id is null then
    return new;
  end if;

  perform public.validate_company_consistency(new.company_id, v_parent_company_id);
  return new;
end;
$$;

drop trigger if exists trg_leave_approval_levels_company_guard on public.leave_approval_levels;
create trigger trg_leave_approval_levels_company_guard
  before insert or update on public.leave_approval_levels
  for each row execute function public.validate_leave_approval_levels_company();

-- ==================================================
-- Shift
-- ==================================================

create or replace function public.validate_shift_swap_requests_company()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_parent_company_id uuid;
begin
  select company_id into v_parent_company_id
    from public.employees
   where id = new.requester_employee_id
     and is_deleted = false;

  perform public.validate_company_consistency(new.company_id, v_parent_company_id);
  return new;
end;
$$;

drop trigger if exists trg_shift_swap_requests_company_guard on public.shift_swap_requests;
create trigger trg_shift_swap_requests_company_guard
  before insert or update on public.shift_swap_requests
  for each row execute function public.validate_shift_swap_requests_company();

-- ==================================================
-- Payroll
-- ==================================================

create or replace function public.validate_employee_salary_assignments_company()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_parent_company_id uuid;
begin
  select company_id into v_parent_company_id
    from public.employees
   where id = new.employee_id
     and is_deleted = false;

  perform public.validate_company_consistency(new.company_id, v_parent_company_id);
  return new;
end;
$$;

drop trigger if exists trg_employee_salary_assignments_company_guard on public.employee_salary_assignments;
create trigger trg_employee_salary_assignments_company_guard
  before insert or update on public.employee_salary_assignments
  for each row execute function public.validate_employee_salary_assignments_company();

create or replace function public.validate_payroll_entries_company()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_parent_company_id uuid;
begin
  select company_id into v_parent_company_id
    from public.employees
   where id = new.employee_id
     and is_deleted = false;

  perform public.validate_company_consistency(new.company_id, v_parent_company_id);
  return new;
end;
$$;

drop trigger if exists trg_payroll_entries_company_guard on public.payroll_entries;
create trigger trg_payroll_entries_company_guard
  before insert or update on public.payroll_entries
  for each row execute function public.validate_payroll_entries_company();

create or replace function public.validate_salary_ledger_company()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_parent_company_id uuid;
begin
  select company_id into v_parent_company_id
    from public.employees
   where id = new.employee_id
     and is_deleted = false;

  perform public.validate_company_consistency(new.company_id, v_parent_company_id);
  return new;
end;
$$;

drop trigger if exists trg_salary_ledger_company_guard on public.salary_ledger;
create trigger trg_salary_ledger_company_guard
  before insert or update on public.salary_ledger
  for each row execute function public.validate_salary_ledger_company();

create or replace function public.validate_employee_salary_ledger_company()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_parent_company_id uuid;
begin
  select company_id into v_parent_company_id
    from public.employees
   where id = new.employee_id
     and is_deleted = false;

  perform public.validate_company_consistency(new.company_id, v_parent_company_id);
  return new;
end;
$$;

drop trigger if exists trg_employee_salary_ledger_company_guard on public.employee_salary_ledger;
create trigger trg_employee_salary_ledger_company_guard
  before insert or update on public.employee_salary_ledger
  for each row execute function public.validate_employee_salary_ledger_company();

-- ============================================
-- PHASE 1 + PHASE 2 COMPANY CONSISTENCY PATCH SUMMARY
-- Functions created: validate_company_consistency + per-table validation functions
-- Triggers created: attendance/leave/shift/payroll company consistency guards
-- Idempotent: YES
-- Non-destructive: YES
-- ============================================
