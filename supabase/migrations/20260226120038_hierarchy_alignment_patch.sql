-- EMP/supabase/hierarchy_alignment_patch.sql

-- Add hierarchy columns to employees
alter table public.employees add column if not exists reports_to uuid;
alter table public.employees add column if not exists role_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_reports_to_fk') THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT employees_reports_to_fk
      FOREIGN KEY (reports_to) REFERENCES public.employees(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_role_id_fk') THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT employees_role_id_fk
      FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE SET NULL;
  END IF;
END $$;

create index if not exists employees_reports_to_idx
  on public.employees (reports_to)
  where is_deleted = false;

create index if not exists employees_role_id_idx
  on public.employees (role_id)
  where is_deleted = false;

-- Normalize teams.team_lead_id to employees hierarchy via validation
create or replace function public.validate_team_lead_hierarchy()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_employee_id uuid;
  v_employee_company uuid;
  v_employee_department uuid;
begin
  if new.team_lead_id is null then
    return new;
  end if;

  select e.id, e.company_id, e.department_id
    into v_employee_id, v_employee_company, v_employee_department
    from public.employees e
    join public.user_profiles up on up.id = e.user_profile_id
   where up.id = new.team_lead_id
     and e.is_deleted = false
     and up.is_deleted = false
   limit 1;

  if v_employee_id is null then
    raise exception 'team_lead_id must map to an existing employee';
  end if;

  if v_employee_company <> new.company_id then
    raise exception 'team_lead_id must belong to the same company';
  end if;

  if v_employee_department is not null and v_employee_department <> new.department_id then
    raise exception 'team_lead_id must belong to the same department';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_teams_team_lead_validate on public.teams;
create trigger trg_teams_team_lead_validate
before insert or update on public.teams
for each row execute function public.validate_team_lead_hierarchy();

-- Align payroll approval with hierarchy (managers can update entries for their reports)

drop policy if exists payroll_entries_update on public.payroll_entries;
create policy payroll_entries_update on public.payroll_entries
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and (
      public.current_user_has_permission('manage_payroll')
      or public.current_user_is_manager_of(employee_id)
    )
  )
  with check (
    company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_payroll')
      or public.current_user_is_manager_of(employee_id)
    )
  );

-- ================================
-- SUMMARY
-- ================================
-- Columns added: employees.reports_to, employees.role_id
-- Constraints added: employees_reports_to_fk, employees_role_id_fk
-- Indexes added: employees_reports_to_idx, employees_role_id_idx
-- Functions added: validate_team_lead_hierarchy
-- Triggers added: trg_teams_team_lead_validate
-- Policies updated: payroll_entries_update
-- Self-audit: no table recreation, no destructive changes, idempotent
-- ================================
