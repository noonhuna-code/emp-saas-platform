-- ============================================
-- Migration: 20260226120224_billing_period_anchor_functions.sql
-- Purpose : Timezone-safe monthly anchor date engine
-- Scope   : Additive + replay-safe
-- ============================================

create or replace function public.compute_next_billing_period_end(
  p_previous_period_end timestamptz,
  p_anchor_day integer,
  p_timezone text default 'Asia/Karachi'
)
returns timestamptz
language plpgsql
security invoker
set search_path = public
stable
as $$
declare
  v_tz text;
  v_local_prev timestamp;
  v_next_month_start date;
  v_last_day integer;
  v_target_day integer;
  v_hour integer;
  v_minute integer;
  v_second integer;
  v_local_next timestamp;
  v_result timestamptz;
begin
  if p_previous_period_end is null then
    raise exception using errcode = 'P0001', message = 'INVALID_PERIOD_END';
  end if;

  v_tz := coalesce(nullif(trim(p_timezone), ''), 'Asia/Karachi');
  v_local_prev := p_previous_period_end at time zone v_tz;

  v_next_month_start := (date_trunc('month', v_local_prev)::date + interval '1 month')::date;
  v_last_day := extract(day from ((date_trunc('month', v_next_month_start)::date + interval '1 month - 1 day')::date))::integer;
  v_target_day := greatest(1, least(coalesce(p_anchor_day, 1), v_last_day));

  v_hour := extract(hour from v_local_prev)::integer;
  v_minute := extract(minute from v_local_prev)::integer;
  v_second := floor(extract(second from v_local_prev))::integer;

  v_local_next := make_timestamp(
    extract(year from v_next_month_start)::integer,
    extract(month from v_next_month_start)::integer,
    v_target_day,
    v_hour,
    v_minute,
    v_second
  );

  v_result := v_local_next at time zone v_tz;
  if v_result <= p_previous_period_end then
    v_result := (v_local_next + interval '1 day') at time zone v_tz;
  end if;

  return v_result;
end;
$$;

create or replace function public.company_billing_is_write_blocked(
  p_company_id uuid,
  p_endpoint text default null
)
returns boolean
language plpgsql
security invoker
set search_path = public
stable
as $$
declare
  v_session_company_id uuid;
  v_subscription record;
  v_invoice record;
begin
  if auth.uid() is null then
    return true;
  end if;

  v_session_company_id := public.current_user_company_id();
  if v_session_company_id is null or p_company_id is null or p_company_id <> v_session_company_id then
    return true;
  end if;

  if p_endpoint is not null and p_endpoint like '/api/billing%' then
    return false;
  end if;

  select cs.*
    into v_subscription
  from public.company_subscriptions cs
  where cs.company_id = p_company_id
    and cs.is_current = true
  order by cs.created_at desc
  limit 1;

  if v_subscription.id is null then
    return false;
  end if;

  if v_subscription.status = 'canceled' then
    return true;
  end if;

  if v_subscription.status = 'past_due' then
    return true;
  end if;

  select bi.*
    into v_invoice
  from public.billing_invoices bi
  where bi.company_id = p_company_id
    and bi.subscription_id = v_subscription.id
    and bi.status in ('pending', 'under_review', 'overdue')
  order by bi.period_end desc, bi.created_at desc
  limit 1;

  if v_invoice.id is null then
    return false;
  end if;

  if current_date > (v_invoice.due_date + 3) then
    return true;
  end if;

  return false;
end;
$$;
