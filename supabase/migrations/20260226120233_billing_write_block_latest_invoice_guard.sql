-- ============================================
-- Migration: 20260226120233_billing_write_block_latest_invoice_guard.sql
-- Purpose : Block operational writes using latest invoice delinquency only
-- Scope   : Additive + replay-safe
-- ============================================

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
  v_latest_invoice record;
  v_timezone text;
  v_local_today date;
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

  select cs.*, coalesce(nullif(trim(cset.timezone), ''), 'Asia/Karachi') as company_timezone
    into v_subscription
  from public.company_subscriptions cs
  left join public.company_settings cset
    on cset.company_id = cs.company_id
   and cset.is_deleted = false
  where cs.company_id = p_company_id
    and cs.is_current = true
  order by cs.created_at desc
  limit 1;

  if v_subscription.id is null then
    return false;
  end if;

  if v_subscription.status in ('canceled', 'past_due') then
    return true;
  end if;

  v_timezone := coalesce(v_subscription.company_timezone, 'Asia/Karachi');
  v_local_today := (now() at time zone v_timezone)::date;

  select bi.*
    into v_latest_invoice
  from public.billing_invoices bi
  where bi.company_id = p_company_id
    and bi.subscription_id = v_subscription.id
    and bi.status <> 'void'
  order by bi.period_end desc, bi.created_at desc
  limit 1;

  if v_latest_invoice.id is null then
    return false;
  end if;

  if v_latest_invoice.status in ('pending', 'under_review', 'overdue')
     and v_local_today > (v_latest_invoice.due_date + 3) then
    return true;
  end if;

  return false;
end;
$$;