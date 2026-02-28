-- ============================================
-- Migration: 92_account_lock_audit.sql
-- Purpose: Account lock audit log (immutable)
-- Scope: New table, RLS, immutability triggers
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: New table only
-- ============================================

create table if not exists public.account_lock_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid null references public.companies(id) on delete restrict,
  email_hash text not null,
  lock_reason text not null,
  lock_duration_minutes integer not null,
  triggered_by text not null, -- 'rate_limit' | 'risk_score'
  created_at timestamptz not null default now()
);

create index if not exists account_lock_events_company_id_idx
  on public.account_lock_events (company_id);

alter table public.account_lock_events enable row level security;
alter table public.account_lock_events force row level security;

drop policy if exists account_lock_events_select on public.account_lock_events;
drop policy if exists account_lock_events_insert on public.account_lock_events;
drop policy if exists account_lock_events_update on public.account_lock_events;
drop policy if exists account_lock_events_delete on public.account_lock_events;

create policy account_lock_events_select on public.account_lock_events
  for select
  using (company_id = public.current_user_company_id());

create policy account_lock_events_insert on public.account_lock_events
  for insert
  with check (
    (company_id = public.current_user_company_id())
    or
    (
      company_id is null
      and coalesce(current_setting('request.jwt.claim.role', true), '') in ('anon','authenticated')
    )
  );

create or replace function public.prevent_account_lock_mutation()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  raise exception using
    errcode = 'P0001',
    message = 'ACCOUNT_LOCK_IMMUTABLE';
end;
$$;

drop trigger if exists trg_account_lock_block_update on public.account_lock_events;
create trigger trg_account_lock_block_update
  before update on public.account_lock_events
  for each row execute function public.prevent_account_lock_mutation();

drop trigger if exists trg_account_lock_block_delete on public.account_lock_events;
create trigger trg_account_lock_block_delete
  before delete on public.account_lock_events
  for each row execute function public.prevent_account_lock_mutation();
