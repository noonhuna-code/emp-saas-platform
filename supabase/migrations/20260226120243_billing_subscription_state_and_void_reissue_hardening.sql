-- ============================================
-- Migration: 20260226120243_billing_subscription_state_and_void_reissue_hardening.sql
-- Purpose : Enforce subscription state/period transition guards and fix void reissue uniqueness
-- Scope   : Additive + replay-safe
-- ============================================

create or replace function public.enforce_company_subscription_status_transition()
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

  if old.status = 'trialing' and new.status in ('active', 'past_due', 'canceled') then
    v_allowed := true;
  elsif old.status = 'active' and new.status in ('past_due', 'canceled') then
    v_allowed := true;
  elsif old.status = 'past_due' and new.status in ('active', 'canceled') then
    v_allowed := true;
  elsif old.status = 'canceled' and new.status = 'canceled' then
    v_allowed := true;
  end if;

  if not v_allowed then
    raise exception using errcode = 'P0001', message = 'SUBSCRIPTION_STATE_CONFLICT';
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_company_subscriptions_status_transition'
      and tgrelid = 'public.company_subscriptions'::regclass
  ) then
    create trigger trg_company_subscriptions_status_transition
      before update of status on public.company_subscriptions
      for each row execute function public.enforce_company_subscription_status_transition();
  end if;
end $$;

create or replace function public.enforce_company_subscription_period_progression()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.current_period_start = old.current_period_start
     and new.current_period_end = old.current_period_end then
    return new;
  end if;

  if new.current_period_start <> old.current_period_end then
    raise exception using errcode = 'P0001', message = 'INVALID_PERIOD_PROGRESS';
  end if;

  if new.current_period_end <= new.current_period_start then
    raise exception using errcode = 'P0001', message = 'INVALID_PERIOD_PROGRESS';
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_company_subscriptions_period_progression'
      and tgrelid = 'public.company_subscriptions'::regclass
  ) then
    create trigger trg_company_subscriptions_period_progression
      before update of current_period_start, current_period_end on public.company_subscriptions
      for each row execute function public.enforce_company_subscription_period_progression();
  end if;
end $$;

drop index if exists public.billing_invoices_company_subscription_period_uniq;

create unique index if not exists billing_invoices_company_subscription_period_uniq
  on public.billing_invoices (company_id, subscription_id, period_start, period_end)
  where status <> 'void';
