-- ============================================
-- Migration: 20260226120225_ensure_company_trial_subscription_anchor_patch.sql
-- Purpose : Trial bootstrap sets currency snapshot + billing anchor day in company timezone
-- Scope   : Additive + replay-safe
-- ============================================

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
  v_timezone text;
  v_anchor_day integer;
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

  select coalesce(nullif(trim(cs.timezone), ''), 'Asia/Karachi')
    into v_timezone
  from public.company_settings cs
  where cs.company_id = p_company_id
    and cs.is_deleted = false
  limit 1;

  v_timezone := coalesce(v_timezone, 'Asia/Karachi');
  v_anchor_day := extract(day from (now() at time zone v_timezone))::integer;

  select
    bp.id as plan_id,
    bp.plan_code as plan_code,
    bpv.id as plan_version_id,
    coalesce(bpv.trial_days, 14) as trial_days,
    upper(coalesce(bpv.currency_code, 'PKR')) as currency_code
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
    billing_anchor_day,
    currency_code_snapshot,
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
    v_anchor_day,
    v_trial_plan_version.currency_code,
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
