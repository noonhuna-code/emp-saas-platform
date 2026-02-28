-- ============================================
-- Migration: 96_security_audit_export_view.sql
-- Purpose: Unified security audit export view (tenant-scoped)
-- Scope: View only
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: None (uses current_user_company_id())
-- ============================================

create or replace view public.v_security_audit_export as
select
  'login'::text as event_type,
  le.company_id,
  le.profile_id,
  le.email_hash,
  le.ip_hash,
  le.device_hash,
  le.risk_score,
  jsonb_build_object(
    'success', le.success,
    'geo_country', le.geo_country
  ) as details,
  le.created_at
from public.login_events le
where le.company_id = public.current_user_company_id()

union all

select
  'account_lock'::text as event_type,
  ale.company_id,
  null::uuid as profile_id,
  ale.email_hash,
  null::text as ip_hash,
  null::text as device_hash,
  null::integer as risk_score,
  jsonb_build_object(
    'lock_reason', ale.lock_reason,
    'lock_duration_minutes', ale.lock_duration_minutes,
    'triggered_by', ale.triggered_by
  ) as details,
  ale.created_at
from public.account_lock_events ale
where ale.company_id = public.current_user_company_id()

union all

select
  'mfa_trigger'::text as event_type,
  mt.company_id,
  mt.profile_id,
  null::text as email_hash,
  null::text as ip_hash,
  null::text as device_hash,
  mt.risk_score,
  jsonb_build_object(
    'reason', mt.reason,
    'status', mt.status,
    'resolved_at', mt.resolved_at
  ) as details,
  mt.created_at
from public.mfa_triggers mt
where mt.company_id = public.current_user_company_id();
