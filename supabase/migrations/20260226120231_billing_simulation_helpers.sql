-- ============================================
-- Migration: 20260226120231_billing_simulation_helpers.sql
-- Purpose : Deterministic renewal simulation helper (read-only)
-- Scope   : Additive + replay-safe
-- ============================================

create or replace function public.simulate_billing_renewal_cycles(
  p_start timestamptz,
  p_anchor_day integer,
  p_timezone text default 'Asia/Karachi',
  p_cycles integer default 12
)
returns table (
  cycle_no integer,
  period_start timestamptz,
  period_end timestamptz,
  invoice_due_date date
)
language plpgsql
security invoker
set search_path = public
stable
as $$
declare
  v_i integer;
  v_start timestamptz;
  v_end timestamptz;
begin
  v_start := p_start;
  v_end := public.compute_next_billing_period_end(v_start, p_anchor_day, p_timezone);

  for v_i in 1..greatest(1, p_cycles) loop
    cycle_no := v_i;
    period_start := v_start;
    period_end := v_end;
    invoice_due_date := (v_end at time zone coalesce(nullif(trim(p_timezone), ''), 'Asia/Karachi'))::date;
    return next;

    v_start := v_end;
    v_end := public.compute_next_billing_period_end(v_start, p_anchor_day, p_timezone);
  end loop;
end;
$$;
