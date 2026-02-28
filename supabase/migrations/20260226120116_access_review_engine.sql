-- ============================================
-- Migration: 77_access_review_engine.sql
-- Purpose: Access review logging (append-only)
-- Scope: New table + RLS policies
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: New table only
-- ============================================

create table if not exists public.access_review_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  reviewer_profile_id uuid not null references public.user_profiles(id) on delete restrict,
  reviewed_profile_id uuid not null references public.user_profiles(id) on delete restrict,
  role_snapshot jsonb,
  decision text not null,
  created_at timestamptz not null default now()
);

create index if not exists access_review_logs_company_id_idx
  on public.access_review_logs (company_id);

create index if not exists access_review_logs_reviewed_profile_id_idx
  on public.access_review_logs (reviewed_profile_id);

alter table public.access_review_logs enable row level security;
alter table public.access_review_logs force row level security;

drop policy if exists access_review_logs_select on public.access_review_logs;
drop policy if exists access_review_logs_insert on public.access_review_logs;

create policy access_review_logs_select on public.access_review_logs
  for select
  using (company_id = public.current_user_company_id());

create policy access_review_logs_insert on public.access_review_logs
  for insert
  with check (company_id = public.current_user_company_id());