-- ============================================
-- Migration: 20260226120228_mark_billing_invoice_paid_atomic_final.sql
-- Purpose : Platform-approval payment verification + atomic subscription extension
-- Scope   : Additive + replay-safe
-- ============================================

create or replace function public.mark_billing_invoice_paid_atomic(
  p_company_id uuid,
  p_invoice_id uuid,
  p_paid_amount_minor bigint,
  p_paid_currency_code text,
  p_payment_reference text default null,
  p_payment_provider text default null,
  p_paid_at timestamptz default now()
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_session_company_id uuid;
  v_actor_profile_id uuid;
  v_invoice record;
  v_subscription record;
  v_timezone text;
  v_reference text;
  v_provider text;
  v_expected_currency text;
  v_paid_currency text;
  v_new_period_start timestamptz;
  v_new_period_end timestamptz;
  v_expected_invoice_start date;
  v_expected_invoice_end date;
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'UNAUTHENTICATED';
  end if;

  v_session_company_id := public.current_user_company_id();
  if v_session_company_id is null or p_company_id is null or p_company_id <> v_session_company_id then
    raise exception using errcode = 'P0001', message = 'TENANT_MISMATCH';
  end if;

  if not (
    public.current_user_has_permission('approve_billing_payments')
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
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

  select bi.*
    into v_invoice
  from public.billing_invoices bi
  where bi.company_id = p_company_id
    and bi.id = p_invoice_id
  limit 1
  for update;

  if v_invoice.id is null then
    raise exception using errcode = 'P0001', message = 'INVOICE_NOT_FOUND';
  end if;

  if v_invoice.status = 'paid' then
    return jsonb_build_object(
      'invoice_id', v_invoice.id,
      'subscription_id', v_invoice.subscription_id,
      'status', 'paid',
      'subscription_status', 'active',
      'changed', false
    );
  end if;

  if v_invoice.status <> 'under_review' then
    raise exception using errcode = 'P0001', message = 'INVOICE_STATE_CONFLICT';
  end if;

  if p_paid_amount_minor is null or p_paid_amount_minor <> v_invoice.subtotal_minor then
    raise exception using errcode = 'P0001', message = 'PAYMENT_AMOUNT_MISMATCH';
  end if;

  v_expected_currency := upper(coalesce(v_invoice.currency_snapshot, v_invoice.currency_code, 'PKR'));
  v_paid_currency := upper(nullif(trim(coalesce(p_paid_currency_code, '')), ''));

  if v_paid_currency is null or v_paid_currency <> v_expected_currency then
    raise exception using errcode = 'P0001', message = 'PAYMENT_CURRENCY_MISMATCH';
  end if;

  v_reference := nullif(trim(coalesce(p_payment_reference, '')), '');
  v_provider := nullif(trim(coalesce(p_payment_provider, '')), '');

  if v_provider is not null and v_provider not in ('jazzcash', 'bank', 'stripe', 'manual') then
    raise exception using errcode = 'P0001', message = 'INVALID_PAYMENT_PROVIDER';
  end if;

  if exists (
    select 1
    from public.billing_payment_events bpe
    where bpe.company_id = p_company_id
      and bpe.invoice_id = p_invoice_id
      and bpe.event_type = 'invoice_paid'
  ) then
    raise exception using errcode = 'P0001', message = 'INVOICE_ALREADY_PAID';
  end if;

  perform public.write_billing_audit_event(
    p_company_id,
    v_actor_profile_id,
    'payment_verified',
    'billing_invoice',
    v_invoice.id,
    jsonb_build_object(
      'paid_amount_minor', p_paid_amount_minor,
      'paid_currency_code', v_paid_currency,
      'payment_provider', v_provider,
      'payment_reference', v_reference
    )
  );

  select cs.*, coalesce(nullif(trim(cset.timezone), ''), 'Asia/Karachi') as company_timezone
    into v_subscription
  from public.company_subscriptions cs
  left join public.company_settings cset
    on cset.company_id = cs.company_id
   and cset.is_deleted = false
  where cs.company_id = p_company_id
    and cs.id = v_invoice.subscription_id
  limit 1
  for update;

  if v_subscription.id is null then
    raise exception using errcode = 'P0001', message = 'SUBSCRIPTION_NOT_FOUND';
  end if;

  if v_subscription.status = 'canceled' then
    raise exception using errcode = 'P0001', message = 'SUBSCRIPTION_CANCELED';
  end if;

  v_timezone := coalesce(v_subscription.company_timezone, 'Asia/Karachi');
  v_new_period_start := v_subscription.current_period_end;
  v_new_period_end := public.compute_next_billing_period_end(v_new_period_start, v_subscription.billing_anchor_day, v_timezone);

  if v_new_period_end <= v_new_period_start then
    raise exception using errcode = 'P0001', message = 'INVALID_PERIOD';
  end if;

  v_expected_invoice_start := (v_subscription.current_period_start at time zone v_timezone)::date;
  v_expected_invoice_end := (v_subscription.current_period_end at time zone v_timezone)::date;

  if v_invoice.period_start <> v_expected_invoice_start or v_invoice.period_end <> v_expected_invoice_end then
    raise exception using errcode = 'P0001', message = 'INVOICE_STATE_CONFLICT';
  end if;

  insert into public.billing_payment_events (
    company_id,
    invoice_id,
    subscription_id,
    event_type,
    amount_minor,
    currency_code,
    payment_reference,
    payment_provider,
    event_source,
    metadata_json,
    created_by_profile_id,
    created_at
  )
  values (
    p_company_id,
    v_invoice.id,
    v_subscription.id,
    'payment_verified',
    p_paid_amount_minor,
    v_paid_currency,
    v_reference,
    v_provider,
    'manual_review',
    jsonb_build_object('paid_at', coalesce(p_paid_at, now())),
    v_actor_profile_id,
    now()
  );

  update public.billing_invoices
     set status = 'paid',
         paid_amount_minor = p_paid_amount_minor,
         paid_currency_code = v_paid_currency,
         paid_at = coalesce(p_paid_at, now()),
         payment_reference = coalesce(v_reference, payment_reference),
         payment_provider = coalesce(v_provider, payment_provider),
         updated_by = v_actor_profile_id,
         updated_at = now()
   where id = v_invoice.id;

  insert into public.billing_payment_events (
    company_id,
    invoice_id,
    subscription_id,
    event_type,
    amount_minor,
    currency_code,
    payment_reference,
    payment_provider,
    event_source,
    metadata_json,
    created_by_profile_id,
    created_at
  )
  values (
    p_company_id,
    v_invoice.id,
    v_subscription.id,
    'invoice_paid',
    p_paid_amount_minor,
    v_paid_currency,
    v_reference,
    v_provider,
    'manual_review',
    jsonb_build_object('paid_at', coalesce(p_paid_at, now())),
    v_actor_profile_id,
    now()
  );

  perform public.write_billing_audit_event(
    p_company_id,
    v_actor_profile_id,
    'invoice_paid',
    'billing_invoice',
    v_invoice.id,
    jsonb_build_object('paid_at', coalesce(p_paid_at, now()))
  );

  update public.company_subscriptions
     set status = 'active',
         grace_ends_at = null,
         current_period_start = v_new_period_start,
         current_period_end = v_new_period_end,
         updated_by = v_actor_profile_id,
         updated_at = now()
   where id = v_subscription.id;

  insert into public.company_subscription_changes (
    company_id,
    subscription_id,
    change_type,
    requested_at,
    effective_at,
    status,
    from_plan_version_id,
    to_plan_version_id,
    processed_at,
    created_by
  )
  values (
    p_company_id,
    v_subscription.id,
    'renewal',
    now(),
    now(),
    'processed',
    v_subscription.plan_version_id,
    v_subscription.plan_version_id,
    now(),
    v_actor_profile_id
  );

  perform public.refresh_company_entitlements_snapshot(p_company_id, v_actor_profile_id);

  perform public.write_billing_audit_event(
    p_company_id,
    v_actor_profile_id,
    'subscription_extended',
    'company_subscription',
    v_subscription.id,
    jsonb_build_object(
      'invoice_id', v_invoice.id,
      'new_period_start', v_new_period_start,
      'new_period_end', v_new_period_end
    )
  );

  return jsonb_build_object(
    'invoice_id', v_invoice.id,
    'subscription_id', v_subscription.id,
    'status', 'paid',
    'subscription_status', 'active',
    'changed', true
  );
end;
$$;
