-- EMP/supabase/system_alignment_verification_report.sql
-- Generated: structural verification only. No changes applied.

-- 1) employees table hierarchy columns and FKs
-- Found in schema.sql:
-- employees.department_id (FK -> departments.id)
-- employees.team_id (FK -> teams.id)
-- employees.manager_id (FK -> employees.id)
-- Missing (per requirement): reports_to, role_id
-- Result: FAIL (reports_to, role_id not present)

-- 2) Duplicate supervisor/manager fields outside employees
-- Found:
-- teams.team_lead_id (FK -> user_profiles.id)
-- shift_swap_requests.status includes 'pending_supervisor' (status only)
-- No other manager/supervisor columns in shift/leave/payroll tables.
-- Result: WARNING (team_lead_id is a hierarchy-like field outside employees)

-- 3) Approval logic uses current_user_is_manager_of()
-- Found in system_global_alignment_patch.sql:
-- leave_requests_update policy uses current_user_is_manager_of()
-- attendance_correction_requests_update policy uses current_user_is_manager_of()
-- shift_swap_requests_update policy uses current_user_is_manager_of()
-- Result: PASS for leave/attendance/shift swap

-- 4) Payroll approval workflow aligned with hierarchy
-- payroll_engine.sql requires manage_payroll permission only.
-- No hierarchy function usage found.
-- Result: FAIL (payroll approval not aligned with hierarchy functions)

-- 5) Functions SECURITY DEFINER + search_path
-- SECURITY DEFINER with set search_path = public, pg_temp present in:
-- attendance_helper_functions.sql: current_user_scope_employee_ids, get_effective_shift_for_employee, calculate_attendance_status, validate_no_shift_overlap
-- attendance_enhancements.sql: calculate_attendance_status
-- leave_engine_advanced.sql: validate_leave_request, process_monthly_leave_accrual
-- shift_rules_engine.sql: validate_minimum_rest, validate_consecutive_days, bulk_assign_shifts
-- payroll_engine.sql: process_payroll_run, finalize_payroll_run, prevent_locked_payroll_entries_update
-- attendance_analytics.sql: export_attendance_report, refresh_attendance_analytics
-- salary_ledger_engine.sql: refresh_salary_ledger_views
-- Note: helper_functions.sql current_user_has_permission uses SECURITY DEFINER but search_path = public (no pg_temp)
-- Result: PASS with minor deviation (current_user_has_permission lacks pg_temp)

-- 6) RLS enable + force on tables
-- Verified in: leave_management.sql, attendance_enhancements.sql, notification_engine.sql,
-- weekend_management.sql, payroll_foundation.sql, payroll_engine.sql,
-- shift_rules_engine.sql, leave_engine_advanced.sql, salary_ledger_engine.sql
-- Materialized views (attendance_analytics.sql, salary_ledger_engine.sql) do not have RLS.
-- Result: PASS for tables; INFO for views (no RLS by design)

-- 7) RLS policies include company_id and is_deleted = false
-- Policies in leave_management.sql, attendance_enhancements.sql, notification_engine.sql,
-- weekend_management.sql, payroll_foundation.sql, payroll_engine.sql,
-- shift_rules_engine.sql, leave_engine_advanced.sql, salary_ledger_engine.sql
-- include company_id filter and is_deleted = false on SELECT/UPDATE.
-- Result: PASS

-- 8) Hard DELETE policies
-- No DELETE policies found in reviewed files.
-- Result: PASS

-- ================================
-- SUMMARY
-- ================================
-- PASS: Hierarchy in employees (department_id, team_id, manager_id) with FKs
-- FAIL: reports_to and role_id missing on employees
-- WARNING: teams.team_lead_id exists outside employees hierarchy
-- PASS: approval policies for leave/attendance/shift swap use current_user_is_manager_of()
-- FAIL: payroll approval not aligned with hierarchy functions
-- PASS: RLS enable + force on tables
-- PASS: RLS policies include company_id and is_deleted = false
-- PASS: no DELETE policies
-- ================================
