-- ============================================
-- Migration: 45_leave_integrity_patch.sql
-- Purpose: Leave stability hardening (scheduler wrapper, balance integrity checks, append-only ledger enforcement)
-- Scope: Leave functions, triggers, indexes only
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: Preserves existing policies (drops stray leave_ledger update/delete policies only if present)
-- Financial Impact: None
-- ============================================

create index if not exists leave_requests_overlap_guard_idx
  on public.leave_requests (company_id, employee_id, start_date, end_date)
  where is_deleted = false and status in ('pending','approved');

create index if not exists leave_ledger_company_employee_type_date_idx
  on public.leave_ledger (company_id, employee_id, leave_type_id, transaction_date)
  where is_deleted = false;

create or replace function public.run_leave_accrual_scheduler(
  p_company_id uuid default null,
  p_force boolean default false
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_processed integer := 0;
  v_has_current_month_accrual boolean;
  v_month_start date := date_trunc('month', current_date)::date;
  v_next_month_start date := (date_trunc('month', current_date) + interval '1 month')::date;
begin
  perform set_config('row_security','off', true);

  for v_company_id in
    select distinct r.company_id
      from public.leave_accrual_rules r
     where r.is_deleted = false
       and (p_company_id is null or r.company_id = p_company_id)
  loop
    if not p_force then
      select exists (
        select 1
          from public.leave_ledger ll
         where ll.company_id = v_company_id
           and ll.transaction_type = 'accrual'
           and ll.transaction_date >= v_month_start
           and ll.transaction_date < v_next_month_start
           and ll.is_deleted = false
      ) into v_has_current_month_accrual;

      if coalesce(v_has_current_month_accrual, false) then
        continue;
      end if;
    end if;

    perform public.process_monthly_leave_accrual(v_company_id);
    v_processed := v_processed + 1;
  end loop;

  return v_processed;
end;
$$;

create or replace function public.leave_balance_integrity_check(p_company_id uuid)
returns table (
  balance_id uuid,
  employee_id uuid,
  leave_type_id uuid,
  balance_year integer,
  issue_code text,
  details jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('row_security','off', true);

  return query
  with used_ledger as (
    select
      ll.company_id,
      ll.employee_id,
      ll.leave_type_id,
      extract(year from ll.transaction_date)::int as balance_year,
      coalesce(sum(case when ll.transaction_type = 'used' then ll.days else 0 end), 0) as used_days_from_ledger
    from public.leave_ledger ll
    where ll.company_id = p_company_id
      and ll.is_deleted = false
    group by ll.company_id, ll.employee_id, ll.leave_type_id, extract(year from ll.transaction_date)
  )
  select
    b.id,
    b.employee_id,
    b.leave_type_id,
    b.year,
    issues.issue_code,
    issues.details
  from public.leave_balances b
  left join used_ledger ul
    on ul.company_id = b.company_id
   and ul.employee_id = b.employee_id
   and ul.leave_type_id = b.leave_type_id
   and ul.balance_year = b.year
  cross join lateral (
    values
      (
        case when b.entitled_days < 0 then 'negative_entitled_days' end,
        case when b.entitled_days < 0 then jsonb_build_object('entitled_days', b.entitled_days) end
      ),
      (
        case when b.used_days < 0 then 'negative_used_days' end,
        case when b.used_days < 0 then jsonb_build_object('used_days', b.used_days) end
      ),
      (
        case when (b.entitled_days - b.used_days) < 0 then 'negative_remaining_days' end,
        case when (b.entitled_days - b.used_days) < 0 then jsonb_build_object('entitled_days', b.entitled_days, 'used_days', b.used_days, 'remaining_days', (b.entitled_days - b.used_days)) end
      ),
      (
        case when coalesce(ul.used_days_from_ledger, 0) <> b.used_days then 'used_days_ledger_mismatch' end,
        case when coalesce(ul.used_days_from_ledger, 0) <> b.used_days then jsonb_build_object('balance_used_days', b.used_days, 'ledger_used_days', coalesce(ul.used_days_from_ledger, 0)) end
      )
  ) as issues(issue_code, details)
  where b.company_id = p_company_id
    and b.is_deleted = false
    and issues.issue_code is not null;
end;
$$;

create or replace function public.block_update_leave_ledger()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Updating leave ledger is not allowed';
end;
$$;

create or replace function public.block_delete_leave_ledger()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Deleting leave ledger is not allowed';
end;
$$;

drop trigger if exists trg_leave_ledger_block_update on public.leave_ledger;
create trigger trg_leave_ledger_block_update
  before update on public.leave_ledger
  for each row execute function public.block_update_leave_ledger();

drop trigger if exists trg_leave_ledger_block_delete on public.leave_ledger;
create trigger trg_leave_ledger_block_delete
  before delete on public.leave_ledger
  for each row execute function public.block_delete_leave_ledger();

-- Re-attach core leave request validator to ensure overlap and blackout rules remain enforced.
drop trigger if exists trg_leave_requests_validate on public.leave_requests;
create trigger trg_leave_requests_validate
  before insert or update on public.leave_requests
  for each row execute function public.validate_leave_request();

drop policy if exists leave_ledger_update on public.leave_ledger;
drop policy if exists leave_ledger_delete on public.leave_ledger;

-- Cron support example (Supabase pg_cron):
-- select cron.schedule(
--   'leave_monthly_accrual_scheduler',
--   '5 0 1 * *',
--   $$select public.run_leave_accrual_scheduler();$$
-- );