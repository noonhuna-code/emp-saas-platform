-- ============================================
-- Migration: 81_auth_rate_limit_policies.sql
-- Purpose: Allow anon/authenticated access for auth_rate_limits via RLS
-- Scope: Policy updates only
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: auth_rate_limits policies only
-- ============================================

drop policy if exists auth_rate_limits_select on public.auth_rate_limits;
drop policy if exists auth_rate_limits_insert on public.auth_rate_limits;
drop policy if exists auth_rate_limits_update on public.auth_rate_limits;

create policy auth_rate_limits_select on public.auth_rate_limits
  for select
  using (coalesce(current_setting('request.jwt.claim.role', true), '') in ('anon', 'authenticated'));

create policy auth_rate_limits_insert on public.auth_rate_limits
  for insert
  with check (coalesce(current_setting('request.jwt.claim.role', true), '') in ('anon', 'authenticated'));

create policy auth_rate_limits_update on public.auth_rate_limits
  for update
  using (coalesce(current_setting('request.jwt.claim.role', true), '') in ('anon', 'authenticated'))
  with check (coalesce(current_setting('request.jwt.claim.role', true), '') in ('anon', 'authenticated'));
