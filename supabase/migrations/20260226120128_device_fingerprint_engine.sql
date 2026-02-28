-- ============================================
-- Migration: 90_device_fingerprint_engine.sql
-- Purpose: Device fingerprint tracking per profile
-- Scope: New table + RLS policies
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: New table only
-- ============================================

create table if not exists public.device_fingerprints (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  profile_id uuid not null references public.user_profiles(id) on delete restrict,
  device_hash text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  risk_score integer not null default 0,
  is_deleted boolean not null default false,
  deleted_at timestamptz null,
  deleted_by uuid null references public.user_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint device_fingerprints_unique unique (company_id, profile_id, device_hash)
);

create index if not exists device_fingerprints_company_is_deleted_idx
  on public.device_fingerprints (company_id, is_deleted);

create index if not exists device_fingerprints_company_profile_idx
  on public.device_fingerprints (company_id, profile_id);

alter table public.device_fingerprints enable row level security;
alter table public.device_fingerprints force row level security;

drop policy if exists device_fingerprints_select on public.device_fingerprints;
drop policy if exists device_fingerprints_insert on public.device_fingerprints;
drop policy if exists device_fingerprints_update on public.device_fingerprints;

create policy device_fingerprints_select on public.device_fingerprints
  for select
  using (company_id = public.current_user_company_id() and is_deleted = false);

create policy device_fingerprints_insert on public.device_fingerprints
  for insert
  with check (company_id = public.current_user_company_id());

create policy device_fingerprints_update on public.device_fingerprints
  for update
  using (company_id = public.current_user_company_id() and is_deleted = false)
  with check (company_id = public.current_user_company_id() and is_deleted = false);
