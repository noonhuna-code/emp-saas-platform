-- ============================================
-- Migration: 20260226120203_phase2d_01b_request_audit_support_patch.sql
-- Purpose: Phase 2D Stage 1.1 non-destructive patch for request-level audit support + signed ledger amounts
-- Scope: financial_obligation_ledger, financial_obligation_status_history only
-- Non-destructive: YES
-- RLS Impact: None (schema patch only; existing policies preserved)
-- ============================================

-- --------------------------------------------
-- Patch financial_obligation_ledger
-- 1) Allow signed amounts by removing non-negative check
-- 2) Support request-level events before obligation exists
-- --------------------------------------------

alter table public.financial_obligation_ledger
  drop constraint if exists financial_obligation_ledger_amount_chk;

alter table public.financial_obligation_ledger
  alter column obligation_id drop not null;

alter table public.financial_obligation_ledger
  add column if not exists request_id uuid;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'financial_obligation_ledger_request_fk'
       and conrelid = 'public.financial_obligation_ledger'::regclass
  ) then
    alter table public.financial_obligation_ledger
      add constraint financial_obligation_ledger_request_fk
        foreign key (request_id)
        references public.financial_obligation_requests(id)
        on delete restrict;
  end if;
end;
$$;

alter table public.financial_obligation_ledger
  drop constraint if exists financial_obligation_ledger_target_xor_chk;

alter table public.financial_obligation_ledger
  add constraint financial_obligation_ledger_target_xor_chk
  check (
    (obligation_id is not null and request_id is null)
    or
    (obligation_id is null and request_id is not null)
  );

create index if not exists financial_obligation_ledger_company_request_created_idx
  on public.financial_obligation_ledger (company_id, request_id, created_at desc);

-- --------------------------------------------
-- Patch financial_obligation_status_history
-- 1) Support request-level status history before obligation exists
-- 2) Enforce entity_scope target consistency for future rows
-- --------------------------------------------

alter table public.financial_obligation_status_history
  alter column obligation_id drop not null;

alter table public.financial_obligation_status_history
  add column if not exists request_id uuid;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'financial_obligation_status_history_request_fk'
       and conrelid = 'public.financial_obligation_status_history'::regclass
  ) then
    alter table public.financial_obligation_status_history
      add constraint financial_obligation_status_history_request_fk
        foreign key (request_id)
        references public.financial_obligation_requests(id)
        on delete restrict;
  end if;
end;
$$;

alter table public.financial_obligation_status_history
  drop constraint if exists financial_obligation_status_history_scope_target_chk;

-- Use NOT VALID to preserve compatibility with any previously inserted request-scope rows
-- that were temporarily keyed via obligation_id before request_id support existed.
alter table public.financial_obligation_status_history
  add constraint financial_obligation_status_history_scope_target_chk
  check (
    (entity_scope = 'request' and request_id is not null and obligation_id is null)
    or
    (entity_scope = 'obligation' and obligation_id is not null and request_id is null)
  ) not valid;

create index if not exists financial_obligation_status_history_company_request_created_idx
  on public.financial_obligation_status_history (company_id, request_id, created_at desc);

