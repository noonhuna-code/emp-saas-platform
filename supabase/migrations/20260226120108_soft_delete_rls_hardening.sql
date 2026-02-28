-- ============================================
-- Migration: 69_soft_delete_rls_hardening.sql
-- Purpose: Ensure UPDATE policies exclude soft-deleted rows
-- Scope: RLS policy replacement only
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: Tightened update policies
-- ============================================

drop policy if exists companies_update on public.companies;
create policy companies_update on public.companies
  for update
  using (
    id = public.current_user_company_id()
    and is_deleted = false
    and public.current_user_has_permission('manage_company')
  )
  with check (
    id = public.current_user_company_id()
    and public.current_user_has_permission('manage_company')
  );

drop policy if exists user_profiles_update on public.user_profiles;
create policy user_profiles_update on public.user_profiles
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

drop policy if exists user_profiles_select_self on public.user_profiles;
create policy user_profiles_select_self on public.user_profiles
  for select
  using (
    user_id = auth.uid()
    and is_deleted = false
  );

drop policy if exists roles_update on public.roles;
create policy roles_update on public.roles
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and is_system_role = false
    and public.current_user_has_permission('manage_roles')
  )
  with check (
    company_id = public.current_user_company_id()
    and is_system_role = false
    and public.current_user_has_permission('manage_roles')
  );

drop policy if exists departments_update on public.departments;
create policy departments_update on public.departments
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and public.current_user_has_permission('manage_departments')
  )
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_departments')
  );

drop policy if exists teams_update on public.teams;
create policy teams_update on public.teams
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and public.current_user_has_permission('manage_departments')
  )
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_departments')
  );

drop policy if exists employees_update on public.employees;
create policy employees_update on public.employees
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

drop policy if exists shift_templates_update on public.shift_templates;
create policy shift_templates_update on public.shift_templates
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and public.current_user_has_permission('manage_shifts')
  )
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_shifts')
  );

drop policy if exists employee_shift_assignments_update on public.employee_shift_assignments;
create policy employee_shift_assignments_update on public.employee_shift_assignments
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
    and public.current_user_has_permission('assign_shifts')
  )
  with check (
    company_id = public.current_user_company_id()
    and employee_id in (select * from public.current_user_scope_employee_ids())
    and public.current_user_has_permission('assign_shifts')
  );

drop policy if exists attendance_records_update on public.attendance_records;
create policy attendance_records_update on public.attendance_records
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
    and (
      public.current_user_has_permission('manage_attendance')
      or public.current_user_has_permission('approve_attendance')
      or public.current_user_has_permission('override_attendance')
    )
  )
  with check (
    company_id = public.current_user_company_id()
    and employee_id in (select * from public.current_user_scope_employee_ids())
    and (
      public.current_user_has_permission('manage_attendance')
      or public.current_user_has_permission('approve_attendance')
      or public.current_user_has_permission('override_attendance')
    )
  );

drop policy if exists shift_change_requests_update on public.shift_change_requests;
create policy shift_change_requests_update on public.shift_change_requests
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
    and (
      public.current_user_has_permission('assign_shifts')
      or public.current_user_has_permission('manage_attendance')
      or public.current_user_has_permission('approve_attendance')
    )
  )
  with check (
    company_id = public.current_user_company_id()
    and employee_id in (select * from public.current_user_scope_employee_ids())
    and (
      public.current_user_has_permission('assign_shifts')
      or public.current_user_has_permission('manage_attendance')
      or public.current_user_has_permission('approve_attendance')
    )
  );

drop policy if exists attendance_escalations_update on public.attendance_escalations;
create policy attendance_escalations_update on public.attendance_escalations
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and public.current_user_has_permission('manage_escalations')
  )
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_escalations')
  );

drop policy if exists company_holidays_update on public.company_holidays;
create policy company_holidays_update on public.company_holidays
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and public.current_user_has_permission('manage_shifts')
  )
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_shifts')
  );
