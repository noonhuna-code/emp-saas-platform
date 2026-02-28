-- ============================================
-- Migration: 20260226120159_phase2d_01_financial_obligations_schema.sql
-- Purpose: Phase 2D Stage 1 financial obligations core schema (requests, obligations, installments, ledger, status history)
-- Scope: Schema only (tables, constraints, indexes, RLS, append-only triggers)
-- Non-destructive: YES
-- Idempotent: YES (CREATE IF NOT EXISTS / DROP IF EXISTS patterns where applicable)
-- RLS Impact: New tables only
-- ============================================

create table if not exists public.financial_obligation_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  obligation_type text not null,
  status text not null default 'draft',
  requested_amount numeric not null,
  requested_term_months integer,
  currency_code text not null,
  reason text,
  rejection_reason text,
  reviewed_by_profile_id uuid references public.user_profiles(id) on delete restrict,
  reviewed_at timestamptz,
  request_payload_version integer not null default 1,
  terms_snapshot_json jsonb,
  created_by_profile_id uuid not null references public.user_profiles(id) on delete restrict,
  updated_by_profile_id uuid references public.user_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_obligation_requests_id_company_uniq unique (id, company_id),
  constraint financial_obligation_requests_obligation_type_chk
    check (obligation_type in ('advance', 'loan')),
  constraint financial_obligation_requests_status_chk
    check (status in ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'cancelled', 'expired')),
  constraint financial_obligation_requests_requested_amount_chk
    check (requested_amount >= 0),
  constraint financial_obligation_requests_requested_term_chk
    check (requested_term_months is null or requested_term_months > 0),
  constraint financial_obligation_requests_currency_code_chk
    check (btrim(currency_code) <> ''),
  constraint financial_obligation_requests_request_payload_version_chk
    check (request_payload_version >= 1)
);

create table if not exists public.financial_obligations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  source_request_id uuid,
  obligation_type text not null,
  obligation_status text not null,
  currency_code text not null,
  principal_requested numeric,
  principal_approved numeric not null,
  outstanding_balance numeric not null,
  term_months_requested integer,
  term_months_approved integer,
  schedule_version integer not null default 1,
  disbursed_at timestamptz,
  closed_at timestamptz,
  interest_model text not null default 'none',
  interest_terms_json jsonb,
  calculation_version integer not null default 1,
  created_by_profile_id uuid not null references public.user_profiles(id) on delete restrict,
  updated_by_profile_id uuid references public.user_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_obligations_id_company_uniq unique (id, company_id),
  constraint financial_obligations_source_request_company_fk
    foreign key (source_request_id, company_id)
    references public.financial_obligation_requests(id, company_id)
    on delete restrict,
  constraint financial_obligations_obligation_type_chk
    check (obligation_type in ('advance', 'loan')),
  constraint financial_obligations_obligation_status_chk
    check (obligation_status in (
      'approved_pending_disbursement',
      'disbursed_active',
      'repayment_in_progress',
      'paid_off',
      'closed',
      'settled_in_exit',
      'written_off'
    )),
  constraint financial_obligations_interest_model_chk
    check (interest_model in ('none')),
  constraint financial_obligations_currency_code_chk
    check (btrim(currency_code) <> ''),
  constraint financial_obligations_principal_requested_chk
    check (principal_requested is null or principal_requested >= 0),
  constraint financial_obligations_principal_approved_chk
    check (principal_approved >= 0),
  constraint financial_obligations_outstanding_balance_chk
    check (outstanding_balance >= 0),
  constraint financial_obligations_term_months_requested_chk
    check (term_months_requested is null or term_months_requested > 0),
  constraint financial_obligations_term_months_approved_chk
    check (term_months_approved is null or term_months_approved > 0),
  constraint financial_obligations_schedule_version_chk
    check (schedule_version >= 1),
  constraint financial_obligations_calculation_version_chk
    check (calculation_version >= 1)
);

create table if not exists public.financial_obligation_installments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  obligation_id uuid not null,
  year integer not null,
  month integer not null,
  scheduled_amount numeric not null,
  applied_amount numeric not null default 0,
  remaining_amount numeric not null,
  status text not null default 'scheduled',
  applied_payroll_run_id uuid references public.payroll_runs(id) on delete restrict,
  applied_payroll_entry_id uuid references public.payroll_entries(id) on delete restrict,
  schedule_version integer not null default 1,
  created_by_profile_id uuid not null references public.user_profiles(id) on delete restrict,
  updated_by_profile_id uuid references public.user_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_obligation_installments_obligation_company_fk
    foreign key (obligation_id, company_id)
    references public.financial_obligations(id, company_id)
    on delete restrict,
  constraint financial_obligation_installments_company_obligation_period_uniq
    unique (company_id, obligation_id, year, month),
  constraint financial_obligation_installments_year_chk
    check (year between 2000 and 9999),
  constraint financial_obligation_installments_month_chk
    check (month between 1 and 12),
  constraint financial_obligation_installments_scheduled_amount_chk
    check (scheduled_amount >= 0),
  constraint financial_obligation_installments_applied_amount_chk
    check (applied_amount >= 0),
  constraint financial_obligation_installments_remaining_amount_chk
    check (remaining_amount >= 0),
  constraint financial_obligation_installments_status_chk
    check (status in ('scheduled', 'partially_applied', 'applied', 'skipped', 'carried_forward', 'waived')),
  constraint financial_obligation_installments_schedule_version_chk
    check (schedule_version >= 1)
);

create table if not exists public.financial_obligation_ledger (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  obligation_id uuid not null,
  event_type text not null,
  amount numeric not null default 0,
  balance_before numeric,
  balance_after numeric,
  reference_type text,
  reference_id uuid,
  actor_profile_id uuid references public.user_profiles(id) on delete restrict,
  external_ref_type text,
  external_ref_id text,
  metadata_json jsonb,
  created_at timestamptz not null default now(),
  constraint financial_obligation_ledger_obligation_company_fk
    foreign key (obligation_id, company_id)
    references public.financial_obligations(id, company_id)
    on delete restrict,
  constraint financial_obligation_ledger_event_type_chk
    check (event_type in (
      'request_created',
      'request_approved',
      'request_rejected',
      'disbursed',
      'installment_scheduled',
      'installment_applied',
      'carry_forward',
      'prepayment',
      'manual_adjustment',
      'settlement_recovery',
      'waiver',
      'closed'
    )),
  constraint financial_obligation_ledger_amount_chk
    check (amount >= 0),
  constraint financial_obligation_ledger_external_ref_pair_chk
    check (
      (external_ref_type is null and external_ref_id is null)
      or
      (external_ref_type is not null and external_ref_id is not null and btrim(external_ref_type) <> '' and btrim(external_ref_id) <> '')
    )
);

create table if not exists public.financial_obligation_status_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  obligation_id uuid not null,
  entity_scope text not null,
  old_status text,
  new_status text not null,
  reason text,
  actor_profile_id uuid not null references public.user_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint financial_obligation_status_history_obligation_company_fk
    foreign key (obligation_id, company_id)
    references public.financial_obligations(id, company_id)
    on delete restrict,
  constraint financial_obligation_status_history_entity_scope_chk
    check (entity_scope in ('request', 'obligation')),
  constraint financial_obligation_status_history_new_status_chk
    check (btrim(new_status) <> '')
);

-- Partial/filtered uniqueness and required supporting indexes
create unique index if not exists financial_obligations_source_request_id_uniq
  on public.financial_obligations (source_request_id)
  where source_request_id is not null;

create unique index if not exists financial_obligation_ledger_one_disbursed_per_obligation_uniq
  on public.financial_obligation_ledger (company_id, obligation_id)
  where event_type = 'disbursed';

create unique index if not exists financial_obligation_ledger_external_ref_company_uniq
  on public.financial_obligation_ledger (company_id, external_ref_type, external_ref_id)
  where external_ref_type is not null and external_ref_id is not null;

-- Requests indexes
create index if not exists financial_obligation_requests_company_status_created_idx
  on public.financial_obligation_requests (company_id, status, created_at desc);

create index if not exists financial_obligation_requests_company_employee_created_idx
  on public.financial_obligation_requests (company_id, employee_id, created_at desc);

-- Obligations indexes
create index if not exists financial_obligations_company_employee_status_created_idx
  on public.financial_obligations (company_id, employee_id, obligation_status, created_at desc);

create index if not exists financial_obligations_company_status_created_idx
  on public.financial_obligations (company_id, obligation_status, created_at desc);

-- Installments indexes
-- Note: company+obligation+year+month lookup is backed by the unique constraint index.
create index if not exists financial_obligation_installments_company_year_month_status_idx
  on public.financial_obligation_installments (company_id, year, month, status);

create index if not exists financial_obligation_installments_company_applied_payroll_run_idx
  on public.financial_obligation_installments (company_id, applied_payroll_run_id);

create index if not exists financial_obligation_installments_company_applied_payroll_entry_idx
  on public.financial_obligation_installments (company_id, applied_payroll_entry_id);

-- Ledger indexes
create index if not exists financial_obligation_ledger_company_obligation_created_idx
  on public.financial_obligation_ledger (company_id, obligation_id, created_at desc);

create index if not exists financial_obligation_ledger_company_event_created_idx
  on public.financial_obligation_ledger (company_id, event_type, created_at desc);

create index if not exists financial_obligation_ledger_company_reference_idx
  on public.financial_obligation_ledger (company_id, reference_type, reference_id);

create index if not exists financial_obligation_ledger_company_created_idx
  on public.financial_obligation_ledger (company_id, created_at desc);

-- Status history indexes
create index if not exists financial_obligation_status_history_company_obligation_created_idx
  on public.financial_obligation_status_history (company_id, obligation_id, created_at desc);

-- RLS enable + force
alter table public.financial_obligation_requests enable row level security;
alter table public.financial_obligation_requests force row level security;

alter table public.financial_obligations enable row level security;
alter table public.financial_obligations force row level security;

alter table public.financial_obligation_installments enable row level security;
alter table public.financial_obligation_installments force row level security;

alter table public.financial_obligation_ledger enable row level security;
alter table public.financial_obligation_ledger force row level security;

alter table public.financial_obligation_status_history enable row level security;
alter table public.financial_obligation_status_history force row level security;

-- Policies: mutable tables (select/insert/update only)
drop policy if exists financial_obligation_requests_select on public.financial_obligation_requests;
drop policy if exists financial_obligation_requests_insert on public.financial_obligation_requests;
drop policy if exists financial_obligation_requests_update on public.financial_obligation_requests;

create policy financial_obligation_requests_select on public.financial_obligation_requests
  for select
  using (company_id = public.current_user_company_id());

create policy financial_obligation_requests_insert on public.financial_obligation_requests
  for insert
  with check (company_id = public.current_user_company_id());

create policy financial_obligation_requests_update on public.financial_obligation_requests
  for update
  using (company_id = public.current_user_company_id())
  with check (company_id = public.current_user_company_id());

drop policy if exists financial_obligations_select on public.financial_obligations;
drop policy if exists financial_obligations_insert on public.financial_obligations;
drop policy if exists financial_obligations_update on public.financial_obligations;

create policy financial_obligations_select on public.financial_obligations
  for select
  using (company_id = public.current_user_company_id());

create policy financial_obligations_insert on public.financial_obligations
  for insert
  with check (company_id = public.current_user_company_id());

create policy financial_obligations_update on public.financial_obligations
  for update
  using (company_id = public.current_user_company_id())
  with check (company_id = public.current_user_company_id());

drop policy if exists financial_obligation_installments_select on public.financial_obligation_installments;
drop policy if exists financial_obligation_installments_insert on public.financial_obligation_installments;
drop policy if exists financial_obligation_installments_update on public.financial_obligation_installments;

create policy financial_obligation_installments_select on public.financial_obligation_installments
  for select
  using (company_id = public.current_user_company_id());

create policy financial_obligation_installments_insert on public.financial_obligation_installments
  for insert
  with check (company_id = public.current_user_company_id());

create policy financial_obligation_installments_update on public.financial_obligation_installments
  for update
  using (company_id = public.current_user_company_id())
  with check (company_id = public.current_user_company_id());

-- Policies: append-only tables (select/insert only)
drop policy if exists financial_obligation_ledger_select on public.financial_obligation_ledger;
drop policy if exists financial_obligation_ledger_insert on public.financial_obligation_ledger;

create policy financial_obligation_ledger_select on public.financial_obligation_ledger
  for select
  using (company_id = public.current_user_company_id());

create policy financial_obligation_ledger_insert on public.financial_obligation_ledger
  for insert
  with check (company_id = public.current_user_company_id());

drop policy if exists financial_obligation_status_history_select on public.financial_obligation_status_history;
drop policy if exists financial_obligation_status_history_insert on public.financial_obligation_status_history;

create policy financial_obligation_status_history_select on public.financial_obligation_status_history
  for select
  using (company_id = public.current_user_company_id());

create policy financial_obligation_status_history_insert on public.financial_obligation_status_history
  for insert
  with check (company_id = public.current_user_company_id());

-- Append-only immutability triggers (ledger + status history)
create or replace function public.raise_financial_obligation_immutable_table()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  raise exception using
    errcode = 'P0001',
    message = 'immutable table';
end;
$$;

drop trigger if exists trg_financial_obligation_ledger_immutable on public.financial_obligation_ledger;
create trigger trg_financial_obligation_ledger_immutable
  before update or delete on public.financial_obligation_ledger
  for each row
  execute function public.raise_financial_obligation_immutable_table();

drop trigger if exists trg_financial_obligation_status_history_immutable on public.financial_obligation_status_history;
create trigger trg_financial_obligation_status_history_immutable
  before update or delete on public.financial_obligation_status_history
  for each row
  execute function public.raise_financial_obligation_immutable_table();
