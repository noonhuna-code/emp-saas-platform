-- ============================================
-- Migration: 82_auth_rate_limit_select_revoke.sql
-- Purpose: Remove SELECT exposure for auth_rate_limits
-- Scope: RLS policy cleanup only
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: auth_rate_limits policies only
-- ============================================

drop policy if exists auth_rate_limits_select on public.auth_rate_limits;
