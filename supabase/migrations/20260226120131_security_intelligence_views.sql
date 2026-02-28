-- ============================================
-- Migration: 93_security_intelligence_views.sql
-- Purpose: Security intelligence views
-- Scope: Views only
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: None (views rely on current_user_company_id())
-- ============================================

create or replace view public.v_high_risk_logins as
select
  company_id,
  profile_id,
  email_hash,
  ip_hash,
  device_hash,
  geo_country,
  success,
  risk_score,
  created_at
from public.login_events
where company_id = public.current_user_company_id()
  and risk_score >= 70;
