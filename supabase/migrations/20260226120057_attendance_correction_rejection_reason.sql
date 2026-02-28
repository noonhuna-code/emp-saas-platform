-- ============================================
-- Migration: 58_attendance_correction_rejection_reason.sql
-- Purpose: Add nullable rejection_reason support for attendance correction requests
-- Safety: Non-destructive, idempotent, no RLS/trigger/constraint changes
-- Validation:
-- - attendance_correction_requests exists (expected from prior applied migrations)
-- - rejection_reason column not present in validated local schema snapshot
-- - nullable column add is safe (backward-compatible)
-- - no RLS impact, no cross-company risk introduced
-- Indexes:
-- - none added (nullable free-text reason; not a filter/join key)
-- ============================================

alter table public.attendance_correction_requests
  add column if not exists rejection_reason text;
