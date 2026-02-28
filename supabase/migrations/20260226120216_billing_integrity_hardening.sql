-- ============================================
-- Migration: 20260226120216_billing_integrity_hardening.sql
-- Purpose : Billing audit immutability, status transition guard, currency immutability, audit helpers
-- Scope   : Additive + replay-safe
-- ============================================

create or replace function public.prevent_billing_audit_events_mutation()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  raise exception using errcode = 'P0001', message = 'BILLING_AUDIT_EVENTS_IMMUTABLE';
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_billing_audit_events_no_update'
      and tgrelid = 'public.billing_audit_events'::regclass
  ) then
    create trigger trg_billing_audit_events_no_update
      before update on public.billing_audit_events
      for each row execute function public.prevent_billing_audit_events_mutation();
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_billing_audit_events_no_delete'
      and tgrelid = 'public.billing_audit_events'::regclass
  ) then
    create trigger trg_billing_audit_events_no_delete
      before delete on public.billing_audit_events
      for each row execute function public.prevent_billing_audit_events_mutation();
  end if;
end $$;

create or replace function public.enforce_subscription_currency_immutable()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if old.currency_code_snapshot is distinct from new.currency_code_snapshot then
    raise exception using errcode = 'P0001', message = 'CURRENCY_IMMUTABLE';
  end if;
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_company_subscriptions_currency_immutable'
      and tgrelid = 'public.company_subscriptions'::regclass
  ) then
    create trigger trg_company_subscriptions_currency_immutable
      before update of currency_code_snapshot on public.company_subscriptions
      for each row execute function public.enforce_subscription_currency_immutable();
  end if;
end $$;

create or replace function public.enforce_billing_invoice_status_transition()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_allowed boolean := false;
begin
  if new.status = old.status then
    return new;
  end if;

  if old.status = 'draft' and new.status = 'pending' then
    v_allowed := true;
  elsif old.status = 'pending' and new.status = 'under_review' then
    v_allowed := true;
  elsif old.status = 'pending' and new.status = 'overdue' then
    v_allowed := true;
  elsif old.status = 'overdue' and new.status = 'under_review' then
    v_allowed := true;
  elsif old.status = 'under_review' and new.status = 'paid' then
    v_allowed := true;
  elsif old.status = 'under_review' and new.status = 'pending' then
    v_allowed := true;
  end if;

  if not v_allowed then
    raise exception using errcode = 'P0001', message = 'INVOICE_STATE_CONFLICT';
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_billing_invoices_status_transition'
      and tgrelid = 'public.billing_invoices'::regclass
  ) then
    create trigger trg_billing_invoices_status_transition
      before update of status on public.billing_invoices
      for each row execute function public.enforce_billing_invoice_status_transition();
  end if;
end $$;

create or replace function public.write_billing_audit_event(
  p_company_id uuid,
  p_actor_profile_id uuid,
  p_event_type text,
  p_entity_type text,
  p_entity_id uuid default null,
  p_metadata_json jsonb default '{}'::jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.billing_audit_events (
    company_id,
    actor_profile_id,
    event_type,
    entity_type,
    entity_id,
    metadata_json,
    created_at
  )
  values (
    p_company_id,
    p_actor_profile_id,
    trim(coalesce(p_event_type, '')),
    trim(coalesce(p_entity_type, '')),
    p_entity_id,
    coalesce(p_metadata_json, '{}'::jsonb),
    now()
  );
end;
$$;

create or replace function public.audit_billing_plan_version_created()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_actor_profile_id uuid;
begin
  if auth.uid() is not null then
    select up.id
      into v_actor_profile_id
    from public.user_profiles up
    where up.user_id = auth.uid()
      and up.is_deleted = false
    order by up.created_at desc
    limit 1;
  end if;

  perform public.write_billing_audit_event(
    null,
    v_actor_profile_id,
    'price_version_created',
    'billing_plan_version',
    new.id,
    jsonb_build_object(
      'plan_id', new.plan_id,
      'version_no', new.version_no,
      'billing_interval', new.billing_interval,
      'currency_code', new.currency_code
    )
  );

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_billing_plan_versions_audit_insert'
      and tgrelid = 'public.billing_plan_versions'::regclass
  ) then
    create trigger trg_billing_plan_versions_audit_insert
      after insert on public.billing_plan_versions
      for each row execute function public.audit_billing_plan_version_created();
  end if;
end $$;
