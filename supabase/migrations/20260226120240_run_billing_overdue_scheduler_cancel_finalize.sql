-- ============================================
-- Migration: 20260226120240_run_billing_overdue_scheduler_cancel_finalize.sql
-- Purpose : Finalize cancellation at period end and skip delinquency while cancellation pending
-- Scope   : Additive + replay-safe
-- ============================================

create or replace function public.run_billing_overdue_scheduler(
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
  v_subscription record;
  v_latest_invoice record;
  v_invoice_changed boolean := false;
  v_subscription_changed boolean := false;
  v_timezone text;
  v_local_today date;
  v_grace_end timestamptz;
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
    or public.current_user_has_permission('approve_billing_payments')
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
  order by cs.created_at desc
  limit 1
  for update;

  if v_subscription.id is null then
    return jsonb_build_object('invoice_changed', false, 'subscription_changed', false, 'reason', 'subscription_missing');
  end if;

  v_timezone := coalesce(v_subscription.company_timezone, 'Asia/Karachi');
  v_local_today := (now() at time zone v_timezone)::date;

  if v_subscription.status <> 'canceled' and v_subscription.cancellation_requested_at is not null then
    if now() >= v_subscription.current_period_end then
      update public.company_subscriptions
         set status = 'canceled',
             grace_ends_at = null,
             updated_by = v_actor_profile_id,
             updated_at = now()
       where id = v_subscription.id;

      perform public.write_billing_audit_event(
        p_company_id,
        v_actor_profile_id,
        'subscription_canceled',
        'company_subscription',
        v_subscription.id,
        jsonb_build_object(
          'cancellation_requested_at', v_subscription.cancellation_requested_at,
          'current_period_end', v_subscription.current_period_end
        )
      );

      return jsonb_build_object(
        'invoice_changed', false,
        'subscription_changed', true,
        'subscription_id', v_subscription.id,
        'reason', 'subscription_canceled'
      );
    end if;

    return jsonb_build_object(
      'invoice_changed', false,
      'subscription_changed', false,
      'subscription_id', v_subscription.id,
      'reason', 'cancellation_pending'
    );
  end if;

  select bi.*
    into v_latest_invoice
  from public.billing_invoices bi
  where bi.company_id = p_company_id
    and bi.subscription_id = v_subscription.id
    and bi.status <> 'void'
  order by bi.period_end desc, bi.created_at desc
  limit 1
  for update;

  if v_latest_invoice.id is null then
    return jsonb_build_object('invoice_changed', false, 'subscription_changed', false, 'reason', 'invoice_missing');
  end if;

  if v_latest_invoice.status = 'pending' and v_local_today > v_latest_invoice.due_date then
    update public.billing_invoices
       set status = 'overdue',
           updated_by = v_actor_profile_id,
           updated_at = now()
     where id = v_latest_invoice.id;

    v_invoice_changed := true;

    perform public.write_billing_audit_event(
      p_company_id,
      v_actor_profile_id,
      'invoice_overdue',
      'billing_invoice',
      v_latest_invoice.id,
      jsonb_build_object('due_date', v_latest_invoice.due_date)
    );

    select bi.*
      into v_latest_invoice
    from public.billing_invoices bi
    where bi.id = v_latest_invoice.id
    limit 1;
  end if;

  v_grace_end := (v_latest_invoice.due_date::timestamptz + interval '3 days');

  if v_subscription.status <> 'canceled'
     and v_subscription.status <> 'past_due'
     and v_local_today > (v_latest_invoice.due_date + 3)
     and v_latest_invoice.status in ('pending', 'under_review', 'overdue') then
    update public.company_subscriptions
       set status = 'past_due',
           grace_ends_at = v_grace_end,
           updated_by = v_actor_profile_id,
           updated_at = now()
     where id = v_subscription.id;

    v_subscription_changed := true;

    perform public.write_billing_audit_event(
      p_company_id,
      v_actor_profile_id,
      'subscription_past_due',
      'company_subscription',
      v_subscription.id,
      jsonb_build_object('grace_ends_at', v_grace_end, 'invoice_id', v_latest_invoice.id)
    );
  end if;

  return jsonb_build_object(
    'invoice_changed', v_invoice_changed,
    'subscription_changed', v_subscription_changed,
    'invoice_id', v_latest_invoice.id,
    'subscription_id', v_subscription.id
  );
end;
$$;
