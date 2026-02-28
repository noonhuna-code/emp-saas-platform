-- ============================================
-- Migration: 98_security_performance_indexes.sql
-- Purpose: Add high-concurrency security indexes
-- Scope: Indexes only
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: None
-- ============================================

-- login_events
create index if not exists login_events_company_risk_score_idx
  on public.login_events (company_id, risk_score);

create index if not exists login_events_company_ip_hash_idx
  on public.login_events (company_id, ip_hash);

create index if not exists login_events_company_created_at_desc_idx
  on public.login_events (company_id, created_at desc);

-- device_fingerprints (partial index for soft-delete table)
create index if not exists device_fingerprints_company_device_hash_idx
  on public.device_fingerprints (company_id, device_hash)
  where is_deleted = false;

-- mfa_triggers
create index if not exists mfa_triggers_company_created_at_desc_idx
  on public.mfa_triggers (company_id, created_at desc);
