-- ============================================
-- Migration: 52_employee_probation_tracking.sql
-- Purpose: Probation expiry calculation, validation guard, and scheduler-ready scan
-- Scope: employees probation functions/triggers and query indexes
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: None (scan function is SECURITY DEFINER for scheduler use)
-- Financial Impact: None
-- ============================================

create index if not exists employees_company_probation_end_date_idx
  on public.employees (company_id, probation_end_date)
  where is_deleted = false and probation_end_date is not null;

create index if not exists employees_company_joining_date_idx
  on public.employees (company_id, joining_date)
  where is_deleted = false and joining_date is not null;

create or replace function public.calculate_employee_probation_expiry(
  p_employee_id uuid,
  p_default_probation_days integer default 90
)
returns date
language plpgsql
set search_path = public
as $$
declare
  v_emp record;
begin
  select e.id, e.joining_date, e.probation_end_date
    into v_emp
    from public.employees e
   where e.id = p_employee_id
     and e.is_deleted = false;

  if not found then
    return null;
  end if;

  if v_emp.probation_end_date is not null then
    return v_emp.probation_end_date;
  end if;

  if v_emp.joining_date is null then
    return null;
  end if;

  return (v_emp.joining_date + make_interval(days => greatest(coalesce(p_default_probation_days, 90), 0)))::date;
end;
$$;

create or replace function public.validate_employee_probation_tracking()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.joining_date is not null and new.joining_date > current_date then
    raise exception 'joining_date cannot be in the future';
  end if;

  if new.probation_end_date is not null and new.joining_date is not null and new.probation_end_date < new.joining_date then
    raise exception 'probation_end_date must be on or after joining_date';
  end if;

  if new.confirmation_date is not null and new.joining_date is not null and new.confirmation_date < new.joining_date then
    raise exception 'confirmation_date must be on or after joining_date';
  end if;

  if new.confirmation_date is not null and new.probation_end_date is not null and new.confirmation_date > new.probation_end_date then
    raise exception 'confirmation_date cannot be after probation_end_date';
  end if;

  return new;
end;
$$;

create or replace function public.scan_employee_probation_status(
  p_reference_date date default current_date,
  p_lookahead_days integer default 14,
  p_default_probation_days integer default 90
)
returns table (
  company_id uuid,
  employee_id uuid,
  joining_date date,
  probation_end_date date,
  confirmation_date date,
  days_to_expiry integer,
  probation_state text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('row_security','off', true);

  return query
  with emp as (
    select
      e.company_id,
      e.id as employee_id,
      e.joining_date,
      coalesce(e.probation_end_date, e.joining_date + make_interval(days => greatest(coalesce(p_default_probation_days, 90), 0)))::date as effective_probation_end_date,
      e.confirmation_date,
      e.employment_status
    from public.employees e
    where e.is_deleted = false
      and e.joining_date is not null
      and coalesce(e.employment_status, 'Active') <> 'Terminated'
  )
  select
    emp.company_id,
    emp.employee_id,
    emp.joining_date,
    emp.effective_probation_end_date as probation_end_date,
    emp.confirmation_date,
    (emp.effective_probation_end_date - p_reference_date)::int as days_to_expiry,
    case
      when emp.confirmation_date is not null then 'confirmed'
      when emp.effective_probation_end_date < p_reference_date then 'overdue'
      when emp.effective_probation_end_date <= (p_reference_date + greatest(coalesce(p_lookahead_days, 14), 0)) then 'expiring_soon'
      else 'active_probation'
    end as probation_state
  from emp
  where emp.confirmation_date is null
     or emp.effective_probation_end_date <= (p_reference_date + greatest(coalesce(p_lookahead_days, 14), 0));
end;
$$;

drop trigger if exists trg_employees_probation_tracking_validate on public.employees;
create trigger trg_employees_probation_tracking_validate
  before insert or update on public.employees
  for each row execute function public.validate_employee_probation_tracking();

-- Scheduler support example (Supabase pg_cron):
-- select public.scan_employee_probation_status(current_date, 14, 90);
