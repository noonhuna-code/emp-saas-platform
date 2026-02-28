-- ============================================
-- Migration: 51_employee_profile_completeness.sql
-- Purpose: Employee profile completeness scoring function for governance/reporting
-- Scope: Read-only scoring function (no triggers)
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: None (function runs as invoker)
-- Financial Impact: None
-- ============================================

create or replace function public.calculate_employee_profile_completeness(p_employee_id uuid)
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_emp record;
  v_total integer := 15;
  v_completed integer := 0;
begin
  select e.*
    into v_emp
    from public.employees e
   where e.id = p_employee_id
     and e.is_deleted = false;

  if not found then
    return null;
  end if;

  if v_emp.employee_code is not null and btrim(v_emp.employee_code) <> '' then v_completed := v_completed + 1; end if;
  if v_emp.profile_image_url is not null and btrim(v_emp.profile_image_url) <> '' then v_completed := v_completed + 1; end if;
  if v_emp.designation is not null and btrim(v_emp.designation) <> '' then v_completed := v_completed + 1; end if;
  if v_emp.job_level is not null and btrim(v_emp.job_level) <> '' then v_completed := v_completed + 1; end if;
  if v_emp.employment_type is not null and btrim(v_emp.employment_type) <> '' then v_completed := v_completed + 1; end if;
  if v_emp.work_mode is not null and btrim(v_emp.work_mode) <> '' then v_completed := v_completed + 1; end if;
  if v_emp.employment_status is not null and btrim(v_emp.employment_status) <> '' then v_completed := v_completed + 1; end if;
  if v_emp.joining_date is not null then v_completed := v_completed + 1; end if;
  if v_emp.department_id is not null then v_completed := v_completed + 1; end if;
  if v_emp.team_id is not null then v_completed := v_completed + 1; end if;
  if v_emp.manager_id is not null or v_emp.reports_to is not null then v_completed := v_completed + 1; end if;
  if v_emp.branch_id is not null then v_completed := v_completed + 1; end if;
  if v_emp.role_id is not null then v_completed := v_completed + 1; end if;
  if v_emp.probation_end_date is not null then v_completed := v_completed + 1; end if;
  if v_emp.confirmation_date is not null or (v_emp.employment_status = 'Terminated' and v_emp.exit_date is not null) then
    v_completed := v_completed + 1;
  end if;

  return round((v_completed::numeric / v_total::numeric) * 100)::integer;
end;
$$;

