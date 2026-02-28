-- ============================================
-- Migration: 48_employee_lifecycle_patch.sql
-- Purpose: Enforce employee lifecycle status transition governance
-- Scope: employees status transition validation trigger/function
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: None
-- Financial Impact: None
-- ============================================

create or replace function public.validate_employee_lifecycle_status_transition()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_old_status text;
  v_new_status text;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if new.employment_status is not distinct from old.employment_status then
    return new;
  end if;

  v_old_status := coalesce(old.employment_status, 'Active');
  v_new_status := coalesce(new.employment_status, 'Active');

  if v_old_status not in ('Active', 'Suspended', 'Terminated') then
    raise exception 'Unsupported existing employment_status transition source: %', v_old_status;
  end if;

  if v_new_status not in ('Active', 'Suspended', 'Terminated') then
    raise exception 'Unsupported target employment_status: %', v_new_status;
  end if;

  if v_old_status = 'Terminated' and v_new_status <> 'Terminated' then
    raise exception 'Invalid employment_status transition: Terminated -> % is not allowed', v_new_status;
  end if;

  if v_old_status = 'Active' and v_new_status not in ('Active', 'Suspended', 'Terminated') then
    raise exception 'Invalid employment_status transition: % -> %', v_old_status, v_new_status;
  end if;

  if v_old_status = 'Suspended' and v_new_status not in ('Suspended', 'Active', 'Terminated') then
    raise exception 'Invalid employment_status transition: % -> %', v_old_status, v_new_status;
  end if;

  if v_new_status = 'Terminated' then
    if new.exit_date is null then
      new.exit_date := coalesce(old.exit_date, current_date);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_employees_lifecycle_status_transition on public.employees;
create trigger trg_employees_lifecycle_status_transition
  before update on public.employees
  for each row execute function public.validate_employee_lifecycle_status_transition();

