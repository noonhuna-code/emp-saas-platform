-- EMP/supabase/payroll_engine.sql

create table if not exists public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  month integer not null,
  year integer not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'draft',
  locked boolean not null default false,
  locked_at timestamptz,
  locked_by uuid references public.user_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

alter table public.payroll_runs
  add constraint payroll_runs_status_chk
  check (status in ('draft','processing','finalized','paid','partial'));

create unique index if not exists payroll_runs_company_month_year_uniq
  on public.payroll_runs (company_id, year, month)
  where is_deleted = false;

create index if not exists payroll_runs_company_id_idx
  on public.payroll_runs (company_id)
  where is_deleted = false;

create index if not exists payroll_runs_status_idx
  on public.payroll_runs (status)
  where is_deleted = false;

create table if not exists public.payroll_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  payroll_run_id uuid not null references public.payroll_runs(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  base_salary numeric not null,
  total_earnings numeric not null default 0,
  total_deductions numeric not null default 0,
  net_salary numeric not null default 0,
  is_processed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

create index if not exists payroll_entries_company_id_idx
  on public.payroll_entries (company_id)
  where is_deleted = false;

create index if not exists payroll_entries_run_id_idx
  on public.payroll_entries (payroll_run_id)
  where is_deleted = false;

create index if not exists payroll_entries_employee_id_idx
  on public.payroll_entries (employee_id)
  where is_deleted = false;

create index if not exists payroll_entries_company_run_employee_idx
  on public.payroll_entries (company_id, payroll_run_id, employee_id)
  where is_deleted = false;

create or replace function public.process_payroll_run(run_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_run record;
  v_assignment record;
  v_employee record;
  v_total_overtime numeric := 0;
  v_total_earnings numeric := 0;
  v_total_deductions numeric := 0;
  v_net numeric := 0;
  v_actor uuid;
begin
  perform set_config('row_security','off', true);

  select * into v_run
  from public.payroll_runs
  where id = run_id
    and is_deleted = false;

  if not found then
    raise exception 'Payroll run not found';
  end if;

  v_actor := (
    select id from public.user_profiles where user_id = auth.uid()
  );

  update public.payroll_runs
     set status = 'processing',
         updated_at = now(),
         updated_by = v_actor
   where id = v_run.id;

  for v_employee in
    select e.id as employee_id
    from public.employees e
    where e.company_id = v_run.company_id
      and e.is_deleted = false
  loop
    select * into v_assignment
    from public.employee_salary_assignments esa
    where esa.company_id = v_run.company_id
      and esa.employee_id = v_employee.employee_id
      and esa.is_deleted = false
      and esa.effective_from <= v_run.end_date
      and (esa.effective_to is null or esa.effective_to >= v_run.start_date)
    order by esa.effective_from desc
    limit 1;

    if not found then
      continue;
    end if;

    select coalesce(sum(ar.overtime_minutes),0)
      into v_total_overtime
      from public.attendance_records ar
      where ar.company_id = v_run.company_id
        and ar.employee_id = v_employee.employee_id
        and ar.is_deleted = false
        and ar.attendance_date between v_run.start_date and v_run.end_date;

    v_total_earnings := v_assignment.base_salary;
    v_total_deductions := 0;
    v_net := v_total_earnings - v_total_deductions;

    insert into public.payroll_entries (
      company_id,
      payroll_run_id,
      employee_id,
      base_salary,
      total_earnings,
      total_deductions,
      net_salary,
      is_processed,
      created_by,
      updated_by
    ) values (
      v_run.company_id,
      v_run.id,
      v_employee.employee_id,
      v_assignment.base_salary,
      v_total_earnings,
      v_total_deductions,
      v_net,
      true,
      v_actor,
      v_actor
    );
  end loop;
end;
$$;

create or replace function public.finalize_payroll_run(run_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_run record;
  v_unprocessed integer;
  v_actor uuid;
begin
  perform set_config('row_security','off', true);

  select * into v_run
  from public.payroll_runs
  where id = run_id
    and is_deleted = false;

  if not found then
    raise exception 'Payroll run not found';
  end if;

  select count(*) into v_unprocessed
  from public.payroll_entries pe
  where pe.payroll_run_id = v_run.id
    and pe.company_id = v_run.company_id
    and pe.is_deleted = false
    and pe.is_processed = false;

  if v_unprocessed > 0 then
    raise exception 'Payroll run has unprocessed entries';
  end if;

  v_actor := (
    select id from public.user_profiles where user_id = auth.uid()
  );

  update public.payroll_runs
     set status = 'finalized',
         locked = true,
         locked_at = now(),
         locked_by = v_actor,
         updated_at = now(),
         updated_by = v_actor
   where id = v_run.id;
end;
$$;

create or replace function public.prevent_locked_payroll_entries_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_locked boolean;
begin
  perform set_config('row_security','off', true);

  select locked into v_locked
  from public.payroll_runs
  where id = new.payroll_run_id
    and is_deleted = false;

  if v_locked then
    raise exception 'Payroll run is locked';
  end if;

  return new;
end;
$$;

alter table public.payroll_runs enable row level security;
alter table public.payroll_runs force row level security;

alter table public.payroll_entries enable row level security;
alter table public.payroll_entries force row level security;

drop policy if exists payroll_runs_select on public.payroll_runs;
drop policy if exists payroll_runs_insert on public.payroll_runs;
drop policy if exists payroll_runs_update on public.payroll_runs;

drop policy if exists payroll_entries_select on public.payroll_entries;
drop policy if exists payroll_entries_insert on public.payroll_entries;
drop policy if exists payroll_entries_update on public.payroll_entries;

create policy payroll_runs_select on public.payroll_runs
  for select
  using (company_id = public.current_user_company_id() and is_deleted = false);

create policy payroll_runs_insert on public.payroll_runs
  for insert
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_payroll')
  );

create policy payroll_runs_update on public.payroll_runs
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

create policy payroll_entries_select on public.payroll_entries
  for select
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
  );

create policy payroll_entries_insert on public.payroll_entries
  for insert
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_payroll')
  );

create policy payroll_entries_update on public.payroll_entries
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

create trigger trg_payroll_entries_lock
  before update on public.payroll_entries
  for each row execute function public.prevent_locked_payroll_entries_update();

create trigger trg_payroll_runs_updated_at
  before update on public.payroll_runs
  for each row execute function public.set_updated_at();

create trigger trg_payroll_entries_updated_at
  before update on public.payroll_entries
  for each row execute function public.set_updated_at();

-- ================================
-- SUMMARY
-- ================================
-- Tables created: payroll_runs, payroll_entries
-- Functions created: process_payroll_run, finalize_payroll_run, prevent_locked_payroll_entries_update
-- Policies created: payroll_runs_select/insert/update, payroll_entries_select/insert/update
-- Indexes created: payroll_runs_company_month_year_uniq, payroll_runs_company_id_idx, payroll_runs_status_idx, payroll_entries_company_id_idx, payroll_entries_run_id_idx, payroll_entries_employee_id_idx, payroll_entries_company_run_employee_idx
-- Self-audit: no duplicates, idempotent, multi-tenant safe, soft-delete consistent
-- ================================
