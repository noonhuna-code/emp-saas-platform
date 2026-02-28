-- EMP/supabase/phase1_13_phase1_rls_hardening.sql

alter table if exists public.employees enable row level security;
alter table if exists public.employees force row level security;

alter table if exists public.departments enable row level security;
alter table if exists public.departments force row level security;

alter table if exists public.teams enable row level security;
alter table if exists public.teams force row level security;

alter table if exists public.branches enable row level security;
alter table if exists public.branches force row level security;

alter table if exists public.company_settings enable row level security;
alter table if exists public.company_settings force row level security;

alter table if exists public.company_working_days enable row level security;
alter table if exists public.company_working_days force row level security;

alter table if exists public.employee_education enable row level security;
alter table if exists public.employee_education force row level security;

alter table if exists public.employee_skills enable row level security;
alter table if exists public.employee_skills force row level security;

alter table if exists public.employee_trainings enable row level security;
alter table if exists public.employee_trainings force row level security;

alter table if exists public.employee_languages enable row level security;
alter table if exists public.employee_languages force row level security;

alter table if exists public.employee_employment_history enable row level security;
alter table if exists public.employee_employment_history force row level security;

alter table if exists public.email_queue enable row level security;
alter table if exists public.email_queue force row level security;

alter table if exists public.shift_templates enable row level security;
alter table if exists public.shift_templates force row level security;

alter table if exists public.employee_shift_assignments enable row level security;
alter table if exists public.employee_shift_assignments force row level security;

alter table if exists public.attendance_records enable row level security;
alter table if exists public.attendance_records force row level security;

alter table if exists public.shift_change_requests enable row level security;
alter table if exists public.shift_change_requests force row level security;

alter table if exists public.attendance_escalations enable row level security;
alter table if exists public.attendance_escalations force row level security;

alter table if exists public.attendance_audit_events enable row level security;
alter table if exists public.attendance_audit_events force row level security;

alter table if exists public.company_holidays enable row level security;
alter table if exists public.company_holidays force row level security;

alter table if exists public.attendance_breaks enable row level security;
alter table if exists public.attendance_breaks force row level security;

alter table if exists public.attendance_correction_requests enable row level security;
alter table if exists public.attendance_correction_requests force row level security;

alter table if exists public.leave_types enable row level security;
alter table if exists public.leave_types force row level security;

alter table if exists public.leave_balances enable row level security;
alter table if exists public.leave_balances force row level security;

alter table if exists public.leave_requests enable row level security;
alter table if exists public.leave_requests force row level security;

alter table if exists public.leave_accrual_rules enable row level security;
alter table if exists public.leave_accrual_rules force row level security;

alter table if exists public.leave_ledger enable row level security;
alter table if exists public.leave_ledger force row level security;

alter table if exists public.leave_policy_rules enable row level security;
alter table if exists public.leave_policy_rules force row level security;

alter table if exists public.leave_blackout_dates enable row level security;
alter table if exists public.leave_blackout_dates force row level security;

alter table if exists public.leave_approval_levels enable row level security;
alter table if exists public.leave_approval_levels force row level security;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'employees'
       AND policyname = 'employees_select_phase1'
  ) THEN
    CREATE POLICY employees_select_phase1 ON public.employees
      FOR SELECT
      USING (
        company_id = public.current_user_company_id()
        AND is_deleted = false
        AND id IN (SELECT * FROM public.current_user_scope_employee_ids())
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'employees'
       AND policyname = 'employees_insert_phase1'
  ) THEN
    CREATE POLICY employees_insert_phase1 ON public.employees
      FOR INSERT
      WITH CHECK (
        company_id = public.current_user_company_id()
        AND public.current_user_has_permission('manage_employees')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'employees'
       AND policyname = 'employees_update_phase1'
  ) THEN
    CREATE POLICY employees_update_phase1 ON public.employees
      FOR UPDATE
      USING (
        company_id = public.current_user_company_id()
        AND is_deleted = false
        AND public.current_user_has_permission('manage_employees')
      )
      WITH CHECK (
        company_id = public.current_user_company_id()
        AND public.current_user_has_permission('manage_employees')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'departments'
       AND policyname = 'departments_select_phase1'
  ) THEN
    CREATE POLICY departments_select_phase1 ON public.departments
      FOR SELECT
      USING (
        company_id = public.current_user_company_id()
        AND is_deleted = false
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'departments'
       AND policyname = 'departments_insert_phase1'
  ) THEN
    CREATE POLICY departments_insert_phase1 ON public.departments
      FOR INSERT
      WITH CHECK (
        company_id = public.current_user_company_id()
        AND public.current_user_has_permission('manage_departments')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'departments'
       AND policyname = 'departments_update_phase1'
  ) THEN
    CREATE POLICY departments_update_phase1 ON public.departments
      FOR UPDATE
      USING (
        company_id = public.current_user_company_id()
        AND is_deleted = false
        AND public.current_user_has_permission('manage_departments')
      )
      WITH CHECK (
        company_id = public.current_user_company_id()
        AND public.current_user_has_permission('manage_departments')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'teams'
       AND policyname = 'teams_select_phase1'
  ) THEN
    CREATE POLICY teams_select_phase1 ON public.teams
      FOR SELECT
      USING (
        company_id = public.current_user_company_id()
        AND is_deleted = false
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'teams'
       AND policyname = 'teams_insert_phase1'
  ) THEN
    CREATE POLICY teams_insert_phase1 ON public.teams
      FOR INSERT
      WITH CHECK (
        company_id = public.current_user_company_id()
        AND public.current_user_has_permission('manage_departments')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'teams'
       AND policyname = 'teams_update_phase1'
  ) THEN
    CREATE POLICY teams_update_phase1 ON public.teams
      FOR UPDATE
      USING (
        company_id = public.current_user_company_id()
        AND is_deleted = false
        AND public.current_user_has_permission('manage_departments')
      )
      WITH CHECK (
        company_id = public.current_user_company_id()
        AND public.current_user_has_permission('manage_departments')
      );
  END IF;
END $$;

-- ============================================
-- PHASE 1 MODULE SUMMARY
-- Tables created: none
-- Columns added: none
-- Constraints added: none
-- Functions created: none
-- Indexes added: none
-- RLS policies added: employees/departments/teams phase1 policies (conditional)
-- ============================================
