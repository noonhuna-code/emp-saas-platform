-- EMP/supabase/hierarchy_alignment_correction.sql

-- 1) Normalize teams.team_lead_id to employees
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teams_team_lead_fk') THEN
    ALTER TABLE public.teams
      ADD CONSTRAINT teams_team_lead_fk
      FOREIGN KEY (team_lead_id)
      REFERENCES public.employees(id)
      ON DELETE SET NULL;
  END IF;
END $$;

create or replace function public.validate_team_lead_hierarchy()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_employee_company uuid;
  v_employee_department uuid;
begin
  if new.team_lead_id is null then
    return new;
  end if;

  select e.company_id, e.department_id
    into v_employee_company, v_employee_department
    from public.employees e
   where e.id = new.team_lead_id
     and e.is_deleted = false
   limit 1;

  if v_employee_company is null then
    raise exception 'team_lead_id must reference an active employee';
  end if;

  if v_employee_company <> new.company_id then
    raise exception 'team_lead_id must belong to the same company';
  end if;

  if new.department_id is not null and v_employee_department is not null and v_employee_department <> new.department_id then
    raise exception 'team_lead_id must belong to the same department';
  end if;

  return new;
end;
$$;

-- trigger remains idempotent

-- 2) Ensure employees hierarchy structure
alter table public.employees add column if not exists reports_to uuid;
alter table public.employees add column if not exists role_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_reports_to_fk') THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT employees_reports_to_fk
      FOREIGN KEY (reports_to)
      REFERENCES public.employees(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_role_id_fk') THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT employees_role_id_fk
      FOREIGN KEY (role_id)
      REFERENCES public.roles(id)
      ON DELETE SET NULL;
  END IF;
END $$;

create index if not exists employees_reports_to_idx
  on public.employees (reports_to)
  where is_deleted = false;

create index if not exists employees_role_id_idx
  on public.employees (role_id)
  where is_deleted = false;

-- 3) Payroll approval enforcement hardening
-- Modify policy payroll_entries_update only if required

drop policy if exists payroll_entries_update on public.payroll_entries;
create policy payroll_entries_update on public.payroll_entries
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and public.current_user_has_permission('manage_payroll')
    and (
      public.current_user_is_manager_of(employee_id)
      or public.current_user_has_permission('company_wide_payroll')
    )
  )
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_payroll')
    and (
      public.current_user_is_manager_of(employee_id)
      or public.current_user_has_permission('company_wide_payroll')
    )
  );

-- ============================================
-- HIERARCHY ALIGNMENT CORRECTION SUMMARY
-- ============================================
-- Columns added: employees.reports_to, employees.role_id
-- Constraints added: teams_team_lead_fk, employees_reports_to_fk, employees_role_id_fk
-- Indexes added: employees_reports_to_idx, employees_role_id_idx
-- Functions modified: validate_team_lead_hierarchy
-- Triggers updated: none (existing trigger remains)
-- Policies modified: payroll_entries_update
-- Security changes: none
-- ============================================
