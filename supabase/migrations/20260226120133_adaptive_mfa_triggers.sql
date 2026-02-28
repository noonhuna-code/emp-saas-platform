-- ============================================
-- Migration: 95_adaptive_mfa_triggers.sql
-- Purpose: Adaptive MFA trigger architecture (append-only insert + optional resolution)
-- Scope: New table + RLS policies
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: New table only
-- ============================================

create table if not exists public.mfa_triggers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  profile_id uuid not null references public.user_profiles(id) on delete restrict,
  risk_score integer not null default 0,
  reason text not null,
  status text not null default 'pending',
  request_id text null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz null,
  resolved_by uuid null references public.user_profiles(id) on delete restrict,
  constraint mfa_triggers_status_check check (status in ('pending','resolved','ignored'))
);

create index if not exists mfa_triggers_company_created_at_idx
  on public.mfa_triggers (company_id, created_at);

create index if not exists mfa_triggers_company_profile_idx
  on public.mfa_triggers (company_id, profile_id);

alter table public.mfa_triggers enable row level security;
alter table public.mfa_triggers force row level security;

drop policy if exists mfa_triggers_select on public.mfa_triggers;
drop policy if exists mfa_triggers_insert on public.mfa_triggers;
drop policy if exists mfa_triggers_update on public.mfa_triggers;

create policy mfa_triggers_select on public.mfa_triggers
  for select
  using (company_id = public.current_user_company_id());

create policy mfa_triggers_insert on public.mfa_triggers
  for insert
  with check (company_id = public.current_user_company_id());

create policy mfa_triggers_update on public.mfa_triggers
  for update
  using (company_id = public.current_user_company_id())
  with check (company_id = public.current_user_company_id());
