-- ============================================
-- Migration: 20260226120207_billing_core_architecture.sql
-- Purpose : Billing core (plans, subscriptions, entitlements, seats, invoices)
-- Scope   : Additive + replay-safe
-- ============================================

insert into public.permissions (key, description)
values
  ('view_billing', 'View billing plans, subscriptions, invoices, and entitlements'),
  ('manage_billing', 'Manage billing subscriptions, seats, and billing operations')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in ('view_billing', 'manage_billing')
where r.is_system_role = true
  and r.name in ('Founder', 'Admin')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key = 'view_billing'
where r.is_system_role = true
  and r.name = 'HR'
on conflict do nothing;

create table if not exists public.billing_features (
  id uuid primary key default gen_random_uuid(),
  feature_key text not null unique,
  feature_type text not null,
  module text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint billing_features_type_chk check (feature_type in ('boolean', 'limit_integer', 'limit_decimal', 'limit_text'))
);

create table if not exists public.billing_plans (
  id uuid primary key default gen_random_uuid(),
  plan_code text not null unique,
  display_name text not null,
  tier_level integer not null,
  is_public boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_plans_tier_level_chk check (tier_level >= 1)
);

create table if not exists public.billing_plan_versions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.billing_plans(id) on delete restrict,
  version_no integer not null,
  billing_interval text not null default 'monthly',
  region_code text not null default 'PK',
  currency_code text not null default 'PKR',
  seat_pricing_model text not null default 'per_active_seat',
  price_minor_unit bigint,
  trial_days integer not null default 14,
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_plan_versions_unique unique (plan_id, version_no),
  constraint billing_plan_versions_interval_chk check (billing_interval in ('monthly')),
  constraint billing_plan_versions_trial_days_chk check (trial_days >= 0),
  constraint billing_plan_versions_effective_chk check (effective_to is null or effective_to > effective_from),
  constraint billing_plan_versions_seat_model_chk check (seat_pricing_model in ('per_active_seat', 'flat'))
);

create table if not exists public.billing_plan_entitlements (
  id uuid primary key default gen_random_uuid(),
  plan_version_id uuid not null references public.billing_plan_versions(id) on delete restrict,
  feature_key text not null references public.billing_features(feature_key) on delete restrict,
  value_type text not null,
  bool_value boolean,
  int_value integer,
  decimal_value numeric(18, 4),
  text_value text,
  created_at timestamptz not null default now(),
  constraint billing_plan_entitlements_unique unique (plan_version_id, feature_key),
  constraint billing_plan_entitlements_value_type_chk check (value_type in ('boolean', 'limit_integer', 'limit_decimal', 'limit_text')),
  constraint billing_plan_entitlements_value_chk check (
    (value_type = 'boolean' and bool_value is not null and int_value is null and decimal_value is null and text_value is null)
    or
    (value_type = 'limit_integer' and int_value is not null and bool_value is null and decimal_value is null and text_value is null)
    or
    (value_type = 'limit_decimal' and decimal_value is not null and bool_value is null and int_value is null and text_value is null)
    or
    (value_type = 'limit_text' and text_value is not null and bool_value is null and int_value is null and decimal_value is null)
  )
);

create table if not exists public.company_subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  plan_id uuid not null references public.billing_plans(id) on delete restrict,
  plan_version_id uuid not null references public.billing_plan_versions(id) on delete restrict,
  status text not null,
  trial_starts_at timestamptz,
  trial_ends_at timestamptz,
  grace_ends_at timestamptz,
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  seat_limit_override integer,
  provider text not null default 'internal_invoice',
  provider_customer_id text,
  provider_subscription_id text,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  constraint company_subscriptions_status_chk check (status in ('trialing', 'active', 'past_due', 'canceled')),
  constraint company_subscriptions_provider_chk check (provider in ('internal_invoice', 'jazzcash', 'bank', 'stripe')),
  constraint company_subscriptions_period_chk check (current_period_end > current_period_start),
  constraint company_subscriptions_trial_chk check (trial_ends_at is null or trial_starts_at is null or trial_ends_at >= trial_starts_at),
  constraint company_subscriptions_seat_limit_override_chk check (seat_limit_override is null or seat_limit_override > 0)
);

create table if not exists public.company_subscription_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  subscription_id uuid not null references public.company_subscriptions(id) on delete restrict,
  plan_version_id uuid references public.billing_plan_versions(id) on delete restrict,
  item_type text not null,
  item_code text not null,
  quantity integer not null default 1,
  unit_price_minor bigint,
  currency_code text not null default 'PKR',
  status text not null default 'active',
  provider_price_id text,
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  constraint company_subscription_items_type_chk check (item_type in ('base_plan', 'add_on', 'metered')),
  constraint company_subscription_items_qty_chk check (quantity >= 1),
  constraint company_subscription_items_status_chk check (status in ('active', 'inactive')),
  constraint company_subscription_items_effective_chk check (effective_to is null or effective_to > effective_from)
);

create table if not exists public.company_entitlements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete restrict,
  source_subscription_id uuid references public.company_subscriptions(id) on delete restrict,
  entitlements_json jsonb not null default '{}'::jsonb,
  resolved_at timestamptz not null default now(),
  expires_at timestamptz,
  resolved_by_profile_id uuid references public.user_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_entitlements_json_type_chk check (jsonb_typeof(entitlements_json) = 'object')
);

create table if not exists public.company_seat_assignments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  user_profile_id uuid not null references public.user_profiles(id) on delete restrict,
  subscription_id uuid references public.company_subscriptions(id) on delete restrict,
  status text not null default 'active',
  is_billable boolean not null default true,
  assigned_at timestamptz not null default now(),
  ended_at timestamptz,
  assigned_by_profile_id uuid references public.user_profiles(id) on delete restrict,
  revoked_by_profile_id uuid references public.user_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_seat_assignments_status_chk check (status in ('active', 'pending', 'revoked')),
  constraint company_seat_assignments_dates_chk check (ended_at is null or ended_at >= assigned_at)
);

create table if not exists public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  subscription_id uuid not null references public.company_subscriptions(id) on delete restrict,
  invoice_number text not null,
  period_start date not null,
  period_end date not null,
  seat_count integer not null default 0,
  subtotal_minor bigint not null default 0,
  tax_minor bigint not null default 0,
  total_minor bigint not null default 0,
  currency_code text not null default 'PKR',
  status text not null default 'pending',
  due_date date not null,
  paid_at timestamptz,
  payment_reference text,
  payment_provider text,
  payment_metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  constraint billing_invoices_company_number_unique unique (company_id, invoice_number),
  constraint billing_invoices_status_chk check (status in ('pending', 'under_review', 'paid', 'overdue', 'canceled')),
  constraint billing_invoices_provider_chk check (payment_provider is null or payment_provider in ('jazzcash', 'bank', 'stripe', 'manual')),
  constraint billing_invoices_period_chk check (period_end >= period_start),
  constraint billing_invoices_counts_chk check (seat_count >= 0),
  constraint billing_invoices_json_type_chk check (jsonb_typeof(payment_metadata_json) = 'object')
);

create table if not exists public.billing_webhook_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete restrict,
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  payload_json jsonb not null default '{}'::jsonb,
  process_status text not null default 'received',
  process_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint billing_webhook_events_provider_event_unique unique (provider, provider_event_id),
  constraint billing_webhook_events_status_chk check (process_status in ('received', 'processed', 'ignored', 'failed')),
  constraint billing_webhook_events_json_type_chk check (jsonb_typeof(payload_json) = 'object')
);

create table if not exists public.company_subscription_changes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  subscription_id uuid references public.company_subscriptions(id) on delete restrict,
  change_type text not null,
  requested_at timestamptz not null default now(),
  effective_at timestamptz,
  status text not null default 'requested',
  from_plan_version_id uuid references public.billing_plan_versions(id) on delete restrict,
  to_plan_version_id uuid references public.billing_plan_versions(id) on delete restrict,
  reason text,
  processed_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  constraint company_subscription_changes_type_chk check (change_type in ('upgrade', 'downgrade', 'renewal', 'trial_start', 'trial_end', 'cancel')),
  constraint company_subscription_changes_status_chk check (status in ('requested', 'scheduled', 'processed', 'failed', 'canceled'))
);

create index if not exists billing_plan_versions_plan_active_idx
  on public.billing_plan_versions (plan_id, is_active, version_no desc);

create index if not exists billing_plan_entitlements_plan_version_idx
  on public.billing_plan_entitlements (plan_version_id, feature_key);

create index if not exists company_subscriptions_company_current_idx
  on public.company_subscriptions (company_id, is_current, status, current_period_end desc);

create unique index if not exists company_subscriptions_one_current_idx
  on public.company_subscriptions (company_id)
  where is_current = true;

create index if not exists company_subscription_items_subscription_idx
  on public.company_subscription_items (company_id, subscription_id, status, effective_from desc);

create index if not exists company_entitlements_company_resolved_idx
  on public.company_entitlements (company_id, resolved_at desc);

create index if not exists company_entitlements_json_gin_idx
  on public.company_entitlements using gin (entitlements_json);

create index if not exists company_seat_assignments_company_status_idx
  on public.company_seat_assignments (company_id, status, is_billable, assigned_at desc);

create unique index if not exists company_seat_assignments_active_profile_idx
  on public.company_seat_assignments (company_id, user_profile_id)
  where status = 'active';

create index if not exists billing_invoices_company_status_due_idx
  on public.billing_invoices (company_id, status, due_date desc);

create index if not exists billing_invoices_company_period_idx
  on public.billing_invoices (company_id, period_start desc, period_end desc);

create index if not exists billing_webhook_events_company_received_idx
  on public.billing_webhook_events (company_id, received_at desc);

create index if not exists billing_webhook_events_process_status_idx
  on public.billing_webhook_events (process_status, received_at desc);

create index if not exists company_subscription_changes_company_requested_idx
  on public.company_subscription_changes (company_id, requested_at desc);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_billing_plans_updated_at') then
    create trigger trg_billing_plans_updated_at
      before update on public.billing_plans
      for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_billing_plan_versions_updated_at') then
    create trigger trg_billing_plan_versions_updated_at
      before update on public.billing_plan_versions
      for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_company_subscriptions_updated_at') then
    create trigger trg_company_subscriptions_updated_at
      before update on public.company_subscriptions
      for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_company_subscription_items_updated_at') then
    create trigger trg_company_subscription_items_updated_at
      before update on public.company_subscription_items
      for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_company_entitlements_updated_at') then
    create trigger trg_company_entitlements_updated_at
      before update on public.company_entitlements
      for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_company_seat_assignments_updated_at') then
    create trigger trg_company_seat_assignments_updated_at
      before update on public.company_seat_assignments
      for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_billing_invoices_updated_at') then
    create trigger trg_billing_invoices_updated_at
      before update on public.billing_invoices
      for each row execute function public.set_updated_at();
  end if;
end $$;

alter table public.billing_features enable row level security;
alter table public.billing_features force row level security;
alter table public.billing_plans enable row level security;
alter table public.billing_plans force row level security;
alter table public.billing_plan_versions enable row level security;
alter table public.billing_plan_versions force row level security;
alter table public.billing_plan_entitlements enable row level security;
alter table public.billing_plan_entitlements force row level security;
alter table public.company_subscriptions enable row level security;
alter table public.company_subscriptions force row level security;
alter table public.company_subscription_items enable row level security;
alter table public.company_subscription_items force row level security;
alter table public.company_entitlements enable row level security;
alter table public.company_entitlements force row level security;
alter table public.company_seat_assignments enable row level security;
alter table public.company_seat_assignments force row level security;
alter table public.billing_invoices enable row level security;
alter table public.billing_invoices force row level security;
alter table public.billing_webhook_events enable row level security;
alter table public.billing_webhook_events force row level security;
alter table public.company_subscription_changes enable row level security;
alter table public.company_subscription_changes force row level security;

drop policy if exists billing_features_select on public.billing_features;
create policy billing_features_select on public.billing_features
  for select
  using (auth.uid() is not null and is_active = true);

drop policy if exists billing_plans_select on public.billing_plans;
create policy billing_plans_select on public.billing_plans
  for select
  using (auth.uid() is not null and is_active = true);

drop policy if exists billing_plan_versions_select on public.billing_plan_versions;
create policy billing_plan_versions_select on public.billing_plan_versions
  for select
  using (auth.uid() is not null and is_active = true);

drop policy if exists billing_plan_entitlements_select on public.billing_plan_entitlements;
create policy billing_plan_entitlements_select on public.billing_plan_entitlements
  for select
  using (
    auth.uid() is not null
    and exists (
      select 1
      from public.billing_plan_versions bpv
      join public.billing_plans bp on bp.id = bpv.plan_id
      where bpv.id = billing_plan_entitlements.plan_version_id
        and bp.is_active = true
        and bpv.is_active = true
    )
  );

drop policy if exists company_subscriptions_select on public.company_subscriptions;
create policy company_subscriptions_select on public.company_subscriptions
  for select
  using (
    company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('view_billing')
      or public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  );

drop policy if exists company_subscriptions_insert on public.company_subscriptions;
create policy company_subscriptions_insert on public.company_subscriptions
  for insert
  with check (
    company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  );

drop policy if exists company_subscriptions_update on public.company_subscriptions;
create policy company_subscriptions_update on public.company_subscriptions
  for update
  using (
    company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  )
  with check (
    company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  );

drop policy if exists company_subscription_items_select on public.company_subscription_items;
create policy company_subscription_items_select on public.company_subscription_items
  for select
  using (
    company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('view_billing')
      or public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  );

drop policy if exists company_subscription_items_insert on public.company_subscription_items;
create policy company_subscription_items_insert on public.company_subscription_items
  for insert
  with check (
    company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  );

drop policy if exists company_subscription_items_update on public.company_subscription_items;
create policy company_subscription_items_update on public.company_subscription_items
  for update
  using (
    company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  )
  with check (
    company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  );

drop policy if exists company_entitlements_select on public.company_entitlements;
create policy company_entitlements_select on public.company_entitlements
  for select
  using (company_id = public.current_user_company_id());

drop policy if exists company_entitlements_insert on public.company_entitlements;
create policy company_entitlements_insert on public.company_entitlements
  for insert
  with check (
    company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  );

drop policy if exists company_entitlements_update on public.company_entitlements;
create policy company_entitlements_update on public.company_entitlements
  for update
  using (
    company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  )
  with check (
    company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  );

drop policy if exists company_seat_assignments_select on public.company_seat_assignments;
create policy company_seat_assignments_select on public.company_seat_assignments
  for select
  using (
    company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('view_billing')
      or public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
      or public.current_user_has_permission('manage_employees')
    )
  );

drop policy if exists company_seat_assignments_insert on public.company_seat_assignments;
create policy company_seat_assignments_insert on public.company_seat_assignments
  for insert
  with check (
    company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  );

drop policy if exists company_seat_assignments_update on public.company_seat_assignments;
create policy company_seat_assignments_update on public.company_seat_assignments
  for update
  using (
    company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  )
  with check (
    company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  );

drop policy if exists billing_invoices_select on public.billing_invoices;
create policy billing_invoices_select on public.billing_invoices
  for select
  using (
    company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('view_billing')
      or public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  );

drop policy if exists billing_invoices_insert on public.billing_invoices;
create policy billing_invoices_insert on public.billing_invoices
  for insert
  with check (
    company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  );

drop policy if exists billing_invoices_update on public.billing_invoices;
create policy billing_invoices_update on public.billing_invoices
  for update
  using (
    company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  )
  with check (
    company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  );

drop policy if exists billing_webhook_events_select on public.billing_webhook_events;
create policy billing_webhook_events_select on public.billing_webhook_events
  for select
  using (
    company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('view_billing')
      or public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  );

drop policy if exists billing_webhook_events_insert on public.billing_webhook_events;
create policy billing_webhook_events_insert on public.billing_webhook_events
  for insert
  with check (
    company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  );

drop policy if exists billing_webhook_events_update on public.billing_webhook_events;
create policy billing_webhook_events_update on public.billing_webhook_events
  for update
  using (
    company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  )
  with check (
    company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  );

drop policy if exists company_subscription_changes_select on public.company_subscription_changes;
create policy company_subscription_changes_select on public.company_subscription_changes
  for select
  using (
    company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('view_billing')
      or public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  );

drop policy if exists company_subscription_changes_insert on public.company_subscription_changes;
create policy company_subscription_changes_insert on public.company_subscription_changes
  for insert
  with check (
    company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  );

drop policy if exists company_subscription_changes_update on public.company_subscription_changes;
create policy company_subscription_changes_update on public.company_subscription_changes
  for update
  using (
    company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  )
  with check (
    company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  );

create or replace function public.refresh_company_entitlements_snapshot(
  p_company_id uuid,
  p_actor_profile_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_session_company_id uuid;
  v_subscription record;
  v_entitlements jsonb := '{}'::jsonb;
  v_effective_actor_profile_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'UNAUTHENTICATED';
  end if;

  v_session_company_id := public.current_user_company_id();
  if v_session_company_id is null or p_company_id is null or p_company_id <> v_session_company_id then
    raise exception using errcode = 'P0001', message = 'TENANT_MISMATCH';
  end if;

  if not (
    public.current_user_has_permission('manage_billing')
    or public.current_user_has_permission('manage_company')
  ) then
    raise exception using errcode = 'P0001', message = 'PERMISSION_DENIED';
  end if;

  select id, plan_version_id, seat_limit_override
    into v_subscription
  from public.company_subscriptions
  where company_id = p_company_id
    and is_current = true
    and status in ('trialing', 'active', 'past_due')
  order by created_at desc
  limit 1;

  if p_actor_profile_id is not null then
    v_effective_actor_profile_id := p_actor_profile_id;
  else
    select up.id
      into v_effective_actor_profile_id
    from public.user_profiles up
    where up.user_id = auth.uid()
      and up.company_id = p_company_id
      and up.is_deleted = false
    limit 1;
  end if;

  if v_subscription.id is not null then
    with entitlement_rows as (
      select
        1 as precedence,
        pe.feature_key,
        case pe.value_type
          when 'boolean' then to_jsonb(coalesce(pe.bool_value, false))
          when 'limit_integer' then to_jsonb(pe.int_value)
          when 'limit_decimal' then to_jsonb(pe.decimal_value)
          else to_jsonb(pe.text_value)
        end as entitlement_value
      from public.billing_plan_entitlements pe
      where pe.plan_version_id = v_subscription.plan_version_id

      union all

      select
        2 as precedence,
        pe.feature_key,
        case pe.value_type
          when 'boolean' then to_jsonb(coalesce(pe.bool_value, false))
          when 'limit_integer' then to_jsonb(pe.int_value)
          when 'limit_decimal' then to_jsonb(pe.decimal_value)
          else to_jsonb(pe.text_value)
        end as entitlement_value
      from public.company_subscription_items csi
      join public.billing_plan_entitlements pe
        on pe.plan_version_id = csi.plan_version_id
      where csi.company_id = p_company_id
        and csi.subscription_id = v_subscription.id
        and csi.status = 'active'
        and csi.plan_version_id is not null
        and csi.effective_from <= now()
        and (csi.effective_to is null or csi.effective_to > now())
    ),
    deduped as (
      select distinct on (feature_key)
        feature_key,
        entitlement_value
      from entitlement_rows
      order by feature_key, precedence desc
    )
    select coalesce(jsonb_object_agg(feature_key, entitlement_value), '{}'::jsonb)
      into v_entitlements
    from deduped;

    if v_subscription.seat_limit_override is not null then
      v_entitlements := v_entitlements || jsonb_build_object('limit.active_seats', v_subscription.seat_limit_override);
    end if;
  end if;

  insert into public.company_entitlements (
    company_id,
    source_subscription_id,
    entitlements_json,
    resolved_at,
    resolved_by_profile_id,
    updated_at
  )
  values (
    p_company_id,
    v_subscription.id,
    coalesce(v_entitlements, '{}'::jsonb),
    now(),
    v_effective_actor_profile_id,
    now()
  )
  on conflict (company_id) do update
    set source_subscription_id = excluded.source_subscription_id,
        entitlements_json = excluded.entitlements_json,
        resolved_at = excluded.resolved_at,
        resolved_by_profile_id = excluded.resolved_by_profile_id,
        updated_at = now();

  return coalesce(v_entitlements, '{}'::jsonb);
end;
$$;

create or replace function public.has_feature(
  p_company_id uuid,
  p_feature_key text
)
returns boolean
language plpgsql
security invoker
set search_path = public
stable
as $$
declare
  v_session_company_id uuid;
  v_value jsonb;
  v_text text;
begin
  if auth.uid() is null then
    return false;
  end if;

  v_session_company_id := public.current_user_company_id();
  if v_session_company_id is null or p_company_id is null or p_company_id <> v_session_company_id then
    return false;
  end if;

  select ce.entitlements_json -> p_feature_key
    into v_value
  from public.company_entitlements ce
  where ce.company_id = p_company_id;

  if v_value is null then
    return false;
  end if;

  if jsonb_typeof(v_value) = 'boolean' then
    return (v_value::text)::boolean;
  end if;

  if jsonb_typeof(v_value) = 'number' then
    return (v_value::text)::numeric > 0;
  end if;

  v_text := trim(both '"' from v_value::text);
  return lower(v_text) in ('true', '1', 'yes', 'enabled');
end;
$$;

create or replace function public.get_feature_limit(
  p_company_id uuid,
  p_limit_key text
)
returns integer
language plpgsql
security invoker
set search_path = public
stable
as $$
declare
  v_session_company_id uuid;
  v_value jsonb;
  v_text text;
begin
  if auth.uid() is null then
    return null;
  end if;

  v_session_company_id := public.current_user_company_id();
  if v_session_company_id is null or p_company_id is null or p_company_id <> v_session_company_id then
    return null;
  end if;

  select ce.entitlements_json -> p_limit_key
    into v_value
  from public.company_entitlements ce
  where ce.company_id = p_company_id;

  if v_value is null then
    return null;
  end if;

  if jsonb_typeof(v_value) = 'number' then
    return floor((v_value::text)::numeric)::integer;
  end if;

  v_text := trim(both '"' from v_value::text);
  if v_text ~ '^[0-9]+$' then
    return v_text::integer;
  end if;

  return null;
end;
$$;

create or replace function public.ensure_company_trial_subscription(
  p_company_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_session_company_id uuid;
  v_actor_profile_id uuid;
  v_existing record;
  v_trial_plan_version record;
  v_subscription_id uuid;
  v_trial_days integer;
  v_period_end timestamptz;
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'UNAUTHENTICATED';
  end if;

  v_session_company_id := public.current_user_company_id();
  if v_session_company_id is null or p_company_id is null or p_company_id <> v_session_company_id then
    raise exception using errcode = 'P0001', message = 'TENANT_MISMATCH';
  end if;

  if not (
    public.current_user_has_permission('manage_billing')
    or public.current_user_has_permission('manage_company')
  ) then
    raise exception using errcode = 'P0001', message = 'PERMISSION_DENIED';
  end if;

  select up.id
    into v_actor_profile_id
  from public.user_profiles up
  where up.user_id = auth.uid()
    and up.company_id = p_company_id
    and up.is_deleted = false
  limit 1;

  if v_actor_profile_id is null then
    raise exception using errcode = 'P0001', message = 'ACTOR_PROFILE_NOT_FOUND';
  end if;

  select id, status
    into v_existing
  from public.company_subscriptions
  where company_id = p_company_id
    and is_current = true
  order by created_at desc
  limit 1;

  if v_existing.id is not null then
    perform public.refresh_company_entitlements_snapshot(p_company_id, v_actor_profile_id);
    return jsonb_build_object(
      'subscription_id', v_existing.id,
      'status', v_existing.status,
      'created', false
    );
  end if;

  select
    bp.id as plan_id,
    bp.plan_code as plan_code,
    bpv.id as plan_version_id,
    coalesce(bpv.trial_days, 14) as trial_days
    into v_trial_plan_version
  from public.billing_plans bp
  join public.billing_plan_versions bpv on bpv.plan_id = bp.id
  where bp.plan_code = 'trial'
    and bp.is_active = true
    and bpv.is_active = true
    and bpv.billing_interval = 'monthly'
  order by bpv.version_no desc
  limit 1;

  if v_trial_plan_version.plan_version_id is null then
    raise exception using errcode = 'P0001', message = 'TRIAL_PLAN_NOT_CONFIGURED';
  end if;

  v_trial_days := greatest(coalesce(v_trial_plan_version.trial_days, 14), 0);
  v_period_end := now() + make_interval(days => v_trial_days);

  insert into public.company_subscriptions (
    company_id,
    plan_id,
    plan_version_id,
    status,
    trial_starts_at,
    trial_ends_at,
    current_period_start,
    current_period_end,
    provider,
    is_current,
    created_by,
    updated_by
  )
  values (
    p_company_id,
    v_trial_plan_version.plan_id,
    v_trial_plan_version.plan_version_id,
    'trialing',
    now(),
    v_period_end,
    now(),
    v_period_end,
    'internal_invoice',
    true,
    auth.uid(),
    auth.uid()
  )
  returning id into v_subscription_id;

  insert into public.company_subscription_items (
    company_id,
    subscription_id,
    plan_version_id,
    item_type,
    item_code,
    quantity,
    status,
    effective_from,
    created_by,
    updated_by
  )
  values (
    p_company_id,
    v_subscription_id,
    v_trial_plan_version.plan_version_id,
    'base_plan',
    'base_plan',
    1,
    'active',
    now(),
    auth.uid(),
    auth.uid()
  );

  insert into public.company_subscription_changes (
    company_id,
    subscription_id,
    change_type,
    requested_at,
    effective_at,
    status,
    to_plan_version_id,
    created_by
  )
  values (
    p_company_id,
    v_subscription_id,
    'trial_start',
    now(),
    now(),
    'processed',
    v_trial_plan_version.plan_version_id,
    auth.uid()
  );

  perform public.refresh_company_entitlements_snapshot(p_company_id, v_actor_profile_id);

  return jsonb_build_object(
    'subscription_id', v_subscription_id,
    'status', 'trialing',
    'created', true,
    'trial_ends_at', v_period_end
  );
end;
$$;

create or replace function public.assign_company_seat_atomic(
  p_company_id uuid,
  p_user_profile_id uuid,
  p_is_billable boolean default true
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_session_company_id uuid;
  v_actor_profile_id uuid;
  v_subscription_id uuid;
  v_limit_raw text;
  v_limit integer;
  v_billable_active_count integer;
  v_assignment_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'UNAUTHENTICATED';
  end if;

  v_session_company_id := public.current_user_company_id();
  if v_session_company_id is null or p_company_id is null or p_company_id <> v_session_company_id then
    raise exception using errcode = 'P0001', message = 'TENANT_MISMATCH';
  end if;

  if not (
    public.current_user_has_permission('manage_billing')
    or public.current_user_has_permission('manage_company')
  ) then
    raise exception using errcode = 'P0001', message = 'PERMISSION_DENIED';
  end if;

  select up.id
    into v_actor_profile_id
  from public.user_profiles up
  where up.user_id = auth.uid()
    and up.company_id = p_company_id
    and up.is_deleted = false
  limit 1;

  if v_actor_profile_id is null then
    raise exception using errcode = 'P0001', message = 'ACTOR_PROFILE_NOT_FOUND';
  end if;

  if not exists (
    select 1
    from public.user_profiles up
    where up.id = p_user_profile_id
      and up.company_id = p_company_id
      and up.is_deleted = false
  ) then
    raise exception using errcode = 'P0001', message = 'USER_PROFILE_NOT_FOUND';
  end if;

  select cs.id
    into v_subscription_id
  from public.company_subscriptions cs
  where cs.company_id = p_company_id
    and cs.is_current = true
    and cs.status in ('trialing', 'active', 'past_due')
  order by cs.created_at desc
  limit 1;

  if v_subscription_id is null then
    raise exception using errcode = 'P0001', message = 'SUBSCRIPTION_NOT_FOUND';
  end if;

  if p_is_billable then
    select ce.entitlements_json ->> 'limit.active_seats'
      into v_limit_raw
    from public.company_entitlements ce
    where ce.company_id = p_company_id;

    if v_limit_raw is not null and v_limit_raw ~ '^[0-9]+$' then
      v_limit := v_limit_raw::integer;
    else
      v_limit := null;
    end if;

    if v_limit is not null then
      select count(*)
        into v_billable_active_count
      from public.company_seat_assignments csa
      where csa.company_id = p_company_id
        and csa.status = 'active'
        and csa.is_billable = true;

      if v_billable_active_count >= v_limit then
        raise exception using errcode = 'P0001', message = 'SEAT_LIMIT_EXCEEDED';
      end if;
    end if;
  end if;

  begin
    insert into public.company_seat_assignments (
      company_id,
      user_profile_id,
      subscription_id,
      status,
      is_billable,
      assigned_at,
      assigned_by_profile_id
    )
    values (
      p_company_id,
      p_user_profile_id,
      v_subscription_id,
      'active',
      coalesce(p_is_billable, true),
      now(),
      v_actor_profile_id
    )
    returning id into v_assignment_id;
  exception
    when unique_violation then
      raise exception using errcode = 'P0001', message = 'SEAT_ALREADY_ASSIGNED';
  end;

  return jsonb_build_object(
    'seat_assignment_id', v_assignment_id,
    'company_id', p_company_id,
    'user_profile_id', p_user_profile_id,
    'status', 'active',
    'is_billable', coalesce(p_is_billable, true)
  );
end;
$$;

