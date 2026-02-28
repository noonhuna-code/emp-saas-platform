-- ============================================
-- Migration: 72_soft_delete_index_hardening.sql
-- Purpose: Add partial indexes for soft-delete filtering performance
-- Scope: Non-destructive index additions only
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: None
-- ============================================

create index if not exists attendance_audit_events_company_id_is_deleted_idx
  on public.attendance_audit_events (company_id)
  where is_deleted = false;

create index if not exists attendance_escalations_company_id_is_deleted_idx
  on public.attendance_escalations (company_id)
  where is_deleted = false;

create index if not exists attendance_records_company_id_is_deleted_idx
  on public.attendance_records (company_id)
  where is_deleted = false;

create index if not exists departments_company_id_is_deleted_idx
  on public.departments (company_id)
  where is_deleted = false;

create index if not exists employees_company_id_is_deleted_idx
  on public.employees (company_id)
  where is_deleted = false;

create index if not exists teams_company_id_is_deleted_idx
  on public.teams (company_id)
  where is_deleted = false;

create index if not exists user_profiles_company_id_is_deleted_idx
  on public.user_profiles (company_id)
  where is_deleted = false;

create index if not exists employee_shift_assignments_company_id_is_deleted_idx
  on public.employee_shift_assignments (company_id)
  where is_deleted = false;

create index if not exists shift_change_requests_company_id_is_deleted_idx
  on public.shift_change_requests (company_id)
  where is_deleted = false;
