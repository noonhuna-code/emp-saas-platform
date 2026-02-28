-- ============================================
-- Migration: 20260226120232_billing_delinquency_latest_invoice_hardening.sql
-- Purpose : Enforce active/trial-only invoice generation
-- Scope   : Additive + replay-safe
-- ============================================

create or replace function public.generate_billing_invoice_atomic(
  p_company_id uuid,
  p_period_start date default null,
  p_period_end date default null,
  p_due_date date default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_session_company_id uuid;
  v_actor_profile_id uuid;
  v_subscription record;
  v_existing_invoice record;
  v_timezone text;
  v_expected_period_start date;
  v_expected_period_end date;
  v_due_date date;
  v_invoice_number text;
  v_invoice_id uuid;
  v_seat_count integer;
  v_unit_price_minor bigint;
  v_subtotal_minor bigint;
  v_tax_minor bigint;
  v_total_minor bigint;
  v_currency_code text;
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

  select cs.*, coalesce(nullif(trim(cset.timezone), ''), 'Asia/Karachi') as company_timezone
    into v_subscription
  from public.company_subscriptions cs
  left join public.company_settings cset
    on cset.company_id = cs.company_id
   and cset.is_deleted = false
  where cs.company_id = p_company_id
    and cs.is_current = true
    and cs.status in ('trialing', 'active')
  order by cs.created_at desc
  limit 1
  for update;

  if v_subscription.id is null then
    raise exception using errcode = 'P0001', message = 'SUBSCRIPTION_NOT_FOUND';
  end if;

  if v_subscription.status = 'canceled' then
    raise exception using errcode = 'P0001', message = 'SUBSCRIPTION_CANCELED';
  end if;

  if now() < (v_subscription.current_period_end - interval '5 days') then
    raise exception using errcode = 'P0001', message = 'INVOICE_WINDOW_NOT_OPEN';
  end if;

  v_timezone := coalesce(v_subscription.company_timezone, 'Asia/Karachi');
  v_expected_period_start := (v_subscription.current_period_start at time zone v_timezone)::date;
  v_expected_period_end := (v_subscription.current_period_end at time zone v_timezone)::date;
  v_due_date := v_expected_period_end;

  if p_period_start is not null and p_period_start <> v_expected_period_start then
    raise exception using errcode = 'P0001', message = 'INVALID_PERIOD';
  end if;

  if p_period_end is not null and p_period_end <> v_expected_period_end then
    raise exception using errcode = 'P0001', message = 'INVALID_PERIOD';
  end if;

  if p_due_date is not null and p_due_date <> v_due_date then
    raise exception using errcode = 'P0001', message = 'INVALID_DUE_DATE';
  end if;

  perform pg_advisory_xact_lock(
    hashtext('billing_invoice:' || p_company_id::text || ':' || v_expected_period_start::text || ':' || v_expected_period_end::text)
  );

  select bi.id, bi.invoice_number, bi.status
    into v_existing_invoice
  from public.billing_invoices bi
  where bi.company_id = p_company_id
    and bi.subscription_id = v_subscription.id
    and bi.period_start = v_expected_period_start
    and bi.period_end = v_expected_period_end
    and bi.status <> 'void'
  order by bi.created_at desc
  limit 1;

  if v_existing_invoice.id is not null then
    return jsonb_build_object(
      'invoice_id', v_existing_invoice.id,
      'invoice_number', v_existing_invoice.invoice_number,
      'status', v_existing_invoice.status,
      'created', false
    );
  end if;

  select count(*)
    into v_seat_count
  from public.company_seat_assignments csa
  where csa.company_id = p_company_id
    and csa.status = 'active'
    and csa.is_billable = true;

  select coalesce(csi.unit_price_minor, bpv.price_minor_unit, 0)
    into v_unit_price_minor
  from public.company_subscription_items csi
  left join public.billing_plan_versions bpv on bpv.id = csi.plan_version_id
  where csi.company_id = p_company_id
    and csi.subscription_id = v_subscription.id
    and csi.item_type = 'base_plan'
    and csi.status = 'active'
  order by csi.created_at desc
  limit 1;

  v_subtotal_minor := coalesce(v_seat_count, 0) * coalesce(v_unit_price_minor, 0);
  v_tax_minor := 0;
  v_total_minor := v_subtotal_minor + v_tax_minor;
  v_currency_code := upper(coalesce(v_subscription.currency_code_snapshot, 'PKR'));

  v_invoice_number := format(
    'INV-%s-%s',
    to_char(now(), 'YYYYMMDDHH24MISSMS'),
    upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 6))
  );

  insert into public.billing_invoices (
    company_id,
    subscription_id,
    invoice_number,
    period_start,
    period_end,
    due_date,
    seat_count,
    subtotal_minor,
    tax_minor,
    total_minor,
    currency_code,
    currency_snapshot,
    seat_count_snapshot,
    price_per_seat_snapshot,
    plan_version_snapshot,
    billing_interval_snapshot,
    status,
    created_by,
    updated_by
  )
  values (
    p_company_id,
    v_subscription.id,
    v_invoice_number,
    v_expected_period_start,
    v_expected_period_end,
    v_due_date,
    v_seat_count,
    v_subtotal_minor,
    v_tax_minor,
    v_total_minor,
    v_currency_code,
    v_currency_code,
    v_seat_count,
    coalesce(v_unit_price_minor, 0),
    v_subscription.plan_version_id,
    'monthly',
    'pending',
    v_actor_profile_id,
    v_actor_profile_id
  )
  returning id into v_invoice_id;

  perform public.write_billing_audit_event(
    p_company_id,
    v_actor_profile_id,
    'invoice_generated',
    'billing_invoice',
    v_invoice_id,
    jsonb_build_object(
      'invoice_number', v_invoice_number,
      'period_start', v_expected_period_start,
      'period_end', v_expected_period_end,
      'due_date', v_due_date,
      'seat_count_snapshot', v_seat_count,
      'price_per_seat_snapshot', coalesce(v_unit_price_minor, 0),
      'subtotal_minor', v_subtotal_minor,
      'currency', v_currency_code,
      'plan_version_snapshot', v_subscription.plan_version_id
    )
  );

  return jsonb_build_object(
    'invoice_id', v_invoice_id,
    'invoice_number', v_invoice_number,
    'status', 'pending',
    'created', true,
    'seat_count', v_seat_count,
    'subtotal_minor', v_subtotal_minor,
    'tax_minor', v_tax_minor,
    'total_minor', v_total_minor,
    'due_date', v_due_date
  );
end;
$$;