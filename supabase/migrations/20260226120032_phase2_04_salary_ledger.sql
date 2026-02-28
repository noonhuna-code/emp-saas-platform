-- EMP/supabase/phase2_04_salary_ledger.sql

create table if not exists public.salary_ledger (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  payroll_entry_id uuid not null references public.payroll_entries(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  debit numeric(14,2) not null default 0,
  credit numeric(14,2) not null default 0,
  running_balance numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

create index if not exists salary_ledger_company_id_idx
  on public.salary_ledger (company_id)
  where is_deleted = false;

create index if not exists salary_ledger_employee_id_idx
  on public.salary_ledger (employee_id)
  where is_deleted = false;

create index if not exists salary_ledger_payroll_entry_id_idx
  on public.salary_ledger (payroll_entry_id)
  where is_deleted = false;

create or replace function public.recalculate_running_balance(p_employee_id uuid)
returns table (ledger_id uuid, running_balance numeric(14,2))
language plpgsql
set search_path = public, pg_temp
as $$
begin
  return query
  select l.id,
         sum(l.credit - l.debit) over (order by l.created_at, l.id) as running_balance
  from public.salary_ledger l
  where l.employee_id = p_employee_id
    and l.company_id = public.current_user_company_id()
    and l.is_deleted = false
  order by l.created_at, l.id;
end;
$$;

create or replace function public.block_update_salary_ledger()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'Updating salary ledger is not allowed';
end;
$$;

create or replace function public.block_delete_salary_ledger()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'Deleting salary ledger is not allowed';
end;
$$;

drop trigger if exists trg_salary_ledger_block_update on public.salary_ledger;
create trigger trg_salary_ledger_block_update
  before update on public.salary_ledger
  for each row execute function public.block_update_salary_ledger();

drop trigger if exists trg_salary_ledger_block_delete on public.salary_ledger;
create trigger trg_salary_ledger_block_delete
  before delete on public.salary_ledger
  for each row execute function public.block_delete_salary_ledger();

-- ============================================
-- PHASE 2 PAYROLL ENGINE SUMMARY
-- Tables created: salary_ledger
-- Functions created: recalculate_running_balance, block_update_salary_ledger, block_delete_salary_ledger
-- Triggers created: trg_salary_ledger_block_update, trg_salary_ledger_block_delete
-- RLS policies added: none (handled in phase2_06_payroll_rls.sql)
-- ============================================
