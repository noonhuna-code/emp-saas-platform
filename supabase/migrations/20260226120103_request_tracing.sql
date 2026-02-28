-- ============================================
-- Migration: 64_request_tracing.sql
-- Purpose: Request-level tracing for observability
-- Scope: New table + RLS policies
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: New table only
-- ============================================

create table if not exists public.request_traces (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  request_id text not null,
  endpoint text not null,
  actor_profile_id uuid references public.user_profiles(id) on delete restrict,
  duration_ms integer,
  status_code integer,
  created_at timestamptz not null default now()
);

create index if not exists request_traces_company_id_idx
  on public.request_traces (company_id);

create index if not exists request_traces_company_request_id_idx
  on public.request_traces (company_id, request_id);

alter table public.request_traces enable row level security;
alter table public.request_traces force row level security;

drop policy if exists request_traces_select on public.request_traces;
drop policy if exists request_traces_insert on public.request_traces;

create policy request_traces_select on public.request_traces
  for select
  using (company_id = public.current_user_company_id());

create policy request_traces_insert on public.request_traces
  for insert
  with check (company_id = public.current_user_company_id());
