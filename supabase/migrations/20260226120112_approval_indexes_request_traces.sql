-- ============================================
-- Migration: 73_approval_indexes_request_traces.sql
-- Purpose: Approval query performance + request tracing time-slice index
-- Scope: Non-destructive index additions only
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: None
-- ============================================

-- High-frequency approval query indexes (company-scoped, soft-delete aware)
create index if not exists leave_requests_company_status_is_deleted_idx
  on public.leave_requests (company_id, status, is_deleted)
  where is_deleted = false;

create index if not exists attendance_correction_requests_company_status_is_deleted_idx
  on public.attendance_correction_requests (company_id, status, is_deleted)
  where is_deleted = false;

create index if not exists project_tasks_company_status_is_deleted_idx
  on public.project_tasks (company_id, status, is_deleted)
  where is_deleted = false;

-- Request tracing time-slice index for scale
create index if not exists request_traces_company_created_at_idx
  on public.request_traces (company_id, created_at);