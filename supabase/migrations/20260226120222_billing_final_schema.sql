-- ============================================
-- Migration: 20260226120222_billing_final_schema.sql
-- Purpose : Final billing schema hardening (anchor, snapshots, proofs/events, webhook fields)
-- Scope   : Additive + replay-safe
-- ============================================

insert into public.permissions (key, description)
values ('approve_billing_payments', 'Approve billing payments and extend subscriptions')
on conflict (key) do nothing;

alter table public.company_subscriptions
  add column if not exists billing_anchor_day integer;

update public.company_subscriptions cs
   set billing_anchor_day = greatest(
     1,
     least(
       31,
       extract(
         day from (
           coalesce(cs.trial_starts_at, cs.current_period_start, now()) at time zone coalesce(nullif(trim(cset.timezone), ''), 'Asia/Karachi')
         )
       )::integer
     )
   )
  from public.company_settings cset
 where cset.company_id = cs.company_id
   and cset.is_deleted = false
   and cs.billing_anchor_day is null;

update public.company_subscriptions
   set billing_anchor_day = greatest(
     1,
     least(
       31,
       extract(day from (coalesce(trial_starts_at, current_period_start, now()) at time zone 'Asia/Karachi'))::integer
     )
   )
 where billing_anchor_day is null;

alter table public.company_subscriptions
  alter column billing_anchor_day set not null;

alter table public.company_subscriptions
  drop constraint if exists company_subscriptions_billing_anchor_day_chk;

alter table public.company_subscriptions
  add constraint company_subscriptions_billing_anchor_day_chk
  check (billing_anchor_day between 1 and 31);

alter table public.billing_invoices
  add column if not exists seat_count_snapshot integer;

alter table public.billing_invoices
  add column if not exists price_per_seat_snapshot bigint;

alter table public.billing_invoices
  add column if not exists plan_version_snapshot uuid;

alter table public.billing_invoices
  add column if not exists billing_interval_snapshot text;

update public.billing_invoices bi
   set seat_count_snapshot = coalesce(bi.seat_count_snapshot, bi.seat_count, 0),
       price_per_seat_snapshot = coalesce(
         bi.price_per_seat_snapshot,
         case when coalesce(bi.seat_count, 0) > 0 then (bi.subtotal_minor / nullif(bi.seat_count, 0)) else 0 end,
         0
       ),
       plan_version_snapshot = coalesce(bi.plan_version_snapshot, cs.plan_version_id),
       billing_interval_snapshot = coalesce(
         bi.billing_interval_snapshot,
         bpv.billing_interval,
         'monthly'
       )
  from public.company_subscriptions cs
  left join public.billing_plan_versions bpv on bpv.id = cs.plan_version_id
 where cs.id = bi.subscription_id;

update public.billing_invoices
   set seat_count_snapshot = coalesce(seat_count_snapshot, 0),
       price_per_seat_snapshot = coalesce(price_per_seat_snapshot, 0),
       billing_interval_snapshot = coalesce(billing_interval_snapshot, 'monthly')
 where seat_count_snapshot is null
    or price_per_seat_snapshot is null
    or billing_interval_snapshot is null;

alter table public.billing_invoices
  alter column seat_count_snapshot set not null;

alter table public.billing_invoices
  alter column price_per_seat_snapshot set not null;

alter table public.billing_invoices
  alter column billing_interval_snapshot set not null;

alter table public.billing_invoices
  drop constraint if exists billing_invoices_snapshot_counts_chk;

alter table public.billing_invoices
  add constraint billing_invoices_snapshot_counts_chk
  check (seat_count_snapshot >= 0 and price_per_seat_snapshot >= 0);

alter table public.billing_invoices
  drop constraint if exists billing_invoices_billing_interval_snapshot_chk;

alter table public.billing_invoices
  add constraint billing_invoices_billing_interval_snapshot_chk
  check (billing_interval_snapshot in ('monthly'));

update public.billing_invoices
   set due_date = period_end
 where due_date is distinct from period_end;

alter table public.billing_invoices
  drop constraint if exists billing_invoices_due_date_period_align_chk;

alter table public.billing_invoices
  add constraint billing_invoices_due_date_period_align_chk
  check (due_date = period_end);

create unique index if not exists billing_invoices_company_period_unique_active
  on public.billing_invoices (company_id, period_start, period_end)
  where status in ('draft', 'pending', 'under_review', 'overdue');

create table if not exists public.billing_payment_proofs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  invoice_id uuid not null references public.billing_invoices(id) on delete restrict,
  submitted_by_profile_id uuid not null references public.user_profiles(id) on delete restrict,
  proof_storage_path text not null,
  amount_minor bigint not null,
  currency_code text not null,
  reference_number text,
  payment_method text not null,
  payment_date date not null,
  notes text,
  supersedes_proof_id uuid references public.billing_payment_proofs(id) on delete restrict,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint billing_payment_proofs_amount_chk check (amount_minor >= 0),
  constraint billing_payment_proofs_currency_chk check (currency_code ~ '^[A-Z]{3}$'),
  constraint billing_payment_proofs_method_chk check (payment_method in ('bank_transfer', 'jazzcash', 'stripe', 'manual')),
  constraint billing_payment_proofs_json_chk check (jsonb_typeof(metadata_json) = 'object')
);

create index if not exists billing_payment_proofs_company_invoice_idx
  on public.billing_payment_proofs (company_id, invoice_id, created_at desc);

create index if not exists billing_payment_proofs_company_reference_idx
  on public.billing_payment_proofs (company_id, reference_number)
  where reference_number is not null;

create table if not exists public.billing_payment_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  invoice_id uuid not null references public.billing_invoices(id) on delete restrict,
  subscription_id uuid not null references public.company_subscriptions(id) on delete restrict,
  event_type text not null,
  amount_minor bigint not null,
  currency_code text not null,
  payment_reference text,
  payment_provider text,
  event_source text not null default 'manual_review',
  metadata_json jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.user_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint billing_payment_events_type_chk check (event_type in ('payment_verified', 'invoice_paid', 'payment_rejected', 'refund_recorded')),
  constraint billing_payment_events_amount_chk check (amount_minor >= 0),
  constraint billing_payment_events_currency_chk check (currency_code ~ '^[A-Z]{3}$'),
  constraint billing_payment_events_provider_chk check (payment_provider is null or payment_provider in ('jazzcash', 'bank', 'stripe', 'manual')),
  constraint billing_payment_events_source_chk check (event_source in ('manual_review', 'webhook', 'admin_correction')),
  constraint billing_payment_events_json_chk check (jsonb_typeof(metadata_json) = 'object')
);

create index if not exists billing_payment_events_company_invoice_idx
  on public.billing_payment_events (company_id, invoice_id, created_at desc);

create index if not exists billing_payment_events_company_event_type_idx
  on public.billing_payment_events (company_id, event_type, created_at desc);

create unique index if not exists billing_payment_events_invoice_paid_unique
  on public.billing_payment_events (company_id, invoice_id)
  where event_type = 'invoice_paid';

create unique index if not exists billing_payment_events_provider_reference_unique
  on public.billing_payment_events (company_id, payment_provider, payment_reference)
  where payment_reference is not null and event_type = 'invoice_paid';

alter table public.billing_webhook_events
  add column if not exists payload_hash text;

alter table public.billing_webhook_events
  add column if not exists processed boolean;

update public.billing_webhook_events
   set processed = coalesce(processed, process_status = 'processed'),
       payload_hash = coalesce(payload_hash, md5(coalesce(payload_json::text, '{}')))
 where processed is null
    or payload_hash is null;

update public.billing_webhook_events
   set processed = false
 where processed is null;

alter table public.billing_webhook_events
  alter column processed set not null;

create index if not exists billing_webhook_events_provider_hash_idx
  on public.billing_webhook_events (provider, payload_hash, received_at desc);

create or replace function public.prevent_billing_append_only_mutation()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  raise exception using errcode = 'P0001', message = 'APPEND_ONLY_TABLE';
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_billing_payment_proofs_no_update'
      and tgrelid = 'public.billing_payment_proofs'::regclass
  ) then
    create trigger trg_billing_payment_proofs_no_update
      before update on public.billing_payment_proofs
      for each row execute function public.prevent_billing_append_only_mutation();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_billing_payment_proofs_no_delete'
      and tgrelid = 'public.billing_payment_proofs'::regclass
  ) then
    create trigger trg_billing_payment_proofs_no_delete
      before delete on public.billing_payment_proofs
      for each row execute function public.prevent_billing_append_only_mutation();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_billing_payment_events_no_update'
      and tgrelid = 'public.billing_payment_events'::regclass
  ) then
    create trigger trg_billing_payment_events_no_update
      before update on public.billing_payment_events
      for each row execute function public.prevent_billing_append_only_mutation();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_billing_payment_events_no_delete'
      and tgrelid = 'public.billing_payment_events'::regclass
  ) then
    create trigger trg_billing_payment_events_no_delete
      before delete on public.billing_payment_events
      for each row execute function public.prevent_billing_append_only_mutation();
  end if;
end $$;

alter table public.billing_payment_proofs enable row level security;
alter table public.billing_payment_proofs force row level security;

alter table public.billing_payment_events enable row level security;
alter table public.billing_payment_events force row level security;

drop policy if exists billing_payment_proofs_select on public.billing_payment_proofs;
create policy billing_payment_proofs_select on public.billing_payment_proofs
  for select
  using (
    company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('view_billing')
      or public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  );

drop policy if exists billing_payment_proofs_insert on public.billing_payment_proofs;
create policy billing_payment_proofs_insert on public.billing_payment_proofs
  for insert
  with check (
    company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('view_billing')
      or public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  );

drop policy if exists billing_payment_events_select on public.billing_payment_events;
create policy billing_payment_events_select on public.billing_payment_events
  for select
  using (
    company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('view_billing')
      or public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
      or public.current_user_has_permission('approve_billing_payments')
    )
  );

drop policy if exists billing_payment_events_insert on public.billing_payment_events;
create policy billing_payment_events_insert on public.billing_payment_events
  for insert
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('approve_billing_payments')
  );
