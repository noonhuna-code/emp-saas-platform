-- ============================================
-- Migration: 20260226120215_billing_integrity_contract.sql
-- Purpose : Billing integrity contract (statuses, exact payment fields, currency snapshot, audit table)
-- Scope   : Additive + replay-safe
-- ============================================

alter table public.billing_invoices
  add column if not exists currency_snapshot text;

update public.billing_invoices
   set currency_snapshot = upper(coalesce(currency_snapshot, currency_code, 'PKR'))
 where currency_snapshot is null
    or currency_snapshot = '';

alter table public.billing_invoices
  alter column currency_snapshot set not null;

alter table public.billing_invoices
  add column if not exists paid_amount_minor bigint;

alter table public.billing_invoices
  add column if not exists paid_currency_code text;

update public.billing_invoices
   set status = 'void'
 where status = 'canceled';

update public.billing_invoices
   set paid_amount_minor = coalesce(paid_amount_minor, subtotal_minor),
       paid_currency_code = upper(coalesce(paid_currency_code, currency_snapshot))
 where status = 'paid'
   and (paid_amount_minor is null or paid_currency_code is null);

alter table public.billing_invoices
  drop constraint if exists billing_invoices_status_chk;

alter table public.billing_invoices
  add constraint billing_invoices_status_chk
  check (status in ('draft', 'pending', 'under_review', 'paid', 'overdue', 'void'));

alter table public.billing_invoices
  drop constraint if exists billing_invoices_paid_exact_match_chk;

alter table public.billing_invoices
  add constraint billing_invoices_paid_exact_match_chk
  check (
    status <> 'paid'
    or (
      paid_amount_minor is not null
      and paid_amount_minor = subtotal_minor
      and paid_currency_code is not null
      and upper(paid_currency_code) = upper(currency_snapshot)
    )
  );

alter table public.company_subscriptions
  add column if not exists currency_code_snapshot text;

update public.company_subscriptions cs
   set currency_code_snapshot = upper(coalesce(cs.currency_code_snapshot, bpv.currency_code, 'PKR'))
  from public.billing_plan_versions bpv
 where bpv.id = cs.plan_version_id
   and (
     cs.currency_code_snapshot is null
     or cs.currency_code_snapshot = ''
   );

update public.company_subscriptions
   set currency_code_snapshot = upper(coalesce(currency_code_snapshot, 'PKR'))
 where currency_code_snapshot is null
    or currency_code_snapshot = '';

alter table public.company_subscriptions
  alter column currency_code_snapshot set not null;

alter table public.company_subscriptions
  drop constraint if exists company_subscriptions_currency_code_snapshot_chk;

alter table public.company_subscriptions
  add constraint company_subscriptions_currency_code_snapshot_chk
  check (currency_code_snapshot ~ '^[A-Z]{3}$');

create table if not exists public.billing_audit_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete restrict,
  actor_profile_id uuid references public.user_profiles(id) on delete restrict,
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint billing_audit_events_metadata_json_chk check (jsonb_typeof(metadata_json) = 'object')
);

create index if not exists billing_audit_events_company_created_idx
  on public.billing_audit_events (company_id, created_at desc);

create index if not exists billing_audit_events_event_created_idx
  on public.billing_audit_events (event_type, created_at desc);

create index if not exists billing_audit_events_entity_idx
  on public.billing_audit_events (entity_type, entity_id, created_at desc);

alter table public.billing_audit_events enable row level security;
alter table public.billing_audit_events force row level security;

drop policy if exists billing_audit_events_select on public.billing_audit_events;
create policy billing_audit_events_select on public.billing_audit_events
  for select
  using (
    auth.uid() is not null
    and (
      company_id = public.current_user_company_id()
      or (
        company_id is null
        and (
          public.current_user_has_permission('manage_billing')
          or public.current_user_has_permission('manage_company')
        )
      )
    )
  );

drop policy if exists billing_audit_events_insert on public.billing_audit_events;
create policy billing_audit_events_insert on public.billing_audit_events
  for insert
  with check (
    auth.uid() is not null
    and (
      company_id = public.current_user_company_id()
      or (
        company_id is null
        and (
          public.current_user_has_permission('manage_billing')
          or public.current_user_has_permission('manage_company')
        )
      )
    )
  );
