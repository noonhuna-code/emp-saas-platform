-- ============================================
-- Migration: 20260226120241_request_billing_subscription_cancellation_atomic.sql
-- Purpose : Controlled cancellation request workflow (no immediate destructive change)
-- Scope   : Additive + replay-safe
-- ============================================

create or replace function public.request_billing_subscription_cancellation_atomic(
  p_company_id uuid,
  p_reason text default null
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
  v_reason text;
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

  select cs.*
    into v_subscription
  from public.company_subscriptions cs
  where cs.company_id = p_company_id
    and cs.is_current = true
  order by cs.created_at desc
  limit 1
  for update;

  if v_subscription.id is null then
    raise exception using errcode = 'P0001', message = 'SUBSCRIPTION_NOT_FOUND';
  end if;

  if v_subscription.status = 'canceled' then
    return jsonb_build_object(
      'subscription_id', v_subscription.id,
      'status', 'canceled',
      'changed', false
    );
  end if;

  if v_subscription.cancellation_requested_at is not null then
    return jsonb_build_object(
      'subscription_id', v_subscription.id,
      'status', v_subscription.status,
      'changed', false,
      'cancellation_requested_at', v_subscription.cancellation_requested_at,
      'current_period_end', v_subscription.current_period_end
    );
  end if;

  v_reason := nullif(trim(coalesce(p_reason, '')), '');

  update public.company_subscriptions
     set cancellation_requested_at = now(),
         updated_by = v_actor_profile_id,
         updated_at = now()
   where id = v_subscription.id;

  perform public.write_billing_audit_event(
    p_company_id,
    v_actor_profile_id,
    'subscription_cancellation_requested',
    'company_subscription',
    v_subscription.id,
    jsonb_build_object(
      'reason', v_reason,
      'current_period_end', v_subscription.current_period_end
    )
  );

  return jsonb_build_object(
    'subscription_id', v_subscription.id,
    'status', v_subscription.status,
    'changed', true,
    'cancellation_requested_at', now(),
    'current_period_end', v_subscription.current_period_end
  );
end;
$$;
