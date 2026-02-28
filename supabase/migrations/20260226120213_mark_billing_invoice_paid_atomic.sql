-- ============================================
-- Migration: 20260226120213_mark_billing_invoice_paid_atomic.sql
-- Purpose : Billing admin workflow function
-- Scope   : Additive + replay-safe
-- ============================================

create or replace function public.mark_billing_invoice_paid_atomic(
  p_company_id uuid,
  p_invoice_id uuid,
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
  v_reference text;
  v_provider text;
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

  if v_invoice.status = 'canceled' then
    raise exception using errcode = 'P0001', message = 'INVOICE_STATE_CONFLICT';
  end if;

  v_reference := nullif(trim(coalesce(p_payment_reference, '')), '');
  v_provider := nullif(trim(coalesce(p_payment_provider, '')), '');
  if v_provider is not null and v_provider not in ('jazzcash', 'bank', 'stripe', 'manual') then
    raise exception using errcode = 'P0001', message = 'INVALID_PAYMENT_PROVIDER';
  end if;

  update public.billing_invoices
     set status = 'paid',
         paid_at = coalesce(p_paid_at, now()),
         payment_reference = coalesce(v_reference, payment_reference),
         payment_provider = coalesce(v_provider, payment_provider),
         updated_by = v_actor_profile_id,
         updated_at = now()
   where id = v_invoice.id;

  select cs.*
    into v_subscription
  from public.company_subscriptions cs
  where cs.company_id = p_company_id
    and cs.id = v_invoice.subscription_id
  limit 1
  for update;

  if v_subscription.id is null then
    raise exception using errcode = 'P0001', message = 'SUBSCRIPTION_NOT_FOUND';
  end if;

  update public.company_subscriptions
     set status = 'active',
         grace_ends_at = null,
         current_period_start = least(
           coalesce(current_period_start, v_invoice.period_start::timestamptz),
           v_invoice.period_start::timestamptz
         ),
         current_period_end = greatest(
           coalesce(current_period_end, (v_invoice.period_end::timestamptz + interval '1 day')),
           (v_invoice.period_end::timestamptz + interval '1 day')
         ),
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

  return jsonb_build_object(
    'invoice_id', v_invoice.id,
    'subscription_id', v_subscription.id,
    'status', 'paid',
    'subscription_status', 'active',
    'changed', true
  );
end;
$$;

