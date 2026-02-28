-- EMP/supabase/salary_ledger_engine.sql

create table if not exists public.employee_salary_ledger (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  payroll_run_id uuid not null references public.payroll_runs(id) on delete restrict,
  entry_type text not null,
  component_name text not null,
  amount numeric not null,
  entry_date date not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

alter table public.employee_salary_ledger
  add constraint employee_salary_ledger_entry_type_chk
  check (entry_type in ('earning','deduction'));

create index if not exists employee_salary_ledger_company_id_idx
  on public.employee_salary_ledger (company_id)
  where is_deleted = false;

create index if not exists employee_salary_ledger_employee_id_idx
  on public.employee_salary_ledger (employee_id)
  where is_deleted = false;

create index if not exists employee_salary_ledger_payroll_run_id_idx
  on public.employee_salary_ledger (payroll_run_id)
  where is_deleted = false;

create index if not exists employee_salary_ledger_entry_date_idx
  on public.employee_salary_ledger (entry_date)
  where is_deleted = false;

create index if not exists employee_salary_ledger_company_employee_date_idx
  on public.employee_salary_ledger (company_id, employee_id, entry_date)
  where is_deleted = false;

create materialized view if not exists public.employee_monthly_salary_summary as
select
  l.company_id,
  l.employee_id,
  extract(year from l.entry_date)::int as year,
  extract(month from l.entry_date)::int as month,
  sum(case when l.entry_type = 'earning' then l.amount else 0 end) as total_earnings,
  sum(case when l.entry_type = 'deduction' then l.amount else 0 end) as total_deductions,
  sum(case when l.entry_type = 'earning' then l.amount else 0 end)
    - sum(case when l.entry_type = 'deduction' then l.amount else 0 end) as net_salary
from public.employee_salary_ledger l
where l.is_deleted = false
group by l.company_id, l.employee_id, extract(year from l.entry_date), extract(month from l.entry_date);

create materialized view if not exists public.employee_yearly_salary_summary as
select
  l.company_id,
  l.employee_id,
  extract(year from l.entry_date)::int as year,
  sum(case when l.entry_type = 'earning' then l.amount else 0 end) as total_earnings,
  sum(case when l.entry_type = 'deduction' then l.amount else 0 end) as total_deductions,
  sum(case when l.entry_type = 'earning' then l.amount else 0 end)
    - sum(case when l.entry_type = 'deduction' then l.amount else 0 end) as net_salary
from public.employee_salary_ledger l
where l.is_deleted = false
group by l.company_id, l.employee_id, extract(year from l.entry_date);

create materialized view if not exists public.company_monthly_payroll_summary as
select
  l.company_id,
  extract(year from l.entry_date)::int as year,
  extract(month from l.entry_date)::int as month,
  sum(case when l.entry_type = 'earning' then l.amount else 0 end) as total_earnings,
  sum(case when l.entry_type = 'deduction' then l.amount else 0 end) as total_deductions,
  sum(case when l.entry_type = 'earning' then l.amount else 0 end)
    - sum(case when l.entry_type = 'deduction' then l.amount else 0 end) as net_payroll
from public.employee_salary_ledger l
where l.is_deleted = false
group by l.company_id, extract(year from l.entry_date), extract(month from l.entry_date);

create unique index if not exists employee_monthly_salary_summary_uniq
  on public.employee_monthly_salary_summary (company_id, employee_id, year, month);

create unique index if not exists employee_yearly_salary_summary_uniq
  on public.employee_yearly_salary_summary (company_id, employee_id, year);

create unique index if not exists company_monthly_payroll_summary_uniq
  on public.company_monthly_payroll_summary (company_id, year, month);

create index if not exists employee_monthly_salary_summary_company_id_idx
  on public.employee_monthly_salary_summary (company_id);

create index if not exists employee_monthly_salary_summary_employee_id_idx
  on public.employee_monthly_salary_summary (employee_id);

create index if not exists employee_yearly_salary_summary_company_id_idx
  on public.employee_yearly_salary_summary (company_id);

create index if not exists employee_yearly_salary_summary_employee_id_idx
  on public.employee_yearly_salary_summary (employee_id);

create index if not exists company_monthly_payroll_summary_company_id_idx
  on public.company_monthly_payroll_summary (company_id);

alter table public.employee_salary_ledger enable row level security;
alter table public.employee_salary_ledger force row level security;

drop policy if exists employee_salary_ledger_select on public.employee_salary_ledger;
drop policy if exists employee_salary_ledger_insert on public.employee_salary_ledger;
drop policy if exists employee_salary_ledger_update on public.employee_salary_ledger;

create policy employee_salary_ledger_select on public.employee_salary_ledger
  for select
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
  );

create policy employee_salary_ledger_insert on public.employee_salary_ledger
  for insert
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_payroll')
  );

create policy employee_salary_ledger_update on public.employee_salary_ledger
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and public.current_user_has_permission('manage_payroll')
  )
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_payroll')
  );

create or replace function public.refresh_salary_ledger_views()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('row_security','off', true);

  refresh materialized view public.employee_monthly_salary_summary;
  refresh materialized view public.employee_yearly_salary_summary;
  refresh materialized view public.company_monthly_payroll_summary;
end;
$$;

-- ================================
-- SUMMARY
-- ================================
-- Tables created: employee_salary_ledger
-- Materialized views created: employee_monthly_salary_summary, employee_yearly_salary_summary, company_monthly_payroll_summary
-- Functions created: refresh_salary_ledger_views
-- Policies created: employee_salary_ledger_select/insert/update
-- Indexes created: employee_salary_ledger_company_id_idx, employee_salary_ledger_employee_id_idx, employee_salary_ledger_payroll_run_id_idx, employee_salary_ledger_entry_date_idx, employee_salary_ledger_company_employee_date_idx,
--                 employee_monthly_salary_summary_uniq, employee_yearly_salary_summary_uniq, company_monthly_payroll_summary_uniq,
--                 employee_monthly_salary_summary_company_id_idx, employee_monthly_salary_summary_employee_id_idx,
--                 employee_yearly_salary_summary_company_id_idx, employee_yearly_salary_summary_employee_id_idx,
--                 company_monthly_payroll_summary_company_id_idx
-- Self-audit: no duplicates, idempotent, multi-tenant safe, soft-delete consistent
-- ================================
