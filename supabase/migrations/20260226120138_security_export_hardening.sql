-- ============================================
-- Migration: 100_security_export_hardening.sql
-- Purpose: Security export audit + hash redaction
-- Scope: New audit table + view replacement
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: New table only
-- ============================================

create table if not exists public.security_export_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  actor_profile_id uuid not null references public.user_profiles(id) on delete restrict,
  export_format text not null,
  row_count integer not null default 0,
  filter_from timestamptz null,
  filter_to timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists security_export_events_company_created_at_idx
  on public.security_export_events (company_id, created_at);

alter table public.security_export_events enable row level security;
alter table public.security_export_events force row level security;

drop policy if exists security_export_events_select on public.security_export_events;
drop policy if exists security_export_events_insert on public.security_export_events;
drop policy if exists security_export_events_update on public.security_export_events;
drop policy if exists security_export_events_delete on public.security_export_events;

create policy security_export_events_select on public.security_export_events
  for select
  using (company_id = public.current_user_company_id());

create policy security_export_events_insert on public.security_export_events
  for insert
  with check (company_id = public.current_user_company_id());

-- Immutability (reuse prevent_audit_mutation)
drop trigger if exists trg_security_export_events_block_update on public.security_export_events;
create trigger trg_security_export_events_block_update
  before update on public.security_export_events
  for each row execute function public.prevent_audit_mutation();

drop trigger if exists trg_security_export_events_block_delete on public.security_export_events;
create trigger trg_security_export_events_block_delete
  before delete on public.security_export_events
  for each row execute function public.prevent_audit_mutation();

-- Redacted export view (no hashes)
create or replace view public.v_security_audit_export as
select
  'login'::text as event_type,
  le.company_id,
  le.profile_id,
  null::text as email_hash,
  null::text as ip_hash,
  null::text as device_hash,
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
  null::text as email_hash,
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
