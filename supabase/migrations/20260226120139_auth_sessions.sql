-- ============================================
-- Migration: 101_auth_sessions.sql
-- Purpose: Session tracking, idle timeout, absolute lifetime, revocation support
-- Scope: New table + RLS policies + indexes
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: New table only
-- ============================================

create table if not exists public.auth_sessions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  user_id uuid not null,
  profile_id uuid not null references public.user_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz null,
  revoked_reason text null,
  request_id text null
);

create index if not exists auth_sessions_company_user_idx
  on public.auth_sessions (company_id, user_id);

create index if not exists auth_sessions_company_profile_idx
  on public.auth_sessions (company_id, profile_id);

create index if not exists auth_sessions_company_last_seen_idx
  on public.auth_sessions (company_id, last_seen_at);

create index if not exists auth_sessions_company_expires_idx
  on public.auth_sessions (company_id, expires_at);

create index if not exists auth_sessions_company_revoked_idx
  on public.auth_sessions (company_id, revoked_at)
  where revoked_at is null;

alter table public.auth_sessions enable row level security;
alter table public.auth_sessions force row level security;

drop policy if exists auth_sessions_select on public.auth_sessions;
drop policy if exists auth_sessions_insert on public.auth_sessions;
drop policy if exists auth_sessions_update on public.auth_sessions;
drop policy if exists auth_sessions_delete on public.auth_sessions;

create policy auth_sessions_select on public.auth_sessions
  for select
  using (company_id = public.current_user_company_id() and user_id = auth.uid());

create policy auth_sessions_insert on public.auth_sessions
  for insert
  with check (company_id = public.current_user_company_id() and user_id = auth.uid());

create policy auth_sessions_update on public.auth_sessions
  for update
  using (company_id = public.current_user_company_id() and user_id = auth.uid())
  with check (company_id = public.current_user_company_id() and user_id = auth.uid());
